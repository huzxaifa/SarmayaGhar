import pandas as pd

# Read the Property.csv file
df = pd.read_csv('ml_training/Property.csv', sep=';')

print("Cities and their locations:")
print("=" * 50)

# Get unique cities
cities = df['city'].unique()[:5]  # First 5 cities

for city in cities:
    print(f"\n{city}:")
    print("-" * 30)
    
    # Get locations for this city
    city_data = df[df['city'] == city]
    locations = city_data['location'].unique()[:15]  # First 15 locations
    
    for i, location in enumerate(locations, 1):
        print(f"  {i:2d}. {location}")
    
    print(f"  ... and {len(city_data['location'].unique()) - 15} more locations")

print(f"\nTotal cities in dataset: {len(df['city'].unique())}")
print(f"Total locations in dataset: {len(df['location'].unique())}")

# Also check property types
print(f"\nProperty types:")
print("-" * 20)
property_types = df['property_type'].unique()
for ptype in property_types:
    print(f"  - {ptype}")

# Check area ranges
print(f"\nArea ranges:")
print("-" * 20)
areas = df['area'].unique()[:20]
for area in areas:
    print(f"  - {area}")
