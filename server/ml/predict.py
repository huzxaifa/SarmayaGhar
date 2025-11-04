#!/usr/bin/env python3
import pickle
import json
import sys
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.tree import DecisionTreeRegressor
try:
    import xgboost as xgb
except ImportError:
    pass
import warnings
warnings.filterwarnings('ignore')

def load_encoders(encoder_path):
    """Load encoders from pickle file with enhanced error handling"""
    try:
        with open(encoder_path, 'rb') as f:
            encoders = pickle.load(f)
        print(f"Successfully loaded encoders from {encoder_path}", file=sys.stderr)
        return encoders
    except Exception as e:
        print(f"Error loading encoders: {e}", file=sys.stderr)
        # Try with different encoding
        try:
            with open(encoder_path, 'rb') as f:
                encoders = pickle.load(f, encoding='latin1')
            print(f"Successfully loaded encoders with latin1 encoding", file=sys.stderr)
            return encoders
        except Exception as e2:
            print(f"Error loading encoders with latin1 encoding: {e2}", file=sys.stderr)
            # Try with joblib as fallback
            try:
                import joblib
                encoders = joblib.load(encoder_path)
                print(f"Successfully loaded encoders with joblib", file=sys.stderr)
                return encoders
            except Exception as e3:
                print(f"Error loading encoders with joblib: {e3}", file=sys.stderr)
                return {}

def load_model(model_path):
    """Load sklearn model from pickle file with enhanced compatibility"""
    try:
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        print(f"Successfully loaded model from {model_path}", file=sys.stderr)
        return model
    except Exception as e:
        print(f"Error loading model with pickle: {e}", file=sys.stderr)
        # Try with joblib (preferred for sklearn models)
        try:
            import joblib
            model = joblib.load(model_path)
            print(f"Successfully loaded model with joblib", file=sys.stderr)
            return model
        except Exception as e2:
            print(f"Error loading model with joblib: {e2}", file=sys.stderr)
            # Try with different encoding
            try:
                with open(model_path, 'rb') as f:
                    model = pickle.load(f, encoding='latin1')
                print(f"Successfully loaded model with latin1 encoding", file=sys.stderr)
                return model
            except Exception as e3:
                print(f"Error loading model with latin1 encoding: {e3}", file=sys.stderr)
                # Try with custom unpickler that ignores version issues
                try:
                    class CustomUnpickler(pickle.Unpickler):
                        def find_class(self, module, name):
                            # Handle version compatibility issues
                            if module.startswith('sklearn'):
                                # Try to import from current sklearn version
                                try:
                                    import importlib
                                    mod = importlib.import_module(module)
                                    return getattr(mod, name)
                                except:
                                    pass
                            return super().find_class(module, name)
                    
                    with open(model_path, 'rb') as f:
                        unpickler = CustomUnpickler(f)
                        model = unpickler.load()
                    print(f"Successfully loaded model with custom unpickler", file=sys.stderr)
                    return model
                except Exception as e4:
                    print(f"Error loading model with custom unpickler: {e4}", file=sys.stderr)
                    return None

def load_features(features_path):
    """Load feature names from pickle file"""
    try:
        with open(features_path, 'rb') as f:
            features = pickle.load(f)
        return features
    except Exception as e:
        print(f"Error loading features: {e}", file=sys.stderr)
        return []

