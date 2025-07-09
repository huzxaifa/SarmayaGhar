import pandas as pd
import numpy as np

# Load the original dataset (Assuming 'real_estate_2019.csv' is the original dataset)
input_file = 'Pakistan House Prices.csv'
df = pd.read_csv(input_file)

# Define years and variation range (5-10% price increase with some random noise)
years = range(2020, 2026)
variation_range = (0.05, 0.10)

# Generate new datasets
df['date_added'] = 2019
data_frames = []
data_frames.append(df)
for year in years:
    new_df = df.copy()

    # Apply random price variations
    new_df['price'] = new_df['price'] * (
                1 + np.random.uniform(variation_range[0], variation_range[1], size=len(new_df)))
    new_df['date_added'] = year
    data_frames.append(new_df)

# Combine all years into one dataset
final_df = pd.concat(data_frames, ignore_index=True)

# Save the new dataset
output_file = 'real_estate_2019_2025.csv'
final_df.to_csv(output_file, index=False)

print(f"Dataset generated and saved as {output_file}")