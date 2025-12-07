import { type Property, type InsertProperty, type Valuation, type InsertValuation, type PortfolioProperty, type InsertPortfolioProperty, type ChatMessage, type InsertChatMessage, properties as propertiesTable, valuations as valuationsTable, portfolioProperties as portfolioTable, chatMessages as chatTable } from "@shared/schema";
import { db } from "./db.js";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";

export interface IStorage {
  // Properties
  getProperties(filters?: Partial<Property>): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, property: Partial<Property>): Promise<Property | undefined>;
  deleteProperty(id: string): Promise<boolean>;

  // Valuations
  getValuations(): Promise<Valuation[]>;
  getValuation(id: string): Promise<Valuation | undefined>;
  createValuation(valuation: InsertValuation): Promise<Valuation>;

  // Portfolio
  getPortfolioProperties(): Promise<PortfolioProperty[]>;
  getPortfolioProperty(id: string): Promise<PortfolioProperty | undefined>;
  createPortfolioProperty(portfolioProperty: InsertPortfolioProperty): Promise<PortfolioProperty>;
  updatePortfolioProperty(id: string, portfolioProperty: Partial<PortfolioProperty>): Promise<PortfolioProperty | undefined>;
  deletePortfolioProperty(id: string): Promise<boolean>;

  // Chat
  getChatMessages(): Promise<ChatMessage[]>;
  createChatMessage(chatMessage: InsertChatMessage): Promise<ChatMessage>;
}

export class MemStorage implements IStorage {
  public properties: Map<string, Property>;
  private valuations: Map<string, Valuation>;
  private portfolioProperties: Map<string, PortfolioProperty>;
  private chatMessages: Map<string, ChatMessage>;
  public datasetLoaded = false;

  constructor() {
    this.properties = new Map();
    this.valuations = new Map();
    this.portfolioProperties = new Map();
    this.chatMessages = new Map();
    // seed minimal demo data; real data is lazy-loaded from CSV on first request
    this.seedData();
  }

