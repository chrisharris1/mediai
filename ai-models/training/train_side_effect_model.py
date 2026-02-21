"""
Side Effect Predictor Training (Neural Network)
Predicts personalized side effect probabilities based on patient profile
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
import tensorflow as tf
from tensorflow import keras
import joblib
import json
from pathlib import Path
from datetime import datetime

def load_data():
    """Load side effect training data"""
    
    print("📂 Loading side effect training data...")
    df = pd.read_csv('../data/train_side_effects.csv')
    print(f"✅ Loaded {len(df)} samples")
    print(f"   Unique drugs: {df['drugname'].nunique()}")
    print(f"   Unique side effects: {df['pt'].nunique()}")
    
    return df

def prepare_features(df):
    """Engineer features for neural network"""
    
    print("\n🔧 Engineering features...")
    
    # Encode drug names
    le_drug = LabelEncoder()
    df['drug_encoded'] = le_drug.fit_transform(df['drugname'])
    
    # Encode side effects
    le_effect = LabelEncoder()
    df['effect_encoded'] = le_effect.fit_transform(df['pt'])
    
    # Feature matrix
    X = df[[
        'drug_encoded',
        'age_years',
        'weight_kg',
        'sex_encoded'
    ]].copy()
    
    # Scale numerical features
    scaler = StandardScaler()
    X[['age_years', 'weight_kg']] = scaler.fit_transform(X[['age_years', 'weight_kg']])
    
    # Create multi-label targets (top 10 side effects)
    top_effects = df['pt'].value_counts().head(10).index.tolist()
    
    y = pd.DataFrame()
    for effect in top_effects:
        y[effect] = (df['pt'] == effect).astype(int)
    
    print(f"✅ Features: {X.shape[1]} columns")
    print(f"   Samples: {X.shape[0]}")
    print(f"   Targets: {y.shape[1]} side effects")
    
    return X, y, le_drug, le_effect, scaler, top_effects

def build_model(input_dim, output_dim):
    """Build neural network architecture"""
    
    print("\n🏗️ Building neural network...")
    
    model = keras.Sequential([
        keras.layers.Dense(128, activation='relu', input_shape=(input_dim,)),
        keras.layers.Dropout(0.3),
        keras.layers.Dense(64, activation='relu'),
        keras.layers.Dropout(0.2),
        keras.layers.Dense(32, activation='relu'),
        keras.layers.Dense(output_dim, activation='sigmoid')  # Multi-label output
    ])
    
    model.compile(
        optimizer='adam',
        loss='binary_crossentropy',
        metrics=['accuracy', tf.keras.metrics.AUC(name='auc')]
    )
    
    print(model.summary())
    
    return model

def train_model(X, y):
    """Train neural network"""
    
    print("\n🤖 Training neural network...")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print(f"   Training set: {len(X_train)} samples")
    print(f"   Test set: {len(X_test)} samples")
    
    # Build model
    model = build_model(X.shape[1], y.shape[1])
    
    # Callbacks
    callbacks = [
        keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=5,
            restore_best_weights=True
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=3,
            min_lr=1e-6
        )
    ]
    
    # Train
    history = model.fit(
        X_train, y_train,
        epochs=50,
        batch_size=32,
        validation_split=0.2,
        callbacks=callbacks,
        verbose=1
    )
    
    # Evaluate
    print("\n📊 Evaluating model...")
    loss, accuracy, auc = model.evaluate(X_test, y_test, verbose=0)
    
    print(f"\n✅ Model Performance:")
    print(f"   Accuracy: {accuracy * 100:.2f}%")
    print(f"   AUC: {auc:.3f}")
    print(f"   Loss: {loss:.4f}")
    
    # Predict on test set
    y_pred = model.predict(X_test, verbose=0)
    
    # Per-class performance
    print("\n📋 Per-Side Effect Performance:")
    for i, effect in enumerate(y.columns):
        y_true_effect = y_test.iloc[:, i]
        y_pred_effect = (y_pred[:, i] > 0.5).astype(int)
        
        from sklearn.metrics import accuracy_score, f1_score
        acc = accuracy_score(y_true_effect, y_pred_effect)
        f1 = f1_score(y_true_effect, y_pred_effect, zero_division=0)
        
        print(f"   {effect}: Acc={acc*100:.1f}%, F1={f1:.3f}")
    
    return model, history, accuracy, auc, X_test, y_test

def save_model(model, le_drug, le_effect, scaler, top_effects, accuracy, auc):
    """Save trained model and preprocessing objects"""
    
    print("\n💾 Saving model...")
    
    # Save model
    model_file = Path('../models/side_effect_nn.h5')
    model.save(model_file)
    print(f"✅ Saved model: {model_file}")
    
    # Save preprocessing objects
    joblib.dump(le_drug, Path('../models/le_drug_name.pkl'))
    joblib.dump(le_effect, Path('../models/le_side_effect.pkl'))
    joblib.dump(scaler, Path('../models/scaler.pkl'))
    
    # Save metadata
    metadata = {
        'model_type': 'Neural Network (Multi-label)',
        'model_version': '1.0',
        'training_date': datetime.now().isoformat(),
        'accuracy': float(accuracy),
        'auc': float(auc),
        'architecture': [128, 64, 32],
        'features': [
            'drug_encoded',
            'age_years',
            'weight_kg',
            'sex_encoded'
        ],
        'side_effects': top_effects,
        'n_outputs': len(top_effects),
        'framework': 'tensorflow/keras'
    }
    
    metadata_file = Path('../models/side_effect_model_metadata.json')
    with open(metadata_file, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"✅ Saved metadata: {metadata_file}")

def main():
    print("=" * 60)
    print("SIDE EFFECT PREDICTOR TRAINING")
    print("=" * 60)
    
    # Load data
    df = load_data()
    
    # Prepare features
    X, y, le_drug, le_effect, scaler, top_effects = prepare_features(df)
    
    # Train model
    model, history, accuracy, auc, X_test, y_test = train_model(X, y)
    
    # Save model
    save_model(model, le_drug, le_effect, scaler, top_effects, accuracy, auc)
    
    print("\n" + "=" * 60)
    print("✅ TRAINING COMPLETE!")
    print("=" * 60)
    print(f"Model saved to: ai-models/models/side_effect_nn.h5")
    print(f"Accuracy: {accuracy * 100:.2f}%")
    print(f"AUC: {auc:.3f}")
    print(f"\nPredicting {len(top_effects)} common side effects:")
    for i, effect in enumerate(top_effects, 1):
        print(f"  {i}. {effect}")
    print("\nYou can now use this model to predict side effects!")

if __name__ == "__main__":
    main()
