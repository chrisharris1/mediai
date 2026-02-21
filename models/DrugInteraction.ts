import mongoose from 'mongoose';

// Trained ML model results for drug-drug interactions
const DrugInteractionSchema = new mongoose.Schema({
  // Drug Pair
  drug1_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  drug2_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  drug1_name: { type: String, required: true },
  drug2_name: { type: String, required: true },
  
  // ML Model Prediction
  interaction_exists: { type: Boolean, required: true },
  interaction_probability: { type: Number, required: true }, // 0-1 from Random Forest
  
  // Severity Classification
  severity: {
    type: String,
    enum: ['minor', 'moderate', 'major', 'contraindicated'],
    required: true
  },
  severity_score: Number, // 0-4
  
  // Clinical Information
  mechanism: {
    type: String,
    description: String, // How the drugs interact
    affected_pathway: String // "CYP3A4 inhibition", "Additive effects"
  },
  
  clinical_effects: {
    description: String,
    potential_outcomes: [String],
    symptoms_to_watch: [String],
    time_to_onset: String // "immediate", "hours", "days"
  },
  
  // Risk Factors (when risk is higher)
  risk_multipliers: [{
    condition: String, // "elderly", "kidney_disease"
    multiplier: Number,
    explanation: String
  }],
  
  // Management
  management: {
    should_avoid: Boolean,
    spacing_required: String, // "Take 2 hours apart"
    dosage_adjustment: String,
    monitoring_required: Boolean,
    monitoring_parameters: [String], // ["Blood pressure", "INR levels"]
    alternative_suggestions: [String]
  },
  
  // Evidence
  evidence: {
    level: { type: String, enum: ['theoretical', 'case_report', 'observational_study', 'clinical_trial', 'meta_analysis'] },
    studies_count: Number,
    last_study_date: Date,
    fda_warning: Boolean,
    references: [{
      source: String,
      url: String,
      pubmed_id: String
    }]
  },
  
  // ML Model Info
  ml_model: {
    model_type: { type: String, default: 'Random Forest' },
    model_version: String,
    training_date: Date,
    feature_importance: [{
      feature: String,
      importance: Number
    }],
    confidence_score: Number // How confident the model is
  },
  
  // Data Sources
  data_sources: [{
    source: String,
    reference_url: String,
    last_verified: Date
  }],
  
  // Metadata
  reported_cases: Number, // Real-world cases reported
  frequency: { type: String, enum: ['rare', 'occasional', 'frequent', 'very_common'] },
  
  disclaimer: {
    type: String,
    default: "This interaction data is for informational purposes only. Always consult a healthcare professional before combining medications."
  },
  
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Compound index for drug pairs (order doesn't matter)
DrugInteractionSchema.index({ drug1_id: 1, drug2_id: 1 }, { unique: true });
DrugInteractionSchema.index({ drug2_id: 1, drug1_id: 1 });
DrugInteractionSchema.index({ severity: 1 });

// Helper method to find interaction regardless of drug order
DrugInteractionSchema.statics.findInteraction = async function(drugId1, drugId2) {
  return await this.findOne({
    $or: [
      { drug1_id: drugId1, drug2_id: drugId2 },
      { drug1_id: drugId2, drug2_id: drugId1 }
    ]
  });
};

export default mongoose.models.DrugInteraction || mongoose.model('DrugInteraction', DrugInteractionSchema);
