CREATE TABLE "chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message" text NOT NULL,
	"response" text NOT NULL,
	"context" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "portfolio_properties" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar,
	"purchase_price" numeric(15, 2) NOT NULL,
	"purchase_date" timestamp NOT NULL,
	"current_value" numeric(15, 2) NOT NULL,
	"monthly_rent" numeric(10, 2),
	"is_rented" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"city" text NOT NULL,
	"area" text NOT NULL,
	"property_type" text NOT NULL,
	"bedrooms" integer NOT NULL,
	"bathrooms" integer NOT NULL,
	"area_size" numeric(10, 2) NOT NULL,
	"area_unit" text DEFAULT 'marla' NOT NULL,
	"price" numeric(15, 2) NOT NULL,
	"year_built" integer,
	"features" jsonb DEFAULT '[]'::jsonb,
	"images" jsonb DEFAULT '[]'::jsonb,
	"location" jsonb,
	"ai_score" integer,
	"expected_roi" numeric(5, 2),
	"rental_yield" numeric(5, 2),
	"market_trend" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "valuations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city" text NOT NULL,
	"area" text NOT NULL,
	"property_type" text NOT NULL,
	"bedrooms" integer NOT NULL,
	"bathrooms" integer NOT NULL,
	"area_size" numeric(10, 2) NOT NULL,
	"area_unit" text DEFAULT 'marla' NOT NULL,
	"year_built" integer,
	"features" jsonb DEFAULT '[]'::jsonb,
	"estimated_value" numeric(15, 2) NOT NULL,
	"confidence_score" integer NOT NULL,
	"price_range" jsonb NOT NULL,
	"market_analysis" jsonb NOT NULL,
	"insights" jsonb DEFAULT '[]'::jsonb,
	"prediction_timeline" text DEFAULT 'current' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "portfolio_properties" ADD CONSTRAINT "portfolio_properties_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;