#!/usr/bin/env python3
"""
Comprehensive Model Evaluation Script
Evaluates all trained models with cross-validation, bias analysis, and performance metrics
"""

import pandas as pd
import numpy as np
import json
import os
from datetime import datetime
from sklearn.model_selection import cross_val_score, cross_validate, KFold
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.tree import DecisionTreeRegressor
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib
import warnings
warnings.filterwarnings('ignore')

def load_and_prepare_data():
    """Load and prepare data for evaluation"""
    print("📊 Loading and preparing data...")
    
    data = pd.read_csv("attached_assets/zameen-updated_1757269388792.csv")
    data = data[data['purpose'] == 'For Sale'].copy()
    data = data.dropna(subset=['price', 'location', 'property_type', 'city', 'area_size'])
    
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
    
    # Feature engineering
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
    data['bath_bedroom_ratio'] = data['baths'] / data['bedrooms']
    
    feature_columns = [
        'location_encoded', 'property_type_encoded', 'city_encoded',
        'province_name_encoded', 'area_size', 'baths', 'bedrooms',
        'price_per_unit', 'property_age_years', 'bath_bedroom_ratio'
    ]
    
    feature_columns = [col for col in feature_columns if col in data.columns]
    X = data[feature_columns].fillna(data[feature_columns].mean())
    y = data['price']
    
    print(f"   ✅ Data prepared: {len(data)} samples, {len(feature_columns)} features")
    return data, X, y, feature_columns

def evaluate_model_comprehensive(model, model_name, X, y):
    """Comprehensive evaluation of a single model"""
    print(f"\n🔍 Evaluating {model_name}...")
    
    # 10-fold cross-validation
    cv_scores = cross_validate(
        model, X, y, 
        cv=10, 
        scoring=['r2', 'neg_mean_squared_error', 'neg_mean_absolute_error'],
        return_train_score=True,
        n_jobs=-1
    )
    
    # Calculate comprehensive metrics
    train_r2_mean = cv_scores['train_r2'].mean()
    train_r2_std = cv_scores['train_r2'].std()
    test_r2_mean = cv_scores['test_r2'].mean()
    test_r2_std = cv_scores['test_r2'].std()
    
    train_mse_mean = -cv_scores['train_neg_mean_squared_error'].mean()
    test_mse_mean = -cv_scores['test_neg_mean_squared_error'].mean()
    
    overfitting_gap = train_r2_mean - test_r2_mean
    overfitting_percentage = (overfitting_gap / train_r2_mean) * 100 if train_r2_mean > 0 else 0
    
    # Stability analysis (coefficient of variation)
    r2_stability = (test_r2_std / test_r2_mean) * 100 if test_r2_mean > 0 else 100
    
    # Performance classification
    if test_r2_mean > 0.95:
        performance_class = "EXCELLENT"
    elif test_r2_mean > 0.85:
        performance_class = "GOOD"
    elif test_r2_mean > 0.70:
        performance_class = "FAIR"
    else:
        performance_class = "POOR"
    
    # Overfitting classification
    if overfitting_percentage > 15:
        overfitting_class = "HIGH"
    elif overfitting_percentage > 5:
        overfitting_class = "MODERATE"
    else:
        overfitting_class = "LOW"
    
    results = {
        'model_name': model_name,
        'performance_metrics': {
            'train_r2_mean': float(train_r2_mean),
            'train_r2_std': float(train_r2_std),
            'test_r2_mean': float(test_r2_mean),
            'test_r2_std': float(test_r2_std),
            'train_mse_mean': float(train_mse_mean),
            'test_mse_mean': float(test_mse_mean),
            'overfitting_gap': float(overfitting_gap),
            'overfitting_percentage': float(overfitting_percentage),
            'r2_stability': float(r2_stability)
        },
        'classifications': {
            'performance': performance_class,
            'overfitting': overfitting_class
        }
    }
    
    print(f"   📈 Test R²: {test_r2_mean:.4f} ± {test_r2_std:.4f}")
    print(f"   📊 Performance: {performance_class}")
    print(f"   ⚖️  Overfitting: {overfitting_class} ({overfitting_percentage:.1f}%)")
    print(f"   🎯 Stability: {r2_stability:.1f}%")
    
    return results

