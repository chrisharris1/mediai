"""
Feature Engineering for ML Models
Creates training datasets for drug interaction and side effect prediction models
"""

import pandas as pd
import numpy as np
import json
from pathlib import Path
from sklearn.preprocessing import LabelEncoder
from itertools import combinations
import warnings
warnings.filterwarnings('ignore')

def load_master_data():
    """Load master medicine dataset"""
    
    print("📂 Loading master dataset...")
    df = pd.read_csv('data/master_medicines.csv')
    print(f"✅ Loaded {len(df)} medicines")
    
    return df

def create_drug_interaction_features(df):
    """Create features for drug interaction prediction model"""
    
    print("\n🔗 Creating drug interaction features...")
    
    # Parse interactions
    drug_interactions = []
    
    for idx, row in df.iterrows():
        drug1_id = row['drugbank_id']
        drug1_name = row['name']
        drug1_cats = eval(row['categories']) if isinstance(row['categories'], str) else row['categories']
        
        # Get interactions for this drug
        interactions = json.loads(row['interactions']) if row['interactions'] else []
        
        for interaction in interactions:
            drug2_id = interaction.get('drugbank_id')
            drug2_name = interaction.get('name')
            description = interaction.get('description', '')
            
            # Find drug2 in dataset
            drug2_row = df[df['drugbank_id'] == drug2_id]
            if len(drug2_row) == 0:
                continue
            
            drug2_cats = eval(drug2_row.iloc[0]['categories']) if isinstance(drug2_row.iloc[0]['categories'], str) else drug2_row.iloc[0]['categories']
            
            # Extract severity from description
            severity = 'moderate'  # default
            desc_lower = description.lower()
            if any(word in desc_lower for word in ['avoid', 'contraindicated', 'serious', 'severe', 'dangerous']):
                severity = 'major'
            elif any(word in desc_lower for word in ['minor', 'mild', 'unlikely']):
                severity = 'minor'
            
            drug_interactions.append({
                'drug1_id': drug1_id,
                'drug2_id': drug2_id,
                'drug1_name': drug1_name,
                'drug2_name': drug2_name,
                'drug1_categories': '|'.join(drug1_cats[:3]) if drug1_cats else '',
                'drug2_categories': '|'.join(drug2_cats[:3]) if drug2_cats else '',
                'interaction_exists': 1,
                'severity': severity,
                'description': description[:200]
            })
    
    df_interactions = pd.DataFrame(drug_interactions)
    print(f"✅ Found {len(df_interactions)} positive interactions")
    
    # Create negative samples (drug pairs that DON'T interact)
    print("🔄 Creating negative samples...")
    
    negative_samples = []
    drug_list = df['drugbank_id'].tolist()
    
    # Sample random pairs
    for _ in range(len(df_interactions)):
        drug1, drug2 = np.random.choice(drug_list, 2, replace=False)
        
        # Check if this pair already exists in positive samples
        exists = ((df_interactions['drug1_id'] == drug1) & (df_interactions['drug2_id'] == drug2)) | \
                 ((df_interactions['drug1_id'] == drug2) & (df_interactions['drug2_id'] == drug1))
        
        if not exists.any():
            drug1_row = df[df['drugbank_id'] == drug1].iloc[0]
            drug2_row = df[df['drugbank_id'] == drug2].iloc[0]
            
            drug1_cats = eval(drug1_row['categories']) if isinstance(drug1_row['categories'], str) else drug1_row['categories']
            drug2_cats = eval(drug2_row['categories']) if isinstance(drug2_row['categories'], str) else drug2_row['categories']
            
            negative_samples.append({
                'drug1_id': drug1,
                'drug2_id': drug2,
                'drug1_name': drug1_row['name'],
                'drug2_name': drug2_row['name'],
                'drug1_categories': '|'.join(drug1_cats[:3]) if drug1_cats else '',
                'drug2_categories': '|'.join(drug2_cats[:3]) if drug2_cats else '',
                'interaction_exists': 0,
                'severity': 'none',
                'description': ''
            })
    
    df_negative = pd.DataFrame(negative_samples)
    print(f"✅ Created {len(df_negative)} negative samples")
    
    # Combine positive and negative
    df_final = pd.concat([df_interactions, df_negative], ignore_index=True)
    
    # Encode categorical features
    le_severity = LabelEncoder()
    df_final['severity_encoded'] = le_severity.fit_transform(df_final['severity'])
    
    print(f"✅ Total training samples: {len(df_final)}")
    
    return df_final

