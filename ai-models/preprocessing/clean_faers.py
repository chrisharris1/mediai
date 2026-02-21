"""
FDA FAERS Data Processor
Processes FDA Adverse Event Reporting System data to extract drug side effects
"""

import pandas as pd
import numpy as np
from pathlib import Path
from tqdm import tqdm
import warnings
warnings.filterwarnings('ignore')

def load_faers_quarter(quarter, data_dir):
    """Load FAERS data for a specific quarter"""
    
    print(f"📂 Loading FAERS {quarter} data...")
    
    try:
        # Load demographic data (patient info)
        demo_file = data_dir / f'DEMO{quarter}.txt'
        df_demo = pd.read_csv(demo_file, sep='$', encoding='latin-1', low_memory=False)
        
        # Load drug data
        drug_file = data_dir / f'DRUG{quarter}.txt'
        df_drug = pd.read_csv(drug_file, sep='$', encoding='latin-1', low_memory=False)
        
        # Load reaction data (side effects)
        reac_file = data_dir / f'REAC{quarter}.txt'
        df_reac = pd.read_csv(reac_file, sep='$', encoding='latin-1', low_memory=False)
        
        print(f"✅ {quarter}: {len(df_demo)} reports, {len(df_drug)} drug mentions, {len(df_reac)} reactions")
        
        return df_demo, df_drug, df_reac
        
    except Exception as e:
        print(f"❌ Error loading {quarter}: {e}")
        return None, None, None

def process_faers_data(data_dir):
    """Process all FAERS quarters and extract side effect information"""
    
    quarters = ['25Q1', '25Q2', '25Q3']
    
    all_demo = []
    all_drug = []
    all_reac = []
    
    # Load all quarters
    for quarter in quarters:
        demo, drug, reac = load_faers_quarter(quarter, data_dir)
        if demo is not None:
            all_demo.append(demo)
            all_drug.append(drug)
            all_reac.append(reac)
    
    if not all_demo:
        print("❌ No FAERS data found!")
        return None
    
    # Combine all quarters
    print("\n🔗 Combining all quarters...")
    df_demo = pd.concat(all_demo, ignore_index=True)
    df_drug = pd.concat(all_drug, ignore_index=True)
    df_reac = pd.concat(all_reac, ignore_index=True)
    
    print(f"📊 Total: {len(df_demo)} reports, {len(df_drug)} drugs, {len(df_reac)} reactions")
    
    # Clean and standardize drug names
    print("\n🧹 Cleaning drug names...")
    df_drug['drugname'] = df_drug['drugname'].str.strip().str.upper()
    df_drug = df_drug[df_drug['drugname'].notna()]
    
    # Clean reaction names
    df_reac['pt'] = df_reac['pt'].str.strip().str.upper()
    df_reac = df_reac[df_reac['pt'].notna()]
    
    # Merge drug and reaction data
    print("\n🔀 Merging drug and reaction data...")
    df_drug_reac = pd.merge(
        df_drug[['primaryid', 'caseid', 'drug_seq', 'drugname', 'role_cod']],
        df_reac[['primaryid', 'caseid', 'pt']],
        on=['primaryid', 'caseid'],
        how='inner'
    )
    
    # Keep only primary suspect drugs (role_cod = 'PS')
    df_drug_reac = df_drug_reac[df_drug_reac['role_cod'] == 'PS']
    
    # Merge with demographics
    print("\n👥 Adding patient demographics...")
    df_full = pd.merge(
        df_drug_reac,
        df_demo[['primaryid', 'caseid', 'age', 'age_cod', 'sex', 'wt', 'wt_cod']],
        on=['primaryid', 'caseid'],
        how='left'
    )
    
    # Convert age to years
    df_full['age_years'] = df_full['age'].astype(float)
    df_full.loc[df_full['age_cod'] == 'MON', 'age_years'] = df_full['age'] / 12
    df_full.loc[df_full['age_cod'] == 'DEC', 'age_years'] = df_full['age'] * 10
    df_full.loc[df_full['age_cod'] == 'WK', 'age_years'] = df_full['age'] / 52
    df_full.loc[df_full['age_cod'] == 'DY', 'age_years'] = df_full['age'] / 365
    
    # Convert weight to kg
    df_full['weight_kg'] = df_full['wt'].astype(float)
    df_full.loc[df_full['wt_cod'] == 'LBS', 'weight_kg'] = df_full['wt'] * 0.453592
    
    # Clean data
    df_full = df_full[
        (df_full['age_years'] >= 0) & (df_full['age_years'] <= 120) &
        (df_full['weight_kg'] >= 20) & (df_full['weight_kg'] <= 300)
    ]
    
    print(f"✅ Processed {len(df_full)} drug-reaction records")
    
    return df_full

def create_side_effect_frequency(df_full):
    """Calculate side effect frequencies for each drug"""
    
    print("\n📊 Calculating side effect frequencies...")
    
    # Count drug-side effect pairs
    side_effects = df_full.groupby(['drugname', 'pt']).size().reset_index(name='count')
    
    # Calculate total reports per drug
    drug_totals = df_full.groupby('drugname').size().reset_index(name='total_reports')
    
    # Merge and calculate frequency
    side_effects = pd.merge(side_effects, drug_totals, on='drugname')
    side_effects['frequency'] = side_effects['count'] / side_effects['total_reports']
    
    # Keep only drugs with at least 10 reports
    side_effects = side_effects[side_effects['total_reports'] >= 10]
    
    # Keep top 20 side effects per drug
    side_effects = side_effects.sort_values(['drugname', 'frequency'], ascending=[True, False])
    side_effects = side_effects.groupby('drugname').head(20)
    
    print(f"✅ Generated side effect data for {side_effects['drugname'].nunique()} drugs")
    
    return side_effects

def main():
    # Paths
    data_dir = Path('data/faers')
    output_file = Path('data/side_effects_cleaned.csv')
    full_output = Path('data/faers_full_processed.csv')
    
    if not data_dir.exists():
        print("❌ FAERS data directory not found!")
        print(f"📥 Please download FAERS data from: https://fis.fda.gov/extensions/FPD-QDE-FAERS/FPD-QDE-FAERS.html")
        print(f"📁 Save to: {data_dir.absolute()}")
        return
    
    # Process FAERS data
    df_full = process_faers_data(data_dir)
    
    if df_full is None:
        return
    
    # Save full processed data
    print("\n💾 Saving processed data...")
    df_full.to_csv(full_output, index=False)
    print(f"Saved full data: {full_output}")
    
    # Create side effect frequency table
    side_effects = create_side_effect_frequency(df_full)
    side_effects.to_csv(output_file, index=False)
    print(f"Saved side effects: {output_file}")
    
    # Print statistics
    print("\n📊 Final Statistics:")
    print(f"Unique drugs: {side_effects['drugname'].nunique()}")
    print(f"Unique side effects: {side_effects['pt'].nunique()}")
    print(f"Total drug-side effect pairs: {len(side_effects)}")
    
    # Top 10 most reported side effects
    print("\n🔝 Top 10 Most Common Side Effects:")
    top_effects = df_full['pt'].value_counts().head(10)
    for effect, count in top_effects.items():
        print(f"  {effect}: {count:,} reports")

if __name__ == "__main__":
    main()