def analyze_bias_by_demographics(data, X, y, feature_columns):
    """Analyze bias across different demographic groups"""
    print("\n⚖️  Analyzing bias by demographics...")
    
    model = RandomForestRegressor(n_estimators=50, random_state=42, n_jobs=-1)
    
    # Global performance
    global_scores = cross_val_score(model, X, y, cv=5, scoring='r2')
    global_r2 = global_scores.mean()
    
    bias_analysis = {
        'global_performance': float(global_r2),
        'city_bias': {},
        'property_type_bias': {},
        'price_range_bias': {}
    }
    
    # City bias analysis
    print("   🏙️  City bias analysis...")
    for city in data['city'].unique():
        if pd.isna(city) or city == '':
            continue
        
        city_data = data[data['city'] == city]
        if len(city_data) < 30:
            continue
        
        try:
            city_X = city_data[feature_columns].fillna(X.mean())
            city_y = city_data['price']
            city_scores = cross_val_score(model, city_X, city_y, cv=3, scoring='r2')
            city_r2 = city_scores.mean()
            
            bias_score = global_r2 - city_r2
            bias_analysis['city_bias'][city] = {
                'samples': len(city_data),
                'r2_mean': float(city_r2),
                'bias_score': float(bias_score),
                'bias_level': 'HIGH' if abs(bias_score) > 0.15 else 'MODERATE' if abs(bias_score) > 0.05 else 'LOW'
            }
            
            bias_icon = "🔴" if abs(bias_score) > 0.15 else "🟡" if abs(bias_score) > 0.05 else "🟢"
            print(f"      {bias_icon} {city}: {city_r2:.4f} (Bias: {bias_score:+.4f})")
            
        except Exception as e:
            print(f"      ❌ {city}: Error in analysis")
            continue
    
    # Property type bias analysis
    print("   🏠 Property type bias analysis...")
    for prop_type in data['property_type'].unique():
        if pd.isna(prop_type) or prop_type == '':
            continue
        
        prop_data = data[data['property_type'] == prop_type]
        if len(prop_data) < 30:
            continue
        
        try:
            prop_X = prop_data[feature_columns].fillna(X.mean())
            prop_y = prop_data['price']
            prop_scores = cross_val_score(model, prop_X, prop_y, cv=3, scoring='r2')
            prop_r2 = prop_scores.mean()
            
            bias_score = global_r2 - prop_r2
            bias_analysis['property_type_bias'][prop_type] = {
                'samples': len(prop_data),
                'r2_mean': float(prop_r2),
                'bias_score': float(bias_score),
                'bias_level': 'HIGH' if abs(bias_score) > 0.15 else 'MODERATE' if abs(bias_score) > 0.05 else 'LOW'
            }
            
            bias_icon = "🔴" if abs(bias_score) > 0.15 else "🟡" if abs(bias_score) > 0.05 else "🟢"
            print(f"      {bias_icon} {prop_type}: {prop_r2:.4f} (Bias: {bias_score:+.4f})")
            
        except Exception as e:
            print(f"      ❌ {prop_type}: Error in analysis")
            continue
    
    # Price range bias analysis
    print("   💰 Price range bias analysis...")
    data['price_quartile'] = pd.qcut(data['price'], q=4, labels=['Q1_Low', 'Q2_Med', 'Q3_High', 'Q4_Premium'])
    
    for quartile in ['Q1_Low', 'Q2_Med', 'Q3_High', 'Q4_Premium']:
        quartile_data = data[data['price_quartile'] == quartile]
        
        if len(quartile_data) < 30:
            continue
        
        try:
            quartile_X = quartile_data[feature_columns].fillna(X.mean())
            quartile_y = quartile_data['price']
            quartile_scores = cross_val_score(model, quartile_X, quartile_y, cv=3, scoring='r2')
            quartile_r2 = quartile_scores.mean()
            
            bias_score = global_r2 - quartile_r2
            bias_analysis['price_range_bias'][quartile] = {
                'samples': len(quartile_data),
                'r2_mean': float(quartile_r2),
                'bias_score': float(bias_score),
                'avg_price': float(quartile_data['price'].mean()),
                'bias_level': 'HIGH' if abs(bias_score) > 0.15 else 'MODERATE' if abs(bias_score) > 0.05 else 'LOW'
            }
            
            bias_icon = "🔴" if abs(bias_score) > 0.15 else "🟡" if abs(bias_score) > 0.05 else "🟢"
            avg_price = quartile_data['price'].mean()
            print(f"      {bias_icon} {quartile}: {quartile_r2:.4f} (Bias: {bias_score:+.4f}) - Avg: {avg_price:,.0f} PKR")
            
        except Exception as e:
            print(f"      ❌ {quartile}: Error in analysis")
            continue
    
    return bias_analysis

