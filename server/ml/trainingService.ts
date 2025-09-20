import { PropertyDataProcessor } from './dataProcessor';
import { MLModelTrainer, type TrainedModel } from './models';
import * as path from 'path';
import * as fs from 'fs';
import * as tf from '@tensorflow/tfjs';

export interface PropertyValuationRequest {
  yearBuilt: number;
  location: string;
  propertyType: string;
  neighbourhood: string;
  areaMarla: number;
  bedrooms: number;
  bathrooms: number;
  city?: string;
  province?: string;
}

export interface PropertyValuationResponse {
  predictedPrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  confidence: number;
  marketTrend: string;
  predictions: {
    currentYear: number;
    oneYear: number;
    twoYear: number;
    threeYear: number;
  };
  comparableProperties: Array<{
    price: number;
    location: string;
    areaMarla: number;
    bedrooms: number;
    bathrooms: number;
  }>;
  insights: string[];
}

export class MLTrainingService {
  private trainedModel: TrainedModel | null = null;
  private isTraining = false;
  private processor = new PropertyDataProcessor();
  private trainedModelsDir = path.join(process.cwd(), 'trained_models');

  constructor() {
    // attempt to load saved model at startup
    this.loadSavedModelIfExists().catch(err => {
      console.warn('Failed to load saved model at startup:', err);
    });
  }

