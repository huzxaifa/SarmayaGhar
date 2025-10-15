import os
import json
from typing import Dict, List, Any, Optional
from datetime import datetime

from .models.rentalPredictor import RentalIncomePredictor
from .models.propertyValuePredictor import PropertyValuePredictor
from .utils.roiCalculator import ROICalculator

class ROIService:
    """
    ROI Service - Main service that combines rental income prediction,
    property value prediction, and ROI calculations
    """
    
    def __init__(self):
        self.rental_predictor = RentalIncomePredictor()
        self.value_predictor = PropertyValuePredictor()
        self.roi_calculator = ROICalculator()
        self.is_initialized = False
        
    def initialize_models(self) -> bool:
        """Initialize all models by loading trained models"""
        try:
            # Try to load rental income model
            try:
                self.rental_predictor.load_model('trained_models/Rental_Income')
                print("Rental income model loaded successfully")
            except FileNotFoundError:
                print("Rental income model not found - will use fallback")
            
            # Try to load property value model
            try:
                self.value_predictor.load_model('trained_models/Property_Value')
                print("Property value model loaded successfully")
            except FileNotFoundError:
                print("Property value model not found - will use fallback")
            
            self.is_initialized = True
            return True
            
        except Exception as e:
            print(f"Error initializing models: {str(e)}")
            return False
    
    def predict_rental_income(self, property_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict rental income for given property"""
        try:
            if self.rental_predictor.is_trained:
                predicted_rent = self.rental_predictor.predict_rental_income(property_data)
                confidence = 0.85  # Based on model performance
            else:
                # Fallback calculation based on property value
                property_value = property_data.get('purchase_price', 0)
                predicted_rent = property_value * 0.008  # 0.8% of property value
                confidence = 0.60
            
            # Calculate rent range (±20%)
            rent_range = {
                'min': predicted_rent * 0.8,
                'max': predicted_rent * 1.2
            }
            
            return {
                'predicted_rent': predicted_rent,
                'rent_range': rent_range,
                'confidence': confidence,
                'model_used': 'trained' if self.rental_predictor.is_trained else 'fallback'
            }
            
        except Exception as e:
            print(f"Error predicting rental income: {str(e)}")
            # Return fallback prediction
            property_value = property_data.get('purchase_price', 0)
            predicted_rent = property_value * 0.008
            return {
                'predicted_rent': predicted_rent,
                'rent_range': {'min': predicted_rent * 0.8, 'max': predicted_rent * 1.2},
                'confidence': 0.50,
                'model_used': 'fallback',
                'error': str(e)
            }
    
    def predict_property_value(self, property_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict property value for given property"""
        try:
            if self.value_predictor.is_trained:
                predicted_value = self.value_predictor.predict_property_value(property_data)
                confidence = 0.90  # Based on model performance
            else:
                # Fallback calculation based on area and location
                area_marla = property_data.get('area_marla', 0)
                city = property_data.get('city', 'Islamabad')
                
                # Base price per marla by city
                base_prices = {
                    'Islamabad': 800000,
                    'Karachi': 600000,
                    'Lahore': 700000,
                    'Rawalpindi': 500000,
                    'Faisalabad': 400000
                }
                
                base_price = base_prices.get(city, 600000)
                predicted_value = area_marla * base_price
                confidence = 0.70
            
            # Calculate value range (±15%)
            value_range = {
                'min': predicted_value * 0.85,
                'max': predicted_value * 1.15
            }
            
            return {
                'predicted_value': predicted_value,
                'value_range': value_range,
                'confidence': confidence,
                'model_used': 'trained' if self.value_predictor.is_trained else 'fallback'
            }
            
        except Exception as e:
            print(f"Error predicting property value: {str(e)}")
            # Return fallback prediction
            area_marla = property_data.get('area_marla', 0)
            predicted_value = area_marla * 600000  # Default price per marla
            return {
                'predicted_value': predicted_value,
                'value_range': {'min': predicted_value * 0.85, 'max': predicted_value * 1.15},
                'confidence': 0.50,
                'model_used': 'fallback',
                'error': str(e)
            }
    
    def calculate_comprehensive_roi(self, property_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate comprehensive ROI analysis"""
        try:
            # Get rental income prediction
            rental_prediction = self.predict_rental_income(property_data)
            monthly_rent = rental_prediction['predicted_rent']
            
            # Get property value prediction
            value_prediction = self.predict_property_value(property_data)
            property_value = value_prediction['predicted_value']
            
            # Use provided purchase price if available, otherwise use predicted value
            purchase_price = property_data.get('purchase_price', property_value)
            
            # Get additional parameters
            monthly_maintenance = property_data.get('monthly_maintenance', 0)
            years = property_data.get('analysis_years', 5)
            
            # Calculate comprehensive ROI
            roi_analysis = self.roi_calculator.calculate_comprehensive_roi(
                monthly_rent, purchase_price, monthly_maintenance, years
            )
            
            # Get investment grade
            investment_grade = self.roi_calculator.get_investment_grade(roi_analysis)
            
            # Generate insights
            insights = self.roi_calculator.generate_insights(roi_analysis)
            
            # Add market insights
            market_insights = self.get_market_insights(property_data)
            
            return {
                'rental_prediction': rental_prediction,
                'value_prediction': value_prediction,
                'roi_analysis': roi_analysis,
                'investment_grade': investment_grade,
                'insights': insights,
                'market_insights': market_insights,
                'analysis_timestamp': datetime.now().isoformat(),
                'property_data': property_data
            }
            
        except Exception as e:
            print(f"Error calculating comprehensive ROI: {str(e)}")
            return {
                'error': str(e),
                'analysis_timestamp': datetime.now().isoformat()
            }
    
    def get_market_insights(self, property_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get market insights for the property location"""
        city = property_data.get('city', 'Islamabad')
        location = property_data.get('location', '')
        
        # Market insights by city
        city_insights = {
            'Islamabad': {
                'market_trend': 'Stable',
                'demand_level': 'High',
                'occupancy_rate': '85%',
                'avg_rental_yield': '8.5%',
                'growth_potential': 'Medium'
            },
            'Karachi': {
                'market_trend': 'Growing',
                'demand_level': 'Very High',
                'occupancy_rate': '90%',
                'avg_rental_yield': '9.2%',
                'growth_potential': 'High'
            },
            'Lahore': {
                'market_trend': 'Stable',
                'demand_level': 'High',
                'occupancy_rate': '88%',
                'avg_rental_yield': '8.8%',
                'growth_potential': 'Medium'
            },
            'Rawalpindi': {
                'market_trend': 'Growing',
                'demand_level': 'Medium',
                'occupancy_rate': '80%',
                'avg_rental_yield': '7.5%',
                'growth_potential': 'High'
            },
            'Faisalabad': {
                'market_trend': 'Stable',
                'demand_level': 'Medium',
                'occupancy_rate': '75%',
                'avg_rental_yield': '7.0%',
                'growth_potential': 'Medium'
            }
        }
        
        return city_insights.get(city, city_insights['Islamabad'])
    
    def get_comparable_properties(self, property_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get comparable properties for market comparison"""
        # This would typically query a database of properties
        # For now, return mock data based on property characteristics
        
        city = property_data.get('city', 'Islamabad')
        area_marla = property_data.get('area_marla', 5)
        bedrooms = property_data.get('bedrooms', 3)
        
        # Mock comparable properties
        comparables = [
            {
                'location': f'{city} Area 1',
                'area_marla': area_marla + 1,
                'bedrooms': bedrooms,
                'bathrooms': property_data.get('bathrooms', 2),
                'estimated_rent': property_data.get('purchase_price', 5000000) * 0.008 * 1.1,
                'estimated_value': property_data.get('purchase_price', 5000000) * 1.05
            },
            {
                'location': f'{city} Area 2',
                'area_marla': area_marla - 1,
                'bedrooms': bedrooms - 1,
                'bathrooms': property_data.get('bathrooms', 2),
                'estimated_rent': property_data.get('purchase_price', 5000000) * 0.008 * 0.9,
                'estimated_value': property_data.get('purchase_price', 5000000) * 0.95
            },
            {
                'location': f'{city} Area 3',
                'area_marla': area_marla,
                'bedrooms': bedrooms + 1,
                'bathrooms': property_data.get('bathrooms', 2) + 1,
                'estimated_rent': property_data.get('purchase_price', 5000000) * 0.008 * 1.2,
                'estimated_value': property_data.get('purchase_price', 5000000) * 1.1
            }
        ]
        
        return comparables
    
    def get_model_status(self) -> Dict[str, Any]:
        """Get status of all models"""
        return {
            'rental_model': {
                'is_trained': self.rental_predictor.is_trained,
                'info': self.rental_predictor.get_model_info() if self.rental_predictor.is_trained else None
            },
            'value_model': {
                'is_trained': self.value_predictor.is_trained,
                'info': self.value_predictor.get_model_info() if self.value_predictor.is_trained else None
            },
            'roi_calculator': {
                'is_ready': True,
                'market_rates': self.roi_calculator.market_rates
            },
            'service_initialized': self.is_initialized
        }
    
    def train_all_models(self) -> Dict[str, Any]:
        """Train all models using the available data"""
        results = {}
        
        try:
            # Train rental income model
            print("Training rental income model...")
            from .models.rentalPredictor import train_rental_model
            rental_model = train_rental_model()
            results['rental_model'] = {
                'success': rental_model is not None,
                'message': 'Rental model trained successfully' if rental_model else 'Rental model training failed'
            }
            
            # Train property value model
            print("Training property value model...")
            from .models.propertyValuePredictor import train_property_value_model
            value_model = train_property_value_model()
            results['value_model'] = {
                'success': value_model is not None,
                'message': 'Value model trained successfully' if value_model else 'Value model training failed'
            }
            
            # Reinitialize models
            self.initialize_models()
            
            results['overall'] = {
                'success': results['rental_model']['success'] and results['value_model']['success'],
                'message': 'All models trained successfully' if results['rental_model']['success'] and results['value_model']['success'] else 'Some models failed to train'
            }
            
        except Exception as e:
            results['error'] = str(e)
            results['overall'] = {
                'success': False,
                'message': f'Training failed: {str(e)}'
            }
        
        return results

# Global ROI service instance
roi_service = ROIService()

def get_roi_service() -> ROIService:
    """Get the global ROI service instance"""
    return roi_service
