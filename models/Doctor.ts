import mongoose, { Schema, model, models } from 'mongoose';

export interface IDoctor {
  userId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  experience: number;
  rating: number;
  consultationFee: number;
  qualifications: string[];
  languages: string[];
  availability: Array<{
    day: string;
    timeSlots: string[];
  }>;
  profileImage?: string;
  isVerified: boolean;
  notificationPreferences: {
    email: boolean;
    sms: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const DoctorSchema = new Schema<IDoctor>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  specialization: {
    type: String,
    required: true,
  },
  experience: {
    type: Number,
    required: true,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  consultationFee: {
    type: Number,
    required: true,
  },
  qualifications: [{
    type: String,
  }],
  languages: [{
    type: String,
  }],
  availability: [{
    day: String,
    timeSlots: [String],
  }],
  profileImage: String,
  isVerified: {
    type: Boolean,
    default: false,
  },
  notificationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
  },
}, {
  timestamps: true,
});

const Doctor = models.Doctor || model<IDoctor>('Doctor', DoctorSchema);

export default Doctor;
