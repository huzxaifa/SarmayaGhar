import * as tf from '@tensorflow/tfjs';
import * as fs from 'fs';
import * as path from 'path';


export interface ModelResult {
  name: string;
  accuracy: number;
  mse: number;
  mae: number;
  r2Score: number;
  predictions: number[];
  model?: any;
}

export interface TrainedModel {
  name: string;
  model: any;
  accuracy: number;
  scalingParams: any;
  encodingMaps: any;
}

export class MLModelTrainer {
  
  // Decision Tree Regressor (Simple implementation)
  public async trainDecisionTree(X: number[][], y: number[]): Promise<ModelResult> {
    console.log('Training Decision Tree Regressor...');
    
    // Simple decision tree implementation using mean splits
    const predictions = this.decisionTreePredict(X, y);
    const metrics = this.calculateMetrics(y, predictions);
    
    return {
      name: 'Decision Tree',
      ...metrics,
      predictions,
      model: { type: 'decision_tree', trainedData: { X, y } }
    };
  }

  // Random Forest Regressor (Ensemble of decision trees)
  public async trainRandomForest(X: number[][], y: number[], numTrees: number = 10): Promise<ModelResult> {
    console.log('Training Random Forest Regressor...');
    
    const predictions = this.randomForestPredict(X, y, numTrees);
    const metrics = this.calculateMetrics(y, predictions);
    
    return {
      name: 'Random Forest',
      ...metrics,
      predictions,
      model: { type: 'random_forest', trainedData: { X, y }, numTrees }
    };
  }