def encode_features(request, encoders):
    """Encode categorical features using loaded encoders with enhanced validation"""
    try:
        # Validate input request
        required_fields = ['propertyType', 'location', 'city', 'areaMarla', 'bedrooms', 'bathrooms', 'yearBuilt']
        for field in required_fields:
            if field not in request:
                print(f"Warning: Missing required field '{field}' in request", file=sys.stderr)
        
        # Default encodings for unknown values
        default_encodings = {
            'property_type': 0,
            'location': 0,
            'city': 0,
            'province': 0,
            'purpose': 0,
            'area_category': 0
        }
        
        # Property type encoding
        property_type_map = encoders.get('property_type_encoder', {})
        property_type_encoded = property_type_map.get(request['propertyType'], 0)
        
        # Location encoding (try neighbourhood first, then location)
        location_map = encoders.get('location_encoder', {})
        location_encoded = location_map.get(request['neighbourhood'], 
                                          location_map.get(request['location'], 0))
        
        # City encoding
        city_map = encoders.get('city_encoder', {})
        city_encoded = city_map.get(request['city'], 0)
        
        # Province encoding
        province_map = encoders.get('province_encoder', {})
        province_encoded = province_map.get(request['province'], 0)
        
        # Purpose encoding (default to 0 for sale)
        purpose_encoded = 0
        
        # Area category encoding
        area_marla = request['areaMarla']
        area_category = '0-5 Marla'
        if area_marla > 20:
            area_category = '20+ Marla'
        elif area_marla >= 15:
            area_category = '15-20 Marla'
        elif area_marla >= 10:
            area_category = '10-15 Marla'
        elif area_marla >= 5:
            area_category = '5-10 Marla'
        
        area_category_map = encoders.get('area_category_encoder', {})
        area_category_encoded = area_category_map.get(area_category, 0)
        
        # Location premium (based on known premium areas)
        premium_areas = ['DHA', 'Bahria', 'Gulberg', 'Clifton', 'Defence', 'Cantonment']
        location_premium = 0
        if any(area in request['neighbourhood'].lower() or area in request['location'].lower() 
               for area in premium_areas):
            location_premium = 1
        
        # City coordinates (simplified)
        city_coords = {
            'Karachi': (24.8607, 67.0011),
            'Lahore': (31.5204, 74.3587),
            'Islamabad': (33.6844, 73.0479),
            'Faisalabad': (31.4504, 73.1350),
            'Rawalpindi': (33.5651, 73.0169)
        }
        
        coords = city_coords.get(request['city'], city_coords['Karachi'])
        latitude, longitude = coords
        
        # Property age
        current_year = 2024
        property_age = max(0, current_year - request['yearBuilt'])
        
        # Bath to bedroom ratio
        bath_bedroom_ratio = request['bathrooms'] / request['bedrooms'] if request['bedrooms'] > 0 else 0
        
        # Area size normalized
        area_size_normalized = min(request['areaMarla'] / 50, 1)
        
        # Construct feature vector in the same order as training
        features = [
            property_type_encoded,
            location_encoded,
            city_encoded,
            province_encoded,
            purpose_encoded,
            area_category_encoded,
            latitude,
            longitude,
            request['bathrooms'],
            request['bedrooms'],
            request['areaMarla'],
            0,  # price_per_unit (will be predicted)
            location_premium,
            property_age,
            bath_bedroom_ratio,
            area_size_normalized
        ]
        
        return np.array(features).reshape(1, -1)
        
    except Exception as e:
        print(f"Error encoding features: {e}", file=sys.stderr)
        return None

def main():
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        model_path = input_data['modelPath']
        encoder_path = input_data['encoderPath']
        features_path = input_data['featuresPath']
        request = input_data['request']
        
        # Load model and encoders
        model = load_model(model_path)
        if model is None:
            print(json.dumps({"error": "Failed to load model"}), file=sys.stderr)
            sys.exit(1)
        
        # Validate model type and capabilities
        model_type = type(model).__name__
        print(f"Loaded model type: {model_type}", file=sys.stderr)
        
        encoders = load_encoders(encoder_path)
        if not encoders:
            print(json.dumps({"error": "Failed to load encoders"}), file=sys.stderr)
            sys.exit(1)
        
        # Validate encoder structure
        required_encoders = ['property_type_encoder', 'location_encoder', 'city_encoder']
        missing_encoders = [enc for enc in required_encoders if enc not in encoders]
        if missing_encoders:
            print(f"Warning: Missing encoders: {missing_encoders}", file=sys.stderr)
        
        # Encode features
        features = encode_features(request, encoders)
        if features is None:
            print(json.dumps({"error": "Failed to encode features"}), file=sys.stderr)
            sys.exit(1)
        
        # Make prediction
        prediction = model.predict(features)[0]
        
        # Get prediction confidence if available (for some models)
        confidence = None
        if hasattr(model, 'predict_proba'):
            try:
                # For models that support probability estimation
                proba = model.predict_proba(features)[0]
                confidence = float(max(proba)) if len(proba) > 0 else None
            except:
                pass
        
        # Ensure prediction is positive and reasonable
        prediction = max(1000000, prediction)  # Minimum 1 million PKR
        
        # Log prediction details for debugging
        print(f"Prediction: {prediction:.2f}, Confidence: {confidence}", file=sys.stderr)
        
        result = {"prediction": float(prediction)}
        if confidence is not None:
            result["confidence"] = confidence
            
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
