#!/usr/bin/env node

/**
 * ML Model Training Script
 * Triggers training for all missing ML models
 */

const http = require('http');

const PORT = process.env.PORT || 5000;
const HOST = 'localhost';

console.log('🚀 Starting ML Model Training...\n');

// Make POST request to training endpoint
const options = {
  hostname: HOST,
  port: PORT,
  path: '/api/ml/train-models',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      console.log('✅ Training Response:\n');
      console.log(`Success: ${result.success}`);
      console.log(`Message: ${result.message}\n`);
      
      if (result.modelInfo) {
        console.log('📊 Model Performance:');
        console.log(`Best Model: ${result.modelInfo.bestModel}`);
        console.log(`Accuracy (R²): ${result.modelInfo.accuracy.toFixed(4)}\n`);
        
        if (result.modelInfo.allResults) {
          console.log('All Models:');
          result.modelInfo.allResults.forEach(model => {
            console.log(`  - ${model.name}: R²=${model.accuracy.toFixed(4)}, MSE=${model.mse.toFixed(0)}, MAE=${model.mae.toFixed(0)}`);
          });
        }
      }
      
      console.log('\n✨ Training completed successfully!');
      console.log('\nYou can now use the AI Valuation feature in the application.');
      
    } catch (error) {
      console.error('❌ Error parsing response:', error);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error triggering training:', error.message);
  console.log('\nMake sure the server is running on port', PORT);
  process.exit(1);
});

// Set timeout for long-running training
req.setTimeout(300000); // 5 minutes timeout

req.end();

console.log('📡 Request sent to server...');
console.log('⏳ This may take 1-2 minutes to complete...\n');