  // Linear Regression using TensorFlow
  public async trainLinearRegression(X: number[][], y: number[]): Promise<ModelResult> {
    console.log('Training Linear Regression...');
    
    const xTensor = tf.tensor2d(X);
    const yTensor = tf.tensor2d(y, [y.length, 1]);
    
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [X[0].length],
          units: 1,
          activation: 'linear'
        })
      ]
    });
    
    model.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });
    
    await model.fit(xTensor, yTensor, {
      epochs: 100,
      validationSplit: 0.2,
      verbose: 0
    });
    
    const predictionTensor = model.predict(xTensor) as tf.Tensor;
    const predictions = Array.from(await predictionTensor.data());
    
    const metrics = this.calculateMetrics(y, predictions);
    
    // Clean up tensors
    xTensor.dispose();
    yTensor.dispose();
    predictionTensor.dispose();
    
    return {
      name: 'Linear Regression',
      ...metrics,
      predictions,
      model
    };
  }

  // Gradient Boosting (simplified implementation)
  public async trainGradientBoosting(X: number[][], y: number[], numEstimators: number = 20): Promise<ModelResult> {
    console.log('Training Gradient Boosting Regressor...');
    
    const predictions = this.gradientBoostingPredict(X, y, numEstimators);
    const metrics = this.calculateMetrics(y, predictions);
    
    return {
      name: 'Gradient Boosting',
      ...metrics,
      predictions,
      model: { type: 'gradient_boosting', trainedData: { X, y }, numEstimators }
    };
  }

  // XGBoost-like implementation (simplified)
  public async trainXGBoost(X: number[][], y: number[]): Promise<ModelResult> {
    console.log('Training XGBoost Regressor...');
    
    // Enhanced gradient boosting with regularization
    const predictions = this.xgboostPredict(X, y);
    const metrics = this.calculateMetrics(y, predictions);
    
    return {
      name: 'XGBoost',
      ...metrics,
      predictions,
      model: { type: 'xgboost', trainedData: { X, y } }
    };
  }

  // Deep Learning Model using TensorFlow
  public async trainDeepLearning(X: number[][], y: number[]): Promise<ModelResult> {
    console.log('Training Deep Learning Model...');
    
    const xTensor = tf.tensor2d(X);
    const yTensor = tf.tensor2d(y, [y.length, 1]);
    
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [X[0].length],
          units: 128,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 64,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 1,
          activation: 'linear'
        })
      ]
    });
    
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });
    
    await model.fit(xTensor, yTensor, {
      epochs: 200,
      validationSplit: 0.2,
      batchSize: 32,
      verbose: 0
    });
    
    const predictionTensor = model.predict(xTensor) as tf.Tensor;
    const predictions = Array.from(await predictionTensor.data());
    
    const metrics = this.calculateMetrics(y, predictions);
    
    // Clean up tensors
    xTensor.dispose();
    yTensor.dispose();
    predictionTensor.dispose();
    
    return {
      name: 'Deep Learning',
      ...metrics,
      predictions,
      model
    };
  }

  // Train all models and return the best one
  public async trainAllModels(X: number[][], y: number[], scalingParams: any, encodingMaps: any): Promise<{ results: ModelResult[], bestModel: TrainedModel }> {
    console.log('Training all models (sequential, saving each)...');

    const results: ModelResult[] = [];

    // Train models one-by-one, save after each, and free memory before next
    const trainedDirRoot = path.join(process.cwd(), 'trained_models');
    await fs.promises.mkdir(trainedDirRoot, { recursive: true });

    // Helper to save and cleanup per model
    const saveAndCleanup = async (res: ModelResult) => {
      try {
        const safeName = res.name.replace(/[^a-z0-9_\-]/gi, '_');
        const dir = path.join(trainedDirRoot, safeName);
        await fs.promises.mkdir(dir, { recursive: true });

        // Save tfjs models (they have model.save) using a save handler if file:// not available
        if (res.model && typeof res.model.save === 'function') {
          try {
            // Prefer file:// if available in the environment
            const fileUrl = `file://${dir}`;
            await res.model.save(fileUrl);
          } catch (err) {
            // Fallback: use tf.io.withSaveHandler to obtain artifacts and write them
            try {
              const saveHandler = tf.io.withSaveHandler(async (artifacts) => {
                // model.json content
                const modelJson = {
                  modelTopology: artifacts.modelTopology,
                  weightsManifest: [{ paths: ['weights.bin'], weights: artifacts.weightSpecs }]
                };
                await fs.promises.writeFile(path.join(dir, 'model.json'), JSON.stringify(modelJson, null, 2));
                // weights.bin
                if (artifacts.weightData) {
                  // artifacts.weightData can be ArrayBuffer or ArrayBufferView
                  let buffer: Buffer;
                  if (ArrayBuffer.isView(artifacts.weightData)) {
                    // typed array view
                    buffer = Buffer.from((artifacts.weightData as ArrayBufferView).buffer);
                  } else {
                    buffer = Buffer.from(new Uint8Array(artifacts.weightData as ArrayBuffer));
                  }
                  await fs.promises.writeFile(path.join(dir, 'weights.bin'), buffer);
                }
                const saveRes: tf.io.SaveResult = ({
                  modelArtifactsInfo: {
                    dateSaved: new Date(),
                    modelTopologyType: 'JSON',
                    weightDataBytes: artifacts.weightData ? (ArrayBuffer.isView(artifacts.weightData) ? (artifacts.weightData as ArrayBufferView).byteLength : (artifacts.weightData as ArrayBuffer).byteLength) : 0
                  }
                } as unknown) as tf.io.SaveResult;
                return saveRes;
              });

              await res.model.save(saveHandler as any);
            } catch (innerErr) {
              console.warn(`Failed to save TF model ${res.name}:`, innerErr);
            }
          }

          // Dispose tf model to free memory
          try { res.model.dispose && res.model.dispose(); } catch (disposeErr) { /* ignore */ }
        } else {
          // Non-tf model: serialize trained data (may be custom object)
          try {
            const serializable = { model: res.model };
            await fs.promises.writeFile(path.join(dir, 'model.json'), JSON.stringify(serializable, null, 2));
          } catch (serErr) {
            console.warn(`Failed to serialize model ${res.name}:`, serErr);
          }
          // Attempt to release large references
          try {
            if (res.model && typeof res.model === 'object' && 'trainedData' in res.model) {
              // @ts-ignore
              res.model.trainedData = undefined;
            }
          } catch (_) {}
        }

        // Save metrics/metadata
        const meta = {
          name: res.name,
          r2Score: res.r2Score,
          mse: res.mse,
          mae: res.mae,
          generatedAt: new Date().toISOString(),
        };
        await fs.promises.writeFile(path.join(dir, 'metadata.json'), JSON.stringify(meta, null, 2));
      } catch (saveErr) {
        console.warn('Error saving model to disk:', saveErr);
      }
    };

    // Train and save models sequentially
    const lrRes = await this.trainLinearRegression(X, y);
    results.push(lrRes);
    await saveAndCleanup(lrRes);

    const dtRes = await this.trainDecisionTree(X, y);
    results.push(dtRes);
    await saveAndCleanup(dtRes);

    const rfRes = await this.trainRandomForest(X, y);
    results.push(rfRes);
    await saveAndCleanup(rfRes);

    const gbRes = await this.trainGradientBoosting(X, y);
    results.push(gbRes);
    await saveAndCleanup(gbRes);

    const xgbRes = await this.trainXGBoost(X, y);
    results.push(xgbRes);
    await saveAndCleanup(xgbRes);

    const dlRes = await this.trainDeepLearning(X, y);
    results.push(dlRes);
    await saveAndCleanup(dlRes);
    
    // Find best model based on R² score
    let bestResult = results[0];
    results.forEach(result => {
      if (result.r2Score > bestResult.r2Score) {
        bestResult = result;
      }
    });
    
    console.log(`\nModel Performance Results:`);
    results.forEach(result => {
      console.log(`${result.name}: R²=${result.r2Score.toFixed(4)}, MSE=${result.mse.toFixed(0)}, MAE=${result.mae.toFixed(0)}`);
    });
    console.log(`\nBest Model: ${bestResult.name} with R² = ${bestResult.r2Score.toFixed(4)}`);
    
    const bestModel: TrainedModel = {
      name: bestResult.name,
      model: bestResult.model,
      accuracy: bestResult.r2Score,
      scalingParams,
      encodingMaps
    };
    
    return { results, bestModel };
  }

  // Simple Decision Tree prediction
  private decisionTreePredict(X: number[][], y: number[]): number[] {
    // Simple implementation: split on feature mean and use mean of target values
    const predictions: number[] = [];
    
    for (let i = 0; i < X.length; i++) {
      let prediction = y.reduce((a, b) => a + b, 0) / y.length; // global mean as fallback
      
      // Simple splitting logic based on first few features
      if (X[i][10] > 0) { // area_size
        const similarAreaIndices = X.map((row, idx) => 
          Math.abs(row[10] - X[i][10]) < 2 ? idx : -1
        ).filter(idx => idx !== -1);
        
        if (similarAreaIndices.length > 0) {
          prediction = similarAreaIndices.reduce((sum, idx) => sum + y[idx], 0) / similarAreaIndices.length;
        }
      }
      
      predictions.push(prediction);
    }
    
    return predictions;
  }

  // Random Forest prediction
  private randomForestPredict(X: number[][], y: number[], numTrees: number): number[] {
    const predictions: number[] = [];
    
    for (let i = 0; i < X.length; i++) {
      const treePredictions: number[] = [];
      
      // Create multiple trees with bootstrap sampling
      for (let tree = 0; tree < numTrees; tree++) {
        // Bootstrap sample
        const sampleSize = Math.floor(X.length * 0.8);
        const sampleIndices = Array.from({ length: sampleSize }, () => 
          Math.floor(Math.random() * X.length)
        );
        
        // Simple tree prediction on bootstrap sample
        const sampleY = sampleIndices.map(idx => y[idx]);
        const sampleMean = sampleY.reduce((a, b) => a + b, 0) / sampleY.length;
        treePredictions.push(sampleMean);
      }
      
      // Average predictions from all trees
      predictions.push(treePredictions.reduce((a, b) => a + b, 0) / treePredictions.length);
    }
    
    return predictions;
  }

  // Gradient Boosting prediction
  private gradientBoostingPredict(X: number[][], y: number[], numEstimators: number): number[] {
    const predictions = new Array(X.length).fill(0);
    let residuals = [...y];
    
    const learningRate = 0.1;
    
    for (let estimator = 0; estimator < numEstimators; estimator++) {
      // Simple weak learner: predict mean of residuals for similar samples
      const weakPredictions: number[] = [];
      
      for (let i = 0; i < X.length; i++) {
        // Find samples with similar area size and location
        const similarIndices = X.map((row, idx) => {
          const areaMatch = Math.abs(row[10] - X[i][10]) < 1; // area_size
          const locationMatch = Math.abs(row[1] - X[i][1]) < 1; // location_encoded
          return (areaMatch || locationMatch) ? idx : -1;
        }).filter(idx => idx !== -1);
        
        const weakPrediction = similarIndices.length > 0
          ? similarIndices.reduce((sum, idx) => sum + residuals[idx], 0) / similarIndices.length
          : 0;
        
        weakPredictions.push(weakPrediction);
      }
      
      // Update predictions and residuals
      for (let i = 0; i < predictions.length; i++) {
        predictions[i] += learningRate * weakPredictions[i];
        residuals[i] = y[i] - predictions[i];
      }
    }
    
    return predictions;
  }

  // XGBoost-like prediction with regularization
  private xgboostPredict(X: number[][], y: number[]): number[] {
    // Enhanced gradient boosting with feature importance and regularization
    const predictions = new Array(X.length).fill(0);
    let residuals = [...y];
    
    const learningRate = 0.05;
    const numRounds = 50;
    const lambda = 1.0; // L2 regularization
    
    for (let round = 0; round < numRounds; round++) {
      const weakPredictions: number[] = [];
      
      for (let i = 0; i < X.length; i++) {
        // Multi-feature similarity matching with regularization
        let weightedSum = 0;
        let totalWeight = 0;
        
        for (let j = 0; j < X.length; j++) {
          let similarity = 0;
          
          // Feature importance weights (area, location, property type, bedrooms)
          const featureWeights = [0.1, 0.2, 0.15, 0.1, 0.1, 0.05, 0.05, 0.05, 0.1, 0.1, 0.3, 0.2, 0.15, 0.1, 0.1, 0.1];
          
          for (let f = 0; f < Math.min(X[i].length, featureWeights.length); f++) {
            const featureSimilarity = 1 / (1 + Math.abs(X[i][f] - X[j][f]));
            similarity += featureWeights[f] * featureSimilarity;
          }
          
          if (similarity > 0.5) {
            const weight = similarity / (1 + lambda);
            weightedSum += weight * residuals[j];
            totalWeight += weight;
          }
        }
        
        const weakPrediction = totalWeight > 0 ? weightedSum / totalWeight : 0;
        weakPredictions.push(weakPrediction);
      }
      
      // Update with learning rate and regularization
      for (let i = 0; i < predictions.length; i++) {
        const update = learningRate * weakPredictions[i];
        predictions[i] += update;
        residuals[i] = y[i] - predictions[i];
      }
    }
    
    return predictions;
  }

  // Calculate regression metrics
  private calculateMetrics(yTrue: number[], yPred: number[]): { accuracy: number; mse: number; mae: number; r2Score: number } {
    const n = yTrue.length;
    let mse = 0;
    let mae = 0;
    
    // Calculate MSE and MAE
    for (let i = 0; i < n; i++) {
      const error = yTrue[i] - yPred[i];
      mse += error * error;
      mae += Math.abs(error);
    }
    
    mse /= n;
    mae /= n;
    
    // Calculate R² score
    const yMean = yTrue.reduce((a, b) => a + b, 0) / n;
    let totalSumSquares = 0;
    let residualSumSquares = 0;
    
    for (let i = 0; i < n; i++) {
      totalSumSquares += (yTrue[i] - yMean) ** 2;
      residualSumSquares += (yTrue[i] - yPred[i]) ** 2;
    }
    
    const r2Score = 1 - (residualSumSquares / totalSumSquares);
    
    return {
      accuracy: r2Score,
      mse,
      mae,
      r2Score
    };
  }

  // Make prediction with trained model
  public async predict(model: TrainedModel, features: number[]): Promise<number> {
    if (model.model?.predict) {
      // TensorFlow model
      const inputTensor = tf.tensor2d([features]);
      const predictionTensor = model.model.predict(inputTensor) as tf.Tensor;
      const prediction = Array.from(await predictionTensor.data())[0];
      
      inputTensor.dispose();
      predictionTensor.dispose();
      
      return prediction;
    } else {
      // Custom model - use simplified prediction
      const trainedData = model.model.trainedData;
      if (!trainedData) return 0;
      
      switch (model.model.type) {
        case 'xgboost':
          return this.predictXGBoost(features, trainedData);
        case 'gradient_boosting':
          return this.predictGradientBoosting(features, trainedData);
        case 'random_forest':
          return this.predictRandomForest(features, trainedData);
        default:
          return this.predictDecisionTree(features, trainedData);
      }
    }
  }

  private predictXGBoost(features: number[], trainedData: { X: number[][], y: number[] }): number {
    const { X, y } = trainedData;
    let weightedSum = 0;
    let totalWeight = 0;
    
    // Find most similar properties
    for (let i = 0; i < X.length; i++) {
      let similarity = 0;
      const featureWeights = [0.1, 0.2, 0.15, 0.1, 0.1, 0.05, 0.05, 0.05, 0.1, 0.1, 0.3, 0.2, 0.15, 0.1, 0.1, 0.1];
      
      for (let f = 0; f < Math.min(features.length, featureWeights.length); f++) {
        const featureSimilarity = 1 / (1 + Math.abs(features[f] - X[i][f]));
        similarity += featureWeights[f] * featureSimilarity;
      }
      
      if (similarity > 0.3) {
        weightedSum += similarity * y[i];
        totalWeight += similarity;
      }
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : y.reduce((a, b) => a + b, 0) / y.length;
  }

  private predictGradientBoosting(features: number[], trainedData: { X: number[][], y: number[] }): number {
    return this.predictXGBoost(features, trainedData); // Similar implementation
  }

  private predictRandomForest(features: number[], trainedData: { X: number[][], y: number[] }): number {
    return this.predictXGBoost(features, trainedData); // Similar implementation
  }

  private predictDecisionTree(features: number[], trainedData: { X: number[][], y: number[] }): number {
    const { X, y } = trainedData;
    
    // Find properties with similar area size
    const similarIndices = X.map((row, idx) => 
      Math.abs(row[10] - features[10]) < 2 ? idx : -1
    ).filter(idx => idx !== -1);
    
    if (similarIndices.length > 0) {
      return similarIndices.reduce((sum, idx) => sum + y[idx], 0) / similarIndices.length;
    }
    
    return y.reduce((a, b) => a + b, 0) / y.length;
  }
}