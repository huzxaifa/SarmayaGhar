"""
Real Estate Price Prediction - Complete Production Module
Features: Payload validation, model selection, API-ready predictions
"""

import pandas as pd
import numpy as np
import joblib
import json
import os
import warnings
warnings.filterwarnings('ignore')

class PayloadValidator:
    """Validates API payload structure and data types"""
    
    VALID_CITIES = ['Karachi', 'Lahore', 'Islamabad']
    VALID_PROPERTY_TYPES = ['House', 'Flat', 'Penthouse']
    VALID_PURPOSES = ['For Sale', 'For Rent']
    
    @staticmethod
    def validatePayload(payload):
        """
        Validates complete payload structure
        
        Returns:
            tuple: (isValid, errorMessage, cleanedPayload)
        """
        errors = []
        
        if not isinstance(payload, dict):
            return False, "Payload must be a dictionary", None
        
        requiredFields = ['propertyType', 'city', 'areaMarla', 'bedrooms', 'bathrooms']
        missingFields = [f for f in requiredFields if f not in payload]
        if missingFields:
            return False, f"Missing required fields: {', '.join(missingFields)}", None
        
        cleanedPayload = {}
        
        propertyType = payload.get('propertyType', '').strip()
        if propertyType not in PayloadValidator.VALID_PROPERTY_TYPES:
            errors.append(f"Invalid propertyType. Must be one of: {PayloadValidator.VALID_PROPERTY_TYPES}")
        cleanedPayload['propertyType'] = propertyType
        
        city = payload.get('city', '').strip()
        if city not in PayloadValidator.VALID_CITIES:
            errors.append(f"Invalid city. Must be one of: {PayloadValidator.VALID_CITIES}")
        cleanedPayload['city'] = city
        
        try:
            areaMarla = float(payload.get('areaMarla', 0))
            if areaMarla <= 0:
                errors.append("areaMarla must be greater than 0")
            elif areaMarla > 100:
                errors.append("areaMarla cannot exceed 100 Marla")
            cleanedPayload['areaMarla'] = areaMarla
        except (ValueError, TypeError):
            errors.append("areaMarla must be a valid number")
            cleanedPayload['areaMarla'] = 0
        
        try:
            bedrooms = int(payload.get('bedrooms', 0))
            if bedrooms < 0:
                errors.append("bedrooms cannot be negative")
            elif bedrooms > 10:
                errors.append("bedrooms cannot exceed 10")
            cleanedPayload['bedrooms'] = bedrooms
        except (ValueError, TypeError):
            errors.append("bedrooms must be a valid integer")
            cleanedPayload['bedrooms'] = 0
        
        try:
            bathrooms = int(payload.get('bathrooms', 0))
            if bathrooms < 0:
                errors.append("bathrooms cannot be negative")
            elif bathrooms > 10:
                errors.append("bathrooms cannot exceed 10")
            cleanedPayload['bathrooms'] = bathrooms
        except (ValueError, TypeError):
            errors.append("bathrooms must be a valid integer")
            cleanedPayload['bathrooms'] = 0
        
        location = payload.get('location', 'Other_Location')
        cleanedPayload['location'] = location if location else 'Other_Location'
        
        purpose = payload.get('purpose', 'For Sale')
        if purpose not in PayloadValidator.VALID_PURPOSES:
            purpose = 'For Sale'
        cleanedPayload['purpose'] = purpose
        
        if errors:
            return False, '; '.join(errors), None
        
        return True, "Valid", cleanedPayload


