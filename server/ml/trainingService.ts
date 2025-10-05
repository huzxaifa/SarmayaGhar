import { PropertyDataProcessor } from './dataProcessor';
import { MLModelTrainer, type TrainedModel, type ModelResult } from './models';
import * as path from 'path';
import * as fs from 'fs';
import * as tf from '@tensorflow/tfjs';

export interface PropertyValuationRequest {
  yearBuilt: number;
  location: string;
  propertyType: string;
  neighbourhood?: string;
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

  // Helper to detect Git LFS pointer files (they start with a 'version' line)
  private isGitLfsPointer(filePath: string): boolean {
    try {
      if (!fs.existsSync(filePath)) return false;
      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(64);
      const bytes = fs.readSync(fd, buf, 0, 64, 0);
      fs.closeSync(fd);
      const head = buf.slice(0, bytes).toString('utf8').trim();
      return head.startsWith('version https://git-lfs.github.com/spec/v1');
    } catch (e) {
      return false;
    }
  }

  // Try to enable the native TF Node backend if available. This registers
  // filesystem IO handlers and allows tf.loadLayersModel('file://...') to work.
  private async tryEnableTfNodeBackend(): Promise<boolean> {
    try {
      // Try the CPU backend first. Use a variable module name so TypeScript
      // doesn't statically try to resolve the optional dependency.
      const cpuModule = '@tensorflow/tfjs-node';
      await import(cpuModule);
      console.log('Using @tensorflow/tfjs-node backend for TensorFlow.js (native filesystem IO enabled).');
      return true;
    } catch (e) {
      try {
        const gpuModule = '@tensorflow/tfjs-node-gpu';
        // Try GPU variant if available
        await import(gpuModule);
        console.log('Using @tensorflow/tfjs-node-gpu backend for TensorFlow.js (native filesystem IO enabled).');
        return true;
      } catch (inner) {
        // Neither native backend available
        console.log('Native tfjs-node backend not installed; file:// model loading may fall back to manual loader. For best performance and file:// support install @tensorflow/tfjs-node.');
        return false;
      }
    }
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

  // Check which models are already trained locally
  public getTrainedModels(): { name: string; trained: boolean; path?: string; accuracy?: number }[] {
    const allModels = [
      'Linear Regression',
      'Decision Tree', 
      'Random Forest',
      'Gradient Boosting',
      'XGBoost',
      'Deep Learning'
    ];
    const result = allModels.map(modelName => {
      const safeName = modelName.replace(/[^a-z0-9_\-]/gi, '_');
      const modelDir = path.join(this.trainedModelsDir, safeName);
      const metadataPath = path.join(modelDir, 'metadata.json');
      const modelJsonPath = path.join(modelDir, 'model.json');
      const weightsPath = path.join(modelDir, 'weights.bin');

      // If metadata exists try to parse it; if parse fails (for example
      // when Git LFS pointer is present) fall back to checking for model
      // artifacts on disk (model.json / weights.bin).
      if (fs.existsSync(metadataPath)) {
        try {
          const metadataRaw = fs.readFileSync(metadataPath, 'utf8');
          const metadata = JSON.parse(metadataRaw);
          return {
            name: modelName,
            trained: true,
            path: modelDir,
            accuracy: metadata.r2Score || metadata.accuracy || 0
          };
        } catch (e) {
          // fall through to artifact checks below
        }
      }

      // If model artifacts exist, consider the model trained even if
      // metadata.json couldn't be parsed (common when using Git LFS)
      if (fs.existsSync(modelJsonPath) || fs.existsSync(weightsPath) || fs.existsSync(modelDir)) {
        // modelDir existence alone might be from a leftover folder; ensure
        // it contains meaningful artifacts where possible (not Git LFS pointers)
        let hasArtifacts = false;

        if (fs.existsSync(modelJsonPath) && !this.isGitLfsPointer(modelJsonPath)) {
          hasArtifacts = true;
        }

        if (!hasArtifacts && fs.existsSync(weightsPath) && !this.isGitLfsPointer(weightsPath)) {
          try {
            const stat = fs.statSync(weightsPath);
            // consider weights present if size > 1KB
            if (stat.size > 1024) hasArtifacts = true;
          } catch (_) {}
        }

        if (!hasArtifacts) {
          // check for any non-pointer files in dir
          try {
            const files = fs.readdirSync(modelDir);
            for (const f of files) {
              const p = path.join(modelDir, f);
              if (fs.statSync(p).isFile() && !this.isGitLfsPointer(p)) {
                hasArtifacts = true;
                break;
              }
            }
          } catch (_) {}
        }

        if (hasArtifacts) {
          // Try to read accuracy from metadata if present, otherwise leave undefined
          let accuracy: number | undefined = undefined;
          try {
            if (fs.existsSync(metadataPath)) {
              const raw = fs.readFileSync(metadataPath, 'utf8');
              const parsed = JSON.parse(raw);
              accuracy = parsed.r2Score || parsed.accuracy || undefined;
            }
          } catch (_) {
            // ignore parse errors
          }

          return {
            name: modelName,
            trained: true,
            path: modelDir,
            accuracy
          };
        }
      }

      return {
        name: modelName,
        trained: false
      };
    });

    return result;
  }

  // Get list of models that need to be trained
  public getUntrainedModels(): string[] {
    const trainedModels = this.getTrainedModels();
    return trainedModels.filter(model => !model.trained).map(model => model.name);
  }

  // Train only specific models that are missing
  public async trainMissingModels(): Promise<{ success: boolean; message: string; modelInfo?: any; trainedModels?: any[] }> {
    if (this.isTraining) {
      return { success: false, message: 'Training already in progress' };
    }

    const untrainedModels = this.getUntrainedModels();
    
    if (untrainedModels.length === 0) {
      const trainedModels = this.getTrainedModels().filter(m => m.trained);
      return { 
        success: true, 
        message: 'All models are already trained!',
        trainedModels: trainedModels
      };
    }

    this.isTraining = true;
    console.log(`Training missing models: ${untrainedModels.join(', ')}`);

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

      // Train only missing models
      const trainer = new MLModelTrainer();
      const { results, bestModel } = await trainer.trainSelectedModels(
        scaledFeatures, 
        targets, 
        scalingParams, 
        encodingMaps,
        untrainedModels
      );

      this.trainedModel = bestModel;
      this.isTraining = false;

      console.log(`Training completed! Trained ${results.length} missing models. Best model: ${bestModel.name} with accuracy: ${bestModel.accuracy.toFixed(4)}`);

      const allTrainedModels = this.getTrainedModels().filter(m => m.trained);

      return {
        success: true,
        message: `Training completed successfully. Trained ${results.length} missing models: ${untrainedModels.join(', ')}`,
        modelInfo: {
          bestModel: bestModel.name,
          accuracy: bestModel.accuracy,
          newlyTrained: results.map((r: ModelResult) => ({
            name: r.name,
            accuracy: r.r2Score,
            mse: r.mse,
            mae: r.mae
          })),
          allTrained: allTrainedModels
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

    // Ensure encoding maps and scaling params are available even when loading
    // a pre-trained model from disk that lacks serialized metadata.
    if (!this.trainedModel.encodingMaps || !this.trainedModel.scalingParams) {
      try {
        // Load dataset and rebuild processor state
        const csvPath = path.join(process.cwd(), 'attached_assets', 'zameen-updated_1757269388792.csv');
        if (!fs.existsSync(csvPath)) {
          throw new Error('Dataset file not found for rebuilding encodings/scaling.');
        }

        const { features } = await this.processor.loadAndPreprocessData(csvPath);
        const { scaledFeatures, scalingParams } = this.processor.scaleFeatures(features as any);
        // Persist encoding maps and scaling params onto trained model
        const encodingMaps = this.processor.getEncodingMaps();
        this.trainedModel.scalingParams = scalingParams;
        this.trainedModel.encodingMaps = encodingMaps as any;
        // Touch scaledFeatures to avoid unused var warning
        void scaledFeatures;
      } catch (rebuildErr) {
        console.warn('Failed to rebuild encoding maps/scaling params:', rebuildErr);
        throw new Error('Model metadata incomplete. Please (re)train models to enable predictions.');
      }
    }

    // Normalize encoding maps to Map instances if they were deserialized as plain objects
    if (this.trainedModel.encodingMaps) {
      this.trainedModel.encodingMaps = this.normalizeEncodingMaps(this.trainedModel.encodingMaps);
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

  // Ensure each encoding map is a real Map with .get available
  private normalizeEncodingMaps(encodingMaps: any): any {
    const toMap = (maybe: any): Map<string, number> => {
      if (maybe instanceof Map) return maybe;
      if (maybe && typeof maybe === 'object') {
        return new Map<string, number>(Object.entries(maybe) as [string, number][]);
      }
      return new Map();
    };

    return {
      locationMap: toMap(encodingMaps.locationMap),
      propertyTypeMap: toMap(encodingMaps.propertyTypeMap),
      cityMap: toMap(encodingMaps.cityMap),
      provinceMap: toMap(encodingMaps.provinceMap),
      purposeMap: toMap(encodingMaps.purposeMap),
      areaCategoryMap: toMap(encodingMaps.areaCategoryMap),
      locationPremiumMap: toMap(encodingMaps.locationPremiumMap),
      cityMeanPrices: toMap(encodingMaps.cityMeanPrices),
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
        const dirPath = path.join(this.trainedModelsDir, d.name);
        const metaPath = path.join(dirPath, 'metadata.json');
        const modelJsonPath = path.join(dirPath, 'model.json');
        const weightsPath = path.join(dirPath, 'weights.bin');

        // Try to read metadata if available and not a Git LFS pointer
        let meta: any = null;
        if (fs.existsSync(metaPath) && !this.isGitLfsPointer(metaPath)) {
          try {
            const metaRaw = await fs.promises.readFile(metaPath, 'utf8');
            meta = JSON.parse(metaRaw);
          } catch (e) {
            // metadata exists but couldn't be parsed
            meta = null;
          }
        }

        // Consider candidate if we have parsed metadata or if model artifacts exist (and are not pointers)
        let hasArtifacts = false;
        if (fs.existsSync(modelJsonPath) && !this.isGitLfsPointer(modelJsonPath)) hasArtifacts = true;
        if (!hasArtifacts && fs.existsSync(weightsPath) && !this.isGitLfsPointer(weightsPath)) {
          try { if (fs.statSync(weightsPath).size > 1024) hasArtifacts = true; } catch (_) {}
        }
        if (!hasArtifacts) {
          try {
            const files = await fs.promises.readdir(dirPath);
            for (const f of files) {
              const p = path.join(dirPath, f);
              try {
                if (fs.statSync(p).isFile() && !this.isGitLfsPointer(p)) {
                  hasArtifacts = true;
                  break;
                }
              } catch (_) {}
            }
          } catch (_) {}
        }

        if (meta || hasArtifacts) {
          candidates.push({ dir: dirPath, meta: meta || {} });
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
          // tf.loadLayersModel expects URL pointing to model.json. In Node
          // environments without the `@tensorflow/tfjs-node` filesystem IO
          // handler, tfjs may attempt to use fetch which doesn't support
          // file:// URLs and will fail with a 'fetch failed' / 'not implemented' error.
          // First try the standard loader; if it fails due to fetch/file://,
          // fall back to a manual loader that reads model.json and weights.bin
          // from disk and constructs an IOHandler for tf.loadLayersModel.
          try {
            // Try to enable native tfjs-node backend which provides proper
            // file:// filesystem handlers. If the native backend is not
            // available, don't attempt file:// since it will likely fail
            // due to Node fetch limitations; jump straight to manual loader.
            const enabled = await this.tryEnableTfNodeBackend();
            if (enabled) {
              const loaded = await tf.loadLayersModel(modelUrl);
              this.trainedModel = {
                name: best.meta.name || path.basename(best.dir),
                model: loaded,
                accuracy: best.meta.r2Score || best.meta.accuracy || 0,
                scalingParams: best.meta.scalingParams || null,
                encodingMaps: best.meta.encodingMaps || null
              } as TrainedModel;
              console.log(`Loaded TF model from ${best.dir} (via file://)`);
              return true;
            } else {
              console.warn('Skipping tf.loadLayersModel(file://) because native tfjs-node backend is not available; attempting manual loader');
            }
          } catch (innerErr) {
            // If error is related to fetch/file protocol, attempt manual load
            console.warn('tf.loadLayersModel(file://) failed or was skipped, attempting manual load:', innerErr && (innerErr as Error).message);

            try {
              const raw = await fs.promises.readFile(modelJsonPath, 'utf8');
              const modelJson = JSON.parse(raw);

              // weights manifest usually references weights.bin
              // try to read weights.bin (first path in manifest)
              let weightDataBuffer: Buffer | null = null;
              if (Array.isArray(modelJson.weightsManifest) && modelJson.weightsManifest.length > 0) {
                const firstEntry = modelJson.weightsManifest[0];
                const firstPath = Array.isArray(firstEntry.paths) && firstEntry.paths.length > 0 ? firstEntry.paths[0] : null;
                if (firstPath) {
                  const weightsPath = path.join(best.dir, firstPath);
                  if (fs.existsSync(weightsPath)) {
                    weightDataBuffer = await fs.promises.readFile(weightsPath);
                  }
                }
              }

              // If no separate weights path found, also try weights.bin at root
              if (!weightDataBuffer) {
                const altWeights = path.join(best.dir, 'weights.bin');
                if (fs.existsSync(altWeights)) {
                  weightDataBuffer = await fs.promises.readFile(altWeights);
                }
              }

              const weightSpecs = Array.isArray(modelJson.weightsManifest)
                ? modelJson.weightsManifest.flatMap((m: any) => m.weights || [])
                : [];

              if (!modelJson.modelTopology) {
                throw new Error('model.json does not contain modelTopology');
              }

              // Construct a custom IOHandler for loading from memory
              const ioHandler: tf.io.IOHandler = {
                load: async () => {
                  const weightDataArrayBuffer = weightDataBuffer
                    ? weightDataBuffer.buffer.slice(weightDataBuffer.byteOffset, weightDataBuffer.byteOffset + weightDataBuffer.byteLength)
                    : new ArrayBuffer(0);

                  const artifacts: tf.io.ModelArtifacts = {
                    modelTopology: modelJson.modelTopology,
                    weightSpecs: weightSpecs,
                    weightData: weightDataArrayBuffer
                  } as any;

                  return artifacts;
                }
              };

              const loadedManual = await tf.loadLayersModel(ioHandler);
              this.trainedModel = {
                name: best.meta.name || path.basename(best.dir),
                model: loadedManual,
                accuracy: best.meta.r2Score || best.meta.accuracy || 0,
                scalingParams: best.meta.scalingParams || null,
                encodingMaps: best.meta.encodingMaps || null
              } as TrainedModel;
              console.log(`Loaded TF model from ${best.dir} (manual)`);
              return true;
            } catch (manualErr) {
              console.warn('Manual TF model load failed:', manualErr);
            }
          }
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