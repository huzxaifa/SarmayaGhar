### Model metrics

**1st Version**

**Random Forest**      R2 Score: 0.9019

**Decision Tree**      R2 Score: 0.8545

**Gradient Boosting**  R2 Score: 0.8292

**Linear Regression**  R2 Score: 0.6089

**XGBoost**            R2 Score: 0.8943

**2nd Version**

Training Linear Regression...

======================
PERFORMING 5-FOLD CROSS-VALIDATION for Linear Regression
=============================
Training Fold 1/5...
  RMSE: 106,078,382,353,393,303,552, MAE: 683,126,708,244,222,720, R2: -7469724747527093550579712.0000, MAPE: 31051214007207.11%
Training Fold 2/5...
  RMSE: 55,802,060,778,680, MAE: 362,776,037,095, R2: -1717061786590.5911, MAPE: 41463.73%
Training Fold 3/5...
  RMSE: 92,247,462, MAE: 12,128,341, R2: -3.9487, MAPE: 49.90%
Training Fold 4/5...
  RMSE: 6,371,073,908, MAE: 58,612,155, R2: -29734.9554, MAPE: 120.41%
Training Fold 5/5...
  RMSE: 29,981,045, MAE: 10,754,020, R2: 0.3486, MAPE: 52.05%

================================================================================
K-FOLD CROSS-VALIDATION SUMMARY (Linear Regression)
================================================================================
fold   rmse         mae          r2         mape
1      106,078,382,353,393,303,552 683,126,708,244,222,720 -7469724747527093550579712.0000 31051214007207.11%
2      55,802,060,778,680 362,776,037,095 -1717061786590.5911 41463.73%
3      92,247,462   12,128,341   -3.9487    49.90%
4      6,371,073,908 58,612,155   -29734.9554 120.41%
5      29,981,045   10,754,020   0.3486     52.05%

Mean Metrics:
  RMSE: 21,215,687,632,389,476,352
  MAE: 136,625,414,220,350,880
  R2: -1493944949505762200125440.0000 +/- 2987889899010665406791680.0000
  MAPE: 6210242809778.64%

Bias Assessment: HIGH BIAS

Splitting data...
Train set: 96452 samples
Test set: 24113 samples

================================================================================
TRAINING FINAL MODEL
================================================================================

================================================================================
MODEL EVALUATION
================================================================================

TRAINING SET Metrics:
  RMSE: 393,743,203,218,933.75
  MAE: 1,273,827,455,237.19
  R2: -98768347642779.6094
  MAPE: 145138.88%

TEST SET Metrics:
  RMSE: 106,078,382,353,437,016,064.00
  MAE: 683,126,708,244,504,576.00
  R2: -7469724747533251459940352.0000
  MAPE: 31051214007219.91%

Training Decision Tree...

======================
PERFORMING 5-FOLD CROSS-VALIDATION for Decision Tree
=============================
Training Fold 1/5...
  RMSE: 23,237,120, MAE: 5,296,199, R2: 0.6416, MAPE: 31.38%
Training Fold 2/5...
  RMSE: 26,807,785, MAE: 5,496,430, R2: 0.6037, MAPE: 28.45%
Training Fold 3/5...
  RMSE: 25,246,951, MAE: 5,604,469, R2: 0.6293, MAPE: 28.88%
Training Fold 4/5...
  RMSE: 22,280,885, MAE: 5,198,482, R2: 0.6363, MAPE: 31.41%
Training Fold 5/5...
  RMSE: 20,720,330, MAE: 5,077,581, R2: 0.6889, MAPE: 26.32%

================================================================================
K-FOLD CROSS-VALIDATION SUMMARY (Decision Tree)
================================================================================
fold   rmse         mae          r2         mape
1      23,237,120   5,296,199    0.6416     31.38%
2      26,807,785   5,496,430    0.6037     28.45%
3      25,246,951   5,604,469    0.6293     28.88%
4      22,280,885   5,198,482    0.6363     31.41%
5      20,720,330   5,077,581    0.6889     26.32%

Mean Metrics:
  RMSE: 23,658,614
  MAE: 5,334,632
  R2: 0.6400 +/- 0.0277
  MAPE: 29.29%

Bias Assessment: MODERATE BIAS

Splitting data...
Train set: 96452 samples
Test set: 24113 samples

