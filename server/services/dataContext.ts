import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

interface PropertyRecord {
    property_id: string;
    location_id: string;
    page_url: string;
    property_type: string;
    price: string;
    location: string;
    city: string;
    province_name: string;
    latitude: string;
    longitude: string;
    baths: string;
    area: string;
    purpose: string;
    bedrooms: string;
    date_added: string;
    agency: string;
    agent: string;
    Area_Type: string;
    Area_Size: string;
    Area_Category: string;
}

interface CityStats {
    count: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    avgArea: number; // in Marla
    propertyTypes: Record<string, number>;
}

class DataContextService {
    private data: PropertyRecord[] = [];
    private cityStats: Record<string, CityStats> = {};
    private systemContext: string = "";
    private isLoaded: boolean = false;

    constructor() {
        this.loadData();
    }

    private async loadData() {
        try {
            // Find the zameen-updated.csv file
            const csvPath = path.join(process.cwd(), 'attached_assets', 'zameen-updated.csv');

            if (!fs.existsSync(csvPath)) {
                console.warn("DataContext: zameen-updated.csv not found at", csvPath);
                return;
            }

            console.log("DataContext: Loading dataset...");
            const fileContent = fs.readFileSync(csvPath, 'utf-8');

            this.data = parse(fileContent, {
                columns: true,
                skip_empty_lines: true,
                relax_column_count: true
            });

            console.log(`DataContext: Loaded ${this.data.length} records.`);
            this.calculateStats();
            this.generateSystemContext();
            this.isLoaded = true;
        } catch (error) {
            console.error("DataContext: Error loading data:", error);
        }
    }

    private calculateStats() {
        // Initialize
        const cities = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad'];

        cities.forEach(city => {
            this.cityStats[city] = {
                count: 0,
                avgPrice: 0,
                minPrice: Infinity,
                maxPrice: -Infinity,
                avgArea: 0,
                propertyTypes: {}
            };
        });

        this.data.forEach(record => {
            const city = record.city;
            if (!this.cityStats[city]) return;

            const price = parseFloat(record.price);
            // Rough Area Normalization to Marla (assuming simple heuristic if unit not clear, 
            // but dataset usually has 'Area_Size' and 'Area_Type' or similar. 
            // For zameen-updated, let's try to use 'Area_Size' if 'Area_Category' is 'Marla' or convert.
            // For simplicity in this summary, we'll trust 'Area_Size' is normalized or skip complex conversion here
            // and just use record count/price for now if area is messy.

            if (isNaN(price) || price <= 0) return;

            const stats = this.cityStats[city];
            stats.count++;
            stats.avgPrice += price;
            stats.minPrice = Math.min(stats.minPrice, price);
            stats.maxPrice = Math.max(stats.maxPrice, price);

            const type = record.property_type;
            stats.propertyTypes[type] = (stats.propertyTypes[type] || 0) + 1;
        });

        // Finalize averages
        for (const city in this.cityStats) {
            const stats = this.cityStats[city];
            if (stats.count > 0) {
                stats.avgPrice = stats.avgPrice / stats.count;
            } else {
                stats.minPrice = 0;
                stats.maxPrice = 0;
            }
        }
    }

    private generateSystemContext() {
        let summary = "REAL ESTATE DATASET CONTEXT (2025 Market Data):\n";
        summary += `Total Records: ${this.data.length}\n`;

        for (const city in this.cityStats) {
            const s = this.cityStats[city];
            if (s.count === 0) continue;

            summary += `\n${city.toUpperCase()}:\n`;
            summary += `- Listings: ${s.count}\n`;
            summary += `- Avg Price: PKR ${this.formatCurrency(s.avgPrice)}\n`;
            summary += `- Price Range: PKR ${this.formatCurrency(s.minPrice)} - ${this.formatCurrency(s.maxPrice)}\n`;

            // Top property types
            const topTypes = Object.entries(s.propertyTypes)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([t, c]) => `${t} (${Math.round(c / s.count * 100)}%)`)
                .join(', ');

            summary += `- Common Types: ${topTypes}\n`;
        }

        this.systemContext = summary;
        console.log("DataContext: Context generated.");
    }

    private formatCurrency(amount: number): string {
        if (amount >= 10000000) return (amount / 10000000).toFixed(2) + " Crore";
        if (amount >= 100000) return (amount / 100000).toFixed(2) + " Lakh";
        return amount.toLocaleString();
    }

    public getContext(): string {
        if (!this.isLoaded) return "Dataset currently loading...";
        return this.systemContext || "Dataset processing...";
    }
}

export const dataContext = new DataContextService();
