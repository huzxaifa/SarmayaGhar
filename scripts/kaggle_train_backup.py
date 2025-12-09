
import pandas as pd
import numpy as np
import pickle
import os
import json
import sys
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.tree import DecisionTreeRegressor
from sklearn.linear_model import LinearRegression
from sklearn.neural_network import MLPRegressor
import xgboost as xgb
from datetime import datetime

# ==========================================
# 1. SETUP & CONFIGURATION
# ==========================================
# Update this path to match where you upload the CSV on Kaggle
CSV_PATH = "zameen-updated.csv" 
OUTPUT_DIR = "trained_models"

def create_directory_structure():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

# ==========================================
# 2. DATA PREPROCESSING (Matches dataProcessor.ts)
# ==========================================
def load_and_clean_data(csv_path):
    print(f"Loading data from {csv_path}...")
    df = pd.read_csv(csv_path)
    
    # Standardize column names
    df.columns = [c.lower().replace(' ', '_') for c in df.columns]
    
    # Filter validation
    initial_count = len(df)
    df = df[
        (df['price'] > 0) &
        (df['area_size'] > 0) &
        (df['area_size'] < 50) & # Remove unrealistic sizes
        (df['bedrooms'] >= 0) & (df['bedrooms'] <= 15) &
        (df['baths'] >= 0) & (df['baths'] <= 15) &
        (df['purpose'] == 'For Sale')
    ].copy()
    
    # Outlier Removal (IQR on Price)
    Q1 = df['price'].quantile(0.25)
    Q3 = df['price'].quantile(0.75)
    IQR = Q3 - Q1
    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR
    
    df = df[(df['price'] >= lower_bound) & (df['price'] <= upper_bound)]
    print(f"Cleaned data: {len(df)} records (removed {initial_count - len(df)} outliers)")
    
    return df

def create_encoders_and_features(df):
    print("Feature Engineering...")
    encoders = {}
    
    # 1. Categorical Encoders (using manual dicts to match TS implementation logic if needed, 
    # but strictly we can use LabelEncoders and save mapping)
    # However, to ensure 100% compatibility with predict.py which expects dict-like lookups:
    
    def create_map(column):
        unique_vals = df[column].unique()
        return {val: idx for idx, val in enumerate(unique_vals)}

    encoders['location_encoder'] = create_map('location')
    encoders['property_type_encoder'] = create_map('property_type')
    encoders['city_encoder'] = create_map('city')
    encoders['province_encoder'] = create_map('province_name')
    encoders['purpose_encoder'] = create_map('purpose')
    encoders['area_category_encoder'] = create_map('area_category')
    
    # 2. Location Premiums & City Means
    # Location Premium: Price per unit area per location
    df['price_per_unit'] = df['price'] / df['area_size']
    location_premium = df.groupby('location')['price_per_unit'].mean().to_dict()
    encoders['location_premium_map'] = location_premium # Not strictly used by predict.py directly but useful metadata
    
    # 3. Apply Encodings to DataFrame
    df['property_type_encoded'] = df['property_type'].map(encoders['property_type_encoder']).fillna(0)
    df['location_encoded'] = df['location'].map(encoders['location_encoder']).fillna(0)
    df['city_encoded'] = df['city'].map(encoders['city_encoder']).fillna(0)
    df['province_encoded'] = df['province_name'].map(encoders['province_encoder']).fillna(0)
    df['purpose_encoded'] = df['purpose'].map(encoders['purpose_encoder']).fillna(0)
    df['area_category_encoded'] = df['area_category'].map(encoders['area_category_encoder']).fillna(0)
    
    # Location Premium Feature
    df['location_premium'] = df['location'].map(location_premium).fillna(0)
    
    # 4. Computed Features
    current_year = datetime.now().year
    # Handle missing date_added or invalid formats if necessary, assuming valid here
    df['date_added'] = pd.to_datetime(df['date_added'], errors='coerce')
    df['property_year'] = df['date_added'].dt.year.fillna(2020)
    df['property_age_years'] = (current_year - df['property_year']).clip(lower=0)
    
    df['bath_bedroom_ratio'] = np.where(df['bedrooms'] > 0, df['baths'] / df['bedrooms'], 0)
    df['area_size_normalized'] = np.clip(df['area_size'] / 50.0, 0, 1)
    
    # 5. Select Final Features specifically ordered
    # matches dataProcessor.ts extractFeatures order approx
    feature_cols = [
        'property_type_encoded',
        'location_encoded',
        'city_encoded',
        'province_encoded',
        'purpose_encoded',
        'area_category_encoded',
        'latitude',
        'longitude',
        'baths',
        'bedrooms',
        'area_size',
        'price_per_unit', # This acts as a proxy during training? dataProcessor includes it.
        # Zero out price_per_unit to avoid leakage as discussed
        'location_premium',
        'property_age_years',
        'bath_bedroom_ratio',
        'area_size_normalized'
    ]
    
    # Fix the data for training to match inference time reality (price_per_unit = 0)
    X = df[feature_cols].copy()
    X['price_per_unit'] = 0 # ZERO OUT TO PREVENT LEAKAGE
    
    y = df['price']
    
    return X, y, encoders, feature_cols

