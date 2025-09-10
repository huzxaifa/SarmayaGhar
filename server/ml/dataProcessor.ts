import * as fs from 'fs';
import { parse } from 'papaparse';
import * as path from 'path';

export interface PropertyData {
  property_id: string;
  location_id: string;
  property_type: string;
  price: number;
  location: string;
  city: string;
  province_name: string;
  latitude: number;
  longitude: number;
  baths: number;
  area: string;
  purpose: string;
  bedrooms: number;
  date_added: string;
  area_type: string;
  area_size: number;
  area_category: string;
}

export interface ProcessedFeatures {
  property_type_encoded: number;
  location_encoded: number;
  city_encoded: number;
  province_encoded: number;
  purpose_encoded: number;
  area_category_encoded: number;
  latitude: number;
  longitude: number;
  baths: number;
  bedrooms: number;
  area_size: number;
  price_per_unit: number;
  location_premium: number;
  property_age_years: number;
  bath_bedroom_ratio: number;
  area_size_normalized: number;
}

export class PropertyDataProcessor {
  private locationMap = new Map<string, number>();
  private propertyTypeMap = new Map<string, number>();
  private cityMap = new Map<string, number>();
  private provinceMap = new Map<string, number>();
  private purposeMap = new Map<string, number>();
  private areaCategoryMap = new Map<string, number>();
  
  private locationPremiumMap = new Map<string, number>();
  private cityMeanPrices = new Map<string, number>();

