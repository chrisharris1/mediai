"""
Download Indian Medicine Dataset from Kaggle
Dataset: A-Z Medicine Dataset of India (200k+ medicines)
"""

import os
import sys
import zipfile
from pathlib import Path
import pandas as pd
from kaggle.api.kaggle_api_extended import KaggleApi
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path='../../.env.local')

# Setup paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / 'data'
RAW_DATA_DIR = DATA_DIR / 'raw_indian_medicines'

# Create directories
RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)

def setup_kaggle_auth():
    """Setup Kaggle authentication using API token"""
    kaggle_token = os.getenv('KAGGLE_API_TOKEN')
    
    if not kaggle_token:
        print("❌ Error: KAGGLE_API_TOKEN not found in .env.local")
        print("Please add: KAGGLE_API_TOKEN=your_token_here")
        sys.exit(1)
    
    # Set environment variable for kaggle library
    os.environ['KAGGLE_KEY'] = kaggle_token
    os.environ['KAGGLE_USERNAME'] = 'mediaihealth'  # Your Kaggle username
    
    print("✅ Kaggle authentication configured")

def download_dataset():
    """Download the Indian medicine dataset from Kaggle"""
    print("📥 Downloading Indian Medicine Dataset from Kaggle...")
    
    try:
        # Initialize Kaggle API
        api = KaggleApi()
        api.authenticate()
        
        # Dataset identifier
        dataset = 'shudhanshusingh/az-medicine-dataset-of-india'
        
        # Download dataset
        api.dataset_download_files(
            dataset,
            path=str(RAW_DATA_DIR),
            unzip=True
        )
        
        print(f"✅ Dataset downloaded to: {RAW_DATA_DIR}")
        
        # List downloaded files
        files = list(RAW_DATA_DIR.glob('*'))
        print(f"\n📁 Downloaded files ({len(files)}):")
        for file in files:
            size_mb = file.stat().st_size / (1024 * 1024)
            print(f"  - {file.name} ({size_mb:.2f} MB)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error downloading dataset: {e}")
        return False

def analyze_dataset():
    """Quick analysis of the downloaded dataset"""
    print("\n📊 Analyzing dataset structure...")
    
    # Find CSV files
    csv_files = list(RAW_DATA_DIR.glob('*.csv'))
    
    if not csv_files:
        print("❌ No CSV files found in downloaded data")
        return
    
    for csv_file in csv_files:
        print(f"\n📄 File: {csv_file.name}")
        
        try:
            # Read first few rows
            df = pd.read_csv(csv_file, nrows=1000)
            
            print(f"   Total rows (sample): {len(df)}")
            print(f"   Columns: {list(df.columns)}")
            print(f"\n   Sample data:")
            print(df.head(3))
            
            # Check for key columns
            key_columns = ['medicine', 'drug', 'name', 'composition', 'manufacturer']
            found_columns = [col for col in key_columns if any(col.lower() in c.lower() for c in df.columns)]
            
            if found_columns:
                print(f"\n   ✅ Found important columns: {found_columns}")
            
        except Exception as e:
            print(f"   ❌ Error reading file: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("🇮🇳 INDIAN MEDICINE DATASET DOWNLOADER")
    print("=" * 60)
    
    # Setup authentication
    setup_kaggle_auth()
    
    # Check if dataset already exists
    existing_files = list(RAW_DATA_DIR.glob('*.csv'))
    if existing_files:
        print(f"\n⚠️  Found {len(existing_files)} existing files in {RAW_DATA_DIR}")
        response = input("Download again? (y/n): ")
        if response.lower() != 'y':
            print("Skipping download...")
            analyze_dataset()
            sys.exit(0)
    
    # Download dataset
    success = download_dataset()
    
    if success:
        # Analyze the downloaded data
        analyze_dataset()
        print("\n✅ Download complete! Next step: filter_indian_medicines.py")
    else:
        print("\n❌ Download failed. Please check your Kaggle API token.")
