#!/usr/bin/env python3
"""
K-Fold Cross Validation with Bias Analysis
Comprehensive model evaluation to detect bias, overfitting, and performance issues
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import KFold, cross_val_score, cross_validate
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.tree import DecisionTreeRegressor
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib
import json
import os
from datetime import datetime
import matplotlib.pyplot as plt
import seaborn as sns

print("=" * 80)
print(" " * 20 + "K-FOLD CROSS VALIDATION & BIAS ANALYSIS")
print("=" * 80)

# Load and prepare data
print("\n1. Loading and preparing dataset...")
data = pd.read_csv("attached_assets/zameen-updated.csv")
print(f"   Loaded {len(data)} records")

# Filter and clean data
data = data[data['purpose'] == 'For Sale'].copy()
data = data.dropna(subset=['price', 'location', 'property_type', 'city', 'area_size'])
print(f"   After filtering: {len(data)} records")

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

# Numeric features
data['baths'] = pd.to_numeric(data['baths'], errors='coerce').fillna(1)
data['bedrooms'] = pd.to_numeric(data['bedrooms'], errors='coerce').fillna(2)
data['area_size'] = pd.to_numeric(data['area_size'], errors='coerce')
data['area_size'] = data['area_size'].replace(0, np.nan).fillna(data['area_size'].median())
data['price_per_unit'] = data['price'] / data['area_size']

# Property age
data['date_added'] = pd.to_datetime(data['date_added'], errors='coerce')
data['property_age_years'] = 2025 - data['date_added'].dt.year
data['property_age_years'] = data['property_age_years'].fillna(5)

# Derived features
data['bedrooms'] = data['bedrooms'].replace(0, 1)
data['bath_bedroom_ratio'] = data['baths'] / data['bedrooms']

# Select features
feature_columns = [
    'location_encoded', 'property_type_encoded', 'city_encoded',
    'province_name_encoded', 'area_size', 'baths', 'bedrooms',
    'price_per_unit', 'property_age_years', 'bath_bedroom_ratio'
]

feature_columns = [col for col in feature_columns if col in data.columns]
X = data[feature_columns].copy()
y = data['price'].copy()
X = X.fillna(X.mean())

print(f"   Features: {len(feature_columns)}")
print(f"   Samples: {len(X)}")

# Define models to test
models = {
    'Random Forest': RandomForestRegressor(
        n_estimators=100, max_depth=15, min_samples_split=10, 
        min_samples_leaf=5, random_state=42, n_jobs=-1
    ),
    'Gradient Boosting': GradientBoostingRegressor(
        n_estimators=100, learning_rate=0.1, max_depth=5,
        min_samples_split=10, min_samples_leaf=5, random_state=42
    ),
    'Decision Tree': DecisionTreeRegressor(
        max_depth=15, min_samples_split=10, min_samples_leaf=5, random_state=42
    ),
    'Linear Regression': LinearRegression()
}

# K-Fold Cross Validation
print("\n3. Performing K-Fold Cross Validation...")
k_folds = 10
kf = KFold(n_splits=k_folds, shuffle=True, random_state=42)

cv_results = {}

for model_name, model in models.items():
    print(f"\n   Testing {model_name}...")
    
    # Standard cross-validation scores
    cv_scores = cross_validate(
        model, X, y, 
        cv=k_folds, 
        scoring=['r2', 'neg_mean_squared_error', 'neg_mean_absolute_error'],
        return_train_score=True,
        n_jobs=-1
    )
    
    # Calculate metrics
    train_r2_mean = cv_scores['train_r2'].mean()
    train_r2_std = cv_scores['train_r2'].std()
    test_r2_mean = cv_scores['test_r2'].mean()
    test_r2_std = cv_scores['test_r2'].std()
    
    train_mse_mean = -cv_scores['train_neg_mean_squared_error'].mean()
    test_mse_mean = -cv_scores['test_neg_mean_squared_error'].mean()
    
    # Calculate overfitting metrics
    overfitting_gap = train_r2_mean - test_r2_mean
    overfitting_percentage = (overfitting_gap / train_r2_mean) * 100
    
    cv_results[model_name] = {
        'train_r2_mean': train_r2_mean,
        'train_r2_std': train_r2_std,
        'test_r2_mean': test_r2_mean,
        'test_r2_std': test_r2_std,
        'train_mse_mean': train_mse_mean,
        'test_mse_mean': test_mse_mean,
        'overfitting_gap': overfitting_gap,
        'overfitting_percentage': overfitting_percentage,
        'cv_scores': cv_scores
    }
    
    print(f"      Train R²: {train_r2_mean:.4f} ± {train_r2_std:.4f}")
    print(f"      Test R²:  {test_r2_mean:.4f} ± {test_r2_std:.4f}")
    print(f"      Overfitting Gap: {overfitting_gap:.4f} ({overfitting_percentage:.2f}%)")

# Bias Analysis by Demographics
print("\n4. Analyzing Bias by Demographics...")

bias_analysis = {}

# City-wise bias analysis
print("\n   City-wise Performance Analysis:")
city_bias = {}
for city in data['city'].unique():
    if pd.isna(city):
        continue
    
    city_data = data[data['city'] == city]
    if len(city_data) < 50:  # Skip cities with too few samples
        continue
    
    city_X = city_data[feature_columns].fillna(X.mean())
    city_y = city_data['price']
    
    # Test Random Forest on this city
    rf = RandomForestRegressor(n_estimators=50, random_state=42, n_jobs=-1)
    city_scores = cross_val_score(rf, city_X, city_y, cv=5, scoring='r2')
    
    city_bias[city] = {
        'samples': len(city_data),
        'r2_mean': city_scores.mean(),
        'r2_std': city_scores.std(),
        'performance': 'Good' if city_scores.mean() > 0.8 else 'Poor'
    }
    
    print(f"      {city}: {city_scores.mean():.4f} ± {city_scores.std():.4f} ({len(city_data)} samples)")

# Property type bias analysis
print("\n   Property Type Performance Analysis:")
property_bias = {}
for prop_type in data['property_type'].unique():
    if pd.isna(prop_type):
        continue
    
    prop_data = data[data['property_type'] == prop_type]
    if len(prop_data) < 50:
        continue
    
    prop_X = prop_data[feature_columns].fillna(X.mean())
    prop_y = prop_data['price']
    
    rf = RandomForestRegressor(n_estimators=50, random_state=42, n_jobs=-1)
    prop_scores = cross_val_score(rf, prop_X, prop_y, cv=5, scoring='r2')
    
    property_bias[prop_type] = {
        'samples': len(prop_data),
        'r2_mean': prop_scores.mean(),
        'r2_std': prop_scores.std(),
        'performance': 'Good' if prop_scores.mean() > 0.8 else 'Poor'
    }
    
    print(f"      {prop_type}: {prop_scores.mean():.4f} ± {prop_scores.std():.4f} ({len(prop_data)} samples)")

# Price range bias analysis
print("\n   Price Range Performance Analysis:")
data['price_quartile'] = pd.qcut(data['price'], q=4, labels=['Q1', 'Q2', 'Q3', 'Q4'])
price_bias = {}

for quartile in ['Q1', 'Q2', 'Q3', 'Q4']:
    quartile_data = data[data['price_quartile'] == quartile]
    
    quartile_X = quartile_data[feature_columns].fillna(X.mean())
    quartile_y = quartile_data['price']
    
    rf = RandomForestRegressor(n_estimators=50, random_state=42, n_jobs=-1)
    quartile_scores = cross_val_score(rf, quartile_X, quartile_y, cv=5, scoring='r2')
    
    price_bias[quartile] = {
        'samples': len(quartile_data),
        'r2_mean': quartile_scores.mean(),
        'r2_std': quartile_scores.std(),
        'avg_price': quartile_data['price'].mean()
    }
    
    print(f"      {quartile}: {quartile_scores.mean():.4f} ± {quartile_scores.std():.4f} "
          f"(Avg Price: {quartile_data['price'].mean():,.0f} PKR)")

# Learning Curve Analysis
print("\n5. Learning Curve Analysis...")

def learning_curve_analysis(model, X, y, model_name):
    """Analyze how model performance changes with training data size"""
    train_sizes = np.linspace(0.1, 1.0, 10)
    train_scores = []
    val_scores = []
    
    for size in train_sizes:
        n_samples = int(len(X) * size)
        X_subset = X.iloc[:n_samples]
        y_subset = y.iloc[:n_samples]
        
        # Train on subset
        model.fit(X_subset, y_subset)
        
        # Evaluate on full dataset
        train_score = model.score(X_subset, y_subset)
        val_score = model.score(X, y)
        
        train_scores.append(train_score)
        val_scores.append(val_score)
    
    return {
        'train_sizes': train_sizes,
        'train_scores': train_scores,
        'val_scores': val_scores,
        'convergence': val_scores[-1] - val_scores[0]
    }

learning_curves = {}
for model_name, model in models.items():
    print(f"   Analyzing {model_name} learning curve...")
    learning_curves[model_name] = learning_curve_analysis(
        model.__class__(**model.get_params()), X, y, model_name
    )

# Compile comprehensive results
print("\n6. Compiling Results...")

results = {
    'analysis_date': datetime.now().isoformat(),
    'dataset_info': {
        'total_samples': len(data),
        'features_count': len(feature_columns),
        'k_folds': k_folds
    },
    'cross_validation_results': cv_results,
    'bias_analysis': {
        'city_bias': city_bias,
        'property_type_bias': property_bias,
        'price_range_bias': price_bias
    },
    'learning_curves': learning_curves,
    'recommendations': []
}

# Generate recommendations
print("\n7. Generating Recommendations...")

# Overfitting analysis
for model_name, results_data in cv_results.items():
    if results_data['overfitting_percentage'] > 10:
        results['recommendations'].append(
            f"{model_name}: High overfitting detected ({results_data['overfitting_percentage']:.1f}%). "
            "Consider reducing model complexity or increasing regularization."
        )
    elif results_data['overfitting_percentage'] < 2:
        results['recommendations'].append(
            f"{model_name}: Low overfitting ({results_data['overfitting_percentage']:.1f}%). "
            "Model may be underfitting. Consider increasing complexity."
        )

# Bias analysis
poor_performance_cities = [city for city, data in city_bias.items() 
                         if data['performance'] == 'Poor']
if poor_performance_cities:
    results['recommendations'].append(
        f"City bias detected: Poor performance in {poor_performance_cities}. "
        "Consider city-specific models or additional features."
    )

poor_performance_types = [ptype for ptype, data in property_bias.items() 
                        if data['performance'] == 'Poor']
if poor_performance_types:
    results['recommendations'].append(
        f"Property type bias detected: Poor performance for {poor_performance_types}. "
        "Consider type-specific models or additional features."
    )

# Save results
os.makedirs("trained_models/cross_validation", exist_ok=True)
results_path = "trained_models/cross_validation/bias_analysis_results.json"

with open(results_path, 'w') as f:
    json.dump(results, f, indent=2, default=str)

print(f"\n📊 Results saved to: {results_path}")

# Print summary
print("\n" + "=" * 80)
print(" " * 30 + "ANALYSIS SUMMARY")
print("=" * 80)

print("\n🏆 Best Performing Models (by Test R²):")
sorted_models = sorted(cv_results.items(), key=lambda x: x[1]['test_r2_mean'], reverse=True)
for i, (model_name, data) in enumerate(sorted_models[:3], 1):
    print(f"   {i}. {model_name}: {data['test_r2_mean']:.4f} ± {data['test_r2_std']:.4f}")

print(f"\n⚠️  Overfitting Analysis:")
for model_name, data in cv_results.items():
    status = "HIGH" if data['overfitting_percentage'] > 10 else "LOW" if data['overfitting_percentage'] < 2 else "MODERATE"
    print(f"   {model_name}: {status} overfitting ({data['overfitting_percentage']:.1f}%)")

print(f"\n🎯 Bias Detection:")
print(f"   Cities with poor performance: {len(poor_performance_cities)}")
print(f"   Property types with poor performance: {len(poor_performance_types)}")

print(f"\n📋 Recommendations:")
for i, rec in enumerate(results['recommendations'], 1):
    print(f"   {i}. {rec}")

print("\n" + "=" * 80)
print("✅ Cross-validation and bias analysis completed!")
print("=" * 80)
