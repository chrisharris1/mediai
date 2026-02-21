"""
Build Comprehensive Symptom Search Index
Creates searchable symptom database with synonyms and fuzzy matching support
"""

import json
from pathlib import Path

# Define comprehensive symptom knowledge base
SYMPTOM_DATABASE = {
    # Respiratory Symptoms
    "cough": {
        "medical_name": "Cough",
        "synonyms": ["coughing", "hacking", "persistent cough", "dry cough", "wet cough", "productive cough"],
        "category": "respiratory",
        "severity_indicators": ["blood in cough", "chronic cough", "severe cough"],
        "related_symptoms": ["sore throat", "chest pain", "shortness of breath"]
    },
    "shortness_of_breath": {
        "medical_name": "Shortness of Breath",
        "synonyms": ["breathless", "cant breathe", "breathing difficulty", "dyspnea", "gasping", "wheezing"],
        "category": "respiratory",
        "severity_indicators": ["severe breathlessness", "bluish lips", "chest pain with breathing"],
        "related_symptoms": ["chest pain", "cough", "anxiety"]
    },
    "sore_throat": {
        "medical_name": "Sore Throat",
        "synonyms": ["throat pain", "painful throat", "scratchy throat", "throat irritation", "pharyngitis"],
        "category": "respiratory",
        "severity_indicators": ["severe throat pain", "difficulty swallowing", "throat swelling"],
        "related_symptoms": ["cough", "fever", "runny nose"]
    },
    "runny_nose": {
        "medical_name": "Runny Nose",
        "synonyms": ["nasal discharge", "stuffy nose", "congestion", "blocked nose", "rhinorrhea"],
        "category": "respiratory",
        "severity_indicators": ["green discharge", "yellow discharge", "facial pain"],
        "related_symptoms": ["sore throat", "cough", "fever"]
    },
    
    # Fever and Temperature
    "fever": {
        "medical_name": "Fever",
        "synonyms": ["temperature", "hot", "burning", "feverish", "high temp", "pyrexia", "high fever"],
        "category": "general",
        "severity_indicators": ["high fever", "persistent fever", "fever with confusion"],
        "related_symptoms": ["chills", "sweating", "headache", "body ache"]
    },
    "chills": {
        "medical_name": "Chills",
        "synonyms": ["shivering", "cold", "shaking", "trembling", "rigor"],
        "category": "general",
        "severity_indicators": ["uncontrollable shaking", "severe chills"],
        "related_symptoms": ["fever", "sweating", "body ache"]
    },
    
    # Pain Symptoms
    "headache": {
        "medical_name": "Headache",
        "synonyms": ["head pain", "migraine", "head ache", "skull pain", "cephalalgia", "tension headache"],
        "category": "pain",
        "severity_indicators": ["severe headache", "sudden headache", "headache with vision changes"],
        "related_symptoms": ["nausea", "dizziness", "fever"]
    },
    "chest_pain": {
        "medical_name": "Chest Pain",
        "synonyms": ["chest discomfort", "chest pressure", "heart pain", "thoracic pain", "angina"],
        "category": "pain",
        "severity_indicators": ["severe chest pain", "crushing pain", "radiating pain"],
        "related_symptoms": ["shortness of breath", "sweating", "nausea"],
        "emergency": True
    },
    "abdominal_pain": {
        "medical_name": "Abdominal Pain",
        "synonyms": ["stomach pain", "belly ache", "stomach ache", "tummy pain", "gut pain"],
        "category": "pain",
        "severity_indicators": ["severe pain", "cramping", "sharp pain"],
        "related_symptoms": ["nausea", "vomiting", "diarrhea"]
    },
    "back_pain": {
        "medical_name": "Back Pain",
        "synonyms": ["backache", "spine pain", "lower back pain", "upper back pain", "lumbar pain"],
        "category": "pain",
        "severity_indicators": ["severe back pain", "radiating pain", "numbness"],
        "related_symptoms": ["muscle ache", "stiffness"]
    },
    "joint_pain": {
        "medical_name": "Joint Pain",
        "synonyms": ["arthritis", "joint ache", "stiff joints", "arthralgia", "joint swelling"],
        "category": "pain",
        "severity_indicators": ["severe pain", "swelling", "redness"],
        "related_symptoms": ["stiffness", "limited movement"]
    },
    "muscle_ache": {
        "medical_name": "Muscle Ache",
        "synonyms": ["body ache", "muscle pain", "myalgia", "sore muscles", "muscle soreness"],
        "category": "pain",
        "severity_indicators": ["severe pain", "weakness", "cramping"],
        "related_symptoms": ["fatigue", "fever"]
    },
    "ear_pain": {
        "medical_name": "Ear Pain",
        "synonyms": ["earache", "ear infection pain", "otalgia"],
        "category": "pain",
        "severity_indicators": ["severe ear pain", "discharge", "hearing loss"],
        "related_symptoms": ["fever", "dizziness"]
    },
    
    # Digestive Symptoms
    "nausea": {
        "medical_name": "Nausea",
        "synonyms": ["nauseated", "sick", "queasy", "upset stomach", "feeling sick"],
        "category": "digestive",
        "severity_indicators": ["persistent nausea", "severe nausea", "dehydration"],
        "related_symptoms": ["vomiting", "dizziness", "abdominal pain"]
    },
    "vomiting": {
        "medical_name": "Vomiting",
        "synonyms": ["throwing up", "vomit", "puking", "emesis"],
        "category": "digestive",
        "severity_indicators": ["blood in vomit", "persistent vomiting", "dehydration"],
        "related_symptoms": ["nausea", "abdominal pain", "diarrhea"]
    },
    "diarrhea": {
        "medical_name": "Diarrhea",
        "synonyms": ["loose stool", "watery stool", "runs", "loose bowels"],
        "category": "digestive",
        "severity_indicators": ["blood in stool", "severe diarrhea", "dehydration"],
        "related_symptoms": ["abdominal pain", "nausea", "fever"]
    },
    "constipation": {
        "medical_name": "Constipation",
        "synonyms": ["blocked bowels", "hard stool", "difficult bowel movement"],
        "category": "digestive",
        "severity_indicators": ["severe pain", "no bowel movement", "blood"],
        "related_symptoms": ["abdominal pain", "bloating"]
    },
    "bloating": {
        "medical_name": "Bloating",
        "synonyms": ["gas", "swollen belly", "distended abdomen", "gassy"],
        "category": "digestive",
        "severity_indicators": ["severe bloating", "pain", "persistent"],
        "related_symptoms": ["abdominal pain", "constipation"]
    },
    
    # Neurological Symptoms
    "dizziness": {
        "medical_name": "Dizziness",
        "synonyms": ["dizzy", "lightheaded", "vertigo", "spinning", "balance problems"],
        "category": "neurological",
        "severity_indicators": ["severe dizziness", "fainting", "loss of consciousness"],
        "related_symptoms": ["nausea", "headache", "confusion"]
    },
    "confusion": {
        "medical_name": "Confusion",
        "synonyms": ["disoriented", "mental fog", "brain fog", "confused", "forgetful"],
        "category": "neurological",
        "severity_indicators": ["severe confusion", "disorientation", "memory loss"],
        "related_symptoms": ["headache", "fever", "fatigue"]
    },
    "weakness": {
        "medical_name": "Weakness",
        "synonyms": ["weak", "feeble", "lack of strength", "muscle weakness"],
        "category": "neurological",
        "severity_indicators": ["sudden weakness", "one-sided weakness", "paralysis"],
        "related_symptoms": ["fatigue", "dizziness"],
        "emergency": True
    },
    "numbness": {
        "medical_name": "Numbness",
        "synonyms": ["tingling", "pins and needles", "loss of sensation", "numb"],
        "category": "neurological",
        "severity_indicators": ["sudden numbness", "spreading numbness", "one-sided"],
        "related_symptoms": ["weakness", "pain"],
        "emergency": True
    },
    
    # General Symptoms
    "fatigue": {
        "medical_name": "Fatigue",
        "synonyms": ["tired", "exhausted", "weary", "low energy", "lethargic", "tiredness"],
        "category": "general",
        "severity_indicators": ["severe fatigue", "chronic fatigue", "unable to function"],
        "related_symptoms": ["weakness", "dizziness", "headache"]
    },
    "sweating": {
        "medical_name": "Sweating",
        "synonyms": ["perspiration", "night sweats", "excessive sweating", "diaphoresis"],
        "category": "general",
        "severity_indicators": ["severe sweating", "night sweats", "cold sweats"],
        "related_symptoms": ["fever", "chills", "anxiety"]
    },
    "weight_loss": {
        "medical_name": "Weight Loss",
        "synonyms": ["losing weight", "unintentional weight loss", "weight drop"],
        "category": "general",
        "severity_indicators": ["rapid weight loss", "severe weight loss", "unintended"],
        "related_symptoms": ["fatigue", "loss of appetite"]
    },
    "loss_of_appetite": {
        "medical_name": "Loss of Appetite",
        "synonyms": ["no appetite", "not hungry", "anorexia", "reduced appetite"],
        "category": "general",
        "severity_indicators": ["complete loss", "weight loss", "malnutrition"],
        "related_symptoms": ["nausea", "fatigue", "weight loss"]
    },
    
    # Skin Symptoms
    "rash": {
        "medical_name": "Rash",
        "synonyms": ["skin rash", "skin irritation", "hives", "red skin", "eruption"],
        "category": "skin",
        "severity_indicators": ["spreading rash", "severe itching", "blistering"],
        "related_symptoms": ["itching", "fever", "swelling"]
    },
    "itching": {
        "medical_name": "Itching",
        "synonyms": ["itchy", "pruritus", "skin itching", "scratching"],
        "category": "skin",
        "severity_indicators": ["severe itching", "bleeding from scratching", "widespread"],
        "related_symptoms": ["rash", "dry skin"]
    },
    "swelling": {
        "medical_name": "Swelling",
        "synonyms": ["edema", "puffiness", "swollen", "inflammation"],
        "category": "skin",
        "severity_indicators": ["severe swelling", "rapid swelling", "breathing difficulty"],
        "related_symptoms": ["pain", "redness", "warmth"],
        "emergency": True
    },
    
    # Sleep and Mental Health
    "insomnia": {
        "medical_name": "Insomnia",
        "synonyms": ["cant sleep", "sleeplessness", "trouble sleeping", "sleep problems"],
        "category": "sleep",
        "severity_indicators": ["chronic insomnia", "severe sleep deprivation"],
        "related_symptoms": ["fatigue", "anxiety", "irritability"]
    },
    "anxiety": {
        "medical_name": "Anxiety",
        "synonyms": ["anxious", "worried", "nervous", "panic", "stressed", "apprehensive"],
        "category": "mental",
        "severity_indicators": ["panic attacks", "severe anxiety", "chest pain with anxiety"],
        "related_symptoms": ["sweating", "palpitations", "shortness of breath"]
    },
    "depression": {
        "medical_name": "Depression",
        "synonyms": ["depressed", "sad", "low mood", "hopeless", "melancholy"],
        "category": "mental",
        "severity_indicators": ["suicidal thoughts", "severe depression", "inability to function"],
        "related_symptoms": ["fatigue", "insomnia", "loss of appetite"]
    },
    
    # Eye Symptoms
    "vision_changes": {
        "medical_name": "Vision Changes",
        "synonyms": ["blurred vision", "double vision", "vision loss", "seeing spots"],
        "category": "eye",
        "severity_indicators": ["sudden vision loss", "severe blurring", "double vision"],
        "related_symptoms": ["headache", "eye pain"],
        "emergency": True
    },
    "eye_pain": {
        "medical_name": "Eye Pain",
        "synonyms": ["eye ache", "eye discomfort", "painful eyes"],
        "category": "eye",
        "severity_indicators": ["severe pain", "vision loss", "discharge"],
        "related_symptoms": ["redness", "vision changes"]
    }
}