================================================================================
TRAINING FINAL MODEL
================================================================================

================================================================================
MODEL EVALUATION
================================================================================

TRAINING SET Metrics:
  RMSE: 8,813,830.53
  MAE: 3,121,499.61
  R2: 0.9505
  MAPE: 16.34%

TEST SET Metrics:
  RMSE: 23,779,228.12
  MAE: 5,366,170.77
  R2: 0.6246
  MAPE: 31.44%

Training Random Forest...

======================
PERFORMING 5-FOLD CROSS-VALIDATION for Random Forest
=============================
Training Fold 1/5...
  RMSE: 19,164,094, MAE: 4,485,238, R2: 0.7562, MAPE: 25.18%
Training Fold 2/5...
  RMSE: 25,344,827, MAE: 4,798,000, R2: 0.6458, MAPE: 23.57%
Training Fold 3/5...
  RMSE: 20,604,305, MAE: 4,757,834, R2: 0.7531, MAPE: 20.21%
Training Fold 4/5...
  RMSE: 18,909,916, MAE: 4,551,309, R2: 0.7380, MAPE: 25.35%
Training Fold 5/5...
  RMSE: 14,719,028, MAE: 4,274,016, R2: 0.8430, MAPE: 21.31%

================================================================================
K-FOLD CROSS-VALIDATION SUMMARY (Random Forest)
================================================================================
fold   rmse         mae          r2         mape
1      19,164,094   4,485,238    0.7562     25.18%
2      25,344,827   4,798,000    0.6458     23.57%
3      20,604,305   4,757,834    0.7531     20.21%
4      18,909,916   4,551,309    0.7380     25.35%
5      14,719,028   4,274,016    0.8430     21.31%

Mean Metrics:
  RMSE: 19,748,434
  MAE: 4,573,279
  R2: 0.7472 +/- 0.0627
  MAPE: 23.13%

Bias Assessment: HIGH BIAS

Splitting data...
Train set: 96452 samples
Test set: 24113 samples

================================================================================
TRAINING FINAL MODEL
================================================================================

================================================================================
MODEL EVALUATION
================================================================================

TRAINING SET Metrics:
  RMSE: 12,982,765.85
  MAE: 2,739,333.00
  R2: 0.8926
  MAPE: 11.03%

TEST SET Metrics:
  RMSE: 19,032,990.03
  MAE: 4,481,919.25
  R2: 0.7595
  MAPE: 24.32%

Training Gradient Boosting...

======================
PERFORMING 5-FOLD CROSS-VALIDATION for Gradient Boosting
=============================
Training Fold 1/5...
  RMSE: 26,520,848, MAE: 7,173,179, R2: 0.5331, MAPE: 33.82%
Training Fold 2/5...
  RMSE: 30,000,261, MAE: 7,206,100, R2: 0.5037, MAPE: 33.84%
Training Fold 3/5...
  RMSE: 28,581,199, MAE: 7,400,891, R2: 0.5249, MAPE: 30.00%
Training Fold 4/5...
  RMSE: 23,643,316, MAE: 6,857,143, R2: 0.5905, MAPE: 33.29%
Training Fold 5/5...
  RMSE: 22,802,151, MAE: 6,975,581, R2: 0.6232, MAPE: 31.69%

================================================================================
K-FOLD CROSS-VALIDATION SUMMARY (Gradient Boosting)
================================================================================
fold   rmse         mae          r2         mape
1      26,520,848   7,173,179    0.5331     33.82%
2      30,000,261   7,206,100    0.5037     33.84%
3      28,581,199   7,400,891    0.5249     30.00%
4      23,643,316   6,857,143    0.5905     33.29%
5      22,802,151   6,975,581    0.6232     31.69%

Mean Metrics:
  RMSE: 26,309,555
  MAE: 7,122,579
  R2: 0.5551 +/- 0.0446
  MAPE: 32.53%

Bias Assessment: MODERATE BIAS

Splitting data...
Train set: 96452 samples
Test set: 24113 samples

================================================================================
TRAINING FINAL MODEL
================================================================================

================================================================================
MODEL EVALUATION
================================================================================

TRAINING SET Metrics:
  RMSE: 26,444,067.44
  MAE: 7,172,731.07
  R2: 0.5545
  MAPE: 31.52%

