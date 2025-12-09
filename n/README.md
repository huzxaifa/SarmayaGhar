# Real Estate Price Prediction System

**Production-ready ML model for Pakistan real estate price prediction**

---

## 📊 Model Performance

| Model | Test MAPE | Test R² | Status |
|-------|-----------|---------|--------|
| **XGBoost** | **29.50%** | **0.9075** | ✅ **Recommended** |
| LightGBM | 30.56% | 0.9072 | ✅ Alternative |

**Dataset:** 42,054 properties across Karachi, Lahore, and Islamabad

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Preprocess Data
```bash
python data_preprocessing.py
```

### 3. Train Model
```bash
python xgboost_train.py  # Recommended
# or
python lightgbm_train.py
```

### 4. Make Predictions
```bash
python predict.py
```

---

## 📁 Files

**Core Scripts:**
- `data_preprocessing.py` - Data cleaning & feature engineering
- `lightgbm_train.py` - LightGBM model training
- `xgboost_train.py` - XGBoost model training
- `predict.py` - **Interactive prediction interface**

**Generated Files:**
- `preprocessor_artifacts.pkl` - Encoders & statistics
- `xgboost_model.pkl` - Trained model
- `xgboost_features.pkl` - Feature names
- Various `.png` plots (K-Fold, training curves, predictions, feature importance)

---

## 🎯 Predict.py Features

### ✨ Interactive CLI
- Model selection (LightGBM or XGBoost)
- User-friendly numbered menus
- Complete input validation
- Comprehensive output with confidence & ROI

### 🔐 Robust Validation
- Data type checking
- Range validation (bedrooms: 0-10, area: 0.1-100 Marla)
- City/property type verification
- Room-to-area ratio validation (0.15-1.8 rooms/marla)

### 📤 API-Ready Output
```json
{
  "predictedPrice": 15500000,
  "priceRange": {"min": 13175000, "max": 17825000},
  "confidence": 82,
  "predictions": {
    "currentYear": 15500000,
    "oneYear": 16740000,
    ...
  },
  "roi": {...},
  "insights": [...]
}
```

---

## 💻 Programmatic Usage

```python
from predict import PropertyPricePredictor, PayloadValidator

# Validate input
payload = {
    "propertyType": "House",
    "city": "Karachi",
    "areaMarla": 5.5,
    "bedrooms": 3,
    "bathrooms": 2
}

isValid, message, cleaned = PayloadValidator.validatePayload(payload)

# Get prediction
predictor = PropertyPricePredictor(modelType='xgboost')
response = predictor.generateApiResponse(cleaned)
```

---

## 📋 Valid Input Values

| Field | Valid Values | Type | Range |
|-------|--------------|------|-------|
| propertyType | House, Flat, Penthouse | String | - |
| city | Karachi, Lahore, Islamabad | String | - |
| areaMarla | Numeric | Float | 0.1-100 |
| bedrooms | Integer | Int | 0-10 |
| bathrooms | Integer | Int | 0-10 |
| location | Any string | String | Optional |
| purpose | For Sale, For Rent | String | Optional |

**Room-Area Ratio:** Total rooms / Area must be between 0.15 and 1.8

---

## 🔧 Troubleshooting

### Error: "preprocessor_artifacts.pkl not found"
**Solution:** Run `python data_preprocessing.py` first

### Error: "Could not find module lib_lightgbm.dll"
**Solution:** 
```bash
pip install lightgbm xgboost --force-reinstall
```

### Error: "Model file not found"
**Solution:** Train models first:
```bash
python xgboost_train.py
```

---

## 📈 Technical Details

### Features (10)
1. baths, bedrooms, Area_in_Marla, totalRooms
2. cityMedianPrice, locationMedianPrice (engineered)
3. property_typeEncoded, cityEncoded, purposeEncoded (label)
4. locationTargetEncoded (target encoding)

### Preprocessing Pipeline
- City filtering (top 3 cities)
- Property type filtering (House/Flat/Penthouse only)
- Room-area ratio validation (0.15-1.8)
- Outlier removal (0.5% and 99.5% percentiles)
- Location grouping (<20 samples → "Other")
- Dataset balancing (14,215 per city)
- Log transformation on target
- Target encoding for locations

### Model Config
- Train-test split: 80-20 (shuffled)
- Cross-validation: 5-fold stratified
- Early stopping: 50 rounds
- Learning rate: 0.05
- Max depth: 8

---

## 📊 Performance Metrics

**K-Fold Cross-Validation:**
- Mean R²: 0.9827 ± 0.0019
- Mean MAPE: 1.27% ± 0.02% (on log scale)

**Test Set:**
- R²: 0.9075
- MAPE: 29.50%
- RMSE: 3.39M PKR
- MAE: 1.94M PKR

**Inference Speed:**
- Single prediction: <100ms
- Batch (100): ~5 seconds

---

## 🎯 Future Improvements

**To reach 20-25% MAPE:**
- Add yearBuilt, condition, amenities features
- Ensemble LightGBM + XGBoost
- Hyperparameter tuning

**To reach 15-20% MAPE (Industry Standard):**
- Building age/renovation data
- GPS coordinates
- Recent comparable sales
- Amenities scoring
- Market seasonality

---

## 📝 Notes

- **pricePerMarla** was removed (data leakage)
- F1/Accuracy metrics don't apply (regression, not classification)
- 30% MAPE is expected given available features
- Comparable to industry standards without advanced features

---

## 📄 License

Project files for FYP/Production use.

---