# ==========================================
# 3. TRAINING
# ==========================================
def train_models(X, y, encoders, feature_names):
    models = {
        'Random_Forest': RandomForestRegressor(n_estimators=100, random_state=42),
        'Decision_Tree': DecisionTreeRegressor(random_state=42),
        'Gradient_Boosting': GradientBoostingRegressor(n_estimators=100, random_state=42),
        'Linear_Regression': LinearRegression(),
        'XGBoost': xgb.XGBRegressor(objective='reg:squarederror', n_estimators=100),
        'Deep_Learning': MLPRegressor(
            hidden_layer_sizes=(128, 64, 32),
            activation='relu',
            solver='adam',
            alpha=0.001,
            batch_size='auto',
            learning_rate='adaptive',
            learning_rate_init=0.001,
            max_iter=200,
            random_state=42,
            early_stopping=True
        )
    }
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
    # Standard Scaling (Crucial for Deep Learning)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    results = []
    
    for name, model in models.items():
        print(f"Training {name}...")
        
        # Use scaled data for better performance across all models
        # (Trees handle it fine, MLP/Linear need it)
        model.fit(X_train_scaled, y_train)
        score = model.score(X_test_scaled, y_test)
        print(f"  R2 Score: {score:.4f}")
        
        # Save Artifacts
        model_dir = os.path.join(OUTPUT_DIR, name)
        if not os.path.exists(model_dir):
            os.makedirs(model_dir)
            
        # 1. Save Model
        with open(os.path.join(model_dir, 'model.pkl'), 'wb') as f:
            pickle.dump(model, f)
            
        # 2. Save Encoders
        with open(os.path.join(model_dir, 'encoders.pkl'), 'wb') as f:
            pickle.dump(encoders, f)
            
        # 3. Save Feature Names
        with open(os.path.join(model_dir, 'features.pkl'), 'wb') as f:
            pickle.dump(feature_names, f)
            
        # 4. Save Scaler (Needed for inference if we trained with scaled data!)
        # IMPORTANT: logic in predict.py likely needs to be updated if it doesn't currently load scaler.
        # But wait, predict.py DOES NOT currently use a scaler for Sklearn models explicitly in the code I saw earlier.
        # It just does `encode_features` and `model.predict`.
        # However, `train_deep_learning.py` SAVES a scaler.
        # If I change training to use scaler, I must ensure predict.py uses it.
        # `predict.py` checks:
        # 5. ... model.predict(features)
        # It doesn't seem to load `scaler.pkl`.
        # BUT for Trees (RandomForest, XGBoost), scaling isn't strictly necessary.
        # For Deep Learning (MLP), it IS.
        # So providing a scaler is good practice. Use `features` as raw input if model doesn't need scaling?
        # NO, if trained on scaled, MUST predict on scaled.
        # So I will save the scaler always.
        
        with open(os.path.join(model_dir, 'scaler.pkl'), 'wb') as f:
            pickle.dump(scaler, f)
            
        # 5. Save Metadata
        metadata = {
            "model_name": name,
            "r2_score": score,
            "trained_at": datetime.now().isoformat(),
            "accuracy": score
        }
        with open(os.path.join(model_dir, 'metadata.json'), 'w') as f:
            json.dump(metadata, f, indent=2)
            
        results.append((name, score))

    print("\nTraining Complete.")
    return results

# ==========================================
# 4. EXECUTION
# ==========================================
if __name__ == "__main__":
    create_directory_structure()
    
    if not os.path.exists(CSV_PATH):
        print(f"Error: {CSV_PATH} not found. Please upload it.")
    else:
        df = load_and_clean_data(CSV_PATH)
        X, y, encoders, feature_names = create_encoders_and_features(df)
        
        # Convert X to numpy for Sklearn (strips headers)
        X_np = X.values
        
        train_models(X_np, y, encoders, feature_names)
        
        print(f"\nModel artifacts saved in '{OUTPUT_DIR}/'. Download this folder!")
