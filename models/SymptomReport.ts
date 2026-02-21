import mongoose, { Schema, model, models } from 'mongoose';

export interface ISymptomReport {
  userId: mongoose.Types.ObjectId;
  symptoms: string[];
  duration: string;
  medications: string[];
  homeRemedies: string[];
  patientInfo: {
    age: number;
    gender: string;
    chronicConditions: string[];
    allergies: string[];
  };
  analysis: {
    possibleConditions: Array<{
      name: string;
      matchPercentage: number;
      severity: 'mild' | 'moderate' | 'high';
    }>;
    homeRemedies: string[];
    suggestedMedicines: string[];
    warningSignsToLookFor: string[];
    overallAdvice: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SymptomReportSchema = new Schema<ISymptomReport>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  symptoms: [{
    type: String,
    required: true,
  }],
  duration: {
    type: String,
    required: true,
  },
  medications: [{
    type: String,
  }],
  homeRemedies: [{
    type: String,
  }],
  patientInfo: {
    age: { type: Number, required: true },
    gender: { type: String, required: true },
    chronicConditions: [String],
    allergies: [String],
  },
  analysis: {
    possibleConditions: [{
      name: String,
      matchPercentage: Number,
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'high'],
      },
    }],
    homeRemedies: [String],
    suggestedMedicines: [String],
    warningSignsToLookFor: [String],
    overallAdvice: String,
  },
}, {
  timestamps: true,
});

const SymptomReport = models.SymptomReport || model<ISymptomReport>('SymptomReport', SymptomReportSchema);

export default SymptomReport;
