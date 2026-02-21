# MediAI - AI Models Setup Guide

## 📥 Step 1: Download Required Datasets

### 1. DrugBank Database (Medicine Information)
- **URL**: https://go.drugbank.com/releases/latest
- **Steps**:
  1. Create FREE academic account
  2. Download "DrugBank Full Database (XML format)"
  3. Save as: `ai-models/data/drugbank.xml`
  4. Size: ~500MB

### 2. FDA FAERS (Adverse Event Reporting System)
- **URL**: https://fis.fda.gov/extensions/FPD-QDE-FAERS/FPD-QDE-FAERS.html
- **Steps**:
  1. Download 2024 quarterly data files:
     - DEMO24Q1.txt, DEMO24Q2.txt, DEMO24Q3.txt, DEMO24Q4.txt (Demographics)
     - DRUG24Q1.txt, DRUG24Q2.txt, DRUG24Q3.txt, DRUG24Q4.txt (Drug names)
     - REAC24Q1.txt, REAC24Q2.txt, REAC24Q3.txt, REAC24Q4.txt (Reactions/Side effects)
  2. Save all files to: `ai-models/data/faers/`
  3. Total size: ~2GB

### 3. SIDER (Side Effect Resource)
- **URL**: http://sideeffects.embl.de/download/
- **Steps**:
  1. Download: `meddra_all_se.tsv.gz`
  2. Extract and save as: `ai-models/data/sider.tsv`
  3. Size: ~5MB

## 🔧 Step 2: Install Python Dependencies

```bash
cd ai-models
pip install -r requirements.txt
```

## 🧹 Step 3: Preprocess Data

```bash
# Clean DrugBank XML (extracts medicine info)
python preprocessing/clean_drugbank.py

# Clean FDA FAERS data (side effects)
python preprocessing/clean_faers.py

# Merge all datasets
python preprocessing/merge_datasets.py

# Create ML training features
python preprocessing/feature_engineering.py
```

## 🤖 Step 4: Train AI Models

```bash
# Train Drug Interaction Classifier (Random Forest)
python training/train_interaction_model.py

# Train Side Effect Predictor (Neural Network)
python training/train_side_effect_model.py

# Evaluate model performance
python training/evaluate_models.py
```

## 📊 Step 5: Import to MongoDB

```bash
# Load medicines and interactions into database
python import_to_mongodb.py
```

## 🚀 Step 6: Start Python API

```bash
cd api
python app.py
# API runs on http://localhost:8000
```

## 📁 Folder Structure

```
ai-models/
├── data/                      # Raw datasets (you download these)
│   ├── drugbank.xml          # DrugBank medicine database
│   ├── sider.tsv             # SIDER side effects
│   └── faers/                # FDA adverse event reports
│       ├── DEMO24Q1.txt
│       ├── DRUG24Q1.txt
│       └── REAC24Q1.txt
│
├── preprocessing/             # Data cleaning scripts
│   ├── clean_drugbank.py     # Parse DrugBank XML
│   ├── clean_faers.py        # Process FDA FAERS
│   ├── merge_datasets.py     # Combine all data
│   └── feature_engineering.py # Create ML features
│
├── training/                  # Model training
│   ├── train_interaction_model.py    # Random Forest
│   ├── train_side_effect_model.py    # Neural Network
│   └── evaluate_models.py            # Test accuracy
│
├── models/                    # Saved trained models
│   ├── drug_interaction_rf.pkl       # Interaction classifier
│   ├── side_effect_nn.h5            # Side effect predictor
│   └── model_metadata.json          # Model info
│
└── api/                       # Python Flask API
    ├── app.py                # Main API server
    ├── predict_interactions.py
    └── predict_side_effects.py
```

## ⚠️ Important Notes

1. **DrugBank License**: Free for academic use, requires citation
2. **Data Size**: Total ~2.5GB, preprocessing takes 2-3 hours
3. **Training Time**: Random Forest ~30 min, Neural Network ~1-2 hours
4. **GPU**: Not required but speeds up Neural Network training
5. **Memory**: Minimum 8GB RAM recommended

## 📞 Support

If you encounter issues:
1. Check dataset files are in correct location
2. Ensure Python dependencies installed
3. Verify MongoDB is running
4. Check preprocessing logs for errors
