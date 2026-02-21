import mongoose, { Schema, Document } from 'mongoose';

export interface IMedicineTracker extends Document {
  user_id: mongoose.Types.ObjectId;
  medicine_name: string;
  dosage: string;
  frequency: 'daily' | 'twice_daily' | 'thrice_daily' | 'weekly' | 'as_needed' | 'custom';
  custom_schedule?: string; // e.g., "Every Monday, Wednesday, Friday"
  times: string[]; // e.g., ["08:00", "20:00"]
  start_date: Date;
  end_date?: Date;
  instructions: string;
  prescribing_doctor?: string;
  purpose: string;
  
  // Notification Settings
  notifications_enabled: boolean;
  notification_channels: {
    in_app: boolean;
    email: boolean;
    sms: boolean;
  };
  phone_number?: string; // For SMS
  
  // Status
  status: 'active' | 'paused' | 'completed' | 'discontinued';
  
  // Analytics
  total_doses_expected: number;
  total_doses_taken: number;
  adherence_rate: number; // Calculated percentage
  
  created_at: Date;
  updated_at: Date;
}

const MedicineTrackerSchema: Schema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  medicine_name: {
    type: String,
    required: true,
    trim: true,
  },
  dosage: {
    type: String,
    required: true,
    // e.g., "500mg", "1 tablet", "2 capsules"
  },
  frequency: {
    type: String,
    enum: ['daily', 'twice_daily', 'thrice_daily', 'weekly', 'as_needed', 'custom'],
    required: true,
  },
  custom_schedule: {
    type: String,
    trim: true,
  },
  times: [{
    type: String, // Format: "HH:MM" (24-hour)
  }],
  start_date: {
    type: Date,
    required: true,
  },
  end_date: {
    type: Date,
  },
  instructions: {
    type: String,
    trim: true,
    default: '',
  },
  prescribing_doctor: {
    type: String,
    trim: true,
  },
  purpose: {
    type: String,
    trim: true,
    default: '',
  },
  
  // Notification Settings
  notifications_enabled: {
    type: Boolean,
    default: true,
  },
  notification_channels: {
    in_app: {
      type: Boolean,
      default: true,
    },
    email: {
      type: Boolean,
      default: false,
    },
    sms: {
      type: Boolean,
      default: false,
    },
  },
  phone_number: {
    type: String,
    trim: true,
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'discontinued'],
    default: 'active',
  },
  
  // Analytics
  total_doses_expected: {
    type: Number,
    default: 0,
  },
  total_doses_taken: {
    type: Number,
    default: 0,
  },
  adherence_rate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Calculate adherence rate
MedicineTrackerSchema.methods.calculateAdherence = function () {
  if (this.total_doses_expected > 0) {
    this.adherence_rate = Math.round((this.total_doses_taken / this.total_doses_expected) * 100);
  } else {
    this.adherence_rate = 0;
  }
  return this.adherence_rate;
};

export default mongoose.models.MedicineTracker || mongoose.model<IMedicineTracker>('MedicineTracker', MedicineTrackerSchema);
