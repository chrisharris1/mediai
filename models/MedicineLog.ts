import mongoose, { Schema, Document } from 'mongoose';

export interface IMedicineLog extends Document {
  medicine_tracker_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  medicine_name: string;
  
  // Scheduled vs Actual
  scheduled_time: Date;
  actual_time?: Date;
  
  // Status
  status: 'taken' | 'missed' | 'skipped' | 'pending';
  
  // Optional Notes
  notes?: string;
  side_effects?: string[];
  
  // Location tracking (optional)
  logged_via: 'manual' | 'reminder' | 'auto' | 'auto_scheduled' | 'auto_system';
  
  created_at: Date;
}

const MedicineLogSchema: Schema = new Schema({
  medicine_tracker_id: {
    type: Schema.Types.ObjectId,
    ref: 'MedicineTracker',
    required: true,
    index: true,
  },
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  medicine_name: {
    type: String,
    required: true,
  },
  
  // Scheduled vs Actual
  scheduled_time: {
    type: Date,
    required: true,
    index: true,
  },
  actual_time: {
    type: Date,
  },
  
  // Status
  status: {
    type: String,
    enum: ['taken', 'missed', 'skipped', 'pending'],
    required: true,
    default: 'pending',
  },
  
  // Optional Notes
  notes: {
    type: String,
    trim: true,
  },
  side_effects: [{
    type: String,
  }],
  
  // Tracking
  logged_via: {
    type: String,
    enum: ['manual', 'reminder', 'auto', 'auto_scheduled', 'auto_system'],
    default: 'manual',
  },
  
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Compound index for efficient queries
MedicineLogSchema.index({ user_id: 1, scheduled_time: -1 });
MedicineLogSchema.index({ medicine_tracker_id: 1, scheduled_time: -1 });

export default mongoose.models.MedicineLog || mongoose.model<IMedicineLog>('MedicineLog', MedicineLogSchema);