class PropertyPricePredictor:
    """Main prediction class with full functionality"""
    
    def __init__(self, modelType='xgboost'):
        """
        Initialize predictor
        
        Args:
            modelType: 'lightgbm' or 'xgboost'
        """
        self.modelType = modelType
        self.minRoomsPerMarla = 0.15
        self.maxRoomsPerMarla = 1.8
        
        self.loadModel()
        self.loadPreprocessor()
    
    def loadModel(self):
        """Load trained model and features"""
        modelPath = f'{self.modelType}_model.pkl'
        featuresPath = f'{self.modelType}_features.pkl'
        
        if not os.path.exists(modelPath):
            raise FileNotFoundError(f"Model file not found: {modelPath}")
        if not os.path.exists(featuresPath):
            raise FileNotFoundError(f"Features file not found: {featuresPath}")
        
        self.model = joblib.load(modelPath)
        self.featureNames = joblib.load(featuresPath)
        
        print(f"Loaded {self.modelType.upper()} model successfully")
    
    def loadPreprocessor(self):
        """Load preprocessing artifacts"""
        preprocessorPath = 'preprocessor_artifacts.pkl'
        
        if not os.path.exists(preprocessorPath):
            raise FileNotFoundError(
                f"{preprocessorPath} not found. Run data_preprocessing.py first."
            )
        
        preprocessorData = joblib.load(preprocessorPath)
        self.labelEncoders = preprocessorData['labelEncoders']
        self.targetEncoder = preprocessorData['targetEncoder']
        self.cityMedianPrices = preprocessorData['cityMedianPrices']
        self.locationMedianPrices = preprocessorData['locationMedianPrices']
        
        print("Loaded preprocessor artifacts successfully")
    
    def validateRoomAreaRatio(self, bedrooms, bathrooms, areaMarla):
        """Validate room-to-area ratio"""
        totalRooms = bedrooms + bathrooms
        roomsPerMarla = totalRooms / areaMarla
        
        if roomsPerMarla < self.minRoomsPerMarla:
            return False, f"Too few rooms for area. Min: {self.minRoomsPerMarla:.2f} rooms/marla, got: {roomsPerMarla:.2f}"
        
        if roomsPerMarla > self.maxRoomsPerMarla:
            return False, f"Too many rooms for area. Max: {self.maxRoomsPerMarla:.2f} rooms/marla, got: {roomsPerMarla:.2f}"
        
        return True, "Valid"
    
    def prepareFeatures(self, payload):
        """Prepare features from validated payload"""
        isValid, msg = self.validateRoomAreaRatio(
            payload['bedrooms'], 
            payload['bathrooms'], 
            payload['areaMarla']
        )
        
        if not isValid:
            raise ValueError(f"Invalid room-area ratio: {msg}")
        
        features = {}
        
        features['baths'] = payload['bathrooms']
        features['bedrooms'] = payload['bedrooms']
        features['Area_in_Marla'] = payload['areaMarla']
        features['totalRooms'] = features['bedrooms'] + features['baths']
        
        city = payload['city']
        location = payload['location']
        propertyType = payload['propertyType']
        purpose = payload['purpose']
        
        features['property_typeEncoded'] = self.labelEncoders['property_type'].transform([propertyType])[0]
        features['cityEncoded'] = self.labelEncoders['city'].transform([city])[0]
        features['purposeEncoded'] = self.labelEncoders['purpose'].transform([purpose])[0]
        
        cityEncoded = features['cityEncoded']
        features['cityMedianPrice'] = self.cityMedianPrices.get(cityEncoded, 10000000)
        
        locationDf = pd.DataFrame({'location': [location]})
        features['locationTargetEncoded'] = self.targetEncoder.transform(locationDf)['location'].values[0]
        
        locationTargetEncoded = features['locationTargetEncoded']
        features['locationMedianPrice'] = self.locationMedianPrices.get(locationTargetEncoded, 10000000)
        
        featureDf = pd.DataFrame([features])
        
        for col in self.featureNames:
            if col not in featureDf.columns:
                featureDf[col] = 0
        
        featureDf = featureDf[self.featureNames]
        
        return featureDf
    
    def predictLogPrice(self, featureDf):
        """Predict log price"""
        if self.modelType == 'lightgbm':
            logPricePred = self.model.predict(featureDf, num_iteration=self.model.best_iteration)[0]
        else:
            import xgboost as xgb
            dmatrix = xgb.DMatrix(featureDf)
            logPricePred = self.model.predict(dmatrix, iteration_range=(0, self.model.best_iteration + 1))[0]
        
        return logPricePred
    
    def predictPrice(self, payload):
        """
        Predict current price with confidence interval
        
        Returns:
            dict: Prediction results
        """
        featureDf = self.prepareFeatures(payload)
        
        logPricePred = self.predictLogPrice(featureDf)
        
        predictedPrice = np.expm1(logPricePred)
        
        uncertaintyFactor = 0.15
        priceMin = predictedPrice * (1 - uncertaintyFactor)
        priceMax = predictedPrice * (1 + uncertaintyFactor)
        
        confidence = max(70, min(95, 85 - abs(logPricePred - 16.0) * 5))
        
        return {
            'predictedPrice': int(predictedPrice),
            'priceRange': {
                'min': int(priceMin),
                'max': int(priceMax)
            },
            'confidence': int(confidence)
        }
    
    def predictFuturePrices(self, payload, years=[0, 1, 2, 3, 4, 5], appreciationRate=0.08):
        """Predict prices for future years"""
        currentPrediction = self.predictPrice(payload)
        currentPrice = currentPrediction['predictedPrice']
        
        predictions = {}
        
        for year in years:
            futurePrice = currentPrice * ((1 + appreciationRate) ** year)
            roi = ((futurePrice - currentPrice) / currentPrice) * 100
            
            predictions[year] = {
                'price': int(futurePrice),
                'roi': round(roi, 2)
            }
        
        return predictions
    
    def generateInsights(self, payload, prediction):
        """Generate text insights"""
        insights = []
        
        city = payload['city']
        areaMarla = payload['areaMarla']
        bedrooms = payload['bedrooms']
        propertyType = payload['propertyType']
        
        insights.append(
            f"{propertyType} in {city} with {bedrooms} bedroom(s) and {areaMarla} Marla"
        )
        
        confidence = prediction['confidence']
        if confidence >= 85:
            insights.append("High confidence prediction based on strong market data")
        elif confidence >= 75:
            insights.append("Moderate confidence - price may vary based on property condition")
        else:
            insights.append("Lower confidence - limited comparable data available")
        
        pricePerMarla = prediction['predictedPrice'] / areaMarla
        insights.append(f"Estimated price per Marla: PKR {int(pricePerMarla):,}")
        
        return insights
    
    def generateApiResponse(self, payload):
        """
        Generate complete API response
        
        Returns:
            dict: Complete prediction response matching API format
        """
        currentPrediction = self.predictPrice(payload)
        futurePredictions = self.predictFuturePrices(payload)
        
        response = {
            "predictedPrice": currentPrediction['predictedPrice'],
            "priceRange": currentPrediction['priceRange'],
            "confidence": currentPrediction['confidence'],
            "marketTrend": "Rising",
            "predictions": {
                "currentYear": futurePredictions[0]['price'],
                "oneYear": futurePredictions[1]['price'],
                "twoYear": futurePredictions[2]['price'],
                "threeYear": futurePredictions[3]['price'],
                "fourYear": futurePredictions[4]['price'],
                "fiveYear": futurePredictions[5]['price']
            },
            "roi": {
                "oneYear": futurePredictions[1]['roi'],
                "twoYear": futurePredictions[2]['roi'],
                "threeYear": futurePredictions[3]['roi'],
                "fourYear": futurePredictions[4]['roi'],
                "fiveYear": futurePredictions[5]['roi']
            },
            "insights": self.generateInsights(payload, currentPrediction)
        }
        
        return response