  private seedData() {
    // Seed some sample properties
    const sampleProperties: Property[] = [
      {
        id: "1",
        title: "Modern House For Sale in DHA Phase 6",
        description: "Luxury 4-bedroom house with swimming pool and garden",
        city: "Karachi",
        area: "DHA Phase 6",
        propertyType: "House",
        bedrooms: 4,
        bathrooms: 5,
        areaSize: "5",
        areaUnit: "marla",
        price: "25000000",
        yearBuilt: 2020,
        features: ["Parking", "Garden", "Security", "Generator"],
        images: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"],
        location: { lat: 24.8607, lng: 67.0011 },
        aiScore: 94,
        expectedROI: "12.5",
        rentalYield: "7.2",
        marketTrend: "Bullish",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        title: "Luxury Flat For Rent in Gulberg III",
        description: "3-bedroom apartment with modern amenities",
        city: "Lahore",
        area: "Gulberg III",
        propertyType: "Flat",
        bedrooms: 3,
        bathrooms: 4,
        areaSize: "2100",
        areaUnit: "sq ft",
        price: "18000000",
        yearBuilt: 2019,
        features: ["Parking", "Security", "Elevator", "Generator"],
        images: ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"],
        location: { lat: 31.5204, lng: 74.3587 },
        aiScore: 89,
        expectedROI: "10.8",
        rentalYield: "6.5",
        marketTrend: "Stable",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "3",
        title: "Penthouse For Sale in F-11 Markaz",
        description: "4-bedroom penthouse with city view",
        city: "Islamabad",
        area: "F-11 Markaz",
        propertyType: "Penthouse",
        bedrooms: 4,
        bathrooms: 5,
        areaSize: "2500",
        areaUnit: "sq ft",
        price: "32000000",
        yearBuilt: 2021,
        features: ["Parking", "Security", "Elevator", "Pool"],
        images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"],
        location: { lat: 33.6844, lng: 73.0479 },
        aiScore: 96,
        expectedROI: "15.2",
        rentalYield: "5.8",
        marketTrend: "Bullish",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    sampleProperties.forEach(property => {
      this.properties.set(property.id, property);
    });
  }

  // Properties methods
  async getProperties(filters?: Partial<Property>): Promise<Property[]> {
    // Ensure dataset is loaded from CSV
    if (!this.datasetLoaded) {
      try {
        await this.loadDatasetFromCsv();
      } catch (e) {
        // Fallback to seeded data if CSV read fails
        // eslint-disable-next-line no-console
        console.warn("Failed to load CSV dataset, using seeded properties only:", e);
      }
    }

    let properties = Array.from(this.properties.values());
    
    if (filters) {
      properties = properties.filter(property => {
        return Object.entries(filters).every(([key, value]) => {
          if (value === undefined) return true;
          return property[key as keyof Property] === value;
        });
      });
    }
    
    return properties;
  }

  async getProperty(id: string): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const id = randomUUID();
    const newProperty: Property = {
      ...property,
      id,
      description: property.description || null,
      areaUnit: property.areaUnit || "marla",
      yearBuilt: property.yearBuilt || null,
      features: property.features ? (property.features as string[]) : null,
      images: property.images ? (property.images as string[]) : null,
      location: property.location || null,
      aiScore: property.aiScore || null,
      expectedROI: property.expectedROI || null,
      rentalYield: property.rentalYield || null,
      marketTrend: property.marketTrend || null,
      isActive: property.isActive !== undefined ? property.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.properties.set(id, newProperty);
    return newProperty;
  }

  async updateProperty(id: string, property: Partial<Property>): Promise<Property | undefined> {
    const existing = this.properties.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...property, updatedAt: new Date() };
    this.properties.set(id, updated);
    return updated;
  }

  async deleteProperty(id: string): Promise<boolean> {
    return this.properties.delete(id);
  }

  // Valuations methods
  async getValuations(): Promise<Valuation[]> {
    return Array.from(this.valuations.values());
  }

  async getValuation(id: string): Promise<Valuation | undefined> {
    return this.valuations.get(id);
  }

  async createValuation(valuation: InsertValuation): Promise<Valuation> {
    const id = randomUUID();
    const newValuation: Valuation = {
      ...valuation,
      id,
      areaUnit: valuation.areaUnit || "marla",
      yearBuilt: valuation.yearBuilt || null,
      features: valuation.features ? (valuation.features as string[]) : null,
      insights: valuation.insights ? (valuation.insights as string[]) : null,
      predictionTimeline: valuation.predictionTimeline || "current",
      createdAt: new Date(),
    };
    this.valuations.set(id, newValuation);
    return newValuation;
  }

  // Portfolio methods
  async getPortfolioProperties(): Promise<PortfolioProperty[]> {
    return Array.from(this.portfolioProperties.values());
  }

  async getPortfolioProperty(id: string): Promise<PortfolioProperty | undefined> {
    return this.portfolioProperties.get(id);
  }

  async createPortfolioProperty(portfolioProperty: InsertPortfolioProperty): Promise<PortfolioProperty> {
    const id = randomUUID();
    const newPortfolioProperty: PortfolioProperty = {
      ...portfolioProperty,
      id,
      monthlyRent: portfolioProperty.monthlyRent || null,
      propertyId: portfolioProperty.propertyId || null,
      isRented: portfolioProperty.isRented || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.portfolioProperties.set(id, newPortfolioProperty);
    return newPortfolioProperty;
  }

  async updatePortfolioProperty(id: string, portfolioProperty: Partial<PortfolioProperty>): Promise<PortfolioProperty | undefined> {
    const existing = this.portfolioProperties.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...portfolioProperty, updatedAt: new Date() };
    this.portfolioProperties.set(id, updated);
    return updated;
  }

  async deletePortfolioProperty(id: string): Promise<boolean> {
    return this.portfolioProperties.delete(id);
  }

  // Chat methods
  async getChatMessages(): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values());
  }

  async createChatMessage(chatMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const newChatMessage: ChatMessage = {
      ...chatMessage,
      id,
      context: chatMessage.context || null,
      createdAt: new Date(),
    };
    this.chatMessages.set(id, newChatMessage);
    return newChatMessage;
  }
}

