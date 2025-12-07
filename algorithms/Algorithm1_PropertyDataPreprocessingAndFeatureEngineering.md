## Algorithm 1: Property Data Preprocessing and Feature Engineering

**Input**: Raw property dataset containing records with attributes such as `price`, `property_type`, `location`, `city`, `province`, `latitude`, `longitude`, `baths`, `bedrooms`, `area_size`, `date_added`, `purpose`, `area_category`  
**Output**:  
- Cleaned and filtered dataset
- Engineered feature matrix  
- Target vector (property prices)  
- Encoding maps for categorical attributes  

**Algorithm: PropertyDataPreprocessingAndFeatureEngineering**

1. Initialize empty list `cleanRecords`, empty list `features`, empty list `targets`.  
2. For each row `r` in dataset `D` do  
3. If **IsValidRow(r)** is `false` then  
4. Skip this row and continue to next `r`.  
5. Else  
6. Convert string fields to trimmed strings.  
7. Parse numeric fields (`price`, `area_size`, `baths`, `bedrooms`, `latitude`, `longitude`).  
8. Append parsed record `r` to `cleanRecords`.  
9. End For  
10. Sort all `price` values from `cleanRecords` into array `P`.  
11. Compute first quartile `Q1` and third quartile `Q3` of `P`.  
12. Compute inter-quartile range `IQR = Q3 - Q1`.  
13. Set `lowerBound = Q1 - 1.5 * IQR`, `upperBound = Q3 + 1.5 * IQR`.  
14. Initialize empty list `filteredRecords`.  
15. For each record `r` in `cleanRecords` do  
16. `r.price` is outside \([lowerBound, upperBound]\) OR  
17. `r.area_size` not in realistic range OR  
18. `r.bedrooms` or `r.baths` outside allowed bounds  
19. then skip this record.  
20. Else append `r` to `filteredRecords`.  
21. End For  
22. Build unique sets for each categorical column from `filteredRecords`:  
23. `Locations`, `PropertyTypes`, `Cities`, `Provinces`, `Purposes`, `AreaCategories`.  
24. For each set, create a label-encoding map that assigns an integer id starting from 0.  
25. For each record `r` in `filteredRecords` do  
26. Compute derived statistics maps:  
27. Accumulate `totalPrice`, `totalArea`, `count` per `location` to compute **location premium**.  
28. Accumulate `totalPrice`, `count` per `city` to compute **city mean price**.  
29. End For  
30. For each location key, compute `locationPremium = totalPrice / totalArea`.  
31. For each city key, compute `cityMeanPrice = totalPrice / count`.  
32. For each record `r` in `filteredRecords` do  
33. Derive `propertyAgeYears = max(0, currentYear - year(date_added))`.  
34. Derive `pricePerUnit = r.price / r.area_size`.  
35. Derive `bathBedroomRatio = r.bedrooms > 0 ? r.baths / r.bedrooms : 0`.  
36. Derive `areaSizeNormalized = min(r.area_size / maxArea, 1)`.  
37. Encode categorical variables using the label maps:  
38. `property_type_encoded`, `location_encoded`, `city_encoded`, `province_encoded`, `purpose_encoded`, `area_category_encoded`.  
39. &emsp; Build feature vector `f` as ordered list of:  
40. `[property_type_encoded, location_encoded, city_encoded, province_encoded, purpose_encoded, area_category_encoded, latitude, longitude, baths, bedrooms, area_size, pricePerUnit, locationPremium, propertyAgeYears, bathBedroomRatio, areaSizeNormalized]`.  
41. Append `f` to `features`.  
42. Append `r.price` to `targets`.  
43. End For  
44. For each feature dimension in `features` do  
45. Compute mean and standard deviation.  
46. For each row, replace `features[i][k]` with z-score:  
47. `features[i][k] = (features[i][k] - μ_k) / max(σ_k, ε)` where is a small constant.  
48. End For  
49. Return cleaned dataset `filteredRecords` as, feature matrix `X = features`, target vector `y = targets`, and all encoding+statistics maps.  