def build_search_index():
    """Build comprehensive searchable index with all symptom variations"""
    search_index = {}
    
    for key, data in SYMPTOM_DATABASE.items():
        # Create searchable text combining all variations
        search_terms = [
            data["medical_name"].lower(),
            key.replace("_", " "),
            *[syn.lower() for syn in data["synonyms"]]
        ]
        
        # Add to index
        for term in search_terms:
            if term not in search_index:
                search_index[term] = {
                    "canonical_name": key,
                    "medical_name": data["medical_name"],
                    "category": data["category"],
                    "is_emergency": data.get("emergency", False),
                    "search_variations": list(set(search_terms))
                }
    
    return search_index

def main():
    print("\n🏥 Building Symptom Search Index...")
    print("=" * 60)
    
    # Build search index
    search_index = build_search_index()
    
    # Save to processed data directory
    output_dir = Path(__file__).parent.parent / 'data' / 'processed'
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_file = output_dir / 'symptom_search_index.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'search_index': search_index,
            'symptom_database': SYMPTOM_DATABASE
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Search index created successfully!")
    print(f"📍 Location: {output_file}")
    print(f"📊 Total symptoms: {len(SYMPTOM_DATABASE)}")
    print(f"🔍 Total search variations: {len(search_index)}")
    
    # Show sample
    print("\n📝 Sample symptoms:")
    for i, (key, data) in enumerate(list(SYMPTOM_DATABASE.items())[:5]):
        emergency = " 🚨 EMERGENCY" if data.get("emergency") else ""
        print(f"   {i+1}. {data['medical_name']} ({data['category']}){emergency}")
    
    print("\n" + "=" * 60)
    print("✅ Index ready for AI symptom analysis!")

if __name__ == '__main__':
    main()
