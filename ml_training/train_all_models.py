#!/usr/bin/env python3
"""
Master Training Script - Train All ML Models
Trains all 6 regression models and compares their performance
"""

import subprocess
import json
import os
from datetime import datetime
import pandas as pd

print("\n" + "=" * 80)
print(" " * 20 + "ML MODEL TRAINING - MASTER SCRIPT")
print("=" * 80)
print("\nThis script will train all 6 machine learning models:")
print("  1. Linear Regression")
print("  2. Decision Tree Regressor")
print("  3. Random Forest Regressor")
print("  4. Gradient Boosting Regressor")
print("  5. XGBoost Regressor")
print("  6. Deep Learning (Neural Network)")
print("\n" + "=" * 80)

# List of training scripts
training_scripts = [
    ("Linear Regression", "ml_training/train_linear_regression.py"),
    ("Decision Tree", "ml_training/train_decision_tree.py"),
    ("Random Forest", "ml_training/train_random_forest.py"),
    ("Gradient Boosting", "ml_training/train_gradient_boosting.py"),
    ("XGBoost", "ml_training/train_xgboost.py"),
    ("Deep Learning", "ml_training/train_deep_learning.py"),
]

results = []

# Train each model
for model_name, script_path in training_scripts:
    print(f"\n{'='*80}")
    print(f"Training: {model_name}")
    print(f"{'='*80}\n")
    
    try:
        # Run training script
        result = subprocess.run(
            ["python", script_path],
            capture_output=True,
            text=True,
            timeout=300  # 5 minutes timeout
        )
        
        if result.returncode == 0:
            print(result.stdout)
            results.append({"model": model_name, "status": "success"})
        else:
            print(f"❌ Error training {model_name}:")
            print(result.stderr)
            results.append({"model": model_name, "status": "failed", "error": result.stderr})
    
    except subprocess.TimeoutExpired:
        print(f"❌ Timeout: {model_name} took too long to train")
        results.append({"model": model_name, "status": "timeout"})
    
    except Exception as e:
        print(f"❌ Exception during {model_name} training: {str(e)}")
        results.append({"model": model_name, "status": "error", "error": str(e)})

# Collect and compare model performance
print("\n" + "=" * 80)
print(" " * 30 + "MODEL COMPARISON")
print("=" * 80 + "\n")

performance_data = []
model_dirs = [
    ("Linear Regression", "trained_models/Linear_Regression"),
    ("Decision Tree", "trained_models/Decision_Tree"),
    ("Random Forest", "trained_models/Random_Forest"),
    ("Gradient Boosting", "trained_models/Gradient_Boosting"),
    ("XGBoost", "trained_models/XGBoost"),
    ("Deep Learning", "trained_models/Deep_Learning"),
]

for model_name, model_dir in model_dirs:
    metadata_path = os.path.join(model_dir, "metadata.json")
    if os.path.exists(metadata_path):
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
            performance_data.append({
                "Model": model_name,
                "R² Score": metadata.get("r2_score", 0),
                "MSE": metadata.get("mse", 0),
                "MAE": metadata.get("mae", 0),
                "Training Samples": metadata.get("training_samples", 0),
                "Test Samples": metadata.get("test_samples", 0)
            })

if performance_data:
    # Create DataFrame for nice display
    df = pd.DataFrame(performance_data)
    df = df.sort_values("R² Score", ascending=False)
    
    print("Performance Metrics (sorted by R² Score):\n")
    print(df.to_string(index=False))
    
    # Find best model
    best_model = df.iloc[0]
    print(f"\n{'='*80}")
    print(f"🏆 BEST MODEL: {best_model['Model']}")
    print(f"{'='*80}")
    print(f"   R² Score: {best_model['R² Score']:.4f}")
    print(f"   Mean Squared Error: {best_model['MSE']:,.0f}")
    print(f"   Mean Absolute Error: {best_model['MAE']:,.0f}")
    print(f"   Training Samples: {best_model['Training Samples']:,}")
    print(f"   Test Samples: {best_model['Test Samples']:,}")
    
    # Save comparison results
    comparison_path = "trained_models/model_comparison.json"
    comparison_data = {
        "comparison_date": datetime.now().isoformat(),
        "models": performance_data,
        "best_model": {
            "name": best_model['Model'],
            "r2_score": float(best_model['R² Score']),
            "mse": float(best_model['MSE']),
            "mae": float(best_model['MAE'])
        }
    }
    
    with open(comparison_path, 'w') as f:
        json.dump(comparison_data, f, indent=2)
    
    print(f"\n📊 Comparison results saved to: {comparison_path}")

else:
    print("❌ No model metadata found. Training may have failed.")

# Summary
print(f"\n{'='*80}")
print(" " * 30 + "TRAINING SUMMARY")
print(f"{'='*80}\n")

successful = sum(1 for r in results if r['status'] == 'success')
failed = len(results) - successful

print(f"Total Models: {len(results)}")
print(f"✅ Successful: {successful}")
print(f"❌ Failed: {failed}")

if failed > 0:
    print("\nFailed models:")
    for r in results:
        if r['status'] != 'success':
            print(f"  - {r['model']}: {r['status']}")

print("\n" + "=" * 80)
print(" " * 25 + "ALL MODELS TRAINING COMPLETE!")
print("=" * 80)
print("\nAll trained models are saved in the 'trained_models/' directory.")
print("Each model includes:")
print("  - model.pkl (trained model)")
print("  - encoders.pkl (label encoders for categorical features)")
print("  - features.pkl (feature information)")
print("  - metadata.json (performance metrics and hyperparameters)")
print("\nYou can now use these models for property price predictions!")
print("=" * 80 + "\n")