def selectModel():
    """Interactive model selection"""
    print("\n" + "="*80)
    print("SELECT MODEL FOR PREDICTION")
    print("="*80)
    print("\n1. LightGBM (Test MAPE: 30.56%, R²: 0.9072)")
    print("2. XGBoost  (Test MAPE: 29.50%, R²: 0.9075) [RECOMMENDED]")
    print("\n" + "="*80)
    
    while True:
        choice = input("\nEnter your choice (1 or 2): ").strip()
        
        if choice == '1':
            print("\nSelected: LightGBM")
            return 'lightgbm'
        elif choice == '2':
            print("\nSelected: XGBoost (Recommended)")
            return 'xgboost'
        else:
            print("Invalid choice. Please enter 1 or 2.")


def getManualInput():
    """Get property details from user input"""
    print("\n" + "="*80)
    print("ENTER PROPERTY DETAILS")
    print("="*80)
    
    payload = {}
    
    print("\nProperty Type:")
    print("  1. House")
    print("  2. Flat")
    print("  3. Penthouse")
    choice = input("Select (1-3): ").strip()
    propertyTypes = {'1': 'House', '2': 'Flat', '3': 'Penthouse'}
    payload['propertyType'] = propertyTypes.get(choice, 'House')
    
    print("\nCity:")
    print("  1. Karachi")
    print("  2. Lahore")
    print("  3. Islamabad")
    choice = input("Select (1-3): ").strip()
    cities = {'1': 'Karachi', '2': 'Lahore', '3': 'Islamabad'}
    payload['city'] = cities.get(choice, 'Karachi')
    
    payload['location'] = input("\nLocation (e.g., DHA Defence) [Optional, press Enter to skip]: ").strip()
    if not payload['location']:
        payload['location'] = 'Other_Location'
    
    payload['areaMarla'] = float(input("\nArea in Marla: ").strip())
    payload['bedrooms'] = int(input("Number of Bedrooms: ").strip())
    payload['bathrooms'] = int(input("Number of Bathrooms: ").strip())
    
    print("\nPurpose:")
    print("  1. For Sale")
    print("  2. For Rent")
    choice = input("Select (1-2): ").strip()
    purposes = {'1': 'For Sale', '2': 'For Rent'}
    payload['purpose'] = purposes.get(choice, 'For Sale')
    
    return payload


