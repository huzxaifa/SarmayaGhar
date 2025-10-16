export interface Property {
  id: string;
  title: string;
  description?: string;
  city: string;
  area: string;
  propertyType: string;
  purpose?: string;
  bedrooms: number;
  bathrooms: number;
  areaSize: string;
  areaUnit: string;
  price: string;
  yearBuilt?: number;
  features: string[];
  images: string[];
  location?: { lat: number; lng: number };
  aiScore?: number;
  expectedROI?: string;
  rentalYield?: string;
  marketTrend?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ValuationInput {
  city: string;
  area: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  areaSize: number;
  areaUnit: string;
  yearBuilt?: number;
  features: string[];
  predictionTimeline: string;
}

export interface ValuationResult {
  estimatedValue: number;
  confidenceScore: number;
  priceRange: { min: number; max: number };
  marketAnalysis: {
    locationScore: number;
    marketTrend: string;
    liquidity: string;
    investmentGrade: string;
  };
  insights: string[];
}

export interface ChatMessage {
  id: string;
  message: string;
  response: string;
  isUser: boolean;
  timestamp: Date;
}

export interface PropertyFilters {
  city?: string;
  propertyType?: string;
  bedrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  purpose?: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalGain: number;
  totalROI: number;
  monthlyIncome: number;
  propertiesCount: number;
}
