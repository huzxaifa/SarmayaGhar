#!/usr/bin/env python3
"""
ROI Models Training Script
Trains both rental income and property value prediction models
"""

import sys
import os
import pandas as pd
import numpy as np
from pathlib import Path

# Add the server directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'server'))
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

def train_rental_model():
    """Train the rental income prediction model"""
    print("=" * 60)
    print("TRAINING RENTAL INCOME PREDICTION MODEL")
    print("=" * 60)
    
    try:
        from server.roi.models.rentalPredictor import train_rental_model
        predictor = train_rental_model()
        
        if predictor:
            print("✅ Rental income model trained successfully!")
            return True
        else:
            print("❌ Rental income model training failed!")
            return False
            
    except Exception as e:
        print(f"❌ Error training rental model: {str(e)}")
        return False

def train_property_value_model():
    """Train the property value prediction model"""
    print("=" * 60)
    print("TRAINING PROPERTY VALUE PREDICTION MODEL")
    print("=" * 60)
    
    try:
        from server.roi.models.propertyValuePredictor import train_property_value_model
        predictor = train_property_value_model()
        
        if predictor:
            print("✅ Property value model trained successfully!")
            return True
        else:
            print("❌ Property value model training failed!")
            return False
            
    except Exception as e:
        print(f"❌ Error training property value model: {str(e)}")
        return False

def test_roi_calculator():
    """Test the ROI calculator"""
    print("=" * 60)
    print("TESTING ROI CALCULATOR")
    print("=" * 60)
    
    try:
        from server.roi.utils.roiCalculator import ROICalculator
        
        calculator = ROICalculator()
        
        # Test data
        monthly_rent = 50000
        property_value = 5000000
        monthly_maintenance = 5000
        
        # Calculate comprehensive ROI
        roi_analysis = calculator.calculate_comprehensive_roi(
            monthly_rent, property_value, monthly_maintenance, 5
        )
        
        print(f"✅ ROI Calculator test successful!")
        print(f"   Annual ROI: {roi_analysis['current_metrics']['annual_roi']:.2f}%")
        print(f"   Cap Rate: {roi_analysis['current_metrics']['cap_rate']:.2f}%")
        print(f"   IRR: {roi_analysis['investment_metrics']['irr']:.2f}%")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing ROI calculator: {str(e)}")
        return False

def test_roi_service():
    """Test the ROI service integration"""
    print("=" * 60)
    print("TESTING ROI SERVICE INTEGRATION")
    print("=" * 60)
    
    try:
        from server.roi.services.roiService import ROIService
        
        service = ROIService()
        
        # Test property data
        property_data = {
            'city': 'Islamabad',
            'location': 'DHA Phase 5',
            'property_type': 'House',
            'bedrooms': 4,
            'bathrooms': 3,
            'area_marla': 10,
            'year_built': 2020,
            'purchase_price': 8000000,
            'monthly_maintenance': 5000,
            'analysis_years': 5
        }
        
        # Test comprehensive ROI analysis
        analysis = service.calculate_comprehensive_roi(property_data)
        
        if 'error' not in analysis:
            print("✅ ROI Service integration test successful!")
            print(f"   Predicted Rent: {analysis['rental_prediction']['predicted_rent']:.0f}")
            print(f"   Predicted Value: {analysis['value_prediction']['predicted_value']:.0f}")
            print(f"   Investment Grade: {analysis['investment_grade']['grade']}")
            return True
        else:
            print(f"❌ ROI Service test failed: {analysis['error']}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing ROI service: {str(e)}")
        return False

def check_data_files():
    """Check if required data files exist"""
    print("=" * 60)
    print("CHECKING DATA FILES")
    print("=" * 60)
    
    required_files = [
        'ml_training/property_data.csv',
        'ml_training/Property.csv'
    ]
    
    all_exist = True
    for file_path in required_files:
        if os.path.exists(file_path):
            print(f"✅ {file_path} - Found")
        else:
            print(f"❌ {file_path} - Missing")
            all_exist = False
    
    return all_exist

def main():
    """Main training function"""
    print("🚀 STARTING ROI MODELS TRAINING")
    print("=" * 60)
    
    # Check data files
    if not check_data_files():
        print("\n❌ Required data files are missing!")
        print("Please ensure the following files exist:")
        print("- ml_training/property_data.csv")
        print("- ml_training/Property.csv")
        return False
    
    # Train models
    results = {
        'rental_model': train_rental_model(),
        'property_value_model': train_property_value_model(),
        'roi_calculator': test_roi_calculator(),
        'roi_service': test_roi_service()
    }
    
    # Summary
    print("\n" + "=" * 60)
    print("TRAINING SUMMARY")
    print("=" * 60)
    
    success_count = sum(results.values())
    total_tests = len(results)
    
    for test_name, success in results.items():
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    print(f"\nOverall: {success_count}/{total_tests} tests passed")
    
    if success_count == total_tests:
        print("\n🎉 All ROI models trained successfully!")
        print("The ROI system is ready for use.")
        return True
    else:
        print(f"\n⚠️  {total_tests - success_count} tests failed.")
        print("Please check the error messages above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
