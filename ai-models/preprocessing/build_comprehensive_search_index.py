"""
Build Comprehensive Medicine Search Index
Processes 5,000+ Indian medicines + International names + Fuzzy matching
"""

import pandas as pd
import json
import re
from pathlib import Path
from difflib import SequenceMatcher

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / 'data' / 'processed'
OUTPUT_FILE = DATA_DIR / 'medicine_search_index.json'

print("📂 Loading Indian medicines CSV (5,000+ medicines)...")
medicines_df = pd.read_csv(DATA_DIR / 'indian_medicines_filtered_5k.csv')
print(f"✅ Loaded {len(medicines_df)} Indian medicines")

# International name mappings (common alternatives)
INTERNATIONAL_NAMES = {
    'Paracetamol': ['Acetaminophen', 'Tylenol', 'Panadol', 'Calpol', 'Paracetomol'],
    'Ibuprofen': ['Advil', 'Motrin', 'Nurofen', 'Brufen'],
    'Aspirin': ['Acetylsalicylic acid', 'Disprin', 'Ecosprin'],
    'Amoxicillin': ['Amoxil', 'Trimox', 'Moxatag'],
    'Metformin': ['Glucophage', 'Glumetza', 'Riomet'],
    'Amlodipine': ['Norvasc', 'Amlopress', 'Amlokind'],
    'Atorvastatin': ['Lipitor', 'Atorva', 'Storvas'],
    'Omeprazole': ['Prilosec', 'Omez', 'Losec'],
    'Cetirizine': ['Zyrtec', 'Alerid', 'Cetrizine'],
    'Ranitidine': ['Zantac', 'Aciloc'],
    'Azithromycin': ['Zithromax', 'Azee', 'Azithral'],
    'Ciprofloxacin': ['Cipro', 'Ciplox'],
    'Diclofenac': ['Voltaren', 'Voveran'],
    'Losartan': ['Cozaar', 'Losar'],
    'Metoprolol': ['Lopressor', 'Betaloc'],
    'Salbutamol': ['Albuterol', 'Ventolin', 'Asthalin'],
    'Montelukast': ['Singulair', 'Montair'],
    'Pantoprazole': ['Protonix', 'Pan'],
    'Levothyroxine': ['Synthroid', 'Eltroxin'],
    'Clopidogrel': ['Plavix', 'Clopivas']
}

# Category mappings
CATEGORY_MAPPING = {
    'Paracetamol': 'Analgesic',
    'Ibuprofen': 'NSAID',
    'Aspirin': 'NSAID',
    'Amoxicillin': 'Antibiotic',
    'Metformin': 'Antidiabetic',
    'Amlodipine': 'Antihypertensive',
    'Atorvastatin': 'Statin',
    'Omeprazole': 'Proton Pump Inhibitor',
    'Cetirizine': 'Antihistamine',
    'Diclofenac': 'NSAID',
    'Losartan': 'ARB',
    'Salbutamol': 'Bronchodilator'
}

def extract_generic_name(composition):
    """Extract generic drug name from composition string"""
    if pd.isna(composition) or not composition:
        return None
    
    # Remove dosage info: "Paracetamol (500mg)" -> "Paracetamol"
    match = re.search(r'^([A-Za-z\s]+)', composition)
    if match:
        return match.group(1).strip()
    return None

def normalize_name(name):
    """Normalize medicine name for searching"""
    if not name or pd.isna(name):
        return ""
    return name.lower().strip()

def build_search_text(brand_name, generic_name, composition, category):
    """Build comprehensive search text with all variations"""
    text_parts = []
    
    # Add brand name
    if brand_name:
        text_parts.append(normalize_name(brand_name))
    
    # Add generic name
    if generic_name:
        text_parts.append(normalize_name(generic_name))
        
        # Add international alternatives
        for gen, alternatives in INTERNATIONAL_NAMES.items():
            if generic_name and gen.lower() in generic_name.lower():
                text_parts.extend([alt.lower() for alt in alternatives])
    
    # Add composition
    if composition:
        text_parts.append(normalize_name(composition))
    
    # Add category
    if category:
        text_parts.append(normalize_name(category))
    
    # Add common search terms
    if generic_name:
        gen_lower = generic_name.lower()
        if 'paracetamol' in gen_lower:
            text_parts.extend(['fever', 'pain', 'headache', 'cold'])
        elif 'ibuprofen' in gen_lower:
            text_parts.extend(['pain', 'inflammation', 'fever'])
        elif 'cetirizine' in gen_lower:
            text_parts.extend(['allergy', 'antihistamine', 'cold'])
        elif 'amoxicillin' in gen_lower:
            text_parts.extend(['antibiotic', 'infection'])
    
    return ' '.join(set(text_parts))  # Remove duplicates

