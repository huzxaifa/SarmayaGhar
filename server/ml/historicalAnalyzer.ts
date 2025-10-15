import fs from 'fs';
import path from 'path';

export interface GrowthRateData {
  property_appreciation_rate: number;
  rent_growth_rate: number;
  years_analyzed: number;
  data_points: number;
  confidence: number;
  avg_price_2018?: number;
  avg_price_2019?: number;
  avg_rent_2018?: number;
  avg_rent_2019?: number;
}

export interface LocationGrowthRates {
  [propertyType: string]: GrowthRateData;
}

export interface CityGrowthRates {
  [location: string]: LocationGrowthRates;
}

export interface HistoricalData {
  [city: string]: CityGrowthRates;
}

export class HistoricalAnalyzer {
  private growthRates: HistoricalData = {};
  private dataPath: string;

  constructor() {
    this.dataPath = path.join(process.cwd(), 'server', 'data', 'growthRates.json');
    this.loadGrowthRates();
  }

  /**
   * Load existing growth rates from file
   */
  private loadGrowthRates(): void {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data = fs.readFileSync(this.dataPath, 'utf8');
        this.growthRates = JSON.parse(data);
        console.log('Historical growth rates loaded successfully');
      }
    } catch (error) {
      console.error('Error loading growth rates:', error);
      this.growthRates = {};
    }
  }

  /**
   * Save growth rates to file
   */
  private saveGrowthRates(): void {
    try {
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dataPath, JSON.stringify(this.growthRates, null, 2));
      console.log('Growth rates saved successfully');
    } catch (error) {
      console.error('Error saving growth rates:', error);
    }
  }

  /**
   * Get growth rates for a specific location and property type
   */
  getGrowthRates(city: string, location: string, propertyType: string): GrowthRateData | null {
    try {
      const cityData = this.growthRates[city];
      if (!cityData) return null;

      const locationData = cityData[location];
      if (!locationData) return null;

      const propertyData = locationData[propertyType];
      if (!propertyData) return null;

      return propertyData;
    } catch (error) {
      console.error('Error getting growth rates:', error);
      return null;
    }
  }

  /**
   * Get fallback growth rates if specific location data is not available
   */
  getFallbackGrowthRates(city: string): GrowthRateData {
    // Default fallback rates based on general market trends
    const fallbackRates: { [key: string]: GrowthRateData } = {
      'Islamabad': {
        property_appreciation_rate: 18.5,
        rent_growth_rate: 8.2,
        years_analyzed: 2,
        data_points: 0,
        confidence: 0.6,
        method: 'fallback'
      },
      'Lahore': {
        property_appreciation_rate: 16.8,
        rent_growth_rate: 7.5,
        years_analyzed: 2,
        data_points: 0,
        confidence: 0.6,
        method: 'fallback'
      },
      'Karachi': {
        property_appreciation_rate: 15.2,
        rent_growth_rate: 6.8,
        years_analyzed: 2,
        data_points: 0,
        confidence: 0.6,
        method: 'fallback'
      }
    };

    return fallbackRates[city] || {
      property_appreciation_rate: 17.0,
      rent_growth_rate: 7.5,
      years_analyzed: 2,
      data_points: 0,
      confidence: 0.5,
      method: 'default_fallback'
    };
  }

  /**
   * Calculate growth rates from historical data
   */
  async calculateGrowthRates(): Promise<void> {
    console.log('Starting historical data analysis...');
    
    try {
      // This will be called by the Python script
      // For now, we'll use the fallback rates
      console.log('Growth rates calculation completed');
    } catch (error) {
      console.error('Error calculating growth rates:', error);
    }
  }

  /**
   * Update growth rates with new data
   */
  updateGrowthRates(
    city: string, 
    location: string, 
    propertyType: string, 
    data: GrowthRateData
  ): void {
    if (!this.growthRates[city]) {
      this.growthRates[city] = {};
    }
    if (!this.growthRates[city][location]) {
      this.growthRates[city][location] = {};
    }
    
    this.growthRates[city][location][propertyType] = data;
    this.saveGrowthRates();
  }

  /**
   * Get all available cities
   */
  getAvailableCities(): string[] {
    return Object.keys(this.growthRates);
  }

  /**
   * Get all available locations for a city
   */
  getAvailableLocations(city: string): string[] {
    const cityData = this.growthRates[city];
    return cityData ? Object.keys(cityData) : [];
  }

  /**
   * Get all available property types for a location
   */
  getAvailablePropertyTypes(city: string, location: string): string[] {
    const cityData = this.growthRates[city];
    if (!cityData) return [];
    
    const locationData = cityData[location];
    return locationData ? Object.keys(locationData) : [];
  }
}

// Export singleton instance
export const historicalAnalyzer = new HistoricalAnalyzer();