TEST SET Metrics:
  RMSE: 26,520,848.39
  MAE: 7,173,179.35
  R2: 0.5331
  MAPE: 33.82%

Training Deep Learning...

======================
PERFORMING 5-FOLD CROSS-VALIDATION for Deep Learning
=============================
Training Fold 1/5...
  RMSE: 247,834,877,062,292, MAE: 1,625,065,086,678, R2: -40773281795500.4844, MAPE: 22253736.29%
Training Fold 2/5...
  RMSE: 6,106,132,092,330, MAE: 39,537,678,745, R2: -20559750381.1486, MAPE: 4534.44%
Training Fold 3/5...
  RMSE: 26,788,934, MAE: 7,104,380, R2: 0.5827, MAPE: 29.80%
Training Fold 4/5...
  RMSE: 36,932,357, MAE: 6,622,327, R2: 0.0008, MAPE: 32.75%
Training Fold 5/5...
  RMSE: 38,721,632, MAE: 6,659,045, R2: -0.0865, MAPE: 32.31%

================================================================================
K-FOLD CROSS-VALIDATION SUMMARY (Deep Learning)
================================================================================
fold   rmse         mae          r2         mape
1      247,834,877,062,292 1,625,065,086,678 -40773281795500.4844 22253736.29%
2      6,106,132,092,330 39,537,678,745 -20559750381.1486 4534.44%
3      26,788,934   7,104,380    0.5827     29.80%
4      36,932,357   6,622,327    0.0008     32.75%
5      38,721,632   6,659,045    -0.0865    32.31%

Mean Metrics:
  RMSE: 50,788,222,319,509
  MAE: 332,924,630,235
  R2: -8158768309176.2266 +/- 16307258687250.5039
  MAPE: 4451673.12%

Bias Assessment: HIGH BIAS

Splitting data...
Train set: 96452 samples
Test set: 24113 samples

================================================================================
TRAINING FINAL MODEL
================================================================================

================================================================================
MODEL EVALUATION
================================================================================

TRAINING SET Metrics:
  RMSE: 117,912,990.05
  MAE: 7,899,764.65
  R2: -7.8576
  MAPE: 29.64%

TEST SET Metrics:
  RMSE: 1,996,287,008,985,109.00
  MAE: 12,857,207,473,238.67
  R2: -2645433100375232.5000
  MAPE: 171473816.12%

Training XGBoost...

======================
PERFORMING 5-FOLD CROSS-VALIDATION for XGBoost
=============================
Training Fold 1/5...
  RMSE: 20,751,875, MAE: 4,881,615, R2: 0.7141, MAPE: 25.34%
Training Fold 2/5...
  RMSE: 25,654,795, MAE: 5,159,109, R2: 0.6371, MAPE: 25.03%
Training Fold 3/5...
  RMSE: 23,102,680, MAE: 5,223,734, R2: 0.6896, MAPE: 20.48%
Training Fold 4/5...
  RMSE: 18,726,980, MAE: 4,873,752, R2: 0.7431, MAPE: 24.72%
Training Fold 5/5...
  RMSE: 16,382,584, MAE: 4,784,206, R2: 0.8055, MAPE: 22.63%

================================================================================
K-FOLD CROSS-VALIDATION SUMMARY (XGBoost)
================================================================================
fold   rmse         mae          r2         mape
1      20,751,875   4,881,615    0.7141     25.34%
2      25,654,795   5,159,109    0.6371     25.03%
3      23,102,680   5,223,734    0.6896     20.48%
4      18,726,980   4,873,752    0.7431     24.72%
5      16,382,584   4,784,206    0.8055     22.63%

Mean Metrics:
  RMSE: 20,923,783
  MAE: 4,984,483
  R2: 0.7179 +/- 0.0560
  MAPE: 23.64%

Bias Assessment: HIGH BIAS

Splitting data...
Train set: 96452 samples
Test set: 24113 samples

================================================================================
TRAINING FINAL MODEL
================================================================================

================================================================================
MODEL EVALUATION
================================================================================

TRAINING SET Metrics:
  RMSE: 17,103,601.98
  MAE: 4,411,509.97
  R2: 0.8136
  MAPE: 19.57%

TEST SET Metrics:
  RMSE: 20,751,874.66
  MAE: 4,881,614.81
  R2: 0.7141
  MAPE: 25.34%

Training LightGBM...

