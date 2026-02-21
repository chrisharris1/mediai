"""
Map Indian medicine brands to generic drug names using RxNorm API
Example: Crocin → Paracetamol, Dolo 650 → Paracetamol
"""

import pandas as pd
import requests
import time
import json
from pathlib import Path
from tqdm import tqdm

# Setup paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / 'data' / 'processed'
INPUT_FILE = DATA_DIR / 'indian_medicines_filtered_5k.csv'
OUTPUT_FILE = DATA_DIR / 'indian_medicines_with_generics.csv'

# RxNorm API endpoint
RXNORM_API_BASE = "https://rxnav.nlm.nih.gov/REST"

def extract_generic_from_composition(composition):
    """Extract generic drug name from composition string"""
    if pd.isna(composition) or composition == 'NaN':
        return None
    
    # Remove dosage information (numbers, mg, mcg, etc.)
    import re
    generic = re.sub(r'\s*\(.*?\)', '', composition)  # Remove parentheses content
    generic = re.sub(r'\s*\d+\s*(mg|mcg|g|ml|%|iu|units?).*', '', generic, flags=re.IGNORECASE)
    generic = generic.strip()
    
    return generic if generic else None

def search_rxnorm(drug_name):
    """Search RxNorm API for drug information"""
    try:
        # Clean the drug name
        drug_name = drug_name.strip()
        
        # Try approximate match first
        url = f"{RXNORM_API_BASE}/approximateTerm.json"
        params = {'term': drug_name, 'maxEntries': 1}
        
        response = requests.get(url, params=params, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            
            if 'approximateGroup' in data and 'candidate' in data['approximateGroup']:
                candidates = data['approximateGroup']['candidate']
                if candidates:
                    # Get the first candidate
                    if isinstance(candidates, list):
                        return candidates[0].get('name', drug_name)
                    else:
                        return candidates.get('name', drug_name)
        
        return drug_name
        
    except Exception as e:
        print(f"   ⚠️  Error searching RxNorm for '{drug_name}': {e}")
        return drug_name

def map_to_generics(df):
    """Map Indian brands to generic names"""
    print("\n🔍 Mapping medicines to generic names...")
    
    # Extract generics from composition fields
    print("   Step 1: Extracting from composition data...")
    df['generic_name'] = df['short_composition1'].apply(extract_generic_from_composition)
    
    # For medicines without composition, use the brand name to search RxNorm
    print("   Step 2: Searching RxNorm for missing generics...")
    
    missing_generics = df[df['generic_name'].isna()].copy()
    
    if len(missing_generics) > 0:
        print(f"   Found {len(missing_generics)} medicines without generic names")
        print("   Searching RxNorm API (this may take a few minutes)...")
        
        for idx in tqdm(missing_generics.index, desc="   RxNorm lookup"):
            medicine_name = df.loc[idx, 'name']
            # Extract first word (often the generic)
            first_word = medicine_name.split()[0]
            
            generic = search_rxnorm(first_word)
            df.loc[idx, 'generic_name'] = generic
            
            # Rate limit: 20 requests per second
            time.sleep(0.05)
    
    # Clean up generic names
    df['generic_name'] = df['generic_name'].str.strip()
    df['generic_name'] = df['generic_name'].str.title()
    
    # Statistics
    total = len(df)
    with_generics = df['generic_name'].notna().sum()
    
    print(f"\n   ✅ Mapped {with_generics}/{total} medicines to generic names ({with_generics/total*100:.1f}%)")
    
    return df

def create_generic_summary(df):
    """Create summary of generic drugs"""
    print("\n📊 Creating generic drug summary...")
    
    # Group by generic name
    generic_summary = df.groupby('generic_name').agg({
        'name': 'count',  # Number of brands
        'manufacturer_name': lambda x: list(x.unique())[:5],  # Top manufacturers
        'price(₹)': ['min', 'max', 'mean']
    }).reset_index()
    
    generic_summary.columns = ['generic_name', 'brand_count', 'manufacturers', 'min_price', 'max_price', 'avg_price']
    generic_summary = generic_summary.sort_values('brand_count', ascending=False)
    
    # Save summary
    summary_file = DATA_DIR / 'generic_drugs_summary.csv'
    generic_summary.to_csv(summary_file, index=False)
    
    print(f"   Saved to: {summary_file}")
    print(f"\n   Top 10 most common generics:")
    for idx, row in generic_summary.head(10).iterrows():
        print(f"   - {row['generic_name']}: {row['brand_count']} brands")
    
    return generic_summary

if __name__ == "__main__":
    print("=" * 60)
    print("🧬 MAPPING INDIAN MEDICINES TO GENERIC NAMES")
    print("=" * 60)
    
    # Load filtered dataset
    print(f"\n📂 Loading dataset: {INPUT_FILE}")
    df = pd.read_csv(INPUT_FILE)
    print(f"   Loaded {len(df):,} medicines")
    
    # Map to generics
    df = map_to_generics(df)
    
    # Create summary
    summary = create_generic_summary(df)
    
    # Save dataset with generics
    print(f"\n💾 Saving dataset with generic names...")
    df.to_csv(OUTPUT_FILE, index=False)
    print(f"   Saved to: {OUTPUT_FILE}")
    
    print("\n✅ Mapping complete!")
    print(f"   Output: {OUTPUT_FILE}")
    print(f"   Summary: {DATA_DIR / 'generic_drugs_summary.csv'}")
    print("\n🎯 Next step: python preprocessing/merge_with_faers.py")