// Database-backed storage implementation using Drizzle ORM
export class DbStorage implements IStorage {
  private fallbackStorage = new MemStorage();

  async getProperties(filters?: Partial<Property>): Promise<Property[]> {
    try {
      if (!filters || Object.keys(filters).length === 0) {
        return await db.select().from(propertiesTable);
      }

      const conditions: any[] = [];
      if (filters.city) conditions.push(eq(propertiesTable.city, filters.city));
      if (filters.area) conditions.push(eq(propertiesTable.area, filters.area));
      if (filters.propertyType) conditions.push(eq(propertiesTable.propertyType, filters.propertyType));
      if (typeof filters.bedrooms === "number") conditions.push(eq(propertiesTable.bedrooms, filters.bedrooms));
      if (typeof filters.bathrooms === "number") conditions.push(eq(propertiesTable.bathrooms, filters.bathrooms));
      if (typeof filters.isActive === "boolean") conditions.push(eq(propertiesTable.isActive, filters.isActive));

      if (conditions.length === 0) {
        return await db.select().from(propertiesTable);
      }
      return await db.select().from(propertiesTable).where(and(...conditions));
    } catch (error) {
      console.warn("Database connection failed, falling back to in-memory storage:", error);
      return await this.fallbackStorage.getProperties(filters);
    }
  }

  async getProperty(id: string): Promise<Property | undefined> {
    try {
      const rows = await db.select().from(propertiesTable).where(eq(propertiesTable.id, id));
      return rows[0];
    } catch (error) {
      console.warn("Database connection failed, falling back to in-memory storage:", error);
      return await this.fallbackStorage.getProperty(id);
    }
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    try {
      const rows = await db.insert(propertiesTable).values({
        ...property,
        description: property.description ?? null,
        yearBuilt: property.yearBuilt ?? null,
        features: (property.features as string[] | null) ?? null,
        images: (property.images as string[] | null) ?? null,
        location: property.location ?? null,
        aiScore: property.aiScore ?? null,
        expectedROI: property.expectedROI ?? null,
        rentalYield: property.rentalYield ?? null,
        marketTrend: property.marketTrend ?? null,
      }).returning();
      return rows[0];
    } catch (error) {
      console.warn("Database connection failed, falling back to in-memory storage:", error);
      return await this.fallbackStorage.createProperty(property);
    }
  }

  async updateProperty(id: string, property: Partial<Property>): Promise<Property | undefined> {
    try {
      const rows = await db.update(propertiesTable)
        .set({ ...property, updatedAt: new Date() })
        .where(eq(propertiesTable.id, id))
        .returning();
      return rows[0];
    } catch (error) {
      console.warn("Database connection failed, falling back to in-memory storage:", error);
      return await this.fallbackStorage.updateProperty(id, property);
    }
  }

  async deleteProperty(id: string): Promise<boolean> {
    try {
      const rows = await db.delete(propertiesTable).where(eq(propertiesTable.id, id)).returning({ id: propertiesTable.id });
      return rows.length > 0;
    } catch (error) {
      console.warn("Database connection failed, falling back to in-memory storage:", error);
      return await this.fallbackStorage.deleteProperty(id);
    }
  }

  async getValuations(): Promise<Valuation[]> {
    try {
      return await db.select().from(valuationsTable);
    } catch (error) {
      console.warn("Database connection failed, falling back to in-memory storage:", error);
      return await this.fallbackStorage.getValuations();
    }
  }

  async getValuation(id: string): Promise<Valuation | undefined> {
    try {
      const rows = await db.select().from(valuationsTable).where(eq(valuationsTable.id, id));
      return rows[0];
    } catch (error) {
      console.warn("Database connection failed, falling back to in-memory storage:", error);
      return await this.fallbackStorage.getValuation(id);
    }
  }

