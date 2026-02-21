import mongoose from 'mongoose';

// AI Symptom Checker Session
const SymptomCheckSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // User Input (Conversation)
  conversation: [{
    question: String,
    answer: String,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Structured Data
  symptoms: {
    primary_symptoms: [String], // ["fever", "headache", "sore throat"]
    duration: String, // "3 days"
    severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
    additional_symptoms: [String]
  },
  
  // Patient Context
  patient_info: {
    age: Number,
    gender: String,
    chronic_conditions: [String],
    allergies: [String],
    current_medications: [{
      name: String,
      dosage: String,
      duration: String
    }],
    home_remedies_tried: [String]
  },
  
  // AI Analysis
  ai_diagnosis: {
    possible_conditions: [{
      condition_name: String,
      match_percentage: Number, // 0-100
      description: String,
      common_causes: [String],
      typical_duration: String
    }],
    
    confidence_score: Number, // 0-1 (how confident AI is)
    
    // Recommendations
    home_remedies: [{
      remedy: String,
      instructions: String,
      effectiveness: String // "highly effective", "moderately effective"
    }],
    
    suggested_medicines: [{
      medicine_name: String,
      generic_name: String,
      dosage: String,
      duration: String,
      purpose: String,
      over_the_counter: Boolean
    }],
    
    // Risk Assessment
    urgency_level: { 
      type: String, 
      enum: ['low', 'moderate', 'high', 'emergency'],
      default: 'low'
    },
    
    warning_signs: [String], // "Seek immediate help if..."
    
    when_to_see_doctor: {
      should_consult: Boolean,
      reason: String,
      timeframe: String // "within 24 hours", "within 3 days"
    }
  },
  
  // Model Info
  ml_model: {
    model_version: String,
    processing_time_ms: Number,
    features_used: [String]
  },
  
  // Follow-up
  consultation_requested: { type: Boolean, default: false },
  consultation_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation' },
  
  // Outcome (for model improvement)
  user_feedback: {
    was_helpful: Boolean,
    felt_better: Boolean,
    saw_doctor: Boolean,
    actual_diagnosis: String, // If they eventually got diagnosed
    comments: String
  },
  
  // Metadata
  status: {
    type: String,
    enum: ['completed', 'consultation_requested', 'follow_up_needed'],
    default: 'completed'
  },
  
  disclaimer_shown: { type: Boolean, default: true },
  disclaimer_text: {
    type: String,
    default: "⚠️ This is an AI-powered analysis and NOT a medical diagnosis. Always consult a qualified healthcare professional for accurate diagnosis and treatment."
  },
  
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Indexes
SymptomCheckSchema.index({ user_id: 1, created_at: -1 });
SymptomCheckSchema.index({ 'ai_diagnosis.urgency_level': 1 });

export default mongoose.models.SymptomCheck || mongoose.model('SymptomCheck', SymptomCheckSchema);