def create_side_effect_features(df):
    """Create features for side effect prediction model"""
    
    print("\n💊 Creating side effect features...")
    
    # Load FAERS full processed data (has patient demographics)
    faers_file = Path('data/faers_full_processed.csv')
    
    if not faers_file.exists():
        print("⚠️ FAERS processed file not found. Using simulated data...")
        return create_simulated_side_effect_data(df)
    
    df_faers = pd.read_csv(faers_file, nrows=100000)  # Limit for speed
    print(f"📊 Loaded {len(df_faers)} patient-drug records")
    
    # Clean data
    df_faers = df_faers[
        (df_faers['age_years'].notna()) &
        (df_faers['age_years'] > 0) &
        (df_faers['age_years'] < 120) &
        (df_faers['weight_kg'].notna()) &
        (df_faers['weight_kg'] > 20) &
        (df_faers['weight_kg'] < 300)
    ]
    
    # Sample for training
    df_sample = df_faers.sample(min(50000, len(df_faers)), random_state=42)
    
    # Encode categorical features
    le_sex = LabelEncoder()
    df_sample['sex_encoded'] = le_sex.fit_transform(df_sample['sex'].fillna('U'))
    
    # Select features
    df_features = df_sample[[
        'drugname',
        'pt',  # Side effect
        'age_years',
        'weight_kg',
        'sex_encoded'
    ]].copy()
    
    df_features['side_effect_occurred'] = 1  # All are positive cases
    
    print(f"✅ Created {len(df_features)} side effect training samples")
    
    return df_features

def create_simulated_side_effect_data(df):
    """Create simulated side effect data when FAERS not available"""
    
    print("🎲 Generating simulated side effect data...")
    
    records = []
    side_effects = [
        'NAUSEA', 'HEADACHE', 'DIZZINESS', 'FATIGUE', 'DIARRHEA',
        'CONSTIPATION', 'RASH', 'INSOMNIA', 'DROWSINESS', 'DRY MOUTH'
    ]
    
    for idx, row in df.iterrows():
        if idx >= 100:  # Limit for speed
            break
        
        side_effect_data = json.loads(row['side_effects_data']) if row['side_effects_data'] else []
        
        # Generate 10 patient records per drug
        for _ in range(10):
            age = np.random.randint(18, 85)
            weight = np.random.normal(70, 15)
            sex = np.random.choice([0, 1])
            
            # Simulate 2-3 side effects
            for effect in np.random.choice(side_effects, np.random.randint(1, 4), replace=False):
                records.append({
                    'drugname': row['name'],
                    'pt': effect,
                    'age_years': age,
                    'weight_kg': weight,
                    'sex_encoded': sex,
                    'side_effect_occurred': 1
                })
    
    df_simulated = pd.DataFrame(records)
    print(f"✅ Generated {len(df_simulated)} simulated records")
    
    return df_simulated

def main():
    # Load data
    df = load_master_data()
    
    # Create drug interaction dataset
    df_interactions = create_drug_interaction_features(df)
    output_file = Path('data/train_interactions.csv')
    df_interactions.to_csv(output_file, index=False)
    print(f"\n💾 Saved: {output_file}")
    
    # Create side effect dataset
    df_side_effects = create_side_effect_features(df)
    output_file = Path('data/train_side_effects.csv')
    df_side_effects.to_csv(output_file, index=False)
    print(f"💾 Saved: {output_file}")
    
    print("\n✅ Feature engineering complete!")
    print(f"   Interaction samples: {len(df_interactions)}")
    print(f"   Side effect samples: {len(df_side_effects)}")

if __name__ == "__main__":
    main()
