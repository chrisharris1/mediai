import mongoose, { Schema, model, models } from 'mongoose';

export interface INotification {
  userId: mongoose.Types.ObjectId;
  type: 'consultation_accepted' | 'consultation_rejected' | 'consultation_reminder' | 'general';
  title: string;
  message: string;
  relatedId?: mongoose.Types.ObjectId;
  relatedModel?: string;
  isRead: boolean;
  sentVia: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['consultation_accepted', 'consultation_rejected', 'consultation_reminder', 'general'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  relatedId: Schema.Types.ObjectId,
  relatedModel: String,
  isRead: {
    type: Boolean,
    default: false,
  },
  sentVia: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
  },
}, {
  timestamps: true,
});

const Notification = models.Notification || model<INotification>('Notification', NotificationSchema);

export default Notification;
