import pandas as pd
import numpy as np
import os
import pickle
import json
import sys
import warnings
from sklearn.model_selection import train_test_split, KFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
try:
    import xgboost as xgb
except ImportError:
    xgb = None
try:
    import lightgbm as lgb
except ImportError:
    lgb = None
from sklearn.neural_network import MLPRegressor
import matplotlib.pyplot as plt
import seaborn as sns

# Suppress warnings
warnings.filterwarnings('ignore')

# Set random seed
np.random.seed(42)

# Configuration
DATA_PATH = "attached_assets/zameen-updated.csv"
MODELS_DIR = "trained_models"
REQUIRED_COLUMNS = ['property_type', 'location', 'city', 'price', 'bedrooms', 'baths', 'area_size']

def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)

class ManualTargetEncoder:
    """
    Target Encoder implementation that works without external dependencies
    and saves mappings as simple dictionaries for robust portability.
    """
    def __init__(self, smoothing=10):
        self.smoothing = smoothing
        self.encoding_map = {}
        self.global_mean = 0

    def fit(self, X, y):
        # X is a series (categorical column), y is series (target)
        df = pd.DataFrame({'feature': X, 'target': y})
        self.global_mean = df['target'].mean()
        
        stats = df.groupby('feature')['target'].agg(['count', 'mean'])
        counts = stats['count']
        means = stats['mean']
        
        # Smoothing
        # weighted_mean = (count * mean + smoothing * global_mean) / (count + smoothing)
        smooth = (counts * means + self.smoothing * self.global_mean) / (counts + self.smoothing)
        
        self.encoding_map = smooth.to_dict()
        return self

    def transform(self, X):
        return X.map(self.encoding_map).fillna(self.global_mean)

    def fit_transform(self, X, y):
        self.fit(X, y)
        return self.transform(X)

def load_and_preprocess_data():
    print("Loading data...")
    if not os.path.exists(DATA_PATH):
        print(f"Error: {DATA_PATH} not found.")
        return None, None
    
    df = pd.read_csv(DATA_PATH)
    
    # Normalize column names (Match TS dataProcessor logic)
    df.columns = df.columns.str.lower().str.replace(r'\s+', '_', regex=True)
    
    print(f"Initial shape: {df.shape}")
    
    # 1. Basic Cleaning
    # Remove unnamed columns
    df = df.loc[:, ~df.columns.str.contains('^Unnamed')]
    
    # Filter valid cities
    valid_cities = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad']
    df = df[df['city'].isin(valid_cities)]
    
    # Filter valid property types
    valid_types = ['House', 'Flat', 'Penthouse', 'Upper Portion', 'Lower Portion', 'Farm House', 'Room']
    df = df[df['property_type'].isin(valid_types)]
    
    # Filter 'For Sale' only (for Valuation)
    df = df[df['purpose'] == 'For Sale']
    
    # 2. Outlier Removal & Validation
    # Room/Area Ratio Validation
    # Calculate total rooms
    total_rooms = df['bedrooms'] + df['baths']
    
    # Calculate ratio (Rooms per Marla)
    # Note: We assume 'area_size' is consistent (Marla) or normalized enough for this heuristic
    df['rooms_per_marla'] = total_rooms / df['area_size']
    
    # Filter based on realistic bounds (0.15 to 1.8 rooms per marla)
    # Example: 5 Marla house -> 0.75 to 9 rooms (Realistic: 3-6)
    # Example: 10 Marla house -> 1.5 to 18 rooms (Realistic: 5-8)
    initial_count = len(df)
    df = df[
        (df['rooms_per_marla'] >= 0.15) & 
        (df['rooms_per_marla'] <= 1.8)
    ]
    print(f"Removed {initial_count - len(df)} rows due to unrealistic room/area ratio.")
    
    # Drop temp column
    df = df.drop(columns=['rooms_per_marla'])
    
    # Remove crazy outliers
    df = df[(df['price'] > 100000) & (df['bedrooms'] <= 15) & (df['baths'] <= 15) & (df['area_size'] > 0)]
    
    # Price Log Transform (New Feature)
    df['log_price'] = np.log1p(df['price'])
    
    print(f"Shape after cleaning: {df.shape}")
    return df

