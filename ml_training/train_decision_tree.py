#!/usr/bin/env python3
"""
Decision Tree Regressor Training Script
Trains a Decision Tree model on Pakistani real estate data
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib
import os
import json
from datetime import datetime

print("=" * 60)
print("Decision Tree Regressor Model Training")
print("=" * 60)

# Load dataset
print("\n1. Loading dataset...")
data = pd.read_csv("attached_assets/zameen-updated_1757269388792.csv")
print(f"   Loaded {len(data)} records")

# Filter for "For Sale" properties only
data = data[data['purpose'] == 'For Sale'].copy()
print(f"   Filtered to {len(data)} 'For Sale' properties")

# Rename columns for easier access
data = data.rename(columns={'Area Size': 'area_size', 'Area Type': 'area_type', 'Area Category': 'area_category'})

# Remove rows with missing critical values
data = data.dropna(subset=['price', 'location', 'property_type', 'city', 'area_size'])
print(f"   After removing missing values: {len(data)} records")

# Remove outliers
def remove_outliers(df, column):
    Q1 = df[column].quantile(0.25)
    Q3 = df[column].quantile(0.75)
    IQR = Q3 - Q1
    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR
    return df[(df[column] >= lower_bound) & (df[column] <= upper_bound)]

data = remove_outliers(data, 'price')
data = remove_outliers(data, 'area_size')
print(f"   After outlier removal: {len(data)} records")

# Feature engineering
print("\n2. Engineering features...")

encoders = {}
categorical_cols = ['location', 'property_type', 'city', 'province_name', 'purpose']

for col in categorical_cols:
    if col in data.columns:
        encoders[col] = LabelEncoder()
        data[f'{col}_encoded'] = encoders[col].fit_transform(data[col].astype(str))

data['baths'] = pd.to_numeric(data['baths'], errors='coerce').fillna(1)
data['bedrooms'] = pd.to_numeric(data['bedrooms'], errors='coerce').fillna(2)

data['area_size'] = pd.to_numeric(data['area_size'], errors='coerce')
data['area_size'] = data['area_size'].replace(0, np.nan).fillna(data['area_size'].median())
data['price_per_unit'] = data['price'] / data['area_size']

data['date_added'] = pd.to_datetime(data['date_added'], errors='coerce')
data['property_age_years'] = 2025 - data['date_added'].dt.year
data['property_age_years'] = data['property_age_years'].fillna(5)

data['bedrooms'] = data['bedrooms'].replace(0, 1)
data['bath_bedroom_ratio'] = data['baths'] / data['bedrooms']

feature_columns = [
    'location_encoded', 'property_type_encoded', 'city_encoded',
    'province_name_encoded', 'area_size', 'baths', 'bedrooms',
    'price_per_unit', 'property_age_years', 'bath_bedroom_ratio'
]

feature_columns = [col for col in feature_columns if col in data.columns]

X = data[feature_columns].copy()
y = data['price'].copy()

X = X.fillna(X.mean())

print(f"   Features selected: {len(feature_columns)}")

# Split dataset
print("\n3. Splitting dataset...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
print(f"   Training set: {len(X_train)} samples")
print(f"   Test set: {len(X_test)} samples")

# Train model
print("\n4. Training Decision Tree Regressor...")
model = DecisionTreeRegressor(
    max_depth=15,
    min_samples_split=10,
    min_samples_leaf=5,
    random_state=42
)
model.fit(X_train, y_train)
print("   Model trained successfully!")

# Evaluate model
print("\n5. Evaluating model...")
y_pred = model.predict(X_test)

mse = mean_squared_error(y_test, y_pred)
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"   R² Score: {r2:.4f}")
print(f"   Mean Squared Error: {mse:,.0f}")
print(f"   Mean Absolute Error: {mae:,.0f}")

# Save model
print("\n6. Saving model...")
os.makedirs("trained_models/Decision_Tree", exist_ok=True)

model_path = "trained_models/Decision_Tree/model.pkl"
joblib.dump(model, model_path)
print(f"   Model saved to: {model_path}")

encoders_path = "trained_models/Decision_Tree/encoders.pkl"
joblib.dump(encoders, encoders_path)
print(f"   Encoders saved to: {encoders_path}")

features_info = {
    "feature_columns": feature_columns,
    "feature_count": len(feature_columns)
}
features_path = "trained_models/Decision_Tree/features.pkl"
joblib.dump(features_info, features_path)
print(f"   Features saved to: {features_path}")

metadata = {
    "model_name": "Decision Tree",
    "r2_score": float(r2),
    "mse": float(mse),
    "mae": float(mae),
    "training_samples": len(X_train),
    "test_samples": len(X_test),
    "feature_count": len(feature_columns),
    "features": feature_columns,
    "trained_at": datetime.now().isoformat(),
    "dataset_size": len(data),
    "hyperparameters": {
        "max_depth": 15,
        "min_samples_split": 10,
        "min_samples_leaf": 5
    }
}

metadata_path = "trained_models/Decision_Tree/metadata.json"
with open(metadata_path, 'w') as f:
    json.dump(metadata, f, indent=2)
print(f"   Metadata saved to: {metadata_path}")

print("\n" + "=" * 60)
print("✅ Decision Tree model training completed successfully!")
print("=" * 60)