  async createValuation(valuation: InsertValuation): Promise<Valuation> {
    try {
      const rows = await db.insert(valuationsTable).values({
        ...valuation,
        yearBuilt: valuation.yearBuilt ?? null,
        features: (valuation.features as string[] | null) ?? null,
        insights: (valuation.insights as string[] | null) ?? null,
      }).returning();
      return rows[0];
    } catch (error) {
      console.warn("Database connection failed, falling back to in-memory storage:", error);
      return await this.fallbackStorage.createValuation(valuation);
    }
  }

  async getPortfolioProperties(): Promise<PortfolioProperty[]> {
    try {
      return await db.select().from(portfolioTable);
    } catch (error) {
      console.warn("Database connection failed, falling back to in-memory storage:", error);
      return await this.fallbackStorage.getPortfolioProperties();
    }
  }

  async getPortfolioProperty(id: string): Promise<PortfolioProperty | undefined> {
    try {
      const rows = await db.select().from(portfolioTable).where(eq(portfolioTable.id, id));
      return rows[0];
    } catch (error) {
      console.warn("Database connection failed, falling back to in-memory storage:", error);
      return await this.fallbackStorage.getPortfolioProperty(id);
    }
  }

  async createPortfolioProperty(portfolioProperty: InsertPortfolioProperty): Promise<PortfolioProperty> {
    try {
      const rows = await db.insert(portfolioTable).values({
        ...portfolioProperty,
        monthlyRent: portfolioProperty.monthlyRent ?? null,
        propertyId: portfolioProperty.propertyId ?? null,
        isRented: portfolioProperty.isRented ?? null,
      }).returning();
      return rows[0];
    } catch (error) {
      console.warn("Database connection failed, falling back to in-memory storage:", error);
      return await this.fallbackStorage.createPortfolioProperty(portfolioProperty);
    }
  }

  async updatePortfolioProperty(id: string, portfolioProperty: Partial<PortfolioProperty>): Promise<PortfolioProperty | undefined> {
    try {
      const rows = await db.update(portfolioTable)
        .set({ ...portfolioProperty, updatedAt: new Date() })
        .where(eq(portfolioTable.id, id))
        .returning();
      return rows[0];
    } catch (error) {
      console.warn("Database connection failed, falling back to in-memory storage:", error);
      return await this.fallbackStorage.updatePortfolioProperty(id, portfolioProperty);
    }
  }

  async deletePortfolioProperty(id: string): Promise<boolean> {
    try {
      const rows = await db.delete(portfolioTable).where(eq(portfolioTable.id, id)).returning({ id: portfolioTable.id });
      return rows.length > 0;
    } catch (error) {
      console.warn("Database connection failed, falling back to in-memory storage:", error);
      return await this.fallbackStorage.deletePortfolioProperty(id);
    }
  }

  async getChatMessages(): Promise<ChatMessage[]> {
    try {
      return await db.select().from(chatTable);
    } catch (error) {
      console.warn("Database connection failed, falling back to in-memory storage:", error);
      return await this.fallbackStorage.getChatMessages();
    }
  }

  async createChatMessage(chatMessage: InsertChatMessage): Promise<ChatMessage> {
    try {
      const rows = await db.insert(chatTable).values({
        ...chatMessage,
        context: chatMessage.context ?? null,
      }).returning();
      return rows[0];
    } catch (error) {
      console.warn("Database connection failed, falling back to in-memory storage:", error);
      return await this.fallbackStorage.createChatMessage(chatMessage);
    }
  }
}

export const storage = new DbStorage();

// Helpers
interface CsvRow {
  [key: string]: any;
}

function toNumberSafe(value: any, defaultValue = 0): number {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === "number") return Number.isFinite(value) ? value : defaultValue;
  const cleaned = String(value).replace(/[,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : defaultValue;
}

function pick<T = any>(row: CsvRow, keys: string[], fallback?: any): T | any {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
  }
  return fallback;
}

