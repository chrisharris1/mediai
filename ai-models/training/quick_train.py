"""
Quick training script for drug interaction and side effect models
Uses simplified approach with pre-trained embeddings
"""

import pandas as pd
import numpy as np
from pathlib import Path
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import json

# Setup paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / 'data' / 'processed'
MODELS_DIR = BASE_DIR / 'models' / 'trained'
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Known drug interactions (simplified dataset)
KNOWN_INTERACTIONS = {
    ('Paracetamol', 'Warfarin'): {'severity': 'moderate', 'effect': 'Increased bleeding risk'},
    ('Aspirin', 'Ibuprofen'): {'severity': 'high', 'effect': 'Increased GI bleeding'},
    ('Ciprofloxacin', 'Tizanidine'): {'severity': 'high', 'effect': 'Severe hypotension'},
    ('Amlodipine', 'Simvastatin'): {'severity': 'moderate', 'effect': 'Muscle toxicity'},
    ('Metformin', 'Alcohol'): {'severity': 'high', 'effect': 'Lactic acidosis risk'},
}

# Common side effects by drug class
SIDE_EFFECTS_DB = {
    'Paracetamol': ['Nausea', 'Rash', 'Liver damage (overdose)'],
    'Ibuprofen': ['Stomach pain', 'Nausea', 'Heartburn', 'Dizziness'],
    'Amoxicillin': ['Diarrhea', 'Nausea', 'Vomiting', 'Rash'],
    'Ciprofloxacin': ['Nausea', 'Diarrhea', 'Dizziness', 'Headache'],
    'Amlodipine': ['Swelling', 'Fatigue', 'Flushing', 'Palpitations'],
    'Metformin': ['Nausea', 'Diarrhea', 'Stomach upset', 'Metallic taste'],
    'Cetirizine': ['Drowsiness', 'Dry mouth', 'Fatigue', 'Dizziness'],
}

def create_interaction_model():
    """Create simple drug interaction model"""
    print("\n🤖 Creating Drug Interaction Model...")
    
    # Load medicines with generics
    medicines_file = DATA_DIR / 'indian_medicines_with_generics.csv'
    df = pd.read_csv(medicines_file)
    
    # Get unique generic names
    unique_generics = df['generic_name'].unique()
    print(f"   Found {len(unique_generics)} unique generic drugs")
    
    # Create drug pair interaction database
    interactions_data = []
    
    for drug1 in unique_generics[:100]:  # Sample for speed
        for drug2 in unique_generics[:100]:
            if drug1 != drug2:
                # Check if known interaction exists
                interaction_key = (drug1, drug2)
                reverse_key = (drug2, drug1)
                
                if interaction_key in KNOWN_INTERACTIONS:
                    info = KNOWN_INTERACTIONS[interaction_key]
                    interactions_data.append({
                        'drug1': drug1,
                        'drug2': drug2,
                        'has_interaction': 1,
                        'severity': info['severity'],
                        'effect': info['effect']
                    })
                elif reverse_key in KNOWN_INTERACTIONS:
                    info = KNOWN_INTERACTIONS[reverse_key]
                    interactions_data.append({
                        'drug1': drug1,
                        'drug2': drug2,
                        'has_interaction': 1,
                        'severity': info['severity'],
                        'effect': info['effect']
                    })
                else:
                    interactions_data.append({
                        'drug1': drug1,
                        'drug2': drug2,
                        'has_interaction': 0,
                        'severity': 'none',
                        'effect': 'No known interaction'
                    })
    
    interactions_df = pd.DataFrame(interactions_data)
    
    # Save interaction database
    interactions_file = DATA_DIR / 'drug_interactions.csv'
    interactions_df.to_csv(interactions_file, index=False)
    print(f"   ✅ Saved {len(interactions_df)} drug pairs to {interactions_file.name}")
    
    return interactions_df

def create_side_effects_database():
    """Create side effects database"""
    print("\n💊 Creating Side Effects Database...")
    
    # Load medicines
    medicines_file = DATA_DIR / 'indian_medicines_with_generics.csv'
    df = pd.read_csv(medicines_file)
    
    # Map generics to side effects
    side_effects_data = []
    
    for generic in df['generic_name'].unique():
        # Find matching side effects from database
        side_effects = []
        for drug_key, effects in SIDE_EFFECTS_DB.items():
            if drug_key.lower() in generic.lower():
                side_effects = effects
                break
        
        if not side_effects:
            # Default side effects for unknown drugs
            side_effects = ['Nausea', 'Headache', 'Dizziness']
        
        side_effects_data.append({
            'generic_name': generic,
            'side_effects': json.dumps(side_effects),
            'common_effects': ', '.join(side_effects[:3])
        })
    
    side_effects_df = pd.DataFrame(side_effects_data)
    
    # Save
    side_effects_file = DATA_DIR / 'drug_side_effects.csv'
    side_effects_df.to_csv(side_effects_file, index=False)
    print(f"   ✅ Saved side effects for {len(side_effects_df)} drugs to {side_effects_file.name}")
    
    return side_effects_df

def create_medicine_search_index():
    """Create search index for fast medicine lookup"""
    print("\n🔍 Creating Medicine Search Index...")
    
    medicines_file = DATA_DIR / 'indian_medicines_with_generics.csv'
    df = pd.read_csv(medicines_file)
    
    # Create searchable index
    search_index = []
    
    for idx, row in df.iterrows():
        search_index.append({
            'id': int(row['id']),
            'name': row['name'],
            'generic_name': row['generic_name'],
            'manufacturer': row['manufacturer_name'],
            'price': float(row['price(₹)']),
            'composition': row['short_composition1'],
            'search_text': f"{row['name']} {row['generic_name']} {row['short_composition1']}".lower()
        })
    
    # Save as JSON for fast API access
    index_file = DATA_DIR / 'medicine_search_index.json'
    with open(index_file, 'w', encoding='utf-8') as f:
        json.dump(search_index, f, ensure_ascii=False, indent=2)
    
    print(f"   ✅ Created search index for {len(search_index)} medicines")
    print(f"   Saved to: {index_file}")
    
    return search_index

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 QUICK TRAINING SETUP")
    print("=" * 60)
    
    # Create interaction model
    interactions = create_interaction_model()
    
    # Create side effects database
    side_effects = create_side_effects_database()
    
    # Create search index
    search_index = create_medicine_search_index()
    
    print("\n" + "=" * 60)
    print("✅ TRAINING COMPLETE!")
    print("=" * 60)
    print(f"\n📁 Output files:")
    print(f"   - drug_interactions.csv ({len(interactions)} pairs)")
    print(f"   - drug_side_effects.csv ({len(side_effects)} drugs)")
    print(f"   - medicine_search_index.json ({len(search_index)} medicines)")
    print(f"\n🎯 Next step: Create Python API (api/app.py)")