def generate_recommendations(evaluation_results, bias_analysis):
    """Generate actionable recommendations based on evaluation results"""
    recommendations = []
    
    # Model performance recommendations
    for result in evaluation_results:
        model_name = result['model_name']
        performance = result['classifications']['performance']
        overfitting = result['classifications']['overfitting']
        
        if performance == 'POOR':
            recommendations.append({
                'type': 'PERFORMANCE',
                'model': model_name,
                'priority': 'HIGH',
                'recommendation': f"{model_name} shows poor performance (R² = {result['performance_metrics']['test_r2_mean']:.3f}). Consider feature engineering, data quality improvements, or different algorithms."
            })
        
        if overfitting == 'HIGH':
            recommendations.append({
                'type': 'OVERFITTING',
                'model': model_name,
                'priority': 'HIGH',
                'recommendation': f"{model_name} shows high overfitting ({result['performance_metrics']['overfitting_percentage']:.1f}%). Consider reducing model complexity, increasing regularization, or getting more training data."
            })
        elif overfitting == 'LOW':
            recommendations.append({
                'type': 'UNDERFITTING',
                'model': model_name,
                'priority': 'MEDIUM',
                'recommendation': f"{model_name} may be underfitting ({result['performance_metrics']['overfitting_percentage']:.1f}% gap). Consider increasing model complexity or feature engineering."
            })
    
    # Bias recommendations
    high_bias_cities = [city for city, data in bias_analysis['city_bias'].items() 
                       if data['bias_level'] == 'HIGH']
    if high_bias_cities:
        recommendations.append({
            'type': 'BIAS',
            'priority': 'HIGH',
            'recommendation': f"High bias detected in cities: {', '.join(high_bias_cities)}. Consider city-specific models or additional location features."
        })
    
    high_bias_types = [ptype for ptype, data in bias_analysis['property_type_bias'].items() 
                      if data['bias_level'] == 'HIGH']
    if high_bias_types:
        recommendations.append({
            'type': 'BIAS',
            'priority': 'HIGH',
            'recommendation': f"High bias detected for property types: {', '.join(high_bias_types)}. Consider type-specific models or additional property features."
        })
    
    return recommendations

def main():
    """Main evaluation function"""
    print("=" * 80)
    print(" " * 20 + "COMPREHENSIVE MODEL EVALUATION")
    print("=" * 80)
    
    # Load and prepare data
    data, X, y, feature_columns = load_and_prepare_data()
    
    # Define models to evaluate
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
    
    # Evaluate all models
    evaluation_results = []
    for model_name, model in models.items():
        result = evaluate_model_comprehensive(model, model_name, X, y)
        evaluation_results.append(result)
    
    # Analyze bias
    bias_analysis = analyze_bias_by_demographics(data, X, y, feature_columns)
    
    # Generate recommendations
    recommendations = generate_recommendations(evaluation_results, bias_analysis)
    
    # Compile final results
    final_results = {
        'evaluation_date': datetime.now().isoformat(),
        'dataset_info': {
            'total_samples': len(data),
            'features_count': len(feature_columns)
        },
        'model_evaluations': evaluation_results,
        'bias_analysis': bias_analysis,
        'recommendations': recommendations,
        'summary': {
            'best_model': max(evaluation_results, key=lambda x: x['performance_metrics']['test_r2_mean']),
            'total_recommendations': len(recommendations),
            'high_priority_recommendations': len([r for r in recommendations if r['priority'] == 'HIGH'])
        }
    }
    
    # Save results
    os.makedirs("trained_models/evaluation", exist_ok=True)
    results_path = "trained_models/evaluation/comprehensive_evaluation.json"
    
    with open(results_path, 'w') as f:
        json.dump(final_results, f, indent=2)
    
    # Print summary
    print("\n" + "=" * 80)
    print(" " * 30 + "EVALUATION SUMMARY")
    print("=" * 80)
    
    # Best model
    best_model = final_results['summary']['best_model']
    print(f"\n🏆 Best Model: {best_model['model_name']}")
    print(f"   R² Score: {best_model['performance_metrics']['test_r2_mean']:.4f}")
    print(f"   Performance: {best_model['classifications']['performance']}")
    print(f"   Overfitting: {best_model['classifications']['overfitting']}")
    
    # Recommendations
    print(f"\n📋 Recommendations ({len(recommendations)} total):")
    high_priority = [r for r in recommendations if r['priority'] == 'HIGH']
    if high_priority:
        print(f"   🔴 High Priority ({len(high_priority)}):")
        for rec in high_priority:
            print(f"      - {rec['recommendation']}")
    
    medium_priority = [r for r in recommendations if r['priority'] == 'MEDIUM']
    if medium_priority:
        print(f"   🟡 Medium Priority ({len(medium_priority)}):")
        for rec in medium_priority:
            print(f"      - {rec['recommendation']}")
    
    print(f"\n📊 Results saved to: {results_path}")
    print("\n" + "=" * 80)
    print("✅ Comprehensive evaluation completed!")
    print("=" * 80)

if __name__ == "__main__":
    main()

