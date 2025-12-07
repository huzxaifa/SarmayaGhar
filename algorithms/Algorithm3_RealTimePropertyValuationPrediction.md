## Algorithm 3: Real‑Time AI Property Valuation

**Input**: Property valuation request `R` with fields  
`city`, `province`, `location`, optional `neighbourhood`, `propertyType`, `areaMarla`, `bedrooms`, `bathrooms`, `yearBuilt`  
and a trained regression model with scaling parameters and encoding maps.  

**Output**: Structured valuation response containing  
- Predicted price  
- Price range (min, max) based on confidence  
- Confidence score (percentage)  
- Market trend label  
- Short‑term future price projections (1–3 years)    

**Algorithm: PredictPropertyValuation(R, B)**

1. If backend has **sklearn models** available then  
2. Call **PredictWithSklearn(R)** and return its response.  
3. Else if no trained TensorFlow / custom model is loaded in memory then  
4. Raise error "No trained model available".  
5. If encoding maps or scaling parameters in are missing then  
6. Rebuild them by re‑running preprocessing on the historical dataset.  
7. Normalize encoding maps so that each categorical map is an in‑memory `Map` with integer ids.     
10. Determine area category label from `R.areaMarla` (e.g., `0–5`, `5–10`, `10–15`, `15–20`, `20+` marla) and encode it via the area‑category map.  
11. Using encoding maps, build unscaled feature vector `f` as:  
12.`property_type_encoded` from `propertyType`  
13.`location_encoded` from `neighbourhood` if available, otherwise from `location`  
14.`city_encoded` from `city` (default `"Karachi"` if missing)  
15.`province_encoded` from `province` (default `"Sindh"` if missing)  
16.`purpose_encoded = 0` (For Sale)  
17.`area_category_encoded` from step 10  
18.`latitude`, `longitude` from step 9  
19.`baths = R.bathrooms`, `bedrooms = R.bedrooms`  
20.`area_size = R.areaMarla`  
21.`price_per_unit = 0` (to be inferred by model)  
22.`location_premium` from premium map using `neighbourhood` or `location`  
23.`property_age_years = age`  
24.`bath_bedroom_ratio = (bedrooms > 0) ? baths / bedrooms : 0`  
25.`area_size_normalized = min(area_size / maxArea, 1)`.  
26. Apply z‑score scaling to `f` using training `scalingParams` to obtain scaled feature vector `z`.  
27. Pass `z` into **PredictWithModel(B, z)** to obtain raw predicted price `p`.  
28. Set model confidence `c = max(0.6, B.accuracy)` and compute price variance factor  
29. `variance = (1 − c) × 0.3`.  
30. Compute price range:  
31. `minPrice = p × (1 − variance)`  
32. `maxPrice = p × (1 + variance)`.  
33. Determine baseline market growth rate `g` using **GetMarketGrowthRate(R.city, R.location)** (city‑specific rate plus premium‑area adjustment).  
34. Compute future price projections:  
35. `currentYearPrice = round(p)`  
36. `oneYearPrice = round(p × (1 + g))`  
37. `twoYearPrice = round(p × (1 + g)²)`  
38. `threeYearPrice = round(p × (1 + g)³)`.  
39. Generate at least three **comparable properties** by varying area and rooms around request values and scaling base price heuristically.  
40. Build a list of qualitative **insights** using rules:  
41. If `price_per_marla` is very high → premium location insight.  
42. If `areaMarla` is very large or very small → size‑based insight.  
43. If `age` is low or very high → construction‑age insight.  
44. If `bathrooms / bedrooms ≥ threshold` → good room‑ratio insight.  
45. If `g` is high → strong growth expected insight.  
46. Set `marketTrend` label:  
47. If `g > 0.05` then `"Rising"`; else if `g < −0.02` then `"Declining"`; else `"Stable"`.  
48. Return response structure:  
49. `predictedPrice = round(p)`  
50. `priceRange = { min = round(minPrice), max = round(maxPrice) }`  
51. `confidence = round(c × 100)`  
52. `marketTrend = marketTrend`  
53. `predictions = { currentYear, oneYear, twoYear, threeYear }`  
54. `comparableProperties` and `insights`.  


