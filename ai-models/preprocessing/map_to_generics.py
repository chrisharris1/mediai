"""
Map Indian brand names to generic drug names using RxNorm API
"""
import pandas as pd
import requests
import time
import os
from tqdm import tqdm

def extract_generic_from_name(medicine_name):
    """
    Extract generic name from medicine brand name
    e.g., "Crocin 650mg Tablet" -> "Crocin"
    """
    # Remove dosage, form, and count info
    name = medicine_name.split('(')[0]  # Remove anything in parentheses
    name = name.split(' mg')[0]  # Remove mg
    name = name.split(' Tablet')[0]
    name = name.split(' Capsule')[0]
    name = name.split(' Syrup')[0]
    name = name.strip()
    return name

def search_rxnorm_api(drug_name):
    """
    Search RxNorm API for generic drug name
    """
    try:
        # RxNorm API endpoint
        url = f"https://rxnav.nlm.nih.gov/REST/spellingsuggestions.json?name={drug_name}"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if 'suggestionGroup' in data and 'suggestionList' in data['suggestionGroup']:
                suggestions = data['suggestionGroup']['suggestionList'].get('suggestion', [])
                if suggestions:
                    return suggestions[0]  # Return first suggestion
        
        return None
    except Exception as e:
        return None

def create_indian_generic_mapping():
    """
    Create a manual mapping for common Indian brands to generics
    """
    # Common Indian medicine mappings
    mapping = {
        # Painkillers
        'Crocin': 'Paracetamol',
        'Dolo': 'Paracetamol',
        'Calpol': 'Paracetamol',
        'Combiflam': 'Ibuprofen + Paracetamol',
        'Brufen': 'Ibuprofen',
        'Disprin': 'Aspirin',
        'Saridon': 'Paracetamol + Caffeine',
        
        # Antibiotics
        'Azithral': 'Azithromycin',
        'Augmentin': 'Amoxicillin + Clavulanic Acid',
        'Zinemac': 'Azithromycin',
        'Taxim': 'Cefixime',
        'Clavam': 'Amoxicillin + Clavulanic Acid',
        
        # Antacids
        'Gelusil': 'Magnesium Hydroxide + Aluminium Hydroxide',
        'Pantop': 'Pantoprazole',
        'Razo': 'Rabeprazole',
        'Omez': 'Omeprazole',
        'Pan': 'Pantoprazole',
        
        # Cold & Cough
        'Sinarest': 'Paracetamol + Phenylephrine + Chlorpheniramine',
        'Cetrizine': 'Cetirizine',
        'Allegra': 'Fexofenadine',
        'Montair': 'Montelukast',
        
        # Diabetes
        'Glycomet': 'Metformin',
        'Januvia': 'Sitagliptin',
        'Amaryl': 'Glimepiride',
        
        # Blood Pressure
        'Telma': 'Telmisartan',
        'Amlong': 'Amlodipine',
        'Stamlo': 'Amlodipine',
        
        # Others
        'Shelcal': 'Calcium + Vitamin D3',
        'Becosules': 'Vitamin B Complex',
        'Zincovit': 'Multivitamin + Zinc',
    }
    
    return mapping

def map_medicines_to_generics():
    """
    Map filtered Indian medicines to generic names
    """
    print("🔗 Mapping Indian medicines to generic names...")
    
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    input_file = os.path.join(data_dir, 'indian_medicines_filtered.csv')
    
    if not os.path.exists(input_file):
        print("❌ Filtered dataset not found. Run filter_indian_medicines.py first")
        return False
    
    # Read filtered dataset
    df = pd.read_csv(input_file)
    print(f"📊 Processing {len(df):,} medicines...")
    
    # Get medicine name column
    name_col = None
    for col in df.columns:
        if 'name' in col.lower() or 'medicine' in col.lower():
            name_col = col
            break
    
    if not name_col:
        print("❌ Could not find medicine name column")
        return False
    
    print(f"📋 Using column: {name_col}")
    
    # Load manual mapping
    manual_mapping = create_indian_generic_mapping()
    print(f"📚 Loaded {len(manual_mapping)} manual mappings")
    
    # Create generic name column
    generics = []
    mapped_count = 0
    
    print("\n🔍 Mapping medicines to generics...")
    for medicine_name in tqdm(df[name_col], desc="Processing"):
        # Extract brand name
        brand = extract_generic_from_name(str(medicine_name))
        
        # Check manual mapping first
        generic = None
        for key, value in manual_mapping.items():
            if key.lower() in brand.lower():
                generic = value
                mapped_count += 1
                break
        
        # If not in manual mapping, try RxNorm API (rate limited)
        if not generic and len(generics) % 50 == 0:  # Only query every 50th medicine to avoid rate limits
            generic = search_rxnorm_api(brand)
            if generic:
                mapped_count += 1
            time.sleep(0.2)  # Rate limiting
        
        # If still no generic, use the extracted brand name
        if not generic:
            generic = brand
        
        generics.append(generic)
    
    df['generic_name'] = generics
    
    print(f"\n✅ Mapped {mapped_count:,} medicines to known generics ({(mapped_count/len(df))*100:.1f}%)")
    
    # Save mapped dataset
    output_file = os.path.join(data_dir, 'indian_medicines_with_generics.csv')
    df.to_csv(output_file, index=False)
    print(f"💾 Saved to: indian_medicines_with_generics.csv")
    
    # Show some examples
    print("\n📝 Sample mappings:")
    sample = df[[name_col, 'generic_name']].head(20)
    print(sample.to_string(index=False))
    
    return True

if __name__ == "__main__":
    success = map_medicines_to_generics()
    if success:
        print("\n✅ Ready for next step: python preprocessing/merge_with_faers.py")
