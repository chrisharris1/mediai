"""
DrugBank XML Parser
Extracts medicine information from DrugBank full database XML file
"""

import xml.etree.ElementTree as ET
import pandas as pd
import json
from pathlib import Path
from tqdm import tqdm

# DrugBank XML namespace
NAMESPACE = {'db': 'http://www.drugbank.ca'}

def parse_drugbank_xml(xml_file_path):
    """Parse DrugBank XML and extract medicine information"""
    
    print("🔍 Parsing DrugBank XML...")
    tree = ET.parse(xml_file_path)
    root = tree.getroot()
    
    medicines = []
    drugs = root.findall('db:drug', NAMESPACE)
    
    print(f"📊 Found {len(drugs)} drugs in database")
    
    for drug in tqdm(drugs, desc="Processing drugs"):
        try:
            # Basic information
            drugbank_id = drug.find('db:drugbank-id[@primary="true"]', NAMESPACE)
            name = drug.find('db:name', NAMESPACE)
            
            if drugbank_id is None or name is None:
                continue
            
            # Categories
            categories = []
            cat_list = drug.find('db:categories', NAMESPACE)
            if cat_list is not None:
                for cat in cat_list.findall('db:category', NAMESPACE):
                    cat_name = cat.find('db:category', NAMESPACE)
                    if cat_name is not None:
                        categories.append(cat_name.text)
            
            # Groups (approved, experimental, etc.)
            groups = []
            group_list = drug.find('db:groups', NAMESPACE)
            if group_list is not None:
                groups = [g.text for g in group_list.findall('db:group', NAMESPACE)]
            
            # Description
            description = drug.find('db:description', NAMESPACE)
            description_text = description.text if description is not None else ""
            
            # Indication (what it's used for)
            indication = drug.find('db:indication', NAMESPACE)
            indication_text = indication.text if indication is not None else ""
            
            # Mechanism of action
            mechanism = drug.find('db:mechanism-of-action', NAMESPACE)
            mechanism_text = mechanism.text if mechanism is not None else ""
            
            # Metabolism
            metabolism = drug.find('db:metabolism', NAMESPACE)
            metabolism_text = metabolism.text if metabolism is not None else ""
            
            # Half-life
            half_life = drug.find('db:half-life', NAMESPACE)
            half_life_text = half_life.text if half_life is not None else ""
            
            # Dosages
            dosages = []
            dosage_list = drug.find('db:dosages', NAMESPACE)
            if dosage_list is not None:
                for dosage in dosage_list.findall('db:dosage', NAMESPACE):
                    form = dosage.find('db:form', NAMESPACE)
                    strength = dosage.find('db:strength', NAMESPACE)
                    if form is not None:
                        dosages.append({
                            'form': form.text,
                            'strength': strength.text if strength is not None else None
                        })
            
            # Drug interactions
            interactions = []
            interaction_list = drug.find('db:drug-interactions', NAMESPACE)
            if interaction_list is not None:
                for interaction in interaction_list.findall('db:drug-interaction', NAMESPACE):
                    int_drug = interaction.find('db:drugbank-id', NAMESPACE)
                    int_name = interaction.find('db:name', NAMESPACE)
                    int_desc = interaction.find('db:description', NAMESPACE)
                    
                    if int_drug is not None and int_name is not None:
                        interactions.append({
                            'drugbank_id': int_drug.text,
                            'name': int_name.text,
                            'description': int_desc.text if int_desc is not None else ""
                        })
            
            # External identifiers
            external_ids = {}
            ext_list = drug.find('db:external-identifiers', NAMESPACE)
            if ext_list is not None:
                for ext_id in ext_list.findall('db:external-identifier', NAMESPACE):
                    resource = ext_id.find('db:resource', NAMESPACE)
                    identifier = ext_id.find('db:identifier', NAMESPACE)
                    if resource is not None and identifier is not None:
                        external_ids[resource.text] = identifier.text
            
            # Chemical properties
            properties = {}
            prop_list = drug.find('db:calculated-properties', NAMESPACE)
            if prop_list is not None:
                for prop in prop_list.findall('db:property', NAMESPACE):
                    kind = prop.find('db:kind', NAMESPACE)
                    value = prop.find('db:value', NAMESPACE)
                    if kind is not None and value is not None:
                        properties[kind.text] = value.text
            
            medicine = {
                'drugbank_id': drugbank_id.text,
                'name': name.text,
                'categories': categories,
                'groups': groups,
                'description': description_text[:500] if description_text else "",  # Truncate
                'indication': indication_text[:500] if indication_text else "",
                'mechanism': mechanism_text[:500] if mechanism_text else "",
                'metabolism': metabolism_text[:300] if metabolism_text else "",
                'half_life': half_life_text,
                'dosages': json.dumps(dosages),
                'interactions': json.dumps(interactions[:10]),  # Top 10 interactions
                'external_ids': json.dumps(external_ids),
                'properties': json.dumps(properties),
                'is_approved': 'approved' in [g.lower() for g in groups]
            }
            
            medicines.append(medicine)
            
        except Exception as e:
            print(f"❌ Error processing drug: {e}")
            continue
    
    print(f"✅ Successfully parsed {len(medicines)} medicines")
    return pd.DataFrame(medicines)

def main():
    # Paths
    xml_file = Path('data/drugbank.xml')
    output_file = Path('data/medicines_cleaned.csv')
    
    if not xml_file.exists():
        print("❌ DrugBank XML file not found!")
        print(f"📥 Please download from: https://go.drugbank.com/releases/latest")
        print(f"📁 Save to: {xml_file.absolute()}")
        return
    
    # Parse XML
    df_medicines = parse_drugbank_xml(xml_file)
    
    # Save to CSV
    df_medicines.to_csv(output_file, index=False)
    print(f"💾 Saved to: {output_file}")
    
    # Print statistics
    print("\n📊 Dataset Statistics:")
    print(f"Total medicines: {len(df_medicines)}")
    print(f"Approved medicines: {df_medicines['is_approved'].sum()}")
    print(f"Categories: {df_medicines['categories'].apply(len).sum()}")
    print(f"With interactions: {df_medicines['interactions'].apply(lambda x: len(json.loads(x))).sum()}")

if __name__ == "__main__":
    main()
