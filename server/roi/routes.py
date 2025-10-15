from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import json

from ..services.roiService import get_roi_service

# Create router
router = APIRouter(prefix="/api/roi", tags=["ROI Analysis"])

# Pydantic models for request/response
class PropertyData(BaseModel):
    city: str
    location: str
    property_type: str
    bedrooms: int
    bathrooms: int
    area_marla: float
    year_built: Optional[int] = None
    purchase_price: Optional[float] = None
    monthly_maintenance: Optional[float] = 0
    property_tax: Optional[float] = 0
    analysis_years: Optional[int] = 5

class RentalPredictionRequest(BaseModel):
    property_data: PropertyData

class ROIAnalysisRequest(BaseModel):
    property_data: PropertyData

class RentalPredictionResponse(BaseModel):
    predicted_rent: float
    rent_range: Dict[str, float]
    confidence: float
    model_used: str
    error: Optional[str] = None

class PropertyValueResponse(BaseModel):
    predicted_value: float
    value_range: Dict[str, float]
    confidence: float
    model_used: str
    error: Optional[str] = None

class ROIAnalysisResponse(BaseModel):
    rental_prediction: RentalPredictionResponse
    value_prediction: PropertyValueResponse
    roi_analysis: Dict[str, Any]
    investment_grade: Dict[str, Any]
    insights: List[str]
    market_insights: Dict[str, Any]
    analysis_timestamp: str
    error: Optional[str] = None

class ModelStatusResponse(BaseModel):
    rental_model: Dict[str, Any]
    value_model: Dict[str, Any]
    roi_calculator: Dict[str, Any]
    service_initialized: bool

class TrainingResponse(BaseModel):
    rental_model: Dict[str, Any]
    value_model: Dict[str, Any]
    overall: Dict[str, Any]
    error: Optional[str] = None

# Initialize ROI service
roi_service = get_roi_service()

@router.on_event("startup")
async def startup_event():
    """Initialize ROI service on startup"""
    print("Initializing ROI service...")
    roi_service.initialize_models()
    print("ROI service initialized")

@router.get("/status", response_model=ModelStatusResponse)
async def get_model_status():
    """Get the status of all ROI models"""
    try:
        status = roi_service.get_model_status()
        return ModelStatusResponse(**status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting model status: {str(e)}")

@router.post("/predict-rental", response_model=RentalPredictionResponse)
async def predict_rental_income(request: RentalPredictionRequest):
    """Predict rental income for a property"""
    try:
        property_data = request.property_data.dict()
        prediction = roi_service.predict_rental_income(property_data)
        
        return RentalPredictionResponse(**prediction)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error predicting rental income: {str(e)}")

@router.post("/predict-value", response_model=PropertyValueResponse)
async def predict_property_value(request: RentalPredictionRequest):
    """Predict property value for a property"""
    try:
        property_data = request.property_data.dict()
        prediction = roi_service.predict_property_value(property_data)
        
        return PropertyValueResponse(**prediction)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error predicting property value: {str(e)}")

@router.post("/analyze", response_model=ROIAnalysisResponse)
async def analyze_roi(request: ROIAnalysisRequest):
    """Perform comprehensive ROI analysis"""
    try:
        property_data = request.property_data.dict()
        analysis = roi_service.calculate_comprehensive_roi(property_data)
        
        if 'error' in analysis:
            raise HTTPException(status_code=500, detail=analysis['error'])
        
        return ROIAnalysisResponse(**analysis)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing ROI: {str(e)}")

@router.get("/market-insights/{city}")
async def get_market_insights(city: str):
    """Get market insights for a specific city"""
    try:
        property_data = {'city': city}
        insights = roi_service.get_market_insights(property_data)
        return insights
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting market insights: {str(e)}")

@router.get("/comparable-properties")
async def get_comparable_properties(
    city: str,
    area_marla: float,
    bedrooms: int,
    bathrooms: int = 2
):
    """Get comparable properties for market comparison"""
    try:
        property_data = {
            'city': city,
            'area_marla': area_marla,
            'bedrooms': bedrooms,
            'bathrooms': bathrooms
        }
        comparables = roi_service.get_comparable_properties(property_data)
        return comparables
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting comparable properties: {str(e)}")

@router.post("/train-models", response_model=TrainingResponse)
async def train_models(background_tasks: BackgroundTasks):
    """Train all ROI models"""
    try:
        # Run training in background
        def run_training():
            return roi_service.train_all_models()
        
        # For now, run synchronously (in production, use background tasks)
        results = run_training()
        
        return TrainingResponse(**results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error training models: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check endpoint for ROI service"""
    try:
        status = roi_service.get_model_status()
        return {
            "status": "healthy",
            "service_initialized": status['service_initialized'],
            "models_ready": status['rental_model']['is_trained'] or status['value_model']['is_trained']
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

# Additional utility endpoints
@router.get("/cities")
async def get_supported_cities():
    """Get list of supported cities"""
    return {
        "cities": [
            "Islamabad",
            "Karachi", 
            "Lahore",
            "Rawalpindi",
            "Faisalabad"
        ]
    }

@router.get("/property-types")
async def get_property_types():
    """Get list of supported property types"""
    return {
        "property_types": [
            "House",
            "Flat",
            "Penthouse",
            "Lower Portion",
            "Upper Portion"
        ]
    }

@router.get("/market-rates")
async def get_market_rates():
    """Get current market rates used in calculations"""
    try:
        status = roi_service.get_model_status()
        return status['roi_calculator']['market_rates']
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting market rates: {str(e)}")
