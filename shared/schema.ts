import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Properties table
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  city: text("city").notNull(),
  area: text("area").notNull(),
  propertyType: text("property_type").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  areaSize: decimal("area_size", { precision: 10, scale: 2 }).notNull(),
  areaUnit: text("area_unit").notNull().default("marla"),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  yearBuilt: integer("year_built"),
  features: jsonb("features").$type<string[]>().default([]),
  images: jsonb("images").$type<string[]>().default([]),
  location: jsonb("location").$type<{ lat: number; lng: number }>(),
  aiScore: integer("ai_score"),
  expectedROI: decimal("expected_roi", { precision: 5, scale: 2 }),
  rentalYield: decimal("rental_yield", { precision: 5, scale: 2 }),
  marketTrend: text("market_trend"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Property valuations table
export const valuations = pgTable("valuations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  city: text("city").notNull(),
  area: text("area").notNull(),
  propertyType: text("property_type").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  areaSize: decimal("area_size", { precision: 10, scale: 2 }).notNull(),
  areaUnit: text("area_unit").notNull().default("marla"),
  yearBuilt: integer("year_built"),
  features: jsonb("features").$type<string[]>().default([]),
  estimatedValue: decimal("estimated_value", { precision: 15, scale: 2 }).notNull(),
  confidenceScore: integer("confidence_score").notNull(),
  priceRange: jsonb("price_range").$type<{ min: number; max: number }>().notNull(),
  marketAnalysis: jsonb("market_analysis").$type<{
    locationScore: number;
    marketTrend: string;
    liquidity: string;
    investmentGrade: string;
  }>().notNull(),
  insights: jsonb("insights").$type<string[]>().default([]),
  predictionTimeline: text("prediction_timeline").notNull().default("current"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Portfolio properties table
export const portfolioProperties = pgTable("portfolio_properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id),
  purchasePrice: decimal("purchase_price", { precision: 15, scale: 2 }).notNull(),
  purchaseDate: timestamp("purchase_date").notNull(),
  currentValue: decimal("current_value", { precision: 15, scale: 2 }).notNull(),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }),
  isRented: boolean("is_rented").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  message: text("message").notNull(),
  response: text("response").notNull(),
  context: jsonb("context").$type<any>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertValuationSchema = createInsertSchema(valuations).omit({
  id: true,
  createdAt: true,
});

export const insertPortfolioPropertySchema = createInsertSchema(portfolioProperties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

// Types
export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;
export type Valuation = typeof valuations.$inferSelect;
export type InsertValuation = typeof valuations.$inferInsert;
export type PortfolioProperty = typeof portfolioProperties.$inferSelect;
export type InsertPortfolioProperty = typeof portfolioProperties.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