def feature_engineering(df):
    print("Engineering features...")
    
    # 1. Total Rooms
    df['total_rooms'] = df['bedrooms'] + df['baths']
    
    # 2. Room density
    df['room_density'] = df['total_rooms'] / df['area_size']
    
    # 3. Location Premium (Price per marla mean) - Used in current project
    # We will compute this but also use Target Encoding
    location_stats = df.groupby('location')['price'].agg(['mean', 'count'])
    # Filter locations with few data points
    valid_locs = location_stats[location_stats['count'] > 5].index
    
    # 4. Target Encoding for Location (New Feature)
    # We use 'log_price' as target for smoother distribution
    target_encoder = ManualTargetEncoder(smoothing=10)
    df['location_encoded'] = target_encoder.fit_transform(df['location'], df['log_price'])
    
    # 5. City Median Price
    city_median = df.groupby('city')['log_price'].median().to_dict()
    df['city_median_price'] = df['city'].map(city_median)
    
    # 6. Other Categorical Encodings (Label Encoding)
    label_encoders = {}
    cat_cols = ['property_type', 'city', 'province_name', 'purpose'] # purpose is single val but kept for consistency
    
    for col in cat_cols:
        le = LabelEncoder()
        # Handle missing
        df[col] = df[col].astype(str)
        df[f'{col}_encoded'] = le.fit_transform(df[col])
        label_encoders[col] = le
        
    return df, label_encoders, target_encoder, city_median

def prepare_model_data(df):
    # Select features
    feature_cols = [
        'property_type_encoded', 'location_encoded', 'city_encoded', 'province_name_encoded',
        'latitude', 'longitude', 'baths', 'bedrooms', 'area_size',
        'total_rooms', 'room_density', 'city_median_price'
    ]
    
    # Drop rows with NaNs in features
    X = df[feature_cols].dropna()
    y = df.loc[X.index, 'log_price'] # Target is LOG PRICE
    
    return X, y, feature_cols