// Extend class methods
declare module "./storage" { interface MemStorage { loadDatasetFromCsv(): Promise<void>; mapCsvRowToProperty(row: CsvRow, index: number): Property | null; } }

MemStorage.prototype.loadDatasetFromCsv = async function loadDatasetFromCsv(this: MemStorage): Promise<void> {
  if (this.datasetLoaded) return;
  const csvPath = path.join(process.cwd(), "attached_assets", "zameen-updated_1757269388792.csv");

  if (!fs.existsSync(csvPath)) {
    this.datasetLoaded = true; // avoid repeated attempts
    return;
  }

  const fileStream = fs.createReadStream(csvPath, { encoding: "utf8" });

  await new Promise<void>((resolve, reject) => {
    let idx = 0;
    let loadedCount = 0;
    
    Papa.parse<CsvRow>(fileStream, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      worker: false,
      step: (result) => {
        try {
          const prop = this.mapCsvRowToProperty(result.data, idx++);
          if (prop) {
            this.properties.set(prop.id, prop);
            loadedCount++;
          }
        } catch (_) {
          // ignore malformed row
        }
      },
      complete: () => {
        this.datasetLoaded = true;
        console.log(`Loaded ${loadedCount} properties from CSV`);
        resolve();
      },
      error: (err) => {
        reject(err);
      }
    });
  });
};

MemStorage.prototype.mapCsvRowToProperty = function mapCsvRowToProperty(this: MemStorage, row: CsvRow, index: number): Property | null {
  // Map CSV columns to property fields
  const city = pick<string>(row, ["city", "City", "city_name"], "");
  const area = pick<string>(row, ["location", "Area", "neighbourhood", "Neighborhood"], "");
  const propertyType = pick<string>(row, ["property_type", "Property Type", "type"], "");
  const bedrooms = toNumberSafe(pick(row, ["bedrooms", "Beds", "bedroom"], 0));
  const bathrooms = toNumberSafe(pick(row, ["baths", "Bathrooms", "bathrooms"], 0));
  const areaSize = toNumberSafe(pick(row, ["Area Size", "area_size", "Area (Marla)", "size"], 0));
  const areaType = pick<string>(row, ["Area Type", "area_type", "area_unit"], "Marla");
  const price = toNumberSafe(pick(row, ["price", "total_price", "Price"], 0));
  const purpose = pick<string>(row, ["purpose", "Purpose"], "For Sale");
  
  // Skip invalid rows
  if (!city || !area || !propertyType || price <= 0 || areaSize <= 0) return null;

  const id = `csv-${index + 1}`;
  const title = `${propertyType} ${purpose} in ${area}`;

  const lat = toNumberSafe(pick(row, ["latitude", "lat"], NaN));
  const lng = toNumberSafe(pick(row, ["longitude", "lng"], NaN));

  // Use default property images
  const images: string[] = [
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
  ];

  // Normalize area unit
  let normalizedAreaUnit = "marla";
  if (areaType) {
    const areaTypeLower = String(areaType).toLowerCase();
    if (areaTypeLower.includes("kanal")) normalizedAreaUnit = "kanal";
    else if (areaTypeLower.includes("sq") || areaTypeLower.includes("ft")) normalizedAreaUnit = "sq ft";
    else if (areaTypeLower.includes("marla")) normalizedAreaUnit = "marla";
  }

  const property: Property = {
    id,
    title,
    description: purpose ? `Property ${purpose.toLowerCase()} in ${area}, ${city}` : null,
    city: String(city).trim(),
    area: String(area).trim(),
    propertyType: String(propertyType).trim(),
    bedrooms,
    bathrooms,
    areaSize: String(areaSize),
    areaUnit: normalizedAreaUnit,
    price: String(price),
    yearBuilt: null,
    features: null,
    images,
    location: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null,
    aiScore: null,
    expectedROI: null,
    rentalYield: null,
    marketTrend: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return property;
};
