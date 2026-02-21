"""
Dataset Merger
Combines DrugBank, FAERS, and SIDER data into unified medicine database
"""

import pandas as pd
import json
from pathlib import Path
import numpy as np

def load_datasets():
    """Load all cleaned datasets"""
    
    print("📂 Loading datasets...")
    
    # Load DrugBank medicines
    df_drugbank = pd.read_csv('data/medicines_cleaned.csv')
    print(f"✅ DrugBank: {len(df_drugbank)} medicines")
    
    # Load FAERS side effects
    df_faers = pd.read_csv('data/side_effects_cleaned.csv')
    print(f"✅ FAERS: {len(df_faers)} drug-side effect pairs")
    
    # Load SIDER if available
    sider_file = Path('data/sider.tsv')
    if sider_file.exists():
        df_sider = pd.read_csv(sider_file, sep='\t')
        print(f"✅ SIDER: {len(df_sider)} entries")
    else:
        print("⚠️ SIDER file not found, skipping...")
        df_sider = None
    
    return df_drugbank, df_faers, df_sider

def normalize_drug_names(df_drugbank, df_faers):
    """Create mapping between different drug name formats"""
    
    print("\n🔗 Normalizing drug names...")
    
    # Create name variations for DrugBank
    drugbank_names = {}
    for idx, row in df_drugbank.iterrows():
        names = [row['name'].upper()]
        
        # Add brand names if available
        external_ids = json.loads(row['external_ids']) if row['external_ids'] else {}
        if 'RxCUI' in external_ids:
            names.append(external_ids['RxCUI'].upper())
        
        drugbank_names[row['drugbank_id']] = names
    
    # Match FAERS drugs to DrugBank
    faers_matched = []
    for drug in df_faers['drugname'].unique():
        for db_id, names in drugbank_names.items():
            if any(name in drug or drug in name for name in names):
                faers_matched.append({
                    'faers_name': drug,
                    'drugbank_id': db_id
                })
                break
    
    df_mapping = pd.DataFrame(faers_matched)
    print(f"✅ Matched {len(df_mapping)} FAERS drugs to DrugBank")
    
    return df_mapping

def merge_side_effects(df_drugbank, df_faers, df_mapping):
    """Merge side effect data into medicine records"""
    
    print("\n🔀 Merging side effect data...")
    
    # Add drugbank_id to FAERS data
    df_faers_mapped = pd.merge(
        df_faers,
        df_mapping,
        left_on='drugname',
        right_on='faers_name',
        how='inner'
    )
    
    # Aggregate side effects per drug
    side_effects_agg = df_faers_mapped.groupby('drugbank_id').apply(
        lambda x: x.nlargest(20, 'frequency')[['pt', 'frequency', 'count']].to_dict('records')
    ).reset_index(name='side_effects_data')
    
    # Merge with DrugBank
    df_merged = pd.merge(
        df_drugbank,
        side_effects_agg,
        on='drugbank_id',
        how='left'
    )
    
    # Fill missing side effects with empty list
    df_merged['side_effects_data'] = df_merged['side_effects_data'].apply(
        lambda x: x if isinstance(x, list) else []
    )
    
    print(f"✅ Merged data: {len(df_merged)} medicines with side effect info")
    
    return df_merged

def create_master_dataset(df_merged):
    """Create final master dataset with all information"""
    
    print("\n🎯 Creating master dataset...")
    
    # Select and rename columns
    df_master = df_merged[[
        'drugbank_id',
        'name',
        'categories',
        'groups',
        'description',
        'indication',
        'mechanism',
        'metabolism',
        'half_life',
        'dosages',
        'interactions',
        'side_effects_data',
        'is_approved'
    ]].copy()
    
    # Add computed fields
    df_master['has_side_effect_data'] = df_master['side_effects_data'].apply(len) > 0
    df_master['interaction_count'] = df_master['interactions'].apply(
        lambda x: len(json.loads(x)) if x else 0
    )
    df_master['category_count'] = df_master['categories'].apply(len)
    
    # Filter to keep only useful medicines
    df_master = df_master[
        (df_master['is_approved'] == True) &
        (df_master['description'].str.len() > 50)
    ]
    
    print(f"✅ Master dataset: {len(df_master)} approved medicines")
    
    return df_master

def main():
    # Load datasets
    df_drugbank, df_faers, df_sider = load_datasets()
    
    # Normalize drug names and create mapping
    df_mapping = normalize_drug_names(df_drugbank, df_faers)
    
    # Merge side effects
    df_merged = merge_side_effects(df_drugbank, df_faers, df_mapping)
    
    # Create master dataset
    df_master = create_master_dataset(df_merged)
    
    # Save
    output_file = Path('data/master_medicines.csv')
    df_master.to_csv(output_file, index=False)
    print(f"\n💾 Saved master dataset: {output_file}")
    
    # Print statistics
    print("\n📊 Master Dataset Statistics:")
    print(f"Total medicines: {len(df_master)}")
    print(f"With side effect data: {df_master['has_side_effect_data'].sum()}")
    print(f"With interactions: {(df_master['interaction_count'] > 0).sum()}")
    print(f"Avg interactions per drug: {df_master['interaction_count'].mean():.1f}")
    
    # Top categories
    print("\n🏷️ Top Medicine Categories:")
    all_categories = []
    for cats in df_master['categories']:
        if isinstance(cats, list):
            all_categories.extend(cats)
    
    from collections import Counter
    top_cats = Counter(all_categories).most_common(10)
    for cat, count in top_cats:
        print(f"  {cat}: {count}")

if __name__ == "__main__":
    main()