  // Train models and select the best one
  public async trainModels(): Promise<{ success: boolean; message: string; modelInfo?: any }> {
    if (this.isTraining) {
      return { success: false, message: 'Training already in progress' };
    }

    this.isTraining = true;
    console.log('Starting ML model training...');

    try {
      // Load and preprocess data
      const csvPath = path.join(process.cwd(), 'attached_assets', 'zameen-updated_1757269388792.csv');
      
      if (!fs.existsSync(csvPath)) {
        throw new Error('Dataset file not found. Please upload the CSV file.');
      }

      const { features, targets } = await this.processor.loadAndPreprocessData(csvPath);
      console.log(`Loaded ${features.length} property records for training`);

      // Scale features
      const { scaledFeatures, scalingParams } = this.processor.scaleFeatures(features);
      const encodingMaps = this.processor.getEncodingMaps();

      // Train all models
      const trainer = new MLModelTrainer();
      const { results, bestModel } = await trainer.trainAllModels(scaledFeatures, targets, scalingParams, encodingMaps);

      this.trainedModel = bestModel;
      this.isTraining = false;

      console.log(`Training completed! Best model: ${bestModel.name} with accuracy: ${bestModel.accuracy.toFixed(4)}`);

      return {
        success: true,
        message: `Training completed successfully. Best model: ${bestModel.name}`,
        modelInfo: {
          bestModel: bestModel.name,
          accuracy: bestModel.accuracy,
          allResults: results.map(r => ({
            name: r.name,
            accuracy: r.r2Score,
            mse: r.mse,
            mae: r.mae
          }))
        }
      };

    } catch (error) {
      this.isTraining = false;
      console.error('Training failed:', error);
      return {
        success: false,
        message: `Training failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Predict property price
  public async predictPrice(request: PropertyValuationRequest): Promise<PropertyValuationResponse> {
    if (!this.trainedModel) {
      throw new Error('No trained model available. Please train the model first.');
    }

    // Convert request to features
    const features = this.convertRequestToFeatures(request);
    
    // Scale features using the same parameters used during training
    const scaledFeatures = this.processor.scaleNewFeature(features, this.trainedModel.scalingParams);

    // Make prediction
    const trainer = new MLModelTrainer();
    const predictedPrice = await trainer.predict(this.trainedModel, scaledFeatures);

    // Calculate price range (±15% based on model confidence)
    const confidence = Math.max(0.6, this.trainedModel.accuracy); // Minimum 60% confidence
    const priceVariance = (1 - confidence) * 0.3; // Max 30% variance for low confidence models
    const minPrice = predictedPrice * (1 - priceVariance);
    const maxPrice = predictedPrice * (1 + priceVariance);

    // Calculate future predictions with market growth assumptions
    const marketGrowthRate = this.getMarketGrowthRate(request.city || '', request.location);
    const predictions = {
      currentYear: Math.round(predictedPrice),
      oneYear: Math.round(predictedPrice * (1 + marketGrowthRate)),
      twoYear: Math.round(predictedPrice * Math.pow(1 + marketGrowthRate, 2)),
      threeYear: Math.round(predictedPrice * Math.pow(1 + marketGrowthRate, 3))
    };

    // Get comparable properties
    const comparableProperties = this.getComparableProperties(request);

    // Generate insights
    const insights = this.generateInsights(request, predictedPrice);

    // Determine market trend
    const marketTrend = marketGrowthRate > 0.05 ? 'Rising' : marketGrowthRate < -0.02 ? 'Declining' : 'Stable';

    return {
      predictedPrice: Math.round(predictedPrice),
      priceRange: {
        min: Math.round(minPrice),
        max: Math.round(maxPrice)
      },
      confidence: Math.round(confidence * 100),
      marketTrend,
      predictions,
      comparableProperties,
      insights
    };
  }

  // Convert request to processed features
  private convertRequestToFeatures(request: PropertyValuationRequest): any {
    const encodingMaps = this.trainedModel?.encodingMaps;
    if (!encodingMaps) {
      throw new Error('Encoding maps not available');
    }

    const currentYear = new Date().getFullYear();
    const propertyAge = Math.max(0, currentYear - request.yearBuilt);
    
    // Default coordinates for major cities (you can expand this)
    const cityCoordinates: { [key: string]: { lat: number, lng: number } } = {
      'Karachi': { lat: 24.8607, lng: 67.0011 },
      'Lahore': { lat: 31.5204, lng: 74.3587 },
      'Islamabad': { lat: 33.6844, lng: 73.0479 },
      'Faisalabad': { lat: 31.4504, lng: 73.1350 },
      'Rawalpindi': { lat: 33.5651, lng: 73.0169 }
    };

    const defaultCoords = cityCoordinates[request.city || 'Karachi'] || cityCoordinates['Karachi'];

    return {
      property_type_encoded: encodingMaps.propertyTypeMap.get(request.propertyType) || 0,
      location_encoded: encodingMaps.locationMap.get(request.neighbourhood) || encodingMaps.locationMap.get(request.location) || 0,
      city_encoded: encodingMaps.cityMap.get(request.city || 'Karachi') || 0,
      province_encoded: encodingMaps.provinceMap.get(request.province || 'Sindh') || 0,
      purpose_encoded: 0, // For Sale
      area_category_encoded: this.getAreaCategoryEncoded(request.areaMarla, encodingMaps),
      latitude: defaultCoords.lat,
      longitude: defaultCoords.lng,
      baths: request.bathrooms,
      bedrooms: request.bedrooms,
      area_size: request.areaMarla,
      price_per_unit: 0, // Will be calculated by prediction
      location_premium: encodingMaps.locationPremiumMap.get(request.neighbourhood) || 
                       encodingMaps.locationPremiumMap.get(request.location) || 0,
      property_age_years: propertyAge,
      bath_bedroom_ratio: request.bedrooms > 0 ? request.bathrooms / request.bedrooms : 0,
      area_size_normalized: Math.min(request.areaMarla / 50, 1)
    };
  }

  private getAreaCategoryEncoded(areaMarla: number, encodingMaps: any): number {
    let category = '0-5 Marla';
    if (areaMarla > 20) category = '20+ Marla';
    else if (areaMarla >= 15) category = '15-20 Marla';
    else if (areaMarla >= 10) category = '10-15 Marla';
    else if (areaMarla >= 5) category = '5-10 Marla';
    
    return encodingMaps.areaCategoryMap.get(category) || 0;
  }

  private getMarketGrowthRate(city: string, location: string): number {
    // Market growth rates based on historical data and economic indicators
    const premiumAreas = ['DHA', 'Bahria', 'Gulberg', 'Clifton', 'Defence', 'Cantonment'];
    const isPremiumArea = premiumAreas.some(area => 
      location.toLowerCase().includes(area.toLowerCase())
    );

    const cityGrowthRates: { [key: string]: number } = {
      'Karachi': 0.08,
      'Lahore': 0.10,
      'Islamabad': 0.12,
      'Rawalpindi': 0.09,
      'Faisalabad': 0.06
    };

    let baseRate = cityGrowthRates[city] || 0.07;
    if (isPremiumArea) {
      baseRate += 0.02; // Premium areas grow 2% faster
    }

    return baseRate;
  }

  private getComparableProperties(request: PropertyValuationRequest): Array<{
    price: number;
    location: string;
    areaMarla: number;
    bedrooms: number;
    bathrooms: number;
  }> {
    // Mock comparable properties - in a real implementation, 
    // this would query the database for similar properties
    const basePrice = 5000000; // Base price for calculation
    const areaMultiplier = request.areaMarla * 0.8;
    const roomMultiplier = (request.bedrooms + request.bathrooms) * 0.5;

    return [
      {
        price: Math.round(basePrice * areaMultiplier * roomMultiplier * 0.95),
        location: `${request.neighbourhood} - Block A`,
        areaMarla: request.areaMarla + 0.5,
        bedrooms: request.bedrooms,
        bathrooms: request.bathrooms
      },
      {
        price: Math.round(basePrice * areaMultiplier * roomMultiplier * 1.05),
        location: `${request.neighbourhood} - Block B`,
        areaMarla: request.areaMarla - 0.5,
        bedrooms: request.bedrooms + 1,
        bathrooms: request.bathrooms
      },
      {
        price: Math.round(basePrice * areaMultiplier * roomMultiplier * 1.02),
        location: `${request.location} - Nearby`,
        areaMarla: request.areaMarla,
        bedrooms: request.bedrooms,
        bathrooms: request.bathrooms + 1
      }
    ];
  }

  private generateInsights(request: PropertyValuationRequest, predictedPrice: number): string[] {
    const insights: string[] = [];
    const pricePerMarla = predictedPrice / request.areaMarla;

    // Price per marla insight
    if (pricePerMarla > 2000000) {
      insights.push('This property is in a premium location with high price per marla');
    } else if (pricePerMarla < 500000) {
      insights.push('This property offers good value for money in terms of price per marla');
    }

    // Area size insight
    if (request.areaMarla >= 10) {
      insights.push('Large property size makes this ideal for families or potential rental income');
    } else if (request.areaMarla < 5) {
      insights.push('Compact size makes this property suitable for small families or first-time buyers');
    }

    // Age insight
    const propertyAge = new Date().getFullYear() - request.yearBuilt;
    if (propertyAge < 5) {
      insights.push('Relatively new construction adds to the property value');
    } else if (propertyAge > 20) {
      insights.push('Older construction may require renovation but offers character');
    }

    // Room ratio insight
    const roomRatio = request.bathrooms / request.bedrooms;
    if (roomRatio >= 0.8) {
      insights.push('Good bathroom to bedroom ratio enhances comfort and resale value');
    }

    // Market trend insight
    const marketGrowthRate = this.getMarketGrowthRate(request.city || '', request.location);
    if (marketGrowthRate > 0.08) {
      insights.push('Strong market growth expected in this area over next few years');
    }

    return insights;
  }

  // Get training status
  public getTrainingStatus(): { isTraining: boolean; hasModel: boolean; modelInfo?: any } {
    return {
      isTraining: this.isTraining,
      hasModel: !!this.trainedModel,
      modelInfo: this.trainedModel ? {
        name: this.trainedModel.name,
        accuracy: this.trainedModel.accuracy
      } : undefined
    };
  }

  // Initialize training on startup (optional)
  public async initializeIfNeeded(): Promise<void> {
    if (!this.trainedModel && !this.isTraining) {
      console.log('No trained model found in-memory; checking disk...');
      const loaded = await this.loadSavedModelIfExists();
      if (!loaded) {
        console.log('No saved model found, starting training...');
        await this.trainModels();
      } else {
        console.log('Loaded saved model from disk; skipping training.');
      }
    }
  }

  // Attempt to find a saved model in trained_models and load the best one
  private async loadSavedModelIfExists(): Promise<boolean> {
    try {
      if (!fs.existsSync(this.trainedModelsDir)) return false;

      const subdirs = await fs.promises.readdir(this.trainedModelsDir, { withFileTypes: true });
      const candidates: { dir: string; meta: any }[] = [];

      for (const d of subdirs) {
        if (!d.isDirectory()) continue;
        const metaPath = path.join(this.trainedModelsDir, d.name, 'metadata.json');
        if (!fs.existsSync(metaPath)) continue;
        try {
          const metaRaw = await fs.promises.readFile(metaPath, 'utf8');
          const meta = JSON.parse(metaRaw);
          candidates.push({ dir: path.join(this.trainedModelsDir, d.name), meta });
        } catch (e) {
          // ignore malformed metadata
        }
      }

      if (candidates.length === 0) return false;

      // Pick best by r2Score
      candidates.sort((a, b) => (b.meta.r2Score || b.meta.accuracy || 0) - (a.meta.r2Score || a.meta.accuracy || 0));
      const best = candidates[0];

      // Try to load TF model if model.json exists
      const modelJsonPath = path.join(best.dir, 'model.json');
      if (fs.existsSync(modelJsonPath)) {
        try {
          const modelUrl = `file://${modelJsonPath}`;
          // tf.loadLayersModel expects URL pointing to model.json
          const loaded = await tf.loadLayersModel(modelUrl);
          this.trainedModel = {
            name: best.meta.name || path.basename(best.dir),
            model: loaded,
            accuracy: best.meta.r2Score || best.meta.accuracy || 0,
            scalingParams: best.meta.scalingParams || null,
            encodingMaps: best.meta.encodingMaps || null
          } as TrainedModel;
          console.log(`Loaded TF model from ${best.dir}`);
          return true;
        } catch (err) {
          console.warn('Failed to load TF model from disk:', err);
        }
      }

      // If non-TF serialized model exists, load metadata and basic model object
      const modelJson = path.join(best.dir, 'model.json');
      if (fs.existsSync(modelJson)) {
        try {
          const raw = await fs.promises.readFile(modelJson, 'utf8');
          const parsed = JSON.parse(raw);
          this.trainedModel = {
            name: best.meta.name || path.basename(best.dir),
            model: parsed.model || parsed,
            accuracy: best.meta.r2Score || best.meta.accuracy || 0,
            scalingParams: best.meta.scalingParams || null,
            encodingMaps: best.meta.encodingMaps || null
          } as TrainedModel;
          console.log(`Loaded serialized model from ${best.dir}`);
          return true;
        } catch (err) {
          // ignore parse errors
        }
      }

      return false;
    } catch (err) {
      console.warn('Error scanning trained_models folder:', err);
      return false;
    }
  }
}

// Singleton instance
export const mlService = new MLTrainingService();