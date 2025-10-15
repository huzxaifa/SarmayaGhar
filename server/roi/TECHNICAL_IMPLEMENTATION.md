# ROI System - Technical Implementation Guide

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │   Data Layer    │
│   (React)       │◄──►│   (Express.js)   │◄──►│   (JSON/CSV)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   ML Services    │
                    │   (Python/TS)    │
                    └──────────────────┘
```

## Core Components

### 1. Historical Data Analyzer (`server/ml/historicalAnalyzer.ts`)

```typescript
export class HistoricalAnalyzer {
  private growthRates: HistoricalData = {};
  private dataPath: string;

  constructor() {
    this.dataPath = path.join(process.cwd(), 'server', 'data', 'growthRates.json');
    this.loadGrowthRates();
  }

  // Core method to get growth rates for specific location
  getGrowthRates(city: string, location: string, propertyType: string): GrowthRateData | null {
    try {
      const cityData = this.growthRates[city];
      if (!cityData) return null;

      const locationData = cityData[location];
      if (!locationData) return null;

      const propertyData = locationData[propertyType];
      if (!propertyData) return null;

      return propertyData;
    } catch (error) {
      console.error('Error getting growth rates:', error);
      return null;
    }
  }

  // Fallback mechanism for cities without specific location data
  getFallbackGrowthRates(city: string): GrowthRateData {
    const fallbackRates: { [key: string]: GrowthRateData } = {
      'Islamabad': {
        property_appreciation_rate: 18.5,
        rent_growth_rate: 8.2,
        years_analyzed: 2,
        data_points: 0,
        confidence: 0.6,
        method: 'fallback'
      },
      // ... other cities
    };
    return fallbackRates[city] || defaultFallback;
  }
}
```

### 2. Growth Rate Calculator (`server/ml/calculateGrowthRates.py`)

```python
class GrowthRateCalculator:
    def __init__(self):
        self.property_data_path = 'ml_training/Property.csv'
        self.rental_data_path = 'ml_training/property_data.csv'
        self.output_path = 'server/data/growthRates.json'
    
    def load_property_data(self) -> pd.DataFrame:
        """Load and process Property.csv data"""
        df = pd.read_csv(self.property_data_path, sep=';')
        df['date_added'] = pd.to_datetime(df['date_added'], format='%m-%d-%Y', errors='coerce')
        df = df.dropna(subset=['date_added'])
        df['year'] = df['date_added'].dt.year
        df = df[df['year'].isin([2018, 2019])]
        return df
    
    def calculate_property_growth_rates(self, df: pd.DataFrame) -> Dict:
        """Calculate property appreciation rates by location and type"""
        growth_rates = {}
        grouped = df.groupby(['city', 'location', 'property_type', 'year'])['price'].agg(['mean', 'count']).reset_index()
        
        for (city, location, property_type), group in grouped.groupby(['city', 'location', 'property_type']):
            data_2018 = group[group['year'] == 2018]
            data_2019 = group[group['year'] == 2019]
            
            if len(data_2018) > 0 and len(data_2019) > 0:
                avg_price_2018 = data_2018['mean'].iloc[0]
                avg_price_2019 = data_2019['mean'].iloc[0]
                data_points_2018 = data_2018['count'].iloc[0]
                data_points_2019 = data_2019['count'].iloc[0]
                
                # Calculate appreciation rate
                appreciation_rate = ((avg_price_2019 - avg_price_2018) / avg_price_2018) * 100
                
                # Calculate confidence based on data points
                total_points = data_points_2018 + data_points_2019
                confidence = min(0.95, 0.5 + (total_points / 100) * 0.45)
                
                # Store in nested structure
                if city not in growth_rates:
                    growth_rates[city] = {}
                if location not in growth_rates[city]:
                    growth_rates[city][location] = {}
                
                growth_rates[city][location][property_type] = {
                    'property_appreciation_rate': round(appreciation_rate, 2),
                    'rent_growth_rate': 0,  # Will be calculated separately
                    'years_analyzed': 2,
                    'data_points': total_points,
                    'confidence': round(confidence, 3),
                    'avg_price_2018': round(avg_price_2018, 0),
                    'avg_price_2019': round(avg_price_2019, 0),
                    'method': 'historical_analysis'
                }
        
        return growth_rates