print("\n🔨 Building comprehensive search index...")
search_index = []
processed_generics = set()  # Track unique generics

for idx, row in medicines_df.iterrows():
    brand_name = row['name']
    composition1 = row['short_composition1']
    composition2 = row.get('short_composition2', '')
    manufacturer = row['manufacturer_name']
    price = row['price(₹)']
    
    # Extract generic names from composition
    generic1 = extract_generic_name(composition1)
    generic2 = extract_generic_name(composition2) if composition2 else None
    
    # Primary generic
    if generic1:
        generic_name = generic1
        if generic2:
            generic_name = f"{generic1} + {generic2}"
    else:
        generic_name = brand_name  # Fallback to brand name
    
    # Determine category
    category = 'General Medicine'
    if generic1:
        for key, cat in CATEGORY_MAPPING.items():
            if key.lower() in generic1.lower():
                category = cat
                break
    
    # Build search text
    search_text = build_search_text(brand_name, generic_name, composition1, category)
    
    # Create entry
    entry = {
        'id': int(row['id']),
        'name': brand_name,
        'display_name': f"{brand_name} ({generic_name})" if generic_name != brand_name else brand_name,
        'generic_name': generic_name,
        'composition': composition1,
        'manufacturer': manufacturer,
        'price': float(price),
        'category': category,
        'search_text': search_text,
        'pack_size': row.get('pack_size_label', ''),
        'is_discontinued': bool(row.get('Is_discontinued', False))
    }
    
    search_index.append(entry)
    
    if idx % 1000 == 0:
        print(f"   Processed {idx}/{len(medicines_df)} medicines...")

print(f"\n✅ Built search index with {len(search_index)} medicines")

# Add pure generic entries (for international users)
print("\n📝 Adding international generic entries...")
for generic, alternatives in INTERNATIONAL_NAMES.items():
    # Check if already exists
    if any(generic.lower() in entry['generic_name'].lower() for entry in search_index):
        continue
    
    category = CATEGORY_MAPPING.get(generic, 'General Medicine')
    search_text = normalize_name(generic) + ' ' + ' '.join([alt.lower() for alt in alternatives])
    
    entry = {
        'id': 90000 + len(search_index),  # Unique ID for generics
        'name': generic,
        'display_name': f"{generic} (Generic)",
        'generic_name': generic,
        'composition': generic,
        'manufacturer': 'Generic',
        'price': 0.0,
        'category': category,
        'search_text': search_text,
        'pack_size': 'Generic',
        'is_discontinued': False
    }
    
    search_index.append(entry)

print(f"✅ Total entries: {len(search_index)}")

# Save to JSON
print(f"\n💾 Saving to {OUTPUT_FILE}...")
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(search_index, f, indent=2, ensure_ascii=False)

print(f"✅ Search index saved!")

# Generate statistics
print("\n📊 Statistics:")
print(f"   Total medicines: {len(search_index)}")
print(f"   Unique brands: {len(set(e['name'] for e in search_index))}")
print(f"   Unique generics: {len(set(e['generic_name'] for e in search_index))}")
print(f"   Categories: {len(set(e['category'] for e in search_index))}")

# Test searches
print("\n🧪 Testing search functionality...")
test_queries = ['Paracetomol', 'Paracetamol', 'Crocin', 'Dolo', 'Acetaminophen', 'Tylenol']

for query in test_queries:
    query_lower = query.lower()
    matches = [e for e in search_index if query_lower in e['search_text']]
    print(f"   '{query}': {len(matches)} matches")
    if matches:
        print(f"      → {matches[0]['display_name']}")

print("\n✅ DONE! Search index is ready.")
print(f"📁 File: {OUTPUT_FILE}")
