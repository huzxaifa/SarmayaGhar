"""
Real Estate Price Prediction - LightGBM Training with K-Fold CV
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import KFold
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import lightgbm as lgb
import joblib
import warnings
warnings.filterwarnings('ignore')

sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (12, 6)

class LightGBMTrainer:
    def __init__(self, dataFile):
        self.dataFile = dataFile
        self.df = None
        self.XTrain = None
        self.XTest = None
        self.yTrain = None
        self.yTest = None
        self.model = None
        self.featureNames = None
        self.kfoldResults = []
        
    def loadData(self):
        """Load cleaned data"""
        print("Loading cleaned data...")
        self.df = pd.read_csv(self.dataFile)
        print(f"Loaded {len(self.df)} rows and {len(self.df.columns)} columns")
        return self
    
    def prepareFeatures(self):
        """Prepare features and target"""
        print("\nPreparing features...")
        
        X = self.df.drop(columns=['price', 'logPrice'])
        y = self.df['logPrice']
        
        self.featureNames = X.columns.tolist()
        print(f"Features: {len(self.featureNames)}")
        print(f"Predicting: logPrice (will convert back to price for evaluation)")
        
        return X, y
    
    def trainTestSplit(self, X, y, testSize=0.2):
        """Split data with shuffling"""
        print("\nSplitting data...")
        
        from sklearn.model_selection import train_test_split
        
        self.XTrain, self.XTest, self.yTrain, self.yTest = train_test_split(
            X, y, test_size=testSize, random_state=42, shuffle=True
        )
        
        print(f"Train set: {len(self.XTrain)} samples")
        print(f"Test set: {len(self.XTest)} samples")
        
        return self
    
    def performKFoldCV(self, X, y, nSplits=5):
        """
        Perform K-Fold Cross-Validation to assess model bias
        """
        print("\n" + "="*80)
        print(f"PERFORMING {nSplits}-FOLD CROSS-VALIDATION")
        print("="*80)
        
        kf = KFold(n_splits=nSplits, shuffle=True, random_state=42)
        
        params = {
            'objective': 'regression',
            'metric': 'rmse',
            'boosting_type': 'gbdt',
            'num_leaves': 31,
            'max_depth': 8,
            'learning_rate': 0.05,
            'feature_fraction': 0.8,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'min_child_samples': 20,
            'reg_alpha': 0.1,
            'reg_lambda': 0.1,
            'verbose': -1,
            'random_state': 42
        }
        
        foldResults = []
        
        for foldIdx, (trainIdx, valIdx) in enumerate(kf.split(X), 1):
            print(f"\nTraining Fold {foldIdx}/{nSplits}...")
            
            XTrainFold = X.iloc[trainIdx]
            yTrainFold = y.iloc[trainIdx]
            XValFold = X.iloc[valIdx]
            yValFold = y.iloc[valIdx]
            
            trainData = lgb.Dataset(XTrainFold, label=yTrainFold)
            valData = lgb.Dataset(XValFold, label=yValFold, reference=trainData)
            
            model = lgb.train(
                params,
                trainData,
                num_boost_round=500,
                valid_sets=[valData],
                callbacks=[
                    lgb.early_stopping(stopping_rounds=50),
                    lgb.log_evaluation(period=0)
                ]
            )
            
            yPred = model.predict(XValFold, num_iteration=model.best_iteration)
            
            rmse = np.sqrt(mean_squared_error(yValFold, yPred))
            mae = mean_absolute_error(yValFold, yPred)
            r2 = r2_score(yValFold, yPred)
            mape = np.mean(np.abs((yValFold - yPred) / yValFold)) * 100
            
            foldResults.append({
                'fold': foldIdx,
                'rmse': rmse,
                'mae': mae,
                'r2': r2,
                'mape': mape
            })
            
            print(f"  RMSE: {rmse:,.2f}, MAE: {mae:,.2f}, R2: {r2:.4f}, MAPE: {mape:.2f}%")
        
        self.kfoldResults = pd.DataFrame(foldResults)
        
        print("\n" + "="*80)
        print("K-FOLD CROSS-VALIDATION SUMMARY")
        print("="*80)
        print(self.kfoldResults.to_string(index=False))
        print("\nMean Metrics:")
        print(f"  RMSE: {self.kfoldResults['rmse'].mean():,.2f} +/- {self.kfoldResults['rmse'].std():,.2f}")
        print(f"  MAE: {self.kfoldResults['mae'].mean():,.2f} +/- {self.kfoldResults['mae'].std():,.2f}")
        print(f"  R2: {self.kfoldResults['r2'].mean():.4f} +/- {self.kfoldResults['r2'].std():.4f}")
        print(f"  MAPE: {self.kfoldResults['mape'].mean():.2f}% +/- {self.kfoldResults['mape'].std():.2f}%")
        
        stdR2 = self.kfoldResults['r2'].std()
        if stdR2 < 0.02:
            print("\nBias Assessment: LOW BIAS (consistent performance across folds)")
        elif stdR2 < 0.05:
            print("\nBias Assessment: MODERATE BIAS (acceptable variation)")
        else:
            print("\nBias Assessment: HIGH BIAS (high variation, possible overfitting)")
        
        return self
    
    def trainFinalModel(self):
        """Train final model on full training set"""
        print("\n" + "="*80)
        print("TRAINING FINAL MODEL")
        print("="*80)
        
        params = {
            'objective': 'regression',
            'metric': 'rmse',
            'boosting_type': 'gbdt',
            'num_leaves': 31,
            'max_depth': 8,
            'learning_rate': 0.05,
            'feature_fraction': 0.8,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'min_child_samples': 20,
            'reg_alpha': 0.1,
            'reg_lambda': 0.1,
            'verbose': -1,
            'random_state': 42
        }
        
        trainData = lgb.Dataset(self.XTrain, label=self.yTrain)
        testData = lgb.Dataset(self.XTest, label=self.yTest, reference=trainData)
        
        evalsResult = {}
        
        self.model = lgb.train(
            params,
            trainData,
            num_boost_round=1000,
            valid_sets=[trainData, testData],
            valid_names=['train', 'test'],
            callbacks=[
                lgb.early_stopping(stopping_rounds=50),
                lgb.log_evaluation(period=100),
                lgb.record_evaluation(evalsResult)
            ]
        )
        
        print(f"\nTraining complete. Best iteration: {self.model.best_iteration}")
        
        self.trainingHistory = evalsResult
        
        return self
    
    def calculateMetrics(self, yTrue, yPred, datasetName):
        """Calculate evaluation metrics - convert log predictions back to price"""
        yTruePrice = np.expm1(yTrue)
        yPredPrice = np.expm1(yPred)
        
        rmse = np.sqrt(mean_squared_error(yTruePrice, yPredPrice))
        mae = mean_absolute_error(yTruePrice, yPredPrice)
        r2 = r2_score(yTruePrice, yPredPrice)
        mape = np.mean(np.abs((yTruePrice - yPredPrice) / yTruePrice)) * 100
        
        print(f"\n{datasetName} Metrics:")
        print(f"  RMSE: {rmse:,.2f}")
        print(f"  MAE: {mae:,.2f}")
        print(f"  R2: {r2:.4f}")
        print(f"  MAPE: {mape:.2f}%")
        
        return {'rmse': rmse, 'mae': mae, 'r2': r2, 'mape': mape}
    
    def evaluateModel(self):
        """Evaluate model on train and test sets"""
        print("\n" + "="*80)
        print("MODEL EVALUATION")
        print("="*80)
        
        trainPred = self.model.predict(self.XTrain, num_iteration=self.model.best_iteration)
        testPred = self.model.predict(self.XTest, num_iteration=self.model.best_iteration)
        
        self.trainMetrics = self.calculateMetrics(self.yTrain, trainPred, "TRAINING SET")
        self.testMetrics = self.calculateMetrics(self.yTest, testPred, "TEST SET")
        
        self.predictions = {
            'train': (self.yTrain, trainPred),
            'test': (self.yTest, testPred)
        }
        
        return self
    
    def plotKFoldResults(self):
        """Plot K-Fold CV results"""
        print("\nPlotting K-Fold results...")
        
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        
        metrics = ['rmse', 'mae', 'r2', 'mape']
        titles = ['RMSE', 'MAE', 'R² Score', 'MAPE (%)']
        
        for idx, (metric, title) in enumerate(zip(metrics, titles)):
            ax = axes[idx // 2, idx % 2]
            
            ax.bar(self.kfoldResults['fold'], self.kfoldResults[metric])
            ax.axhline(y=self.kfoldResults[metric].mean(), color='r', linestyle='--', 
                      label=f'Mean: {self.kfoldResults[metric].mean():.4f}')
            ax.set_xlabel('Fold')
            ax.set_ylabel(title)
            ax.set_title(f'{title} across K-Folds')
            ax.legend()
            ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig('lightgbm_kfold_results.png', dpi=300, bbox_inches='tight')
        print("K-Fold results plot saved")
        plt.close()
        
        return self
    
    def plotTrainingCurves(self):
        """Plot training curves"""
        print("Plotting training curves...")
        
        plt.figure(figsize=(14, 6))
        
        trainRmse = self.trainingHistory['train']['rmse']
        testRmse = self.trainingHistory['test']['rmse']
        iterations = range(1, len(trainRmse) + 1)
        
        plt.subplot(1, 2, 1)
        plt.plot(iterations, trainRmse, label='Training RMSE', linewidth=2)
        plt.plot(iterations, testRmse, label='Test RMSE', linewidth=2)
        plt.axvline(x=self.model.best_iteration, color='r', linestyle='--', 
                    label=f'Best Iteration ({self.model.best_iteration})')
        plt.xlabel('Iterations')
        plt.ylabel('RMSE')
        plt.title('LightGBM Training Curve')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        plt.subplot(1, 2, 2)
        plt.plot(iterations, trainRmse, label='Training RMSE', linewidth=2)
        plt.plot(iterations, testRmse, label='Test RMSE', linewidth=2)
        plt.axvline(x=self.model.best_iteration, color='r', linestyle='--',
                    label=f'Best Iteration ({self.model.best_iteration})')
        plt.xlabel('Iterations')
        plt.ylabel('RMSE (log scale)')
        plt.title('LightGBM Training Curve (Log Scale)')
        plt.yscale('log')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig('lightgbm_training_curves.png', dpi=300, bbox_inches='tight')
        print("Training curves saved")
        plt.close()
        
        return self
    
    def plotPredictions(self):
        """Plot actual vs predicted"""
        print("Plotting predictions...")
        
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))
        
        datasets = ['train', 'test']
        titles = ['Training Set', 'Test Set']
        
        for idx, (dataset, title) in enumerate(zip(datasets, titles)):
            yTrue, yPred = self.predictions[dataset]
            
            ax = axes[idx]
            
            ax.scatter(yTrue, yPred, alpha=0.3, s=10)
            
            minVal = min(yTrue.min(), yPred.min())
            maxVal = max(yTrue.max(), yPred.max())
            ax.plot([minVal, maxVal], [minVal, maxVal], 'r--', linewidth=2, label='Perfect Prediction')
            
            ax.set_xlabel('Actual Price')
            ax.set_ylabel('Predicted Price')
            
            metrics = self.trainMetrics if dataset == 'train' else self.testMetrics
            ax.set_title(f'{title}\nR2 = {metrics["r2"]:.4f}')
            ax.legend()
            ax.grid(True, alpha=0.3)
            ax.ticklabel_format(style='scientific', axis='both', scilimits=(6,6))
        
        plt.tight_layout()
        plt.savefig('lightgbm_predictions.png', dpi=300, bbox_inches='tight')
        print("Prediction plots saved")
        plt.close()
        
        return self
    
    def plotFeatureImportance(self):
        """Plot feature importance"""
        print("Plotting feature importance...")
        
        importance = self.model.feature_importance(importance_type='gain')
        featureImportance = pd.DataFrame({
            'feature': self.featureNames,
            'importance': importance
        }).sort_values('importance', ascending=False)
        
        plt.figure(figsize=(10, 8))
        topFeatures = featureImportance.head(15)
        plt.barh(range(len(topFeatures)), topFeatures['importance'])
        plt.yticks(range(len(topFeatures)), topFeatures['feature'])
        plt.xlabel('Importance (Gain)')
        plt.ylabel('Features')
        plt.title('Top 15 Feature Importance - LightGBM')
        plt.gca().invert_yaxis()
        plt.grid(True, alpha=0.3, axis='x')
        plt.tight_layout()
        plt.savefig('lightgbm_feature_importance.png', dpi=300, bbox_inches='tight')
        print("Feature importance saved")
        plt.close()
        
        return self
    
    def saveModel(self):
        """Save trained model"""
        print("\nSaving model...")
        modelPath = 'lightgbm_model.pkl'
        joblib.dump(self.model, modelPath)
        print(f"Model saved to {modelPath}")
        
        featurePath = 'lightgbm_features.pkl'
        joblib.dump(self.featureNames, featurePath)
        print(f"Feature names saved to {featurePath}")
        
        return self
    
    def trainPipeline(self):
        """Run complete training pipeline"""
        print("="*80)
        print("LIGHTGBM TRAINING PIPELINE")
        print("="*80)
        
        X, y = (self
                .loadData()
                .prepareFeatures())
        
        (self
         .performKFoldCV(X, y, nSplits=5)
         .trainTestSplit(X, y, testSize=0.2)
         .trainFinalModel()
         .evaluateModel()
         .plotKFoldResults()
         .plotTrainingCurves()
         .plotPredictions()
         .plotFeatureImportance()
         .saveModel())
        
        print("\n" + "="*80)
        print("TRAINING PIPELINE COMPLETE")
        print("="*80)
        print("\nFinal Test Set Performance:")
        print(f"  RMSE: {self.testMetrics['rmse']:,.2f}")
        print(f"  MAE: {self.testMetrics['mae']:,.2f}")
        print(f"  R2: {self.testMetrics['r2']:.4f}")
        print(f"  MAPE: {self.testMetrics['mape']:.2f}%")
        
        return self


if __name__ == "__main__":
    DATA_FILE = "cleaned_real_estate_data.csv"
    
    trainer = LightGBMTrainer(DATA_FILE)
    trainer.trainPipeline()
