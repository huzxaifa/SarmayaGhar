"""
ROI Module for SarmayaGhar
Comprehensive ROI analysis for Pakistani real estate investments
"""

from .services.roiService import get_roi_service, ROIService
from .models.rentalPredictor import RentalIncomePredictor
from .models.propertyValuePredictor import PropertyValuePredictor
from .utils.roiCalculator import ROICalculator

__version__ = "1.0.0"
__author__ = "SarmayaGhar Team"

# Export main classes
__all__ = [
    'get_roi_service',
    'ROIService', 
    'RentalIncomePredictor',
    'PropertyValuePredictor',
    'ROICalculator'
]
