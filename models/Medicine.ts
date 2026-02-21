import mongoose from 'mongoose';

const MedicineSchema = new mongoose.Schema({
  // Basic Information
  drugbank_id: { type: String, unique: true, required: true },
  name: { type: String, required: true, index: true },
  generic_name: { type: String, required: true },
  brand_names: [String],
  
  // Classification
  category: { type: String, required: true }, // e.g., "NSAID", "Antibiotic"
  therapeutic_class: { type: String },
  chemical_formula: String,
  
  // Dosage Information
  dosage_forms: [String], // ["Tablet", "Syrup", "Injection"]
  standard_dosage: String,
  max_daily_dose: String,
  
  // Side Effects (Base probabilities from dataset)
  common_side_effects: [{
    name: String,
    base_probability: Number, // 0-1 from training data
    severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
    description: String
  }],
  
  serious_side_effects: [{
    name: String,
    base_probability: Number,
    description: String,
    requires_immediate_attention: Boolean
  }],
  
  // Contraindications
  contraindications: {
    age_restrictions: {
      min_age: Number,
      max_age: Number,
      warnings: String
    },
    pregnancy_category: { type: String, enum: ['A', 'B', 'C', 'D', 'X'] },
    breastfeeding_safe: Boolean,
    chronic_conditions_risk: [{
      condition: String, // "diabetes", "kidney_disease"
      risk_multiplier: Number, // 1.5 means 50% higher risk
      warning: String
    }]
  },
  
  // Drug Interactions (from trained model)
  known_interactions: [{
    interacting_drug_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
    interacting_drug_name: String,
    severity: { type: String, enum: ['minor', 'moderate', 'major', 'contraindicated'] },
    risk_score: Number, // 0-1 from ML model
    mechanism: String,
    clinical_effects: String,
    management: String,
    evidence_level: { type: String, enum: ['theoretical', 'case_report', 'study', 'established'] }
  }],
  
  // ML Model Data
  ml_features: {
    chemical_properties: {
      molecular_weight: Number,
      lipophilicity: Number,
      protein_binding: Number
    },
    metabolism: {
      primary_pathway: String, // "CYP3A4", "CYP2D6"
      half_life_hours: Number,
      excretion_route: String
    },
    encoded_vector: [Number] // For ML model input
  },
  
  // Metadata
  fda_approved: Boolean,
  approval_date: Date,
  manufacturer: String,
  
  // Data Source & Verification
  data_sources: [{
    source: { type: String, enum: ['DrugBank', 'FDA', 'SIDER', 'PubMed', 'Manual'] },
    reference_url: String,
    last_verified: Date
  }],
  
  // Disclaimers
  disclaimer: {
    type: String,
    default: "This information is for educational purposes only. Always consult a healthcare professional before starting or stopping any medication."
  },
  
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Indexes for fast queries
MedicineSchema.index({ name: 'text', generic_name: 'text', brand_names: 'text' });
MedicineSchema.index({ category: 1 });
MedicineSchema.index({ 'known_interactions.interacting_drug_id': 1 });

export default mongoose.models.Medicine || mongoose.model('Medicine', MedicineSchema);
