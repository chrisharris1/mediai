import mongoose, { Schema, Document } from 'mongoose';

export interface IBugReport extends Document {
  user_id: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  issue: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'dismissed';
  admin_notified: boolean;
  resolved_at?: Date;
  resolution_notes?: string;
  created_at: Date;
  updated_at: Date;
}

const BugReportSchema = new Schema<IBugReport>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    issue: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'resolved', 'dismissed'],
      default: 'pending'
    },
    admin_notified: {
      type: Boolean,
      default: false
    },
    resolved_at: {
      type: Date
    },
    resolution_notes: {
      type: String
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

// Indexes for performance
BugReportSchema.index({ user_id: 1, created_at: -1 });
BugReportSchema.index({ status: 1 });

const BugReport = mongoose.models.BugReport || mongoose.model<IBugReport>('BugReport', BugReportSchema);

export default BugReport;