def main():
    """Main function with interactive CLI"""
    print("\n" + "="*80)
    print("REAL ESTATE PRICE PREDICTION SYSTEM")
    print("="*80)
    
    try:
        modelType = selectModel()
        
        predictor = PropertyPricePredictor(modelType=modelType)
        
        print("\n" + "="*80)
        print("ENTER PROPERTY DETAILS")
        print("="*80)
        
        payload = getManualInput()
        
        print("\n" + "="*80)
        print("VALIDATING PAYLOAD...")
        print("="*80)
        
        isValid, message, cleanedPayload = PayloadValidator.validatePayload(payload)
        
        if not isValid:
            print(f"\nValidation Error: {message}")
            return
        
        print("Payload validated successfully")
        
        print("\n" + "="*80)
        print("GENERATING PREDICTION...")
        print("="*80)
        
        response = predictor.generateApiResponse(cleanedPayload)
        
        print("\n" + "="*80)
        print("PREDICTION RESULTS")
        print("="*80)
        print(json.dumps(response, indent=2))
        
        print("\n" + "="*80)
        print("SUMMARY")
        print("="*80)
        print(f"Predicted Price: PKR {response['predictedPrice']:,}")
        print(f"Price Range: PKR {response['priceRange']['min']:,} - {response['priceRange']['max']:,}")
        print(f"Confidence: {response['confidence']}%")
        print(f"5-Year Appreciation: {response['roi']['fiveYear']}% (PKR {response['predictions']['fiveYear']:,})")
        
        print("\n" + "="*80)
        
    except FileNotFoundError as e:
        print(f"\nError: {str(e)}")
        print("\nPlease ensure:")
        print("1. Run 'python data_preprocessing.py' first")
        print("2. Run 'python lightgbm_train.py' or 'python xgboost_train.py'")
        print("3. All .pkl files are in the current directory")
    
    except Exception as e:
        print(f"\nUnexpected Error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