======================
PERFORMING 5-FOLD CROSS-VALIDATION for LightGBM
=============================
[LightGBM] [Info] Auto-choosing row-wise multi-threading, the overhead of testing was 0.005935 seconds.
You can set `force_row_wise=true` to remove the overhead.
And if memory is not enough, you can set `force_col_wise=true`.
[LightGBM] [Info] Total Bins 1270
[LightGBM] [Info] Number of data points in the train set: 96452, number of used features: 12
[LightGBM] [Info] Start training from score 16.483520
Training Fold 1/5...
  RMSE: 20,505,167, MAE: 4,918,120, R2: 0.7209, MAPE: 24.92%
[LightGBM] [Info] Auto-choosing col-wise multi-threading, the overhead of testing was 0.008363 seconds.
You can set `force_col_wise=true` to remove the overhead.
[LightGBM] [Info] Total Bins 1267
[LightGBM] [Info] Number of data points in the train set: 96452, number of used features: 12
[LightGBM] [Info] Start training from score 16.484373
Training Fold 2/5...
  RMSE: 24,998,556, MAE: 5,177,378, R2: 0.6554, MAPE: 25.19%
[LightGBM] [Info] Auto-choosing col-wise multi-threading, the overhead of testing was 0.007069 seconds.
You can set `force_col_wise=true` to remove the overhead.
[LightGBM] [Info] Total Bins 1270
[LightGBM] [Info] Number of data points in the train set: 96452, number of used features: 12
[LightGBM] [Info] Start training from score 16.482958
Training Fold 3/5...
  RMSE: 22,727,193, MAE: 5,233,377, R2: 0.6996, MAPE: 20.51%
[LightGBM] [Info] Auto-choosing col-wise multi-threading, the overhead of testing was 0.008282 seconds.
You can set `force_col_wise=true` to remove the overhead.
[LightGBM] [Info] Total Bins 1268
[LightGBM] [Info] Number of data points in the train set: 96452, number of used features: 12
[LightGBM] [Info] Start training from score 16.484372
Training Fold 4/5...
  RMSE: 18,241,016, MAE: 4,837,422, R2: 0.7562, MAPE: 24.80%
[LightGBM] [Info] Auto-choosing col-wise multi-threading, the overhead of testing was 0.008299 seconds.
You can set `force_col_wise=true` to remove the overhead.
[LightGBM] [Info] Total Bins 1272
[LightGBM] [Info] Number of data points in the train set: 96452, number of used features: 12
[LightGBM] [Info] Start training from score 16.486064
Training Fold 5/5...
  RMSE: 16,046,484, MAE: 4,785,236, R2: 0.8134, MAPE: 22.88%

================================================================================
K-FOLD CROSS-VALIDATION SUMMARY (LightGBM)
================================================================================
fold   rmse         mae          r2         mape
1      20,505,167   4,918,120    0.7209     24.92%
2      24,998,556   5,177,378    0.6554     25.19%
3      22,727,193   5,233,377    0.6996     20.51%
4      18,241,016   4,837,422    0.7562     24.80%
5      16,046,484   4,785,236    0.8134     22.88%

Mean Metrics:
  RMSE: 20,503,683
  MAE: 4,990,307
  R2: 0.7291 +/- 0.0533
  MAPE: 23.66%

Bias Assessment: HIGH BIAS

Splitting data...
Train set: 96452 samples
Test set: 24113 samples

================================================================================
TRAINING FINAL MODEL
================================================================================
[LightGBM] [Info] Auto-choosing col-wise multi-threading, the overhead of testing was 0.008673 seconds.
You can set `force_col_wise=true` to remove the overhead.
[LightGBM] [Info] Total Bins 1270
[LightGBM] [Info] Number of data points in the train set: 96452, number of used features: 12
[LightGBM] [Info] Start training from score 16.483520
Could not plot learning curve for LightGBM: 'LGBMRegressor' object has no attribute 'evals_result'

================================================================================
MODEL EVALUATION
================================================================================

TRAINING SET Metrics:
  RMSE: 18,719,417.03
  MAE: 4,593,648.39
  R2: 0.7768
  MAPE: 20.62%

TEST SET Metrics:
  RMSE: 20,505,167.44
  MAE: 4,918,120.43
  R2: 0.7209
  MAPE: 24.92%

Training Complete.



