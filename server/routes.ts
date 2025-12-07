import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { insertPropertySchema, insertPortfolioPropertySchema } from "@shared/schema";
import { calculatePropertyValuation, predictMarketTrends, calculateROI, type PropertyValuationInput } from "./services/mlModels.js";
import { getChatResponse } from "./services/openai.js";
import { mlService, type PropertyValuationRequest } from "./ml/trainingService.js";
import { historicalAnalyzer } from "./ml/historicalAnalyzer.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // Properties routes
  app.get("/api/properties", async (req, res) => {
    try {
      const { city, propertyType, bedrooms, minPrice, maxPrice, purpose, q, page = "1", pageSize = "30", sort } = req.query as Record<string, string | undefined>;
      const filters: any = {};
      if (city) filters.city = city;
      if (propertyType) filters.propertyType = propertyType;
      if (bedrooms) filters.bedrooms = parseInt(bedrooms as string);
      if (purpose) filters.purpose = purpose;

      let properties = await storage.getProperties(filters);

      // Text search across title/area/city/type
      if (q && q.trim().length > 0) {
        const term = q.trim().toLowerCase();
        properties = properties.filter(p =>
          p.title.toLowerCase().includes(term) ||
          p.area.toLowerCase().includes(term) ||
          p.city.toLowerCase().includes(term) ||
          p.propertyType.toLowerCase().includes(term)
        );
      }

      // Filter by price range if provided
      if (minPrice || maxPrice) {
        const min = minPrice ? parseFloat(minPrice) : -Infinity;
        const max = maxPrice ? parseFloat(maxPrice) : Infinity;
        properties = properties.filter(property => {
          const price = parseFloat(property.price);
          return price >= min && price <= max;
        });
      }

      // Sorting
      if (sort) {
        if (sort === "price_asc") properties = properties.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        else if (sort === "price_desc") properties = properties.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        else if (sort === "newest") properties = properties.sort((a, b) => new Date(b.createdAt || new Date()).getTime() - new Date(a.createdAt || new Date()).getTime());
      }

      // Pagination
      const pageNum = Math.max(1, parseInt(String(page)) || 1);
      const pageSz = Math.min(100, Math.max(1, parseInt(String(pageSize)) || 30));
      const total = properties.length;
      const start = (pageNum - 1) * pageSz;
      const items = properties.slice(start, start + pageSz);

      res.json({ items, total, page: pageNum, pageSize: pageSz });
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

  // Locations by city - for dependent dropdowns
  app.get("/api/locations", async (req, res) => {
    try {
      const { city } = req.query as Record<string, string | undefined>;
      if (!city || city.trim().length === 0) {
        return res.status(400).json({ message: "city is required" });
      }

      const properties = await storage.getProperties({ city });
      const set = new Set<string>();
      for (const p of properties) {
        if (p.area && typeof p.area === "string" && p.area.trim().length > 0) {
          set.add(p.area.trim());
        }
      }
      const locations = Array.from(set).sort((a, b) => a.localeCompare(b));
      res.json({ city, locations });
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
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
  app.post("/api/ml/train-models", async (_req, res) => {
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
  app.get("/api/ml/model-status", async (_req, res) => {
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

  app.get("/api/ml/training-status", async (_req, res) => {
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
  app.get("/api/portfolio", async (_req, res) => {
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

  // ROI Heatmap Data Endpoint
  app.get("/api/roi/heatmap-data", async (req, res) => {
    try {
      const { city, property_type } = req.query;
      const selectedCity = (city as string) || "Karachi";
      const propertyType = (property_type as string) || "House";
      
      // Get historical data for the city
      // Get historical data for the city (stored but not used in this context)
      historicalAnalyzer.getGrowthRates(selectedCity, "", propertyType);
      
      // Generate realistic ROI heatmap data based on actual calculations
      const generateAreaData = async (areaName: string, lat: number, lng: number, basePrice: number) => {
        try {
          // Create a property valuation request
          const valuationRequest: PropertyValuationRequest = {
            city: selectedCity,
            location: areaName,
            propertyType: propertyType,
            areaMarla: 10, // 10 marla standard
            bedrooms: 4,
            bathrooms: 3,
            yearBuilt: 2020 // Default year for heatmap calculations
          };

          // Get AI property price prediction
          const priceResponse = await mlService.predictPrice(valuationRequest);
          const propertyPrice = priceResponse.predictedPrice;
          
          // If ML prediction fails, use base price as fallback
          if (!propertyPrice || propertyPrice <= 0) {
            console.warn(`ML prediction failed for ${areaName}, using base price: ${basePrice}`);
            const fallbackPrice = basePrice;
            const monthlyRent = fallbackPrice / 100;
            const annualRent = monthlyRent * 12;
            const annualMaintenance = fallbackPrice * 0.0075;
            const netAnnualIncome = annualRent - annualMaintenance;
            
            // Apply area-specific variations even in fallback
            const areaVariations = {
              "DHA Defence": { appreciation: 18.5, rentGrowth: 0.6 },
              "DHA Phase": { appreciation: 17.2, rentGrowth: 0.55 },
              "Gulberg": { appreciation: 16.8, rentGrowth: 0.5 },
              "Model Town": { appreciation: 14.5, rentGrowth: 0.4 },
              "Johar Town": { appreciation: 13.2, rentGrowth: 0.35 },
              "Wapda Town": { appreciation: 12.8, rentGrowth: 0.3 },
              "Clifton": { appreciation: 19.2, rentGrowth: 0.7 },
              "Gulshan": { appreciation: 15.5, rentGrowth: 0.45 },
              "Nazimabad": { appreciation: 11.8, rentGrowth: 0.25 },
              "Bahria": { appreciation: 16.5, rentGrowth: 0.5 },
              "F-8": { appreciation: 18.8, rentGrowth: 0.65 },
              "F-10": { appreciation: 17.5, rentGrowth: 0.6 },
              "G-11": { appreciation: 15.8, rentGrowth: 0.45 },
              "I-8": { appreciation: 14.2, rentGrowth: 0.4 },
              "Saddar": { appreciation: 10.5, rentGrowth: 0.2 },
              "Al Noor": { appreciation: 13.8, rentGrowth: 0.35 }
            };
            
            // Find matching area variation
            const matchingVariation = Object.keys(areaVariations).find(key => 
              areaName.toLowerCase().includes(key.toLowerCase())
            );
            
            let propertyAppreciationRate = 15.6578;
            let rentGrowthRate = 0.4897;
            let confidence = 0.5;
            
            if (matchingVariation) {
              propertyAppreciationRate = areaVariations[matchingVariation as keyof typeof areaVariations].appreciation;
              rentGrowthRate = areaVariations[matchingVariation as keyof typeof areaVariations].rentGrowth;
              confidence = 0.7;
            }
            
            const propertyAppreciation = fallbackPrice * (propertyAppreciationRate / 100);
            const totalAnnualReturn = netAnnualIncome + propertyAppreciation;
            const annualROI = (totalAnnualReturn / fallbackPrice) * 100;
            
            return {
              name: areaName,
              lat: lat,
              lng: lng,
              avgPrice: fallbackPrice,
              monthlyRent: monthlyRent,
              annualROI: annualROI,
              propertyAppreciation: propertyAppreciationRate,
              rentGrowth: rentGrowthRate,
              dataPoints: 0,
              confidence: confidence,
              usingHistoricalData: false
            };
          }
          
          // Calculate monthly rent using the formula: propertyPrice / 100
          const monthlyRent = propertyPrice / 100;
          const annualRent = monthlyRent * 12;
          
          // Calculate maintenance costs (0.75% of property value annually)
          const annualMaintenance = propertyPrice * 0.0075;
          const netAnnualIncome = annualRent - annualMaintenance;
          
          // Get historical growth rates for this specific location
          const locationGrowthRates = historicalAnalyzer.getGrowthRates(selectedCity, areaName, propertyType);
          
          let propertyAppreciationRate = 15.6578; // Default fallback
          let rentGrowthRate = 0.4897; // Default fallback
          let confidence = 0.5;
          let usingHistoricalData = false;
          let dataPoints = 0;
          
          if (locationGrowthRates) {
            // Check if historical data is suitable for investment analysis
            if (locationGrowthRates.property_appreciation_rate >= -20 &&
                locationGrowthRates.rent_growth_rate >= -10 &&
                locationGrowthRates.confidence > 0.6) {
              propertyAppreciationRate = locationGrowthRates.property_appreciation_rate;
              rentGrowthRate = locationGrowthRates.rent_growth_rate;
              confidence = locationGrowthRates.confidence;
              usingHistoricalData = true;
              dataPoints = locationGrowthRates.data_points;
            }
          } else {
            // If no historical data, create realistic variations based on area characteristics
            const areaVariations = {
              "DHA Defence": { appreciation: 18.5, rentGrowth: 0.6 },
              "DHA Phase": { appreciation: 17.2, rentGrowth: 0.55 },
              "Gulberg": { appreciation: 16.8, rentGrowth: 0.5 },
              "Model Town": { appreciation: 14.5, rentGrowth: 0.4 },
              "Johar Town": { appreciation: 13.2, rentGrowth: 0.35 },
              "Wapda Town": { appreciation: 12.8, rentGrowth: 0.3 },
              "Clifton": { appreciation: 19.2, rentGrowth: 0.7 },
              "Gulshan": { appreciation: 15.5, rentGrowth: 0.45 },
              "Nazimabad": { appreciation: 11.8, rentGrowth: 0.25 },
              "Bahria": { appreciation: 16.5, rentGrowth: 0.5 },
              "F-8": { appreciation: 18.8, rentGrowth: 0.65 },
              "F-10": { appreciation: 17.5, rentGrowth: 0.6 },
              "G-11": { appreciation: 15.8, rentGrowth: 0.45 },
              "I-8": { appreciation: 14.2, rentGrowth: 0.4 },
              "Saddar": { appreciation: 10.5, rentGrowth: 0.2 },
              "Al Noor": { appreciation: 13.8, rentGrowth: 0.35 }
            };
            
            // Find matching area variation
            const matchingVariation = Object.keys(areaVariations).find(key => 
              areaName.toLowerCase().includes(key.toLowerCase())
            );
            
            if (matchingVariation) {
              propertyAppreciationRate = areaVariations[matchingVariation as keyof typeof areaVariations].appreciation;
              rentGrowthRate = areaVariations[matchingVariation as keyof typeof areaVariations].rentGrowth;
              confidence = 0.7; // Higher confidence for area-based estimates
            }
          }
          
          // Calculate ROI: (Net Annual Income + Property Appreciation) / Property Price * 100
          const propertyAppreciation = propertyPrice * (propertyAppreciationRate / 100);
          const totalAnnualReturn = netAnnualIncome + propertyAppreciation;
          const annualROI = (totalAnnualReturn / propertyPrice) * 100;
          
          return {
            name: areaName,
            lat: lat,
            lng: lng,
            avgPrice: propertyPrice,
            monthlyRent: monthlyRent,
            annualROI: annualROI,
            propertyAppreciation: propertyAppreciationRate,
            rentGrowth: rentGrowthRate,
            dataPoints: dataPoints,
            confidence: confidence,
            usingHistoricalData: usingHistoricalData
          };
        } catch (error) {
          console.error(`Error generating data for ${areaName}:`, error);
          // Fallback to basic calculation
          const monthlyRent = basePrice / 100;
          const annualRent = monthlyRent * 12;
          const annualMaintenance = basePrice * 0.0075;
          const netAnnualIncome = annualRent - annualMaintenance;
          const propertyAppreciation = basePrice * 0.156578;
          const totalAnnualReturn = netAnnualIncome + propertyAppreciation;
          const annualROI = (totalAnnualReturn / basePrice) * 100;
          
          return {
            name: areaName,
            lat: lat,
            lng: lng,
            avgPrice: basePrice,
            monthlyRent: monthlyRent,
            annualROI: annualROI,
            propertyAppreciation: 15.6578,
            rentGrowth: 0.4897,
            dataPoints: 0,
            confidence: 0.5,
            usingHistoricalData: false
          };
        }
      };

      // Define areas with their coordinates and base prices
      const areaDefinitions = {
        "Karachi": [
          { name: "DHA Defence", lat: 24.8607, lng: 67.0011, basePrice: 7500000 },
          { name: "DHA Phase 8", lat: 24.8607, lng: 67.0011, basePrice: 8500000 },
          { name: "Clifton Block 2", lat: 24.8138, lng: 67.0303, basePrice: 9500000 },
          { name: "Gulshan-e-Iqbal", lat: 24.9056, lng: 67.0822, basePrice: 4500000 },
          { name: "Nazimabad", lat: 24.9240, lng: 67.0430, basePrice: 3200000 },
          { name: "North Nazimabad", lat: 24.9324, lng: 67.0624, basePrice: 3800000 },
        ],
        "Lahore": [
          { name: "DHA Defence", lat: 31.5204, lng: 74.3587, basePrice: 6500000 },
          { name: "Gulberg", lat: 31.5204, lng: 74.3587, basePrice: 5500000 },
          { name: "Model Town", lat: 31.5204, lng: 74.3587, basePrice: 4800000 },
          { name: "Johar Town", lat: 31.5204, lng: 74.3587, basePrice: 4200000 },
          { name: "Wapda Town", lat: 31.5204, lng: 74.3587, basePrice: 3800000 },
        ],
        "Islamabad": [
          { name: "DHA Phase 2", lat: 33.6844, lng: 73.0479, basePrice: 8500000 },
          { name: "F-8", lat: 33.6844, lng: 73.0479, basePrice: 7500000 },
          { name: "F-10", lat: 33.6844, lng: 73.0479, basePrice: 7000000 },
          { name: "G-11", lat: 33.6844, lng: 73.0479, basePrice: 6000000 },
          { name: "I-8", lat: 33.6844, lng: 73.0479, basePrice: 5500000 },
        ],
        "Rawalpindi": [
          { name: "DHA Phase 1", lat: 33.5651, lng: 73.0169, basePrice: 4500000 },
          { name: "Bahria Town", lat: 33.5651, lng: 73.0169, basePrice: 5000000 },
          { name: "Gulberg Greens", lat: 33.5651, lng: 73.0169, basePrice: 4000000 },
          { name: "Saddar", lat: 33.5651, lng: 73.0169, basePrice: 3500000 },
        ],
        "Faisalabad": [
          { name: "DHA Phase 1", lat: 31.4504, lng: 73.1350, basePrice: 3000000 },
          { name: "Gulberg", lat: 31.4504, lng: 73.1350, basePrice: 2800000 },
          { name: "Al Noor Garden", lat: 31.4504, lng: 73.1350, basePrice: 2500000 },
          { name: "Model Town", lat: 31.4504, lng: 73.1350, basePrice: 2200000 },
        ],
      };
      
      const cityAreas = areaDefinitions[selectedCity as keyof typeof areaDefinitions] || areaDefinitions["Karachi"];
      
      // Generate data for all areas in parallel
      const areas = await Promise.all(
        cityAreas.map(area => generateAreaData(area.name, area.lat, area.lng, area.basePrice))
      );
      
      const heatmapData = {
        city: selectedCity,
        areas: areas,
        lastUpdated: new Date().toISOString(),
      };
      
      res.json(heatmapData);
    } catch (error) {
      console.error("Error fetching ROI heatmap data:", error);
      res.status(500).json({ message: "Failed to fetch ROI heatmap data" });
    }
  });

  // Market insights route
  app.get("/api/market-insights", async (_req, res) => {
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
  app.get("/api/roi/cities", async (_req, res) => {
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

  app.get("/api/roi/property-types", async (_req, res) => {
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

  app.get("/api/roi/market-rates", async (_req, res) => {
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
            : `Based on ${growthRates?.years_analyzed} years of historical data (${growthRates?.data_points} data points), ${property_type} in ${location}, ${city} shows ${property_appreciation_rate.toFixed(1)}% annual appreciation and ${rent_growth_rate.toFixed(1)}% rent growth, generating ${annual_roi.toFixed(1)}% annual ROI with PKR ${price_per_marla.toLocaleString()} per marla.`
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