def train_and_evaluate(X, y, feature_names, encoders, target_encoder, city_median):
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    X_scaled = pd.DataFrame(X_scaled, columns=feature_names)
    
    models = {
        'Linear Regression': LinearRegression(),
        'Decision Tree': DecisionTreeRegressor(random_state=42, max_depth=15),
        'Random Forest': RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
        'Gradient Boosting': GradientBoostingRegressor(random_state=42),
        'Deep Learning': MLPRegressor(hidden_layer_sizes=(100, 50), max_iter=500, random_state=42)
    }
    
    if xgb:
        models['XGBoost'] = xgb.XGBRegressor(objective='reg:squarederror', n_estimators=1000, learning_rate=0.05, n_jobs=-1, random_state=42)
    
    if lgb:
        models['LightGBM'] = lgb.LGBMRegressor(objective='regression', n_estimators=1000, learning_rate=0.05, random_state=42)
        
    results = {}
    
    ensure_dir(MODELS_DIR)
    
    # Save encoding artifacts (Shared across models)
    # Save encoders dict (LabelEncoders)
    with open(os.path.join(MODELS_DIR, 'encoders.pkl'), 'wb') as f:
        pickle.dump(encoders, f)
        
    # Save Scaler
    with open(os.path.join(MODELS_DIR, 'scaler.pkl'), 'wb') as f:
        pickle.dump(scaler, f)
        
    # Save Target Encoder Map (Dict)
    with open(os.path.join(MODELS_DIR, 'target_encoder.pkl'), 'wb') as f:
        pickle.dump(target_encoder.encoding_map, f)
        
    # Save City Median Map (Dict)
    with open(os.path.join(MODELS_DIR, 'city_median.pkl'), 'wb') as f:
        pickle.dump(city_median, f)
        
    # Save Feature Names
    with open(os.path.join(MODELS_DIR, 'features.pkl'), 'wb') as f:
        pickle.dump(feature_names, f)

    for name, model in models.items():
        print(f"\nTraining {name}...")
        
        # K-Fold CV
        print(f"\n======================\nPERFORMING 5-FOLD CROSS-VALIDATION for {name}\n=============================")
        kf = KFold(n_splits=5, shuffle=True, random_state=42)
        fold_scores = []
        
        from sklearn.base import clone
        
        for fold_idx, (train_index, val_index) in enumerate(kf.split(X_scaled), 1):
            X_fold_train, X_fold_val = X_scaled.iloc[train_index], X_scaled.iloc[val_index]
            y_fold_train, y_fold_val = y.iloc[train_index], y.iloc[val_index]
            
            # Clone model to avoid affecting final training or subsequent folds
            if name == 'XGBoost' or name == 'LightGBM':
                 # XGB/LGB Sklearn wrappers might be cloneable, but let's be safe
                 # They are initialized in the dict, clone should work for sklearn-API wrappers
                 model_fold = clone(model) 
            else:
                 model_fold = clone(model)
            
            # Train Fold
            if name == 'XGBoost':
                model_fold.fit(X_fold_train, y_fold_train, eval_set=[(X_fold_val, y_fold_val)], verbose=False)
            elif name == 'LightGBM':
                model_fold.fit(X_fold_train, y_fold_train, eval_set=[(X_fold_val, y_fold_val)])
            else:
                model_fold.fit(X_fold_train, y_fold_train)
            
            if name == 'Linear Regression':
                print("Intercept (Bias):", model.intercept_)
                print("Coefficients (Weights):")
                for feature, weight in zip(feature_names, model.coef_):
                    print(f"  {feature}: {weight:.4f}")
        
            # Predict Fold
            y_fold_pred_log = model_fold.predict(X_fold_val)
            y_fold_val_price = np.expm1(y_fold_val)
            y_fold_pred_price = np.expm1(y_fold_pred_log)
            
            # Metrics
            rmse_fold = np.sqrt(mean_squared_error(y_fold_val_price, y_fold_pred_price))
            mae_fold = mean_absolute_error(y_fold_val_price, y_fold_pred_price)
            r2_fold = r2_score(y_fold_val_price, y_fold_pred_price)
            mape_fold = np.mean(np.abs((y_fold_val_price - y_fold_pred_price) / y_fold_val_price)) * 100
            
            print(f"Training Fold {fold_idx}/5...")
            print(f"  RMSE: {rmse_fold:,.0f}, MAE: {mae_fold:,.0f}, R2: {r2_fold:.4f}, MAPE: {mape_fold:.2f}%")
            
            fold_scores.append({
                'fold': fold_idx,
                'rmse': rmse_fold,
                'mae': mae_fold,
                'r2': r2_fold,
                'mape': mape_fold
            })
            
        # CV Summary
        print("\n================================================================================")
        print(f"K-FOLD CROSS-VALIDATION SUMMARY ({name})")
        print("================================================================================")
        print(f"{'fold':<6} {'rmse':<12} {'mae':<12} {'r2':<10} {'mape':<10}")
        for s in fold_scores:
            print(f"{s['fold']:<6} {s['rmse']:<12,.0f} {s['mae']:<12,.0f} {s['r2']:<10.4f} {s['mape']:.2f}%")
            
        avg_rmse = np.mean([s['rmse'] for s in fold_scores])
        avg_mae = np.mean([s['mae'] for s in fold_scores])
        avg_r2 = np.mean([s['r2'] for s in fold_scores])
        avg_mape = np.mean([s['mape'] for s in fold_scores])
        std_r2 = np.std([s['r2'] for s in fold_scores])
        
        print("\nMean Metrics:")
        print(f"  RMSE: {avg_rmse:,.0f}")
        print(f"  MAE: {avg_mae:,.0f}")
        print(f"  R2: {avg_r2:.4f} +/- {std_r2:.4f}")
        print(f"  MAPE: {avg_mape:.2f}%")
        
        if std_r2 < 0.02:
            print("\nBias Assessment: LOW BIAS")
        elif std_r2 < 0.05:
            print("\nBias Assessment: MODERATE BIAS")
        else:
            print("\nBias Assessment: HIGH BIAS")
            
        print("\nSplitting data...")
        
        # Train on full set for final model
        X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
        print(f"Train set: {len(X_train)} samples")
        print(f"Test set: {len(X_test)} samples")
        
        print("\n" + "="*80)
        print("TRAINING FINAL MODEL")
        print("="*80)
        
        # Train
        if name == 'XGBoost':
            # Use early stopping if possible (requires val set)
            model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False) 
        elif name == 'LightGBM':
            model.fit(X_train, y_train, eval_set=[(X_test, y_test)])
        else:
            model.fit(X_train, y_train)

        if name == 'XGBoost' or name == 'LightGBM':
            # Plot Learning Curve
            try:
                results = model.evals_result()
                if results:
                    plt.figure(figsize=(10, 6))
                    # Check structure of results (xgb vs lgb)
                    if name == 'XGBoost':
                        if 'validation_0' in results and 'rmse' in results['validation_0']:
                            epochs = len(results['validation_0']['rmse'])
                            x_axis = range(0, epochs)
                            plt.plot(x_axis, results['validation_0']['rmse'], label='Test')
                    else: # LightGBM
                        # LightGBM keys might differ, e.g. 'valid_0' and metric name 'l2'
                        # Generic plotting if possible or specific
                        pass 
                    
                    plt.legend()
                    plt.title(f'Learning Curve - {name}')
                    plt.savefig(os.path.join(model_dir, 'learning_curve.png'))
                    plt.close()
            except Exception as e:
                print(f"Could not plot learning curve for {name}: {e}")
            
        # --- Final Evaluation ---
        print("\n================================================================================")
        print("MODEL EVALUATION")
        print("================================================================================")
        
        # inverse transform for meaningful metrics
        y_train_price = np.expm1(y_train)
        y_test_price = np.expm1(y_test)
        
        # 1. Training Set Metrics
        y_train_pred_log = model.predict(X_train)
        y_train_pred_price = np.expm1(y_train_pred_log)
        
        train_rmse = np.sqrt(mean_squared_error(y_train_price, y_train_pred_price))
        train_mae = mean_absolute_error(y_train_price, y_train_pred_price)
        train_r2 = r2_score(y_train_price, y_train_pred_price)
        train_mape = np.mean(np.abs((y_train_price - y_train_pred_price) / y_train_price)) * 100
        
        print("\nTRAINING SET Metrics:")
        print(f"  RMSE: {train_rmse:,.2f}")
        print(f"  MAE: {train_mae:,.2f}")
        print(f"  R2: {train_r2:.4f}")
        print(f"  MAPE: {train_mape:.2f}%")
        
        # 2. Test Set Metrics
        y_test_pred_log = model.predict(X_test)
        y_test_pred_price = np.expm1(y_test_pred_log)
        
        rmse = np.sqrt(mean_squared_error(y_test_price, y_test_pred_price))
        mae = mean_absolute_error(y_test_price, y_test_pred_price)
        r2 = r2_score(y_test_price, y_test_pred_price)
        mape = np.mean(np.abs((y_test_price - y_test_pred_price) / y_test_price)) * 100
        
        print("\nTEST SET Metrics:")
        print(f"  RMSE: {rmse:,.2f}")
        print(f"  MAE: {mae:,.2f}")
        print(f"  R2: {r2:.4f}")
        print(f"  MAPE: {mape:.2f}%")
        
        results[name] = {'r2': r2, 'rmse': rmse, 'mae': mae}
        
        # Save Model
        safe_name = name.replace(' ', '_')
        model_dir = os.path.join(MODELS_DIR, safe_name)
        ensure_dir(model_dir)
        
        with open(os.path.join(model_dir, 'model.pkl'), 'wb') as f:
            pickle.dump(model, f)
            
        # Save Metadata
        metadata = {
            'model_name': name,
            'r2_score': r2,
            'rmse': rmse,
            'mae': mae,
            'features': feature_names,
            'log_transformed': True
        }
        with open(os.path.join(model_dir, 'metadata.json'), 'w') as f:
            json.dump(metadata, f, indent=2)
            
        # Copy shared artifacts to model dir for self-containment (predict.py expects them in model dir)
        with open(os.path.join(model_dir, 'encoders.pkl'), 'wb') as f:
            pickle.dump(encoders, f)
        with open(os.path.join(model_dir, 'scaler.pkl'), 'wb') as f:
            pickle.dump(scaler, f)
        with open(os.path.join(model_dir, 'target_encoder.pkl'), 'wb') as f:
            pickle.dump(target_encoder.encoding_map, f)
        with open(os.path.join(model_dir, 'city_median.pkl'), 'wb') as f:
            pickle.dump(city_median, f)
        with open(os.path.join(model_dir, 'features.pkl'), 'wb') as f:
            pickle.dump(feature_names, f)

        # Plotting (Feature Importance)
        if hasattr(model, 'feature_importances_'):
            plt.figure(figsize=(10, 6))
            sns.barplot(x=model.feature_importances_, y=feature_names)
            plt.title(f'Feature Importance - {name}')
            plt.tight_layout()
            plt.savefig(os.path.join(model_dir, 'feature_importance.png'))
            plt.close()

    print("\nTraining Complete.")
    print("Results summary:")
    for name, metrics in results.items():
        print(f"{name}: R2={metrics['r2']:.4f}, RMSE={metrics['rmse']:,.0f}")

def main():
    print("="*50)
    print("KAGGLE TRAINING SCRIPT (UPGRADED)")
    print("="*50)
    
    df = load_and_preprocess_data()
    if df is None:
        return
        
    df, encoders, target_encoder, city_median = feature_engineering(df)
    X, y, feature_names = prepare_model_data(df)
    
    print(f"Training on {len(X)} samples with {len(feature_names)} features.")
    
    train_and_evaluate(X, y, feature_names, encoders, target_encoder, city_median)

if __name__ == "__main__":
    main()