```

### 3. ROI API Endpoint (`server/routes.ts`)

```typescript
app.post("/api/roi/analyze", async (req, res) => {
  try {
    const { property_data } = req.body;
    const { city, location, property_type, area_marla, bedrooms, bathrooms } = property_data;

    // Step 1: Get AI property price prediction
    const propertyPriceResponse = await mlService.predictPrice({
      city, location, bedrooms, bathrooms,
      areaMarla: area_marla,
      propertyType: property_type,
      yearBuilt: 2020
    });

    const propertyPrice = propertyPriceResponse.predictedPrice;
    
    // Step 2: Calculate rental income (current formula)
    const monthlyRent = propertyPrice / 100;
    const annualRent = monthlyRent * 12;
    
    // Step 3: Get historical growth rates
    const growthRates = historicalAnalyzer.getGrowthRates(city, location, property_type);
    
    // Step 4: Use historical data or fallback
    const property_appreciation_rate = growthRates?.property_appreciation_rate || 20.0;
    const rent_growth_rate = growthRates?.rent_growth_rate || 10.0;
    const data_confidence = growthRates?.confidence || 0.5;
    
    // Step 5: Calculate ROI metrics
    const annual_maintenance = propertyPrice * 0.0075;
    const net_annual_income = annualRent - annual_maintenance;
    const property_appreciation = propertyPrice * (property_appreciation_rate / 100);
    const total_annual_return = net_annual_income + property_appreciation;
    const annual_roi = (total_annual_return / propertyPrice) * 100;
    
    // Step 6: Build response
    const analysis = {
      ai_predictions: {
        property_price: propertyPrice,
        monthly_rent: monthlyRent,
        price_per_marla: propertyPrice / area_marla,
        confidence: data_confidence,
        method: growthRates ? "historical_analysis" : "ai_ml_models",
        historical_data: growthRates ? {
          property_appreciation_rate,
          rent_growth_rate,
          data_points: growthRates.data_points,
          years_analyzed: growthRates.years_analyzed
        } : null
      },
      current_metrics: {
        annual_roi,
        cap_rate: (annualRent / propertyPrice) * 100,
        cash_flow_positive: net_annual_income > 0
      },
      future_projections: {
        year_1: {
          projected_rent: monthlyRent * (1 + rent_growth_rate / 100),
          projected_value: propertyPrice * (1 + property_appreciation_rate / 100),
          projected_roi: // Calculated using compound growth
        },
        year_5: {
          projected_rent: monthlyRent * Math.pow(1 + rent_growth_rate / 100, 5),
          projected_value: propertyPrice * Math.pow(1 + property_appreciation_rate / 100, 5),
          projected_roi: // Calculated using compound growth
        }
      }
    };

    res.json(analysis);
  } catch (error) {
    console.error("Error analyzing ROI:", error);
    res.status(500).json({ message: "Failed to analyze ROI" });
  }
});
```

## Data Flow

### 1. Historical Data Processing Flow

```
CSV Files → Python Script → JSON Database → TypeScript Service → API Response
```

**Step 1**: Load CSV files
```python
property_df = pd.read_csv('ml_training/Property.csv', sep=';')
rental_df = pd.read_csv('ml_training/property_data.csv')
```

**Step 2**: Process dates and filter
```python
property_df['date_added'] = pd.to_datetime(property_df['date_added'], format='%m-%d-%Y')
property_df = property_df[property_df['year'].isin([2018, 2019])]
```

**Step 3**: Calculate growth rates
```python
grouped = df.groupby(['city', 'location', 'property_type', 'year'])['price'].agg(['mean', 'count'])
appreciation_rate = ((avg_2019 - avg_2018) / avg_2018) * 100
```

**Step 4**: Save to JSON
```python
with open('server/data/growthRates.json', 'w') as f:
    json.dump(growth_rates, f, indent=2)
```

### 2. API Request Flow

```
Frontend Request → Express Router → Historical Analyzer → ML Service → Response
```

**Step 1**: Receive request
```typescript
const { property_data } = req.body;
const { city, location, property_type } = property_data;
```

**Step 2**: Check historical data
```typescript
const growthRates = historicalAnalyzer.getGrowthRates(city, location, property_type);
```

**Step 3**: Get AI prediction
```typescript
const propertyPrice = await mlService.predictPrice(request);
```

**Step 4**: Calculate ROI
```typescript
const annual_roi = (total_annual_return / propertyPrice) * 100;
```

**Step 5**: Return response
```typescript
res.json(analysis);
```

## Error Handling

### 1. Historical Data Not Found
```typescript
// Check if historical data exists
if (!growthRates) {
  // Use fallback rates
  const fallbackRates = historicalAnalyzer.getFallbackGrowthRates(city);
  property_appreciation_rate = fallbackRates.property_appreciation_rate;
  rent_growth_rate = fallbackRates.rent_growth_rate;
  data_confidence = fallbackRates.confidence;
}
```

### 2. ML Model Errors
```typescript
try {
  const propertyPrice = await mlService.predictPrice(request);
} catch (error) {
  console.error("ML prediction failed:", error);
  // Use fallback calculation
  const propertyPrice = calculateFallbackPrice(request);
}
```

### 3. Data Validation
```typescript
// Validate required fields
if (!property_data.city || !property_data.location || !property_data.property_type) {
  return res.status(400).json({ message: "Missing required fields" });
}