  async loadAndPreprocessData(csvPath: string): Promise<{ features: ProcessedFeatures[], targets: number[], rawData: PropertyData[] }> {
    console.log('Loading dataset from:', csvPath);
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const parseResult = parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.toLowerCase().replace(/\s+/g, '_')
    });

    const rawData: PropertyData[] = parseResult.data
      .filter((row: any) => this.isValidRow(row))
      .map((row: any) => this.parseRow(row));

    console.log(`Loaded ${rawData.length} valid property records`);

    // Data cleaning and outlier removal
    const cleanedData = this.removeOutliers(rawData);
    console.log(`After outlier removal: ${cleanedData.length} records`);

    // Create encodings and feature engineering mappings
    this.createEncodingMaps(cleanedData);
    this.calculateLocationPremiums(cleanedData);

    // Feature engineering
    const features = cleanedData.map(row => this.extractFeatures(row));
    const targets = cleanedData.map(row => row.price);

    return { features, targets, rawData: cleanedData };
  }

  private isValidRow(row: any): boolean {
    return (
      row.price && !isNaN(parseFloat(row.price)) && parseFloat(row.price) > 0 &&
      row.property_type && 
      row.location &&
      row.city &&
      row.area_size && !isNaN(parseFloat(row.area_size)) &&
      row.latitude && !isNaN(parseFloat(row.latitude)) &&
      row.longitude && !isNaN(parseFloat(row.longitude)) &&
      row.baths && !isNaN(parseInt(row.baths)) &&
      row.bedrooms && !isNaN(parseInt(row.bedrooms)) &&
      row.purpose === 'For Sale' // Only include properties for sale
    );
  }

  private parseRow(row: any): PropertyData {
    return {
      property_id: row.property_id,
      location_id: row.location_id,
      property_type: row.property_type?.trim(),
      price: parseFloat(row.price),
      location: row.location?.trim(),
      city: row.city?.trim(),
      province_name: row.province_name?.trim(),
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      baths: parseInt(row.baths) || 0,
      area: row.area?.trim(),
      purpose: row.purpose?.trim(),
      bedrooms: parseInt(row.bedrooms) || 0,
      date_added: row.date_added,
      area_type: row.area_type?.trim(),
      area_size: parseFloat(row.area_size),
      area_category: row.area_category?.trim()
    };
  }

  private removeOutliers(data: PropertyData[]): PropertyData[] {
    // Remove price outliers using IQR method
    const prices = data.map(d => d.price).sort((a, b) => a - b);
    const q1 = prices[Math.floor(prices.length * 0.25)];
    const q3 = prices[Math.floor(prices.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return data.filter(d => 
      d.price >= lowerBound && 
      d.price <= upperBound &&
      d.area_size > 0 &&
      d.area_size < 50 && // Remove unrealistic area sizes
      d.bedrooms >= 0 && d.bedrooms <= 15 &&
      d.baths >= 0 && d.baths <= 15
    );
  }

  private createEncodingMaps(data: PropertyData[]): void {
    // Create categorical encodings
    const locations = Array.from(new Set(data.map(d => d.location)));
    const propertyTypes = Array.from(new Set(data.map(d => d.property_type)));
    const cities = Array.from(new Set(data.map(d => d.city)));
    const provinces = Array.from(new Set(data.map(d => d.province_name)));
    const purposes = Array.from(new Set(data.map(d => d.purpose)));
    const areaCategories = Array.from(new Set(data.map(d => d.area_category)));

    locations.forEach((loc, idx) => this.locationMap.set(loc, idx));
    propertyTypes.forEach((type, idx) => this.propertyTypeMap.set(type, idx));
    cities.forEach((city, idx) => this.cityMap.set(city, idx));
    provinces.forEach((province, idx) => this.provinceMap.set(province, idx));
    purposes.forEach((purpose, idx) => this.purposeMap.set(purpose, idx));
    areaCategories.forEach((category, idx) => this.areaCategoryMap.set(category, idx));

    console.log(`Created encodings: ${locations.length} locations, ${propertyTypes.length} property types, ${cities.length} cities`);
  }

  private calculateLocationPremiums(data: PropertyData[]): void {
    // Calculate mean price per unit for each location
    const locationStats = new Map<string, { totalPrice: number, totalArea: number, count: number }>();
    const cityStats = new Map<string, { totalPrice: number, count: number }>();

    data.forEach(property => {
      // Location premium calculation
      const locationKey = property.location;
      if (!locationStats.has(locationKey)) {
        locationStats.set(locationKey, { totalPrice: 0, totalArea: 0, count: 0 });
      }
      const locationStat = locationStats.get(locationKey)!;
      locationStat.totalPrice += property.price;
      locationStat.totalArea += property.area_size;
      locationStat.count += 1;

      // City mean price calculation
      const cityKey = property.city;
      if (!cityStats.has(cityKey)) {
        cityStats.set(cityKey, { totalPrice: 0, count: 0 });
      }
      const cityStat = cityStats.get(cityKey)!;
      cityStat.totalPrice += property.price;
      cityStat.count += 1;
    });

    // Calculate location premiums (price per unit area)
    locationStats.forEach((stats, location) => {
      if (stats.totalArea > 0) {
        this.locationPremiumMap.set(location, stats.totalPrice / stats.totalArea);
      }
    });

    // Calculate city mean prices
    cityStats.forEach((stats, city) => {
      this.cityMeanPrices.set(city, stats.totalPrice / stats.count);
    });

    console.log(`Calculated location premiums for ${this.locationPremiumMap.size} locations`);
  }

  private extractFeatures(property: PropertyData): ProcessedFeatures {
    const currentYear = new Date().getFullYear();
    const propertyYear = new Date(property.date_added).getFullYear();
    const propertyAge = Math.max(0, currentYear - propertyYear);

    return {
      property_type_encoded: this.propertyTypeMap.get(property.property_type) || 0,
      location_encoded: this.locationMap.get(property.location) || 0,
      city_encoded: this.cityMap.get(property.city) || 0,
      province_encoded: this.provinceMap.get(property.province_name) || 0,
      purpose_encoded: this.purposeMap.get(property.purpose) || 0,
      area_category_encoded: this.areaCategoryMap.get(property.area_category) || 0,
      latitude: property.latitude,
      longitude: property.longitude,
      baths: property.baths,
      bedrooms: property.bedrooms,
      area_size: property.area_size,
      price_per_unit: property.price / property.area_size,
      location_premium: this.locationPremiumMap.get(property.location) || 0,
      property_age_years: propertyAge,
      bath_bedroom_ratio: property.bedrooms > 0 ? property.baths / property.bedrooms : 0,
      area_size_normalized: this.normalizeAreaSize(property.area_size)
    };
  }

  private normalizeAreaSize(areaSize: number): number {
    // Normalize area size to 0-1 scale (assuming max area is 50)
    return Math.min(areaSize / 50, 1);
  }

  // Feature scaling methods
  public scaleFeatures(features: ProcessedFeatures[]): { scaledFeatures: number[][], scalingParams: any } {
    const featureNames = Object.keys(features[0]) as (keyof ProcessedFeatures)[];
    const scalingParams: any = {};
    const scaledData: number[][] = [];

    // Calculate mean and standard deviation for each feature
    featureNames.forEach(featureName => {
      const values = features.map(f => f[featureName] as number);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      scalingParams[featureName] = { mean, stdDev: Math.max(stdDev, 1e-8) }; // Avoid division by zero
    });

    // Apply z-score normalization
    features.forEach((feature, idx) => {
      const scaledFeature = featureNames.map(name => {
        const value = feature[name] as number;
        const params = scalingParams[name];
        return (value - params.mean) / params.stdDev;
      });
      scaledData.push(scaledFeature);
    });

    return { scaledFeatures: scaledData, scalingParams };
  }

  public scaleNewFeature(feature: ProcessedFeatures, scalingParams: any): number[] {
    const featureNames = Object.keys(feature) as (keyof ProcessedFeatures)[];
    return featureNames.map(name => {
      const value = feature[name] as number;
      const params = scalingParams[name];
      return (value - params.mean) / params.stdDev;
    });
  }

  // Get encoding maps for prediction
  public getEncodingMaps() {
    return {
      locationMap: this.locationMap,
      propertyTypeMap: this.propertyTypeMap,
      cityMap: this.cityMap,
      provinceMap: this.provinceMap,
      purposeMap: this.purposeMap,
      areaCategoryMap: this.areaCategoryMap,
      locationPremiumMap: this.locationPremiumMap,
      cityMeanPrices: this.cityMeanPrices
    };
  }
}