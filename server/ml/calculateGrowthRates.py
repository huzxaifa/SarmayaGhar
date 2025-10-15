#!/usr/bin/env python3
"""
Historical Data Growth Rate Calculator
Analyzes Property.csv and property_data.csv to calculate real growth rates
"""

import pandas as pd
import numpy as np
import json
import os
from datetime import datetime, timedelta
import re
from typing import Dict, List, Tuple, Optional

class GrowthRateCalculator:
    def __init__(self):
        self.property_data_path = 'ml_training/Property.csv'
        self.rental_data_path = 'ml_training/property_data.csv'
        self.output_path = 'server/data/growthRates.json'
        
    def load_property_data(self) -> pd.DataFrame:
        """Load and process Property.csv data"""
        print("Loading Property.csv data...")
        try:
            df = pd.read_csv(self.property_data_path, sep=';')
            print(f"Loaded {len(df)} property records")
            
            # Convert date_added to datetime
            df['date_added'] = pd.to_datetime(df['date_added'], format='%m-%d-%Y', errors='coerce')
            
            # Filter out invalid dates
            df = df.dropna(subset=['date_added'])
            
            # Add year column
            df['year'] = df['date_added'].dt.year
            
            # Filter for 2018-2019 data
            df = df[df['year'].isin([2018, 2019])]
            
            print(f"Filtered to {len(df)} records from 2018-2019")
            print(f"Year distribution: {df['year'].value_counts().to_dict()}")
            
            return df
        except Exception as e:
            print(f"Error loading property data: {e}")
            return pd.DataFrame()
    
    def load_rental_data(self) -> pd.DataFrame:
        """Load and process property_data.csv (rental data)"""
        print("Loading property_data.csv (rental) data...")
        try:
            df = pd.read_csv(self.rental_data_path)
            print(f"Loaded {len(df)} rental records")
            
            # Convert relative dates to absolute dates
            df['actual_date'] = self.convert_relative_dates(df['added'])
            
            # Add year column
            df['year'] = pd.to_datetime(df['actual_date']).dt.year
            
            # Filter for 2018-2019 data
            df = df[df['year'].isin([2018, 2019])]
            
            print(f"Filtered to {len(df)} rental records from 2018-2019")
            print(f"Year distribution: {df['year'].value_counts().to_dict()}")
            
            return df
        except Exception as e:
            print(f"Error loading rental data: {e}")
            return pd.DataFrame()
    
    def convert_relative_dates(self, date_series: pd.Series) -> pd.Series:
        """Convert relative dates like '4 days ago' to absolute dates"""
        current_date = datetime.now()
        converted_dates = []
        
        for date_str in date_series:
            try:
                if pd.isna(date_str):
                    converted_dates.append(None)
                    continue
                
                # Extract number and unit
                match = re.search(r'(\d+)\s+(day|week|hour)s?\s+ago', str(date_str).lower())
                if match:
                    number = int(match.group(1))
                    unit = match.group(2)
                    
                    if unit == 'hour':
                        delta = timedelta(hours=number)
                    elif unit == 'day':
                        delta = timedelta(days=number)
                    elif unit == 'week':
                        delta = timedelta(weeks=number)
                    else:
                        delta = timedelta(days=number)
                    
                    actual_date = current_date - delta
                    converted_dates.append(actual_date)
                else:
                    converted_dates.append(None)
            except Exception as e:
                converted_dates.append(None)
        
        return pd.Series(converted_dates)
    
    def calculate_property_growth_rates(self, df: pd.DataFrame) -> Dict:
        """Calculate property appreciation rates by location and type"""
        print("Calculating property growth rates...")
        
        growth_rates = {}
        
        # Group by city, location, property_type, and year
        grouped = df.groupby(['city', 'location', 'property_type', 'year'])['price'].agg(['mean', 'count']).reset_index()
        
        # Calculate growth rates for each combination
        for (city, location, property_type), group in grouped.groupby(['city', 'location', 'property_type']):
            if city not in growth_rates:
                growth_rates[city] = {}
            if location not in growth_rates[city]:
                growth_rates[city][location] = {}
            
            # Get 2018 and 2019 data
            data_2018 = group[group['year'] == 2018]
            data_2019 = group[group['year'] == 2019]
            
            if len(data_2018) > 0 and len(data_2019) > 0:
                avg_price_2018 = data_2018['mean'].iloc[0]
                avg_price_2019 = data_2019['mean'].iloc[0]
                data_points_2018 = data_2018['count'].iloc[0]
                data_points_2019 = data_2019['count'].iloc[0]
                
                # Calculate appreciation rate
                appreciation_rate = ((avg_price_2019 - avg_price_2018) / avg_price_2018) * 100
                
                # Calculate confidence based on data points
                total_points = data_points_2018 + data_points_2019
                confidence = min(0.95, 0.5 + (total_points / 100) * 0.45)  # 0.5 to 0.95 based on data points
                
                growth_rates[city][location][property_type] = {
                    'property_appreciation_rate': round(appreciation_rate, 2),
                    'rent_growth_rate': 0,  # Will be calculated separately
                    'years_analyzed': 2,
                    'data_points': total_points,
                    'confidence': round(confidence, 3),
                    'avg_price_2018': round(avg_price_2018, 0),
                    'avg_price_2019': round(avg_price_2019, 0),
                    'method': 'historical_analysis'
                }
                
                print(f"{city} - {location} - {property_type}: {appreciation_rate:.2f}% appreciation ({total_points} data points)")
        
        return growth_rates
    
    def calculate_rental_growth_rates(self, df: pd.DataFrame, property_growth_rates: Dict) -> Dict:
        """Calculate rental growth rates and merge with property growth rates"""
        print("Calculating rental growth rates...")
        
        # Group by city, location, property_type, and year
        grouped = df.groupby(['location_city', 'location', 'type', 'year'])['price'].agg(['mean', 'count']).reset_index()
        
        # Calculate growth rates for each combination
        for (city, location, property_type), group in grouped.groupby(['location_city', 'location', 'type']):
            if city not in property_growth_rates:
                property_growth_rates[city] = {}
            if location not in property_growth_rates[city]:
                property_growth_rates[city][location] = {}
            if property_type not in property_growth_rates[city][location]:
                property_growth_rates[city][location][property_type] = {
                    'property_appreciation_rate': 0,
                    'rent_growth_rate': 0,
                    'years_analyzed': 2,
                    'data_points': 0,
                    'confidence': 0.5,
                    'method': 'historical_analysis'
                }
            
            # Get 2018 and 2019 data
            data_2018 = group[group['year'] == 2018]
            data_2019 = group[group['year'] == 2019]
            
            if len(data_2018) > 0 and len(data_2019) > 0:
                avg_rent_2018 = data_2018['mean'].iloc[0]
                avg_rent_2019 = data_2019['mean'].iloc[0]
                data_points_2018 = data_2018['count'].iloc[0]
                data_points_2019 = data_2019['count'].iloc[0]
                
                # Calculate rent growth rate
                rent_growth_rate = ((avg_rent_2019 - avg_rent_2018) / avg_rent_2018) * 100
                
                # Update existing data
                property_growth_rates[city][location][property_type]['rent_growth_rate'] = round(rent_growth_rate, 2)
                property_growth_rates[city][location][property_type]['avg_rent_2018'] = round(avg_rent_2018, 0)
                property_growth_rates[city][location][property_type]['avg_rent_2019'] = round(avg_rent_2019, 0)
                property_growth_rates[city][location][property_type]['data_points'] += (data_points_2018 + data_points_2019)
                
                # Update confidence
                total_points = property_growth_rates[city][location][property_type]['data_points']
                confidence = min(0.95, 0.5 + (total_points / 100) * 0.45)
                property_growth_rates[city][location][property_type]['confidence'] = round(confidence, 3)
                
                print(f"{city} - {location} - {property_type}: {rent_growth_rate:.2f}% rent growth")
        
        return property_growth_rates
    
    def save_growth_rates(self, growth_rates: Dict):
        """Save growth rates to JSON file"""
        print("Saving growth rates...")
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(self.output_path), exist_ok=True)
        
        # Convert numpy types to Python types for JSON serialization
        def convert_numpy_types(obj):
            if isinstance(obj, np.integer):
                return int(obj)
            elif isinstance(obj, np.floating):
                return float(obj)
            elif isinstance(obj, dict):
                return {key: convert_numpy_types(value) for key, value in obj.items()}
            elif isinstance(obj, list):
                return [convert_numpy_types(item) for item in obj]
            else:
                return obj
        
        # Convert all numpy types
        growth_rates_converted = convert_numpy_types(growth_rates)
        
        with open(self.output_path, 'w') as f:
            json.dump(growth_rates_converted, f, indent=2)
        
        print(f"Growth rates saved to {self.output_path}")
    
    def run_analysis(self):
        """Run the complete growth rate analysis"""
        print("=== Historical Data Growth Rate Analysis ===")
        
        # Load data
        property_df = self.load_property_data()
        rental_df = self.load_rental_data()
        
        if property_df.empty and rental_df.empty:
            print("No data available for analysis")
            return
        
        # Calculate growth rates
        growth_rates = {}
        
        if not property_df.empty:
            growth_rates = self.calculate_property_growth_rates(property_df)
        
        if not rental_df.empty:
            growth_rates = self.calculate_rental_growth_rates(rental_df, growth_rates)
        
        # Save results
        self.save_growth_rates(growth_rates)
        
        # Print summary
        print("\n=== Analysis Summary ===")
        for city, city_data in growth_rates.items():
            print(f"\n{city}:")
            for location, location_data in city_data.items():
                print(f"  {location}:")
                for property_type, data in location_data.items():
                    print(f"    {property_type}: {data['property_appreciation_rate']:.2f}% appreciation, {data['rent_growth_rate']:.2f}% rent growth ({data['data_points']} data points)")
        
        print(f"\nAnalysis complete! Growth rates saved to {self.output_path}")

if __name__ == "__main__":
    calculator = GrowthRateCalculator()
    calculator.run_analysis()
