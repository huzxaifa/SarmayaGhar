import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import xgboost as xgb
import joblib
import os
import json
import re
from datetime import datetime
from typing import Dict, List, Tuple, Any

class PropertyValuePredictor:
    """
    Property Value Prediction Model for Pakistani Real Estate
    Trained on Property.csv sale records
    """
    
    def __init__(self):
        self.models = {}
        self.encoders = {}
        self.scaler = StandardScaler()
        self.feature_columns = []
        self.is_trained = False
        self.model_performance = {}
        
    def clean_price(self, price_str: str) -> float:
        """Clean and convert price string to numeric value"""
        if pd.isna(price_str) or price_str == '':
            return 0
            
        # Convert to string and remove commas
        price_str = str(price_str).replace(',', '').strip()
        
        try:
            return float(price_str)
        except:
            return 0
    
    def clean_area(self, area_str: str) -> float:
        """Clean and convert area string to numeric value in Marla"""
        if pd.isna(area_str) or area_str == '':
            return 0
            
        area_str = str(area_str).strip()
        
        # Extract number and unit
        if 'Kanal' in area_str:
            number = re.findall(r'[\d.]+', area_str)
            if number:
                return float(number[0]) * 20  # 1 Kanal = 20 Marla
        elif 'Marla' in area_str:
            number = re.findall(r'[\d.]+', area_str)
            if number:
                return float(number[0])
        
        return 0
    
    def parse_date(self, date_str: str) -> float:
        """Parse date string and return year as float"""
        if pd.isna(date_str) or date_str == '':
            return datetime.now().year
            
        try:
            # Handle different date formats
            if '-' in date_str:
                parts = date_str.split('-')
                if len(parts) >= 3:
                    return float(parts[2])  # Assuming MM-DD-YYYY format
            return float(date_str)
        except:
            return datetime.now().year
    
    def preprocess_data(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        """Preprocess the property sale data"""
        print("Preprocessing property sale data...")
        
        # Filter only sale properties
        sale_df = df[df['purpose'] == 'For Sale'].copy()
        print(f"Found {len(sale_df)} sale properties")
        
        if len(sale_df) == 0:
            raise ValueError("No sale data found in the dataset")
        
        # Clean price column
        sale_df['price_clean'] = sale_df['price'].apply(self.clean_price)
        
        # Clean area column
        sale_df['area_clean'] = sale_df['area'].apply(self.clean_area)
        
        # Clean bedroom and bath columns
        sale_df['bedroom_clean'] = pd.to_numeric(sale_df['bedrooms'], errors='coerce').fillna(0)
        sale_df['bath_clean'] = pd.to_numeric(sale_df['baths'], errors='coerce').fillna(0)
        
        # Parse date
        sale_df['year_clean'] = sale_df['date_added'].apply(self.parse_date)
        
        # Remove rows with invalid data
        sale_df = sale_df[
            (sale_df['price_clean'] > 0) & 
            (sale_df['area_clean'] > 0) & 
            (sale_df['bedroom_clean'] > 0)
        ].copy()
        
        print(f"After cleaning: {len(sale_df)} valid sale properties")
        
        if len(sale_df) == 0:
            raise ValueError("No valid sale data after cleaning")
        
        # Create features
        features_df = pd.DataFrame()
        
        # Property type encoding
        if 'property_type' in sale_df.columns:
            le_type = LabelEncoder()
            features_df['property_type_encoded'] = le_type.fit_transform(sale_df['property_type'].fillna('Unknown'))
            self.encoders['property_type'] = le_type
        
        # Location encoding
        if 'location' in sale_df.columns:
            le_location = LabelEncoder()
            features_df['location_encoded'] = le_location.fit_transform(sale_df['location'].fillna('Unknown'))
            self.encoders['location'] = le_location
        
        # City encoding
        if 'city' in sale_df.columns:
            le_city = LabelEncoder()
            features_df['city_encoded'] = le_city.fit_transform(sale_df['city'].fillna('Unknown'))
            self.encoders['city'] = le_city
        
        # Province encoding
        if 'province_name' in sale_df.columns:
            le_province = LabelEncoder()
            features_df['province_encoded'] = le_province.fit_transform(sale_df['province_name'].fillna('Unknown'))
            self.encoders['province'] = le_province
        
        # Numeric features
        features_df['bedrooms'] = sale_df['bedroom_clean']
        features_df['bathrooms'] = sale_df['bath_clean']
        features_df['area_marla'] = sale_df['area_clean']
        features_df['year'] = sale_df['year_clean']
        
        # Geographic features (if available)
        if 'latitude' in sale_df.columns and 'longitude' in sale_df.columns:
            features_df['latitude'] = pd.to_numeric(sale_df['latitude'], errors='coerce').fillna(0)
            features_df['longitude'] = pd.to_numeric(sale_df['longitude'], errors='coerce').fillna(0)
        
        # Derived features
        features_df['price_per_marla'] = sale_df['price_clean'] / sale_df['area_clean']
        features_df['bedroom_density'] = sale_df['area_clean'] / sale_df['bedroom_clean']
        features_df['bathroom_ratio'] = sale_df['bath_clean'] / sale_df['bedroom_clean']
        features_df['age'] = datetime.now().year - sale_df['year_clean']
        
        # Target variable
        target = sale_df['price_clean']
        
        # Store feature columns
        self.feature_columns = features_df.columns.tolist()
        
        return features_df, target
    
    def train_models(self, X: pd.DataFrame, y: pd.Series) -> Dict[str, Any]:
        """Train multiple models for property value prediction"""
        print("Training property value prediction models...")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Define models
        models = {
            'Random Forest': RandomForestRegressor(
                n_estimators=100, 
                random_state=42,
                max_depth=20,
                min_samples_split=5
            ),
            'Gradient Boosting': GradientBoostingRegressor(
                n_estimators=100,
                random_state=42,
                max_depth=6,
                learning_rate=0.1
            ),
            'XGBoost': xgb.XGBRegressor(
                n_estimators=100,
                random_state=42,
                max_depth=6,
                learning_rate=0.1
            )
        }
        
        # Train and evaluate models
        results = {}
        for name, model in models.items():
            print(f"Training {name}...")
            
            # Train model
            model.fit(X_train_scaled, y_train)
            
            # Make predictions
            y_pred = model.predict(X_test_scaled)
            
            # Calculate metrics
            mse = mean_squared_error(y_test, y_pred)
            rmse = np.sqrt(mse)
            mae = mean_absolute_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            
            results[name] = {
                'model': model,
                'mse': mse,
                'rmse': rmse,
                'mae': mae,
                'r2': r2
            }
            
            print(f"{name} - R²: {r2:.4f}, RMSE: {rmse:.2f}, MAE: {mae:.2f}")
        
        # Select best model based on R² score
        best_model_name = max(results.keys(), key=lambda k: results[k]['r2'])
        best_model = results[best_model_name]['model']
        
        print(f"\nBest model: {best_model_name} (R²: {results[best_model_name]['r2']:.4f})")
        
        self.models['property_value'] = best_model
        self.model_performance = results[best_model_name]
        self.is_trained = True
        
        return results
    
    def save_model(self, model_dir: str = 'trained_models/Property_Value'):
        """Save the trained model and encoders"""
        if not self.is_trained:
            raise ValueError("Model must be trained before saving")
        
        os.makedirs(model_dir, exist_ok=True)
        
        # Save model
        joblib.dump(self.models['property_value'], f'{model_dir}/model.pkl')
        
        # Save encoders
        joblib.dump(self.encoders, f'{model_dir}/encoders.pkl')
        
        # Save scaler
        joblib.dump(self.scaler, f'{model_dir}/scaler.pkl')
        
        # Save feature columns
        joblib.dump(self.feature_columns, f'{model_dir}/features.pkl')
        
        # Save metadata
        metadata = {
            'model_type': 'Property Value Prediction',
            'feature_columns': self.feature_columns,
            'encoders': list(self.encoders.keys()),
            'trained_at': pd.Timestamp.now().isoformat(),
            'model_name': 'Property Value Predictor',
            'performance': self.model_performance
        }
        
        with open(f'{model_dir}/metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"Model saved to {model_dir}")
    
    def load_model(self, model_dir: str = 'trained_models/Property_Value'):
        """Load the trained model and encoders"""
        if not os.path.exists(model_dir):
            raise FileNotFoundError(f"Model directory {model_dir} not found")
        
        # Load model
        self.models['property_value'] = joblib.load(f'{model_dir}/model.pkl')
        
        # Load encoders
        self.encoders = joblib.load(f'{model_dir}/encoders.pkl')
        
        # Load scaler
        self.scaler = joblib.load(f'{model_dir}/scaler.pkl')
        
        # Load feature columns
        self.feature_columns = joblib.load(f'{model_dir}/features.pkl')
        
        self.is_trained = True
        print(f"Model loaded from {model_dir}")
    
    def predict_property_value(self, property_data: Dict[str, Any]) -> float:
        """Predict property value for given property data"""
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        # Prepare features
        features = []
        
        for col in self.feature_columns:
            if col == 'property_type_encoded':
                if 'property_type' in property_data:
                    try:
                        encoded_value = self.encoders['property_type'].transform([property_data['property_type']])[0]
                    except ValueError:
                        encoded_value = 0
                else:
                    encoded_value = 0
                features.append(encoded_value)
            elif col == 'location_encoded':
                if 'location' in property_data:
                    try:
                        encoded_value = self.encoders['location'].transform([property_data['location']])[0]
                    except ValueError:
                        encoded_value = 0
                else:
                    encoded_value = 0
                features.append(encoded_value)
            elif col == 'city_encoded':
                if 'city' in property_data:
                    try:
                        encoded_value = self.encoders['city'].transform([property_data['city']])[0]
                    except ValueError:
                        encoded_value = 0
                else:
                    encoded_value = 0
                features.append(encoded_value)
            elif col == 'province_encoded':
                if 'province' in property_data:
                    try:
                        encoded_value = self.encoders['province'].transform([property_data['province']])[0]
                    except ValueError:
                        encoded_value = 0
                else:
                    encoded_value = 0
                features.append(encoded_value)
            elif col == 'bedrooms':
                features.append(property_data.get('bedrooms', 0))
            elif col == 'bathrooms':
                features.append(property_data.get('bathrooms', 0))
            elif col == 'area_marla':
                features.append(property_data.get('area_marla', 0))
            elif col == 'year':
                features.append(property_data.get('year_built', datetime.now().year))
            elif col == 'latitude':
                features.append(property_data.get('latitude', 0))
            elif col == 'longitude':
                features.append(property_data.get('longitude', 0))
            elif col == 'price_per_marla':
                area = property_data.get('area_marla', 1)
                price = property_data.get('purchase_price', 0)
                features.append(price / area if area > 0 else 0)
            elif col == 'bedroom_density':
                area = property_data.get('area_marla', 0)
                bedrooms = property_data.get('bedrooms', 1)
                features.append(area / bedrooms if bedrooms > 0 else 0)
            elif col == 'bathroom_ratio':
                bathrooms = property_data.get('bathrooms', 0)
                bedrooms = property_data.get('bedrooms', 1)
                features.append(bathrooms / bedrooms if bedrooms > 0 else 0)
            elif col == 'age':
                year_built = property_data.get('year_built', datetime.now().year)
                features.append(datetime.now().year - year_built)
        
        # Scale features
        features_scaled = self.scaler.transform([features])
        
        # Make prediction
        prediction = self.models['property_value'].predict(features_scaled)[0]
        
        return max(0, prediction)  # Ensure non-negative prediction
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information and performance metrics"""
        if not self.is_trained:
            return {"error": "Model not trained"}
        
        return {
            "model_type": "Property Value Prediction",
            "feature_columns": self.feature_columns,
            "encoders": list(self.encoders.keys()),
            "performance": self.model_performance,
            "is_trained": self.is_trained
        }

def train_property_value_model():
    """Train the property value prediction model"""
    print("Starting Property Value Prediction Model Training...")
    
    # Load data
    try:
        df = pd.read_csv('ml_training/Property.csv', sep=';')
        print(f"Loaded {len(df)} records from Property.csv")
    except FileNotFoundError:
        print("Error: Property.csv not found in ml_training directory")
        return None
    
    # Initialize predictor
    predictor = PropertyValuePredictor()
    
    try:
        # Preprocess data
        X, y = predictor.preprocess_data(df)
        
        # Train models
        results = predictor.train_models(X, y)
        
        # Save model
        predictor.save_model()
        
        print("\nProperty Value Prediction Model Training Complete!")
        print("Model saved to trained_models/Property_Value/")
        
        return predictor
        
    except Exception as e:
        print(f"Error during training: {str(e)}")
        return None

if __name__ == "__main__":
    train_property_value_model()
