import mongoose, { Schema, model, models } from 'mongoose';

export interface IConsultationRequest {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  symptomReportId?: mongoose.Types.ObjectId;
  requestDate: Date;
  preferredTime: string;
  additionalNotes?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  scheduledTime?: Date;
  meetingLink?: string;
  doctorNotes?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConsultationRequestSchema = new Schema<IConsultationRequest>({
  patientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  doctorId: {
    type: Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
  },
  symptomReportId: {
    type: Schema.Types.ObjectId,
    ref: 'SymptomReport',
  },
  requestDate: {
    type: Date,
    default: Date.now,
  },
  preferredTime: {
    type: String,
    required: true,
  },
  additionalNotes: String,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
    default: 'pending',
  },
  scheduledTime: Date,
  meetingLink: String,
  doctorNotes: String,
  rejectionReason: String,
}, {
  timestamps: true,
});

const ConsultationRequest = models.ConsultationRequest || model<IConsultationRequest>('ConsultationRequest', ConsultationRequestSchema);

export default ConsultationRequest;
