## Algorithm 4: ROI Analysis and Investment Recommendation

**Input**:  
- Property data payload `P` with fields such as `city`, `location`, `property_type`, `area_marla`, `bedrooms`, `bathrooms`  
- Access to property valuation prediction service (Algorithm 3)  
- Historical growth‑rates store `H` (city/location/property‑type level), with appreciation and rent growth plus confidence  

**Output**:  
- Detailed ROI analysis containing AI price and rent predictions  
- Annual ROI and cap rate  
- Payback period, simplified IRR and NPV estimates  
- 1‑year and 5‑year projections  
- Investment grade and human‑readable recommendation text  

**Algorithm: AnalyzePropertyROI(P, H)**

1. Validate that `P.property_data` is present; if missing, return error.  
2. Extract normalized fields from `P.property_data` with defaults:  
3. &emsp; `city`, `location`, `property_type`, `area_marla`, `bedrooms`, `bathrooms` (with sensible fallbacks).  
4. Build valuation request `R` using these fields plus default `yearBuilt` if not provided.  
5. Call **PredictPropertyValuation(R, B)** to obtain AI price prediction `V`:  
6. Set `property_value = V.predictedPrice`.  
7. Estimate **monthly rent** using rule‑of‑thumb formula, e.g.  
8. `monthly_rent = property_value / 100`.  
9. Compute **annual rent** and **maintenance costs**:  
10. `annual_rent = monthly_rent × 12`  
11. `annual_maintenance = property_value × 0.0075`.  
12. Compute **net annual income**:  
13. `net_annual_income = annual_rent − annual_maintenance`.  
14. Query historical growth data `G = H.getGrowthRates(city, location, property_type)`.  
15. Initialize defaults:  
16. `property_appreciation_rate = 15.6578` (percent per year)  
17. `rent_growth_rate = 0.4897` (percent per year)  
18. `data_confidence = 0.5`  
19. `using_fallback = true`, `fallback_reason = "no_historical_data"`.  
20. If `G` exists then  
21. If `G.property_appreciation_rate ≥ −20`, `G.rent_growth_rate ≥ −10` and `G.confidence > 0.6` then  
22. Set `property_appreciation_rate = G.property_appreciation_rate`.  
23. Set `rent_growth_rate = G.rent_growth_rate`.  
24. Set `data_confidence = G.confidence`.  
25. Set `using_fallback = false`, `fallback_reason = "historical_data_used"`.  
26. Else  
27. Keep default rates but set `fallback_reason` explaining whether appreciation, rent growth, or confidence was too low.  
28. Compute **annual property appreciation amount**:  
29. `property_appreciation = property_value × (property_appreciation_rate / 100)`.  
30. Compute **total annual return**:  
31. `total_annual_return = net_annual_income + property_appreciation`.  
32. Compute **annual ROI** and **cap rate**:  
33. `annual_roi = (total_annual_return / property_value) × 100`  
34. `cap_rate = (annual_rent / property_value) × 100`.  
35. Compute **price per marla**: `price_per_marla = property_value / area_marla`.  
36. Derive **investment grade**:  
37. If `annual_roi ≥ 12` and `cap_rate ≥ 8` then grade = `"A+"`.  
38. Else if `annual_roi ≥ 10` and `cap_rate ≥ 6` then grade = `"A"`.  
39. Else if `annual_roi ≥ 8` and `cap_rate ≥ 5` then grade = `"B+"`.  
40. Else if `annual_roi ≥ 6` and `cap_rate ≥ 4` then grade = `"B"`.  
41. Else if `annual_roi ≥ 4` and `cap_rate ≥ 3` then grade = `"C"`; else grade = `"D"`.  
42. Compute **investment metrics**:  
43. `payback_period = property_value / max(net_annual_income, ε)`  
44. `irr ≈ annual_roi × 0.8` (simplified)  
45. `npv ≈ net_annual_income × 5 − property_value` (5‑year horizon with simplified discounting).  
46. Compute **future projections** using historical growth:  
47. Year‑1:  
48. `projected_rent_1 = monthly_rent × (1 + rent_growth_rate / 100)`  
49. `projected_value_1 = property_value × (1 + property_appreciation_rate / 100)`  
50. `projected_roi_1 = ROI(projected_rent_1, projected_value_1)`.  
51. Year‑5:  
52. `projected_rent_5 = monthly_rent × (1 + rent_growth_rate / 100)^5`  
53. `projected_value_5 = property_value × (1 + property_appreciation_rate / 100)^5`  
54. `projected_roi_5 = ROI(projected_rent_5, projected_value_5)`.  
55. Build qualitative **investment recommendation** text using:  
56. city and location,  
57. grade, `annual_roi`, `cap_rate`, `price_per_marla`, and whether historical data or fallback was used.  
58. Package and return structured response including:  
59. `ai_predictions` (price, rent, price_per_marla, confidence, methods, historical data usage)  
60. `current_metrics` (cash‑flow, ROI, cap rate)  
61. `investment_metrics` (payback, irr, npv)  
62. `future_projections` for 1 and 5 years  
63. `investment_grade` (grade, recommendation, risk level)  
64. `market_insights` summarizing narrative explanation.  


