#!/usr/bin/env python3
"""
Quick Bias Detection Script
Lightweight bias analysis for regular monitoring
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import cross_val_score
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import json
import os
from datetime import datetime

def detect_bias():
    """Quick bias detection across different demographics"""
    
    print("Running Quick Bias Detection...")
    
    # Load data
    data = pd.read_csv("attached_assets/zameen-updated_1757269388792.csv")
    data = data[data['purpose'] == 'For Sale'].copy()
    data = data.dropna(subset=['price', 'location', 'property_type', 'city', 'Area Size'])
    
    # Feature engineering (simplified)
    encoders = {}
    categorical_cols = ['location', 'property_type', 'city', 'province_name']
    
    for col in categorical_cols:
        if col in data.columns:
            encoders[col] = LabelEncoder()
            data[f'{col}_encoded'] = encoders[col].fit_transform(data[col].astype(str))
    
    # Numeric features
    data['baths'] = pd.to_numeric(data['baths'], errors='coerce').fillna(1)
    data['bedrooms'] = pd.to_numeric(data['bedrooms'], errors='coerce').fillna(2)
    data['area_size'] = pd.to_numeric(data['Area Size'], errors='coerce')
    data['area_size'] = data['area_size'].replace(0, np.nan).fillna(data['area_size'].median())
    data['price_per_unit'] = data['price'] / data['area_size']
    
    # Remove infinite values
    data = data.replace([np.inf, -np.inf], np.nan)
    data = data.dropna()
    
    # Property age
    data['date_added'] = pd.to_datetime(data['date_added'], errors='coerce')
    data['property_age_years'] = 2025 - data['date_added'].dt.year
    data['property_age_years'] = data['property_age_years'].fillna(5)
    data['bath_bedroom_ratio'] = data['baths'] / data['bedrooms']
    
    feature_columns = [
        'location_encoded', 'property_type_encoded', 'city_encoded',
        'province_name_encoded', 'area_size', 'baths', 'bedrooms',
        'price_per_unit', 'property_age_years', 'bath_bedroom_ratio'
    ]
    
    feature_columns = [col for col in feature_columns if col in data.columns]
    X = data[feature_columns].fillna(data[feature_columns].mean())
    y = data['price']
    
    # Final check for infinite values
    X = X.replace([np.inf, -np.inf], np.nan)
    X = X.fillna(X.mean())
    
    # Remove any remaining infinite values
    mask = np.isfinite(X).all(axis=1) & np.isfinite(y)
    X = X[mask]
    y = y[mask]
    
    # Initialize model
    model = RandomForestRegressor(n_estimators=50, random_state=42, n_jobs=-1)
    
    # Global performance
    global_scores = cross_val_score(model, X, y, cv=5, scoring='r2')
    global_r2 = global_scores.mean()
    
    print(f"   Global R² Score: {global_r2:.4f} ± {global_scores.std():.4f}")
    
    bias_results = {
        'analysis_date': datetime.now().isoformat(),
        'global_performance': {
            'r2_mean': float(global_r2),
            'r2_std': float(global_scores.std())
        },
        'bias_metrics': {}
    }
    
    # City bias detection
    print("\n   City Bias Analysis:")
    city_bias = {}
    for city in data['city'].unique():
        if pd.isna(city) or city == '':
            continue
        
        city_data = data[data['city'] == city]
        if len(city_data) < 30:  # Minimum samples
            continue
        
        city_X = city_data[feature_columns].fillna(X.mean())
        city_y = city_data['price']
        
        try:
            city_scores = cross_val_score(model, city_X, city_y, cv=3, scoring='r2')
            city_r2 = city_scores.mean()
            
            # Calculate bias (difference from global performance)
            bias_score = global_r2 - city_r2
            
            city_bias[city] = {
                'samples': len(city_data),
                'r2_mean': float(city_r2),
                'bias_score': float(bias_score),
                'status': 'BIASED' if abs(bias_score) > 0.1 else 'FAIR'
            }
            
            status_icon = "WARNING" if abs(bias_score) > 0.1 else "OK"
            print(f"      {status_icon} {city}: {city_r2:.4f} (Bias: {bias_score:+.4f})")
            
        except Exception as e:
            print(f"      ERROR {city}: Error in analysis")
            continue
    
    bias_results['bias_metrics']['city_bias'] = city_bias
    
    # Property type bias detection
    print("\n   Property Type Bias Analysis:")
    property_bias = {}
    for prop_type in data['property_type'].unique():
        if pd.isna(prop_type) or prop_type == '':
            continue
        
        prop_data = data[data['property_type'] == prop_type]
        if len(prop_data) < 30:
            continue
        
        prop_X = prop_data[feature_columns].fillna(X.mean())
        prop_y = prop_data['price']
        
        try:
            prop_scores = cross_val_score(model, prop_X, prop_y, cv=3, scoring='r2')
            prop_r2 = prop_scores.mean()
            
            bias_score = global_r2 - prop_r2
            
            property_bias[prop_type] = {
                'samples': len(prop_data),
                'r2_mean': float(prop_r2),
                'bias_score': float(bias_score),
                'status': 'BIASED' if abs(bias_score) > 0.1 else 'FAIR'
            }
            
            status_icon = "WARNING" if abs(bias_score) > 0.1 else "OK"
            print(f"      {status_icon} {prop_type}: {prop_r2:.4f} (Bias: {bias_score:+.4f})")
            
        except Exception as e:
            print(f"      ERROR {prop_type}: Error in analysis")
            continue
    
    bias_results['bias_metrics']['property_type_bias'] = property_bias
    
    # Price range bias detection
    print("\n   Price Range Bias Analysis:")
    data['price_quartile'] = pd.qcut(data['price'], q=4, labels=['Q1_Low', 'Q2_Med', 'Q3_High', 'Q4_Premium'])
    price_bias = {}
    
    for quartile in ['Q1_Low', 'Q2_Med', 'Q3_High', 'Q4_Premium']:
        quartile_data = data[data['price_quartile'] == quartile]
        
        if len(quartile_data) < 30:
            continue
        
        quartile_X = quartile_data[feature_columns].fillna(X.mean())
        quartile_y = quartile_data['price']
        
        try:
            quartile_scores = cross_val_score(model, quartile_X, quartile_y, cv=3, scoring='r2')
            quartile_r2 = quartile_scores.mean()
            
            bias_score = global_r2 - quartile_r2
            
            price_bias[quartile] = {
                'samples': len(quartile_data),
                'r2_mean': float(quartile_r2),
                'bias_score': float(bias_score),
                'avg_price': float(quartile_data['price'].mean()),
                'status': 'BIASED' if abs(bias_score) > 0.1 else 'FAIR'
            }
            
            status_icon = "WARNING" if abs(bias_score) > 0.1 else "OK"
            avg_price = quartile_data['price'].mean()
            print(f"      {status_icon} {quartile}: {quartile_r2:.4f} (Bias: {bias_score:+.4f}) - Avg: {avg_price:,.0f} PKR")
            
        except Exception as e:
            print(f"      ERROR {quartile}: Error in analysis")
            continue
    
    bias_results['bias_metrics']['price_range_bias'] = price_bias
    
    # Generate bias summary
    biased_cities = [city for city, data in city_bias.items() if data['status'] == 'BIASED']
    biased_types = [ptype for ptype, data in property_bias.items() if data['status'] == 'BIASED']
    biased_ranges = [range_name for range_name, data in price_bias.items() if data['status'] == 'BIASED']
    
    bias_summary = {
        'total_biased_groups': len(biased_cities) + len(biased_types) + len(biased_ranges),
        'biased_cities': biased_cities,
        'biased_property_types': biased_types,
        'biased_price_ranges': biased_ranges,
        'overall_bias_level': 'HIGH' if (len(biased_cities) + len(biased_types) + len(biased_ranges)) > 5 else 'MODERATE' if (len(biased_cities) + len(biased_types) + len(biased_ranges)) > 2 else 'LOW'
    }
    
    bias_results['bias_summary'] = bias_summary
    
    # Save results
    os.makedirs("trained_models/bias_detection", exist_ok=True)
    results_path = "trained_models/bias_detection/quick_bias_analysis.json"
    
    with open(results_path, 'w') as f:
        json.dump(bias_results, f, indent=2)
    
    print(f"\nResults saved to: {results_path}")
    
    # Print summary
    print("\n" + "=" * 60)
    print(" " * 20 + "BIAS DETECTION SUMMARY")
    print("=" * 60)
    
    print(f"\nOverall Bias Level: {bias_summary['overall_bias_level']}")
    print(f"   Total Biased Groups: {bias_summary['total_biased_groups']}")
    
    if biased_cities:
        print(f"\nWARNING - Biased Cities: {', '.join(biased_cities)}")
    if biased_types:
        print(f"WARNING - Biased Property Types: {', '.join(biased_types)}")
    if biased_ranges:
        print(f"WARNING - Biased Price Ranges: {', '.join(biased_ranges)}")
    
    if bias_summary['overall_bias_level'] == 'LOW':
        print("\nSUCCESS - Model shows good fairness across different demographics!")
    elif bias_summary['overall_bias_level'] == 'MODERATE':
        print("\nWARNING - Some bias detected. Consider model improvements.")
    else:
        print("\nCRITICAL - High bias detected! Model needs significant improvements.")
    
    return bias_results

if __name__ == "__main__":
    detect_bias()
