
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { db, pool } from '../server/db';
import { MLTrainingService } from '../server/ml/trainingService';

// Force SSL bypass for this script
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function main() {
    console.log("Starting model retraining script...");

    // 1. Clear existing models
    const trainedModelsDir = path.join(process.cwd(), 'trained_models');
    if (fs.existsSync(trainedModelsDir)) {
        console.log("Clearing outdated models...");
        fs.rmSync(trainedModelsDir, { recursive: true, force: true });
        fs.mkdirSync(trainedModelsDir);
    }

    // 2. Initialize Service
    const mlService = new MLTrainingService();

    try {
        console.log("Starting training process (this may take a few minutes)...");
        const result = await mlService.trainModels();

        if (result.success) {
            console.log("Training Successful!");
            console.log("Best Model:", result.modelInfo?.bestModel);
            console.log("Accuracy:", result.modelInfo?.accuracy);
        } else {
            console.error("Training Failed:", result.message);
        }
    } catch (error) {
        console.error("Critical Error during training:", error);
    } finally {
        await pool.end();
    }
}

main();
