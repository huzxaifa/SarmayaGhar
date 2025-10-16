import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPropertySchema, insertValuationSchema, insertPortfolioPropertySchema, insertChatMessageSchema } from "@shared/schema";
import { calculatePropertyValuation, predictMarketTrends, calculateROI, type PropertyValuationInput } from "./services/mlModels";
import { getChatResponse, analyzePakistaniPropertyMarket } from "./services/openai";
import { mlService, type PropertyValuationRequest } from "./ml/trainingService";

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

  const httpServer = createServer(app);
  return httpServer;
}