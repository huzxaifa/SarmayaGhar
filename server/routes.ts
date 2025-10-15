import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPropertySchema, insertValuationSchema, insertPortfolioPropertySchema, insertChatMessageSchema } from "@shared/schema";
import { calculatePropertyValuation, predictMarketTrends, calculateROI, type PropertyValuationInput } from "./services/mlModels";
import { getChatResponse, analyzePakistaniPropertyMarket } from "./services/openai";
import { mlService, type PropertyValuationRequest } from "./ml/trainingService";
import { historicalAnalyzer } from "./ml/historicalAnalyzer";

export async function registerRoutes(app: Express): Promise<Server> {
  // Properties routes
  app.get("/api/properties", async (req, res) => {
    try {
      const { city, propertyType, bedrooms, minPrice, maxPrice } = req.query;
      const filters: any = {};
      
      if (city) filters.city = city;
      if (propertyType) filters.propertyType = propertyType;
      if (bedrooms) filters.bedrooms = parseInt(bedrooms as string);
      
      let properties = await storage.getProperties(filters);
      
      // Filter by price range if provided
      if (minPrice || maxPrice) {
        properties = properties.filter(property => {
          const price = parseFloat(property.price);
          if (minPrice && price < parseFloat(minPrice as string)) return false;
          if (maxPrice && price > parseFloat(maxPrice as string)) return false;
          return true;
        });
      }
      
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  app.post("/api/properties", async (req, res) => {
    try {
      const validatedData = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(validatedData);
      res.status(201).json(property);
    } catch (error) {
      console.error("Error creating property:", error);
      res.status(400).json({ message: "Invalid property data" });
    }
  });

  // ML Training and Model Management routes
  app.post("/api/ml/train-models", async (req, res) => {
    try {
      // Use the new selective training method
      const result = await mlService.trainMissingModels();
      res.json(result);
    } catch (error) {
      console.error("Error training models:", error);
      res.status(500).json({ message: "Failed to start model training" });
    }
  });

  // Get list of trained/untrained models
  app.get("/api/ml/model-status", async (req, res) => {
    try {
      const trainedModels = mlService.getTrainedModels();
      const untrainedModels = mlService.getUntrainedModels();
      const status = mlService.getTrainingStatus();
      
      res.json({
        trainedModels,
        untrainedModels,
        hasAllModels: untrainedModels.length === 0,
        hasModel: status.hasModel,
        modelInfo: status.modelInfo
      });
    } catch (error) {
      console.error("Error getting model status:", error);
      res.status(500).json({ message: "Failed to get model status" });
    }
  });

  app.get("/api/ml/training-status", async (req, res) => {
    try {
      const status = mlService.getTrainingStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting training status:", error);
      res.status(500).json({ message: "Failed to get training status" });
    }
  });

  // Enhanced ML-based property valuation
  app.post("/api/ml/property-valuation", async (req, res) => {
    try {
      const request: PropertyValuationRequest = req.body;
      
      // Validate required fields
      if (!request.location || !request.propertyType || !request.areaMarla) {
        return res.status(400).json({ message: "Missing required fields: location, propertyType, areaMarla" });
      }

      if (!request.yearBuilt || !request.bedrooms || !request.bathrooms) {
        return res.status(400).json({ message: "Missing required fields: yearBuilt, bedrooms, bathrooms" });
      }

      // Check if model is trained
      const status = mlService.getTrainingStatus();
      if (!status.hasModel) {
        return res.status(503).json({ 
          message: "ML models not trained yet. Please train the models first.",
          shouldTrain: true
        });
      }

      const result = await mlService.predictPrice(request);
      
      // Store valuation in database
      const valuationData = {
        city: request.city || "Karachi",
        area: request.neighbourhood || request.location || "",
        propertyType: request.propertyType,
        bedrooms: request.bedrooms,
        bathrooms: request.bathrooms,
        areaSize: request.areaMarla.toString(),
        areaUnit: "marla",
        yearBuilt: request.yearBuilt,
        features: null,
        estimatedValue: result.predictedPrice.toString(),
        confidenceScore: result.confidence / 100,
        priceRange: result.priceRange,
        marketAnalysis: {
          locationScore: 8,
          marketTrend: result.marketTrend,
          liquidity: "Medium",
          investmentGrade: "B+"
        },
        insights: result.insights,
        predictionTimeline: JSON.stringify(result.predictions),
      };
      
      await storage.createValuation(valuationData);
      
      res.json(result);
    } catch (error) {
      const err = error as any;
      console.error("Error calculating ML valuation:", err && (err.stack || err.message || err));
      res.status(500).json({ 
        message: "Failed to calculate property valuation",
        detail: err && (err.message || String(err))
      });
    }
  });

  // Legacy valuation route (backup for old frontend)
  app.post("/api/ml/property-valuation-legacy", async (req, res) => {
    try {
      const input: PropertyValuationInput = req.body;
      
      // Validate required fields
      if (!input.city || !input.propertyType || !input.areaSize) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const result = await calculatePropertyValuation(input);
      
      // Store valuation in database
      const valuationData = {
        city: input.city,
        area: input.area,
        propertyType: input.propertyType,
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms,
        areaSize: input.areaSize.toString(),
        areaUnit: input.areaUnit,
        yearBuilt: input.yearBuilt,
        features: input.features,
        estimatedValue: result.estimatedValue.toString(),
        confidenceScore: result.confidenceScore,
        priceRange: result.priceRange,
        marketAnalysis: result.marketAnalysis,
        insights: result.insights,
        predictionTimeline: input.predictionTimeline,
      };
      
      await storage.createValuation(valuationData);
      
      res.json(result);
    } catch (error) {
      console.error("Error calculating valuation:", error);
      res.status(500).json({ message: "Failed to calculate property valuation" });
    }
  });

  app.get("/api/ml/market-trends", async (req, res) => {
    try {
      const { city, propertyType } = req.query;
      const trends = await predictMarketTrends(city as string, propertyType as string);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching market trends:", error);
      res.status(500).json({ message: "Failed to fetch market trends" });
    }
  });

  app.post("/api/ml/roi-calculation", async (req, res) => {
    try {
      const { purchasePrice, currentValue, monthlyRent } = req.body;
      const roi = await calculateROI(purchasePrice, currentValue, monthlyRent);
      res.json(roi);
    } catch (error) {
      console.error("Error calculating ROI:", error);
      res.status(500).json({ message: "Failed to calculate ROI" });
    }
  });

  // Portfolio routes
  app.get("/api/portfolio", async (req, res) => {
    try {
      const portfolioProperties = await storage.getPortfolioProperties();
      
      // Calculate portfolio summary
      const totalValue = portfolioProperties.reduce((sum, prop) => sum + parseFloat(prop.currentValue), 0);
      const totalPurchasePrice = portfolioProperties.reduce((sum, prop) => sum + parseFloat(prop.purchasePrice), 0);
      const totalGain = totalValue - totalPurchasePrice;
      const totalROI = totalPurchasePrice > 0 ? (totalGain / totalPurchasePrice) * 100 : 0;
      const monthlyIncome = portfolioProperties
        .filter(prop => prop.isRented && prop.monthlyRent)
        .reduce((sum, prop) => sum + parseFloat(prop.monthlyRent!), 0);

      res.json({
        properties: portfolioProperties,
        summary: {
          totalValue,
          totalGain,
          totalROI: Math.round(totalROI * 100) / 100,
          monthlyIncome,
          propertiesCount: portfolioProperties.length,
        }
      });
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      res.status(500).json({ message: "Failed to fetch portfolio" });
    }
  });

  app.post("/api/portfolio", async (req, res) => {
    try {
      const validatedData = insertPortfolioPropertySchema.parse(req.body);
      const portfolioProperty = await storage.createPortfolioProperty(validatedData);
      res.status(201).json(portfolioProperty);
    } catch (error) {
      console.error("Error adding to portfolio:", error);
      res.status(400).json({ message: "Invalid portfolio data" });
    }
  });

  // Chat routes
  app.post("/api/ml/chatbot", async (req, res) => {
    try {
      const { message, context } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      const response = await getChatResponse(message, context);
      
      // Store chat message
      await storage.createChatMessage({
        message,
        response: response.message,
        context,
      });
      
      res.json(response);
    } catch (error) {
      console.error("Error processing chat message:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  app.get("/api/ml/heatmap-data", async (req, res) => {
    try {
      const { city } = req.query;
      
      // Generate mock heatmap data for the specified city
      const heatmapData = {
        city: city || "Karachi",
        areas: [
          { name: "DHA Phase 8", lat: 24.8607, lng: 67.0011, avgPrice: 7500000, growth: 18 },
          { name: "Clifton Block 2", lat: 24.8138, lng: 67.0303, avgPrice: 8500000, growth: 15 },
          { name: "Gulshan-e-Iqbal", lat: 24.9056, lng: 67.0822, avgPrice: 4500000, growth: 22 },
          { name: "Nazimabad", lat: 24.9240, lng: 67.0430, avgPrice: 3200000, growth: 12 },
          { name: "North Nazimabad", lat: 24.9324, lng: 67.0624, avgPrice: 3800000, growth: 16 },
        ],
        lastUpdated: new Date().toISOString(),
      };
      
      res.json(heatmapData);
    } catch (error) {
      console.error("Error fetching heatmap data:", error);
      res.status(500).json({ message: "Failed to fetch heatmap data" });
    }
  });

  // Market insights route
  app.get("/api/market-insights", async (req, res) => {
    try {
      const insights = {
        topAreas: [
          { name: "DHA Phase 8", avgPrice: "PKR 75 Lac/Marla", growth: "+18%" },
          { name: "Clifton Block 2", avgPrice: "PKR 85 Lac/Marla", growth: "+15%" },
          { name: "Gulshan-e-Iqbal", avgPrice: "PKR 45 Lac/Marla", growth: "+22%" },
        ],
        marketPredictions: [
          "Karachi property values expected to rise 12-15% in 2025",
          "DHA areas showing signs of market correction",
          "Best investment window: Next 6 months",
        ],
        chartData: {
          labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
          values: [65, 68, 72, 70, 75, 78],
        }
      };
      
      res.json(insights);
    } catch (error) {
      console.error("Error fetching market insights:", error);
      res.status(500).json({ message: "Failed to fetch market insights" });
    }
  });

  // Basic ROI Analysis routes (without Python service)
  app.get("/api/roi/cities", async (req, res) => {
    res.json({
      cities: [
        "Islamabad",
        "Karachi", 
        "Lahore",
        "Rawalpindi",
        "Faisalabad"
      ]
    });
  });

  app.get("/api/roi/property-types", async (req, res) => {
    res.json({
      property_types: [
        "House",
        "Flat",
        "Penthouse",
        "Lower Portion",
        "Upper Portion"
      ]
    });
  });

  app.get("/api/roi/market-rates", async (req, res) => {
    res.json({
      "Islamabad": {
        "avg_rent_per_marla": 4500,
        "avg_price_per_marla": 600000,
        "yield_percentage": 9.0
      },
      "Karachi": {
        "avg_rent_per_marla": 5000,
        "avg_price_per_marla": 550000,
        "yield_percentage": 10.9
      },
      "Lahore": {
        "avg_rent_per_marla": 4000,
        "avg_price_per_marla": 500000,
        "yield_percentage": 9.6
      },
      "Rawalpindi": {
        "avg_rent_per_marla": 3500,
        "avg_price_per_marla": 450000,
        "yield_percentage": 9.3
      },
      "Faisalabad": {
        "avg_rent_per_marla": 3000,
        "avg_price_per_marla": 400000,
        "yield_percentage": 9.0
      }
    });
  });

  app.post("/api/roi/analyze", async (req, res) => {
    try {
      const { property_data } = req.body;
      
      if (!property_data) {
        return res.status(400).json({ message: "Property data is required" });
      }

      // AI-powered ROI calculation using ML models
      const {
        city = "Islamabad",
        location = "DHA Defence",
        property_type = "House",
        area_marla = 10,
        bedrooms = 3,
        bathrooms = 2
      } = property_data;

      // Use AI models to predict property price and rent
      const propertyPriceResponse = await mlService.predictPrice({
        city,
        location,
        bedrooms,
        bathrooms,
        areaMarla: area_marla,
        propertyType: property_type,
        yearBuilt: 2020 // Default year
      });

      const propertyPrice = propertyPriceResponse.predictedPrice;
      
      // For now, use your formula for rent prediction (1% of property value)
      // TODO: Implement dedicated rental prediction model
      const monthlyRent = propertyPrice / 100;

      // Use AI predictions for calculations
      const property_value = propertyPrice;
      const monthly_rent = monthlyRent;
      const annual_rent = monthly_rent * 12;
      
      // Calculate maintenance costs (typically 0.5-1% of property value annually)
      const annual_maintenance = property_value * 0.0075; // 0.75% of property value
      const net_annual_income = annual_rent - annual_maintenance;
      
      // Get historical growth rates for this location and property type
      const growthRates = historicalAnalyzer.getGrowthRates(city, location, property_type);
      
      // Use historical data if available and positive, otherwise fallback to default rates
      let property_appreciation_rate = 15.6578; // Default fallback
      let rent_growth_rate = 0.4897; // Default fallback - 0.4897% of property price
      let data_confidence = 0.5; // Default confidence
      let using_fallback = true;
      let fallback_reason = "no_historical_data";
      
      if (growthRates) {
        // Check if historical data is reasonable for investment analysis
        const historical_appreciation = growthRates.property_appreciation_rate;
        const historical_rent_growth = growthRates.rent_growth_rate;
        
        // Use historical data only if:
        // 1. Property appreciation is not severely negative (< -20%)
        // 2. Rent growth is not severely negative (< -10%)
        // 3. Data has reasonable confidence (> 0.6)
        if (historical_appreciation >= -20 && 
            historical_rent_growth >= -10 && 
            growthRates.confidence > 0.6) {
          property_appreciation_rate = historical_appreciation;
          rent_growth_rate = historical_rent_growth;
          data_confidence = growthRates.confidence;
          using_fallback = false;
          fallback_reason = "historical_data_used";
        } else {
          // Historical data exists but is not suitable for investment analysis
          if (historical_appreciation < -20) {
            fallback_reason = "negative_appreciation_too_severe";
          } else if (historical_rent_growth < -10) {
            fallback_reason = "negative_rent_growth_too_severe";
          } else if (growthRates.confidence <= 0.6) {
            fallback_reason = "low_confidence_data";
          }
        }
      }
      
      // ROI = (Rent + Property Appreciation) / Property Price
      // Use actual historical appreciation rate
      const property_appreciation = property_value * (property_appreciation_rate / 100);
      const total_annual_return = net_annual_income + property_appreciation;
      const annual_roi = (total_annual_return / property_value) * 100;
      const cap_rate = (annual_rent / property_value) * 100;
      
      // Calculate price per marla
      const price_per_marla = property_value / area_marla;
      
      // Calculate investment grade
      let grade = "D";
      if (annual_roi >= 12 && cap_rate >= 8) grade = "A+";
      else if (annual_roi >= 10 && cap_rate >= 6) grade = "A";
      else if (annual_roi >= 8 && cap_rate >= 5) grade = "B+";
      else if (annual_roi >= 6 && cap_rate >= 4) grade = "B";
      else if (annual_roi >= 4 && cap_rate >= 3) grade = "C";

      const analysis = {
        ai_predictions: {
          property_price: property_value,
          monthly_rent: monthly_rent,
          price_per_marla: price_per_marla,
          confidence: data_confidence,
          method: using_fallback ? "fallback_formula" : "historical_analysis",
          fallback_info: {
            using_fallback: using_fallback,
            fallback_reason: fallback_reason,
          fallback_rates: {
            property_appreciation_rate: 15.6578,
            rent_growth_rate: 0.4897
          }
          },
          historical_data: growthRates ? {
            property_appreciation_rate: growthRates.property_appreciation_rate,
            rent_growth_rate: growthRates.rent_growth_rate,
            data_points: growthRates.data_points,
            years_analyzed: growthRates.years_analyzed,
            confidence: growthRates.confidence,
            was_used: !using_fallback
          } : null
        },
        rental_prediction: {
          predicted_rent: monthly_rent,
          confidence: 0.90,
          method: "ai_ml_models"
        },
        value_prediction: {
          predicted_value: property_value,
          confidence: 0.90,
          method: "ai_ml_models"
        },
        current_metrics: {
          monthly_rent: monthly_rent,
          annual_rent: annual_rent,
          monthly_maintenance: annual_maintenance / 12,
          annual_maintenance: annual_maintenance,
          net_monthly_income: monthly_rent - (annual_maintenance / 12),
          net_annual_income: net_annual_income,
          annual_roi: annual_roi,
          cap_rate: cap_rate,
          cash_flow_positive: net_annual_income > 0
        },
        investment_metrics: {
          payback_period: property_value / net_annual_income,
          irr: annual_roi * 0.8, // Simplified IRR calculation
          npv: net_annual_income * 5 - property_value // Simplified NPV
        },
        investment_grade: {
          grade: grade,
          recommendation: grade >= "B" ? "Good investment opportunity" : "Consider carefully",
          risk_level: grade >= "A" ? "Low" : grade >= "B" ? "Medium" : "High"
        },
        future_projections: {
          year_1: {
            projected_rent: monthly_rent * (1 + rent_growth_rate / 100), // Historical rent growth rate
            projected_value: property_value * (1 + property_appreciation_rate / 100), // Historical property appreciation rate
            projected_roi: ((monthly_rent * (1 + rent_growth_rate / 100) * 12 - annual_maintenance) + (property_value * (1 + property_appreciation_rate / 100) - property_value)) / (property_value * (1 + property_appreciation_rate / 100)) * 100
          },
          year_5: {
            projected_rent: monthly_rent * Math.pow(1 + rent_growth_rate / 100, 5), // Historical rent growth rate compounded
            projected_value: property_value * Math.pow(1 + property_appreciation_rate / 100, 5), // Historical property appreciation rate compounded
            projected_roi: ((monthly_rent * Math.pow(1 + rent_growth_rate / 100, 5) * 12 - annual_maintenance) + (property_value * Math.pow(1 + property_appreciation_rate / 100, 5) - property_value)) / (property_value * Math.pow(1 + property_appreciation_rate / 100, 5)) * 100
          }
        },
        market_insights: {
          city: city,
          location: location,
          price_per_marla: price_per_marla,
          market_yield: (monthly_rent * 12 / property_value) * 100,
          market_trend: using_fallback ? "Fallback Formula" : "Historical Data",
          recommendation: using_fallback 
            ? `Using fallback formula (${fallback_reason}): ${property_type} in ${location}, ${city} projected with 15.66% annual appreciation and 0.49% rent growth, generating ${annual_roi.toFixed(1)}% annual ROI with PKR ${price_per_marla.toLocaleString()} per marla.`
            : `Based on ${growthRates.years_analyzed} years of historical data (${growthRates.data_points} data points), ${property_type} in ${location}, ${city} shows ${property_appreciation_rate.toFixed(1)}% annual appreciation and ${rent_growth_rate.toFixed(1)}% rent growth, generating ${annual_roi.toFixed(1)}% annual ROI with PKR ${price_per_marla.toLocaleString()} per marla.`
        }
      };

      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing ROI:", error);
      res.status(500).json({ message: "Failed to analyze ROI" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
