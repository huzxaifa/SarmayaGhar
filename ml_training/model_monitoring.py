#!/usr/bin/env python3
"""
Model Performance Monitoring Dashboard
Regular monitoring of model performance, bias, and data quality
"""

import pandas as pd
import numpy as np
import json
import os
from datetime import datetime, timedelta
from sklearn.model_selection import cross_val_score
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import warnings
warnings.filterwarnings('ignore')

class ModelMonitor:
    def __init__(self):
        self.monitoring_dir = "trained_models/monitoring"
        os.makedirs(self.monitoring_dir, exist_ok=True)
        
    def load_data(self):
        """Load and prepare data for monitoring"""
        try:
            data = pd.read_csv("attached_assets/zameen-updated.csv")
            data = data[data['purpose'] == 'For Sale'].copy()
            data = data.dropna(subset=['price', 'location', 'property_type', 'city', 'area_size'])
            return data
        except Exception as e:
            print(f"❌ Error loading data: {e}")
            return None
    
    def check_data_quality(self, data):
        """Check data quality metrics"""
        print("🔍 Checking Data Quality...")
        
        quality_metrics = {
            'total_samples': len(data),
            'missing_values': data.isnull().sum().to_dict(),
            'duplicate_rows': data.duplicated().sum(),
            'outlier_percentage': 0,
            'data_freshness': 'Unknown'
        }
        
        # Check outliers in price
        Q1 = data['price'].quantile(0.25)
        Q3 = data['price'].quantile(0.75)
        IQR = Q3 - Q1
        outliers = data[(data['price'] < Q1 - 1.5*IQR) | (data['price'] > Q3 + 1.5*IQR)]
        quality_metrics['outlier_percentage'] = (len(outliers) / len(data)) * 100
        
        # Check data freshness (if date_added exists)
        if 'date_added' in data.columns:
            try:
                data['date_added'] = pd.to_datetime(data['date_added'], errors='coerce')
                latest_date = data['date_added'].max()
                days_old = (datetime.now() - latest_date).days
                quality_metrics['data_freshness'] = f"{days_old} days old"
            except:
                quality_metrics['data_freshness'] = "Unknown"
        
        print(f"   📊 Total Samples: {quality_metrics['total_samples']:,}")
        print(f"   🔄 Duplicate Rows: {quality_metrics['duplicate_rows']:,}")
        print(f"   📈 Outlier Percentage: {quality_metrics['outlier_percentage']:.2f}%")
        print(f"   📅 Data Freshness: {quality_metrics['data_freshness']}")
        
        return quality_metrics
    
    def check_model_performance(self, data):
        """Check current model performance"""
        print("\n🎯 Checking Model Performance...")
        
        # Feature engineering
        encoders = {}
        categorical_cols = ['location', 'property_type', 'city', 'province_name']
        
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
        
        # Test model performance
        model = RandomForestRegressor(n_estimators=50, random_state=42, n_jobs=-1)
        scores = cross_val_score(model, X, y, cv=5, scoring='r2')
        
        performance_metrics = {
            'r2_mean': float(scores.mean()),
            'r2_std': float(scores.std()),
            'performance_status': 'EXCELLENT' if scores.mean() > 0.95 else 'GOOD' if scores.mean() > 0.85 else 'POOR'
        }
        
        print(f"   📈 R² Score: {scores.mean():.4f} ± {scores.std():.4f}")
        print(f"   🎯 Status: {performance_metrics['performance_status']}")
        
        return performance_metrics
    
    def check_bias_quick(self, data):
        """Quick bias check across demographics"""
        print("\n⚖️  Checking Bias...")
        
        # Feature engineering (simplified)
        encoders = {}
        categorical_cols = ['location', 'property_type', 'city']
        
        for col in categorical_cols:
            if col in data.columns:
                encoders[col] = LabelEncoder()
                data[f'{col}_encoded'] = encoders[col].fit_transform(data[col].astype(str))
        
        data['baths'] = pd.to_numeric(data['baths'], errors='coerce').fillna(1)
        data['bedrooms'] = pd.to_numeric(data['bedrooms'], errors='coerce').fillna(2)
        data['area_size'] = pd.to_numeric(data['area_size'], errors='coerce')
        data['area_size'] = data['area_size'].replace(0, np.nan).fillna(data['area_size'].median())
        data['price_per_unit'] = data['price'] / data['area_size']
        
        feature_columns = [
            'location_encoded', 'property_type_encoded', 'city_encoded',
            'area_size', 'baths', 'bedrooms', 'price_per_unit'
        ]
        
        feature_columns = [col for col in feature_columns if col in data.columns]
        X = data[feature_columns].fillna(data[feature_columns].mean())
        y = data['price']
        
        model = RandomForestRegressor(n_estimators=30, random_state=42, n_jobs=-1)
        
        # Global performance
        global_scores = cross_val_score(model, X, y, cv=3, scoring='r2')
        global_r2 = global_scores.mean()
        
        bias_issues = []
        
        # Check city bias
        for city in data['city'].unique():
            if pd.isna(city) or city == '':
                continue
            
            city_data = data[data['city'] == city]
            if len(city_data) < 20:
                continue
            
            try:
                city_X = city_data[feature_columns].fillna(X.mean())
                city_y = city_data['price']
                city_scores = cross_val_score(model, city_X, city_y, cv=3, scoring='r2')
                city_r2 = city_scores.mean()
                
                bias_score = global_r2 - city_r2
                if abs(bias_score) > 0.15:  # Significant bias
                    bias_issues.append(f"City bias in {city}: {bias_score:+.3f}")
                    
            except:
                continue
        
        # Check property type bias
        for prop_type in data['property_type'].unique():
            if pd.isna(prop_type) or prop_type == '':
                continue
            
            prop_data = data[data['property_type'] == prop_type]
            if len(prop_data) < 20:
                continue
            
            try:
                prop_X = prop_data[feature_columns].fillna(X.mean())
                prop_y = prop_data['price']
                prop_scores = cross_val_score(model, prop_X, prop_y, cv=3, scoring='r2')
                prop_r2 = prop_scores.mean()
                
                bias_score = global_r2 - prop_r2
                if abs(bias_score) > 0.15:  # Significant bias
                    bias_issues.append(f"Property type bias in {prop_type}: {bias_score:+.3f}")
                    
            except:
                continue
        
        bias_metrics = {
            'global_r2': float(global_r2),
            'bias_issues_count': len(bias_issues),
            'bias_issues': bias_issues,
            'bias_status': 'HIGH' if len(bias_issues) > 3 else 'MODERATE' if len(bias_issues) > 1 else 'LOW'
        }
        
        print(f"   🌍 Global R²: {global_r2:.4f}")
        print(f"   ⚠️  Bias Issues: {len(bias_issues)}")
        print(f"   📊 Bias Status: {bias_metrics['bias_status']}")
        
        if bias_issues:
            print("   🚨 Detected Bias Issues:")
            for issue in bias_issues[:5]:  # Show first 5 issues
                print(f"      - {issue}")
        
        return bias_metrics
    
    def generate_alerts(self, quality_metrics, performance_metrics, bias_metrics):
        """Generate alerts based on monitoring results"""
        alerts = []
        
        # Data quality alerts
        if quality_metrics['outlier_percentage'] > 10:
            alerts.append({
                'type': 'DATA_QUALITY',
                'severity': 'HIGH',
                'message': f"High outlier percentage: {quality_metrics['outlier_percentage']:.1f}%"
            })
        
        if quality_metrics['duplicate_rows'] > 100:
            alerts.append({
                'type': 'DATA_QUALITY',
                'severity': 'MEDIUM',
                'message': f"High duplicate rows: {quality_metrics['duplicate_rows']}"
            })
        
        # Performance alerts
        if performance_metrics['performance_status'] == 'POOR':
            alerts.append({
                'type': 'PERFORMANCE',
                'severity': 'HIGH',
                'message': f"Poor model performance: R² = {performance_metrics['r2_mean']:.3f}"
            })
        
        # Bias alerts
        if bias_metrics['bias_status'] == 'HIGH':
            alerts.append({
                'type': 'BIAS',
                'severity': 'HIGH',
                'message': f"High bias detected: {bias_metrics['bias_issues_count']} issues"
            })
        elif bias_metrics['bias_status'] == 'MODERATE':
            alerts.append({
                'type': 'BIAS',
                'severity': 'MEDIUM',
                'message': f"Moderate bias detected: {bias_metrics['bias_issues_count']} issues"
            })
        
        return alerts
    
    def save_monitoring_report(self, quality_metrics, performance_metrics, bias_metrics, alerts):
        """Save monitoring report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'data_quality': quality_metrics,
            'model_performance': performance_metrics,
            'bias_analysis': bias_metrics,
            'alerts': alerts,
            'overall_status': 'HEALTHY' if not alerts else 'NEEDS_ATTENTION'
        }
        
        # Save current report
        report_path = os.path.join(self.monitoring_dir, f"monitoring_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Save latest report
        latest_path = os.path.join(self.monitoring_dir, "latest_monitoring_report.json")
        with open(latest_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        return report
    
    def run_monitoring(self):
        """Run complete monitoring check"""
        print("=" * 80)
        print(" " * 25 + "MODEL MONITORING DASHBOARD")
        print("=" * 80)
        
        # Load data
        data = self.load_data()
        if data is None:
            return
        
        # Run checks
        quality_metrics = self.check_data_quality(data)
        performance_metrics = self.check_model_performance(data)
        bias_metrics = self.check_bias_quick(data)
        
        # Generate alerts
        alerts = self.generate_alerts(quality_metrics, performance_metrics, bias_metrics)
        
        # Save report
        report = self.save_monitoring_report(quality_metrics, performance_metrics, bias_metrics, alerts)
        
        # Print summary
        print("\n" + "=" * 80)
        print(" " * 30 + "MONITORING SUMMARY")
        print("=" * 80)
        
        print(f"\n📊 Overall Status: {report['overall_status']}")
        print(f"🔍 Data Quality: {quality_metrics['total_samples']:,} samples")
        print(f"🎯 Model Performance: {performance_metrics['performance_status']}")
        print(f"⚖️  Bias Status: {bias_metrics['bias_status']}")
        
        if alerts:
            print(f"\n🚨 Alerts ({len(alerts)}):")
            for alert in alerts:
                severity_icon = "🔴" if alert['severity'] == 'HIGH' else "🟡" if alert['severity'] == 'MEDIUM' else "🟢"
                print(f"   {severity_icon} {alert['type']}: {alert['message']}")
        else:
            print("\n✅ No alerts - System is healthy!")
        
        print(f"\n📄 Report saved to: {self.monitoring_dir}/")
        
        return report

if __name__ == "__main__":
    monitor = ModelMonitor()
    monitor.run_monitoring()

