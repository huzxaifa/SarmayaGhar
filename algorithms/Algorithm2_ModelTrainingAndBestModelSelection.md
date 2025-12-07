## Algorithm 2: Training Multiple Models and Selecting the Best Regressor

**Input**:  
- Feature matrix \(X\) (scaled engineered features)  
- Target vector \(y\) (property prices)  
- Set of model types \(M = \{\)Linear Regression, Decision Tree, Random Forest, Gradient Boosting, XGBoost-like, Deep Learning NN\(\}\)  
- Scaling parameters and encoding maps from preprocessing  

**Output**:  
- Performance results for each trained model (R², MSE, MAE)  
- Selected best model \(B \in M\) with its trained parameters and metadata  
- Saved model artifacts and metadata on disk  

**Algorithm: TrainAllModelsAndSelectBest(X, y, scalingParams, encodingMaps)**

1. Initialize empty list `results`.  
2. For each model type `m` in set `M` do  
3. If `m` is **Linear Regression** then  
4. Build a single-layer dense regression network with linear activation.  
5. Train using optimizer `Adam`, loss `MSE`, validation split 0.2 for fixed epochs.  
6. Obtain predictions `ŷ` on training data.  
7. Else if `m` is **Decision Tree** then  
8. Apply mean-splitting heuristic on area and similar features to generate predictions `ŷ`.  
9. Else if `m` is **Random Forest** then  
10. For each tree in ensemble:  
11.     Draw bootstrap sample of \((X, y)\).  
12.     Train a weak decision tree using local means.  
13.     Aggregate predictions of all trees by averaging to obtain `ŷ`.  
14.       Else if `m` is **Gradient Boosting** then  
15.          Initialize `predictions = 0`, `residuals = y`.  
16.          For a fixed number of estimators do  
17.          Train a weak learner to predict current residuals using local similarity.  
18.           Update `predictions += learningRate * weakPredictions`.  
19.    `residuals = y - predictions`.  
20.     Set `ŷ = predictions`.  
21.     Else if `m` is **XGBoost-like** then  
22.     Run boosted rounds with feature-weighted similarity and L2 regularization to produce `ŷ`.  
23.     Else if `m` is **Deep Learning NN** then  
24.     Build a 4-layer feedforward network with ReLU activations and dropout, final linear output.  
25.     Train with optimizer `Adam`, loss `MSE`, validation split 0.2, for configured epochs and batch size.  
26.     Obtain predictions `ŷ` on training data.  
27.     Compute metrics for model `m`:  
28.     `MSE = mean((y - ŷ)²)`  
29.     `MAE = mean(|y - ŷ|)`  
30.     `R2 = 1 - sum((y - ŷ)²) / sum((y - mean(y))²)`  
31.     Create record `result_m = { name: m, mse: MSE, mae: MAE, r2Score: R2, modelParams }`.  
32.     Append `result_m` to `results`.  
33.     Persist model to disk in directory `trained_models/<m>`:  
34.     Save learned weights and architecture (`model.json`, `weights.bin` or equivalent).  
35.     Save `metadata.json` containing `name`, `r2Score`, `mse`, `mae`, `generatedAt`, and optionally `scalingParams`, `encodingMaps`.  
36. End For  
37. Select `bestResult` from `results` with maximum `r2Score`.  
38. Construct `bestModel` structure containing:  
39. `bestModel.name = bestResult.name`  
40. `bestModel.model = bestResult.modelParams`  
41. `bestModel.accuracy = bestResult.r2Score`  
42. `bestModel.scalingParams = scalingParams`  
43. `bestModel.encodingMaps = encodingMaps`  
44. Log comparison table of `results` and identified `bestModel`.  
45. Return `results` and `bestModel`.  