// Validate numeric fields
if (isNaN(property_data.area_marla) || property_data.area_marla <= 0) {
  return res.status(400).json({ message: "Invalid area value" });
}
```

## Performance Optimization

### 1. Caching Strategy
```typescript
// Cache growth rates in memory
private growthRates: HistoricalData = {};

// Load once at startup
constructor() {
  this.loadGrowthRates();
}

// Fast lookup without file I/O
getGrowthRates(city: string, location: string, propertyType: string) {
  return this.growthRates[city]?.[location]?.[propertyType] || null;
}
```

### 2. Lazy Loading
```typescript
// Only load historical data when needed
private loadGrowthRates(): void {
  try {
    if (fs.existsSync(this.dataPath)) {
      const data = fs.readFileSync(this.dataPath, 'utf8');
      this.growthRates = JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading growth rates:', error);
    this.growthRates = {};
  }
}
```

### 3. Async Processing
```typescript
// Non-blocking API calls
app.post("/api/roi/analyze", async (req, res) => {
  try {
    // Process asynchronously
    const analysis = await processROIAnalysis(property_data);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ message: "Processing failed" });
  }
});
```

## Testing

### 1. Unit Tests
```typescript
describe('HistoricalAnalyzer', () => {
  test('should return growth rates for valid location', () => {
    const analyzer = new HistoricalAnalyzer();
    const rates = analyzer.getGrowthRates('Lahore', 'DHA Defence', 'House');
    expect(rates).toBeDefined();
    expect(rates.property_appreciation_rate).toBeDefined();
  });

  test('should return fallback rates for invalid location', () => {
    const analyzer = new HistoricalAnalyzer();
    const rates = analyzer.getGrowthRates('Unknown', 'Unknown', 'House');
    expect(rates).toBeNull();
  });
});
```

### 2. Integration Tests
```typescript
describe('ROI API', () => {
  test('should return valid ROI analysis', async () => {
    const response = await request(app)
      .post('/api/roi/analyze')
      .send({
        property_data: {
          city: 'Lahore',
          location: 'DHA Defence',
          property_type: 'House',
          area_marla: 10,
          bedrooms: 4,
          bathrooms: 3
        }
      });
    
    expect(response.status).toBe(200);
    expect(response.body.ai_predictions).toBeDefined();
    expect(response.body.current_metrics.annual_roi).toBeDefined();
  });
});
```

### 3. Load Testing
```bash
# Test API performance
ab -n 1000 -c 10 -p test_data.json -T application/json http://localhost:5000/api/roi/analyze
```

## Deployment

### 1. Environment Setup
```bash
# Install dependencies
npm install
pip install pandas numpy scikit-learn

# Generate historical data
python server/ml/calculateGrowthRates.py

# Start server
npm run dev
```

### 2. Docker Configuration
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN python server/ml/calculateGrowthRates.py

EXPOSE 5000
CMD ["npm", "start"]
```

### 3. Production Considerations
- Use Redis for caching growth rates
- Implement rate limiting for API endpoints
- Add monitoring and logging
- Set up automated data updates
- Use CDN for static assets

## Monitoring and Logging

### 1. API Logging
```typescript
// Log all ROI analysis requests
app.use((req, res, next) => {
  if (req.path === '/api/roi/analyze') {
    console.log(`ROI Analysis: ${req.body.property_data.city} - ${req.body.property_data.location}`);
  }
  next();
});
```

### 2. Performance Monitoring
```typescript
// Track response times
const startTime = Date.now();
// ... process request ...
const duration = Date.now() - startTime;
console.log(`ROI Analysis completed in ${duration}ms`);
```

### 3. Error Tracking
```typescript
// Track errors for debugging
try {
  // ... process request ...
} catch (error) {
  console.error('ROI Analysis Error:', {
    error: error.message,
    stack: error.stack,
    request: req.body
  });
  res.status(500).json({ message: "Analysis failed" });
}
```

---

**Last Updated**: January 2024  
**Version**: 1.0.0  
**Maintainer**: Development Team
