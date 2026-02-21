import mongoose from 'mongoose';

export interface IMedicineReport extends mongoose.Document {
  doctorId: mongoose.Types.ObjectId;
  doctorName: string;
  doctorEmail: string;
  doctorCredentials?: string; // e.g., "MD, Cardiologist"
  
  // Medicine Information
  medicineName: string;
  drugBankId?: string;
  
  // Issue Details
  issueType: 'incorrect_side_effect' | 'missing_interaction' | 'wrong_dosage' | 'incorrect_contraindication' | 'other';
  issueTitle: string;
  issueDescription: string;
  suggestedCorrection?: string;
  
  // Supporting Information
  evidenceSource?: string; // e.g., "Clinical study, Personal experience"
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  affectsPatientSafety: boolean;
  
  // Admin Review
  status: 'pending' | 'under_review' | 'resolved' | 'rejected';
  adminNotes?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  actionTaken?: string;
  
  // Timestamps
  submittedAt: Date;
  updatedAt: Date;

  // Methods
  updateStatus(
    status: 'pending' | 'under_review' | 'resolved' | 'rejected',
    adminId: mongoose.Types.ObjectId,
    adminNotes?: string,
    actionTaken?: string
  ): Promise<IMedicineReport>;
}

interface IMedicineReportModel extends mongoose.Model<IMedicineReport> {
  getStatistics(): Promise<{
    byStatus: Array<{ _id: string; count: number }>;
    byUrgency: Array<{ _id: string; count: number }>;
    safetyConcerns: number;
  }>;
}

const MedicineReportSchema = new mongoose.Schema<IMedicineReport>(
  {
    // Doctor Information
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doctorName: {
      type: String,
      required: true,
    },
    doctorEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    doctorCredentials: {
      type: String,
    },
    
    // Medicine Information
    medicineName: {
      type: String,
      required: true,
      index: true,
    },
    drugBankId: {
      type: String,
      index: true,
    },
    
    // Issue Details
    issueType: {
      type: String,
      enum: ['incorrect_side_effect', 'missing_interaction', 'wrong_dosage', 'incorrect_contraindication', 'other'],
      required: true,
      index: true,
    },
    issueTitle: {
      type: String,
      required: true,
      maxlength: 200,
    },
    issueDescription: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    suggestedCorrection: {
      type: String,
      maxlength: 1000,
    },
    
    // Supporting Information
    evidenceSource: {
      type: String,
      maxlength: 500,
    },
    urgencyLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    affectsPatientSafety: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    // Admin Review
    status: {
      type: String,
      enum: ['pending', 'under_review', 'resolved', 'rejected'],
      default: 'pending',
      index: true,
    },
    adminNotes: {
      type: String,
      maxlength: 1000,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    actionTaken: {
      type: String,
      maxlength: 500,
    },
    
    // Timestamps
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
MedicineReportSchema.index({ status: 1, submittedAt: -1 });
MedicineReportSchema.index({ doctorId: 1, submittedAt: -1 });
MedicineReportSchema.index({ urgencyLevel: 1, status: 1 });
MedicineReportSchema.index({ affectsPatientSafety: 1, status: 1 });

// Virtual for report age in days
MedicineReportSchema.virtual('daysOpen').get(function() {
  if (this.status === 'resolved' || this.status === 'rejected') {
    return 0;
  }
  const now = new Date();
  const submitted = new Date(this.submittedAt);
  return Math.floor((now.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
});

// Method to update status
MedicineReportSchema.methods.updateStatus = function(
  status: 'pending' | 'under_review' | 'resolved' | 'rejected',
  adminId: mongoose.Types.ObjectId,
  adminNotes?: string,
  actionTaken?: string
) {
  this.status = status;
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  if (adminNotes) this.adminNotes = adminNotes;
  if (actionTaken) this.actionTaken = actionTaken;
  return this.save();
};

// Static method to get statistics
MedicineReportSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);
  
  const urgencyStats = await this.aggregate([
    {
      $match: { status: { $in: ['pending', 'under_review'] } },
    },
    {
      $group: {
        _id: '$urgencyLevel',
        count: { $sum: 1 },
      },
    },
  ]);
  
  const safetyCount = await this.countDocuments({
    affectsPatientSafety: true,
    status: { $in: ['pending', 'under_review'] },
  });
  
  return {
    byStatus: stats,
    byUrgency: urgencyStats,
    safetyConcerns: safetyCount,
  };
};

export default (mongoose.models.MedicineReport || mongoose.model<IMedicineReport, IMedicineReportModel>('MedicineReport', MedicineReportSchema)) as IMedicineReportModel;
