import * as dotenv from "dotenv";
dotenv.config();

import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";

// Define the structure of our CSV rows
interface CsvRow {
    [key: string]: any;
}

// Helper to safely parse numbers
function toNumberSafe(value: any, defaultValue = 0): number {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === "number") return Number.isFinite(value) ? value : defaultValue;
    const cleaned = String(value).replace(/[,\s]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : defaultValue;
}

// Helper to pick values from various potential column names
function pick<T = any>(row: CsvRow, keys: string[], fallback?: any): T | any {
    for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
    }
    return fallback;
}

async function seed() {
    console.log("Starting database seed...");

    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is missing from environment variables.");
        process.exit(1);
    }

    // Dynamic import to ensure env vars are loaded first
    console.log("Connecting onto database...");
    const { db } = await import("../db.js");
    const { properties } = await import("@shared/schema");

    const csvPath = path.join(process.cwd(), "attached_assets", "zameen-updated.csv");

    if (!fs.existsSync(csvPath)) {
        console.error(`CSV file not found at: ${csvPath}`);
        process.exit(1);
    }

    const fileContent = fs.readFileSync(csvPath, "utf8");

    const parseResult = Papa.parse<CsvRow>(fileContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
        console.warn("CSV parse warnings:", parseResult.errors.length);
    }

    const rows = parseResult.data;
    console.log(`Parsed ${rows.length} rows from CSV`);

    const batchSize = 100;
    let insertedCount = 0;
    let skippedCount = 0;

    // Clear existing properties (optional - uncomment if you want a fresh start)
    // await db.delete(properties);
    // console.log("Cleared existing properties");

    const recordsToInsert: any[] = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        // Map fields
        const city = pick<string>(row, ["city", "City", "city_name"], "");
        const area = pick<string>(row, ["location", "Area", "neighbourhood", "Neighborhood"], "");
        const propertyType = pick<string>(row, ["property_type", "Property Type", "type"], "");
        const bedrooms = toNumberSafe(pick(row, ["bedrooms", "Beds", "bedroom"], 0));
        const bathrooms = toNumberSafe(pick(row, ["baths", "Bathrooms", "bathrooms"], 0));
        const areaSizeRaw = toNumberSafe(pick(row, ["Area Size", "area_size", "Area (Marla)", "size"], 0));
        const areaType = pick<string>(row, ["Area Type", "area_type", "area_unit"], "Marla");
        const priceRaw = toNumberSafe(pick(row, ["price", "total_price", "Price"], 0));
        const purpose = pick<string>(row, ["purpose", "Purpose"], "For Sale");

        // Skip invalid records
        if (!city || !area || !propertyType || priceRaw <= 0 || areaSizeRaw <= 0) {
            skippedCount++;
            continue;
        }

        const lat = toNumberSafe(pick(row, ["latitude", "lat"], NaN));
        const lng = toNumberSafe(pick(row, ["longitude", "lng"], NaN));

        // Normalize area unit
        let normalizedAreaUnit = "marla";
        if (areaType) {
            const areaTypeLower = String(areaType).toLowerCase();
            if (areaTypeLower.includes("kanal")) normalizedAreaUnit = "kanal";
            else if (areaTypeLower.includes("sq") || areaTypeLower.includes("ft")) normalizedAreaUnit = "sq ft";
            else if (areaTypeLower.includes("marla")) normalizedAreaUnit = "marla";
        }

        const image = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400";

        recordsToInsert.push({
            title: `${propertyType} ${purpose} in ${area}`,
            description: `Property ${purpose.toLowerCase()} in ${area}, ${city}`,
            city: String(city).trim(),
            area: String(area).trim(),
            propertyType: String(propertyType).trim(),
            bedrooms: bedrooms,
            bathrooms: bathrooms,
            areaSize: String(areaSizeRaw),
            areaUnit: normalizedAreaUnit,
            price: String(priceRaw),
            // Use null for non-existent columns if they differ from schema defaults, 
            // but here defaults handle most things.
            location: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null,
            images: [image],
            isActive: true,
            features: [], // Empty features for now
        });
    }

    // Batch insert
    for (let i = 0; i < recordsToInsert.length; i += batchSize) {
        const batch = recordsToInsert.slice(i, i + batchSize);
        try {
            await db.insert(properties).values(batch);
            insertedCount += batch.length;
            process.stdout.write(`\rInserted ${insertedCount} / ${recordsToInsert.length} properties...`);
        } catch (error) {
            console.error(`\nError inserting batch at index ${i}:`, error);
        }
    }

    console.log(`\n\nSeed completed!`);
    console.log(`Total rows processed: ${rows.length}`);
    console.log(`Inserted: ${insertedCount}`);
    console.log(`Skipped (invalid data): ${skippedCount}`);

    process.exit(0);
}

seed().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
