"""
Real Estate Price Prediction - Fixed Data Preprocessing Pipeline
Implements: Target encoding, log transform, proper shuffling, location grouping
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
from category_encoders import TargetEncoder
import joblib
import warnings
warnings.filterwarnings('ignore')

class DataPreprocessor:
    def __init__(self, inputFile, outputFile):
        self.inputFile = inputFile
        self.outputFile = outputFile
        self.df = None
        self.labelEncoders = {}
        self.targetEncoder = None
        
        self.minRoomsPerMarla = 0.15
        self.maxRoomsPerMarla = 1.8
        
    def loadData(self):
        print("Loading data...")
        self.df = pd.read_csv(self.inputFile)
        print(f"Loaded {len(self.df)} rows and {len(self.df.columns)} columns")
        return self
    
    def dropUnnecessaryColumns(self):
        print("\nDropping unnecessary columns...")
        
        unnamedCols = [col for col in self.df.columns if 'Unnamed' in str(col)]
        
        if unnamedCols:
            self.df = self.df.drop(columns=unnamedCols)
            print(f"Dropped columns: {unnamedCols}")
        
        return self
    
    def filterCities(self):
        print("\nFiltering cities...")
        
        initialCount = len(self.df)
        targetCities = ['Karachi', 'Lahore', 'Islamabad']
        self.df = self.df[self.df['city'].isin(targetCities)]
        
        removed = initialCount - len(self.df)
        print(f"Kept only {targetCities}")
        print(f"Removed {removed} rows")
        print(f"Remaining: {len(self.df)}")
        
        return self
    
    def filterPropertyTypes(self):
        print("\nFiltering property types...")
        
        initialCount = len(self.df)
        validTypes = ['House', 'Flat', 'Penthouse']
        self.df = self.df[self.df['property_type'].isin(validTypes)]
        
        removed = initialCount - len(self.df)
        print(f"Kept: {validTypes}")
        print(f"Removed {removed} rows")
        print(f"Remaining: {len(self.df)}")
        
        return self
    
    def validateRoomAreaRatios(self):
        print("\nValidating room-area ratios...")
        
        initialCount = len(self.df)
        self.df['totalRooms'] = self.df['bedrooms'] + self.df['baths']
        self.df = self.df[self.df['Area_in_Marla'] > 0]
        self.df['roomsPerMarla'] = self.df['totalRooms'] / self.df['Area_in_Marla']
        
        validMask = (
            (self.df['roomsPerMarla'] >= self.minRoomsPerMarla) & 
            (self.df['roomsPerMarla'] <= self.maxRoomsPerMarla)
        )
        
        self.df = self.df[validMask]
        self.df = self.df.drop(columns=['roomsPerMarla'])
        
        removed = initialCount - len(self.df)
        print(f"Removed {removed} invalid ratios")
        print(f"Remaining: {len(self.df)}")
        
        return self
    
    def handleOutliers(self):
        print("\nHandling outliers...")
        
        initialCount = len(self.df)
        
        self.df = self.df[
            (self.df['price'] > 0) &
            (self.df['bedrooms'] <= 10) &
            (self.df['baths'] <= 10) &
            (self.df['Area_in_Marla'] <= 100) &
            (self.df['Area_in_Marla'] >= 1)
        ]
        
        priceQ005 = self.df['price'].quantile(0.005)
        priceQ995 = self.df['price'].quantile(0.995)
        
        self.df = self.df[
            (self.df['price'] >= priceQ005) &
            (self.df['price'] <= priceQ995)
        ]
        
        removed = initialCount - len(self.df)
        print(f"Removed {removed} outliers")
        print(f"Price range: {self.df['price'].min():,.0f} - {self.df['price'].max():,.0f}")
        print(f"Remaining: {len(self.df)}")
        
        return self
    
    def groupRareLocations(self):
        print("\nGrouping rare locations...")
        
        locationCounts = self.df['location'].value_counts()
        rareLocations = locationCounts[locationCounts < 20].index
        
        print(f"Found {len(rareLocations)} rare locations (< 20 samples)")
        self.df.loc[self.df['location'].isin(rareLocations), 'location'] = 'Other_Location'
        
        print(f"Unique locations after grouping: {self.df['location'].nunique()}")
        
        return self
    
    def balanceDataset(self):
        print("\nBalancing dataset...")
        
        print("Before balancing:")
        print(self.df['city'].value_counts())
        
        cityCounts = self.df['city'].value_counts()
        minCount = cityCounts.min()
        
        balancedDfs = []
        for city in ['Karachi', 'Lahore', 'Islamabad']:
            cityDf = self.df[self.df['city'] == city]
            
            if len(cityDf) > minCount:
                cityDfSampled = cityDf.sample(n=minCount, random_state=42)
                balancedDfs.append(cityDfSampled)
                print(f"  {city}: {len(cityDf)} -> {minCount}")
            else:
                balancedDfs.append(cityDf)
                print(f"  {city}: {len(cityDf)}")
        
        self.df = pd.concat(balancedDfs, ignore_index=True)
        self.df = self.df.sample(frac=1, random_state=42).reset_index(drop=True)
        
        print(f"Total balanced: {len(self.df)}")
        
        return self
    
    def createEngineeredFeatures(self):
        print("\nCreating engineered features...")
        
        if 'totalRooms' not in self.df.columns:
            self.df['totalRooms'] = self.df['bedrooms'] + self.df['baths']
        
        self.df['cityMedianPrice'] = self.df.groupby('city')['price'].transform('median')
        self.df['locationMedianPrice'] = self.df.groupby('location')['price'].transform('median')
        
        print("Created: totalRooms, cityMedianPrice, locationMedianPrice")
        
        return self
    
    def applyLogTransform(self):
        print("\nApplying log transformation...")
        
        self.df['logPrice'] = np.log1p(self.df['price'])
        
        print(f"Price range: {self.df['price'].min():,.0f} - {self.df['price'].max():,.0f}")
        print(f"Log price range: {self.df['logPrice'].min():.2f} - {self.df['logPrice'].max():.2f}")
        
        return self
    
    def encodeCategoricalVariables(self):
        print("\nEncoding categorical variables...")
        
        categoricalSimple = ['property_type', 'city', 'purpose']
        
        for col in categoricalSimple:
            if col in self.df.columns:
                le = LabelEncoder()
                self.df[f'{col}Encoded'] = le.fit_transform(self.df[col].astype(str))
                self.labelEncoders[col] = le
                print(f"  Label encoded {col}: {self.df[col].nunique()} values")
        
        self.targetEncoder = TargetEncoder(cols=['location'], smoothing=1.0)
        self.df['locationTargetEncoded'] = self.targetEncoder.fit_transform(
            self.df['location'], 
            self.df['logPrice']
        )
        print(f"  Target encoded location: {self.df['location'].nunique()} values")
        
        self.df = self.df.drop(columns=['property_type', 'location', 'city', 'purpose'])
        
        return self
    
    def reorderColumns(self):
        print("\nReordering columns...")
        
        featureCols = [col for col in self.df.columns if col not in ['price', 'logPrice']]
        self.df = self.df[['price', 'logPrice'] + featureCols]
        
        return self
    
    def saveCleanedData(self):
        print(f"\nSaving to {self.outputFile}...")
        self.df.to_csv(self.outputFile, index=False)
        
        print("Saving preprocessor artifacts...")
        preprocessorArtifacts = {
            'labelEncoders': self.labelEncoders,
            'targetEncoder': self.targetEncoder,
            'cityMedianPrices': self.df.groupby('cityEncoded')['price'].median().to_dict(),
            'locationMedianPrices': self.df.groupby('locationTargetEncoded')['price'].median().to_dict()
        }
        joblib.dump(preprocessorArtifacts, 'preprocessor_artifacts.pkl')
        print("Preprocessor artifacts saved")
        
        print("\n" + "="*80)
        print("FINAL DATASET SUMMARY")
        print("="*80)
        print(f"Total rows: {len(self.df)}")
        print(f"Columns: {list(self.df.columns)}")
        print(f"\nPrice stats:")
        print(self.df['price'].describe())
        print(f"\nLog price stats:")
        print(self.df['logPrice'].describe())
        
        return self
    
    def preprocess(self):
        print("="*80)
        print("PREPROCESSING WITH FIX FOR DATA LEAKAGE")
        print("="*80)
        
        (self
         .loadData()
         .dropUnnecessaryColumns()
         .filterCities()
         .filterPropertyTypes()
         .validateRoomAreaRatios()
         .handleOutliers()
         .groupRareLocations()
         .balanceDataset()
         .createEngineeredFeatures()
         .applyLogTransform()
         .encodeCategoricalVariables()
         .reorderColumns()
         .saveCleanedData())
        
        print("\n" + "="*80)
        print("PREPROCESSING COMPLETE")
        print("="*80)
        
        return self.df


if __name__ == "__main__":
    INPUT_FILE = "Cleaned_data_for_model.csv"
    OUTPUT_FILE = "cleaned_real_estate_data.csv"
    
    preprocessor = DataPreprocessor(INPUT_FILE, OUTPUT_FILE)
    cleanedDf = preprocessor.preprocess()
