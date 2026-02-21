"""
Drug Interaction Classifier Training (Random Forest)
Predicts if two drugs will interact and severity level
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, roc_auc_score
import joblib
import json
from pathlib import Path
from datetime import datetime

def load_data():
    """Load training data"""
    
    print("📂 Loading interaction training data...")
    df = pd.read_csv('../data/train_interactions.csv')
    print(f"✅ Loaded {len(df)} samples")
    print(f"   Positive (interactions): {(df['interaction_exists'] == 1).sum()}")
    print(f"   Negative (no interaction): {(df['interaction_exists'] == 0).sum()}")
    
    return df

def prepare_features(df):
    """Engineer features for the model"""
    
    print("\n🔧 Engineering features...")
    
    # Encode drug categories
    le_cat1 = LabelEncoder()
    le_cat2 = LabelEncoder()
    
    df['drug1_cat_encoded'] = le_cat1.fit_transform(df['drug1_categories'].fillna('UNKNOWN'))
    df['drug2_cat_encoded'] = le_cat2.fit_transform(df['drug2_categories'].fillna('UNKNOWN'))
    
    # Create interaction features
    df['same_category'] = (df['drug1_categories'] == df['drug2_categories']).astype(int)
    df['name_length_1'] = df['drug1_name'].str.len()
    df['name_length_2'] = df['drug2_name'].str.len()
    
    # Feature matrix
    X = df[[
        'drug1_cat_encoded',
        'drug2_cat_encoded',
        'same_category',
        'name_length_1',
        'name_length_2'
    ]]
    
    # Target variable (interaction exists)
    y = df['interaction_exists']
    
    # Severity target (for secondary model)
    y_severity = df['severity_encoded']
    
    print(f"✅ Features: {X.shape[1]} columns")
    print(f"   Samples: {X.shape[0]}")
    
    return X, y, y_severity, le_cat1, le_cat2

def train_model(X, y):
    """Train Random Forest classifier"""
    
    print("\n🤖 Training Random Forest model...")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"   Training set: {len(X_train)} samples")
    print(f"   Test set: {len(X_test)} samples")
    
    # Train model
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=15,
        min_samples_split=10,
        min_samples_leaf=5,
        random_state=42,
        n_jobs=-1,
        verbose=1
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    print("\n📊 Evaluating model...")
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    accuracy = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_pred_proba)
    
    print(f"\n✅ Model Performance:")
    print(f"   Accuracy: {accuracy * 100:.2f}%")
    print(f"   AUC-ROC: {auc:.3f}")
    
    print("\n📋 Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['No Interaction', 'Interaction']))
    
    print("\n🎯 Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"   True Negatives: {cm[0][0]}")
    print(f"   False Positives: {cm[0][1]}")
    print(f"   False Negatives: {cm[1][0]}")
    print(f"   True Positives: {cm[1][1]}")
    
    # Feature importance
    print("\n🌟 Top Feature Importance:")
    feature_names = X.columns
    importances = model.feature_importances_
    indices = np.argsort(importances)[::-1]
    
    for i in range(min(5, len(feature_names))):
        idx = indices[i]
        print(f"   {feature_names[idx]}: {importances[idx]:.3f}")
    
    return model, accuracy, auc, X_test, y_test

def save_model(model, le_cat1, le_cat2, accuracy, auc):
    """Save trained model and metadata"""
    
    print("\n💾 Saving model...")
    
    # Save model
    model_file = Path('../models/drug_interaction_rf.pkl')
    joblib.dump(model, model_file)
    print(f"✅ Saved model: {model_file}")
    
    # Save label encoders
    joblib.dump(le_cat1, Path('../models/le_drug1_category.pkl'))
    joblib.dump(le_cat2, Path('../models/le_drug2_category.pkl'))
    
    # Save metadata
    metadata = {
        'model_type': 'Random Forest Classifier',
        'model_version': '1.0',
        'training_date': datetime.now().isoformat(),
        'accuracy': float(accuracy),
        'auc_roc': float(auc),
        'n_estimators': 100,
        'max_depth': 15,
        'features': [
            'drug1_cat_encoded',
            'drug2_cat_encoded',
            'same_category',
            'name_length_1',
            'name_length_2'
        ],
        'target': 'interaction_exists',
        'framework': 'scikit-learn'
    }
    
    metadata_file = Path('../models/interaction_model_metadata.json')
    with open(metadata_file, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"✅ Saved metadata: {metadata_file}")

def main():
    print("=" * 60)
    print("DRUG INTERACTION CLASSIFIER TRAINING")
    print("=" * 60)
    
    # Load data
    df = load_data()
    
    # Prepare features
    X, y, y_severity, le_cat1, le_cat2 = prepare_features(df)
    
    # Train model
    model, accuracy, auc, X_test, y_test = train_model(X, y)
    
    # Save model
    save_model(model, le_cat1, le_cat2, accuracy, auc)
    
    print("\n" + "=" * 60)
    print("✅ TRAINING COMPLETE!")
    print("=" * 60)
    print(f"Model saved to: ai-models/models/drug_interaction_rf.pkl")
    print(f"Accuracy: {accuracy * 100:.2f}%")
    print(f"AUC-ROC: {auc:.3f}")
    print("\nYou can now use this model to predict drug interactions!")

if __name__ == "__main__":
    main()
