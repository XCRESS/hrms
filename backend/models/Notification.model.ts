import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface INotificationDoc extends Document {
  user: mongoose.Types.ObjectId;
  type: string;
  title: string;
  body: string;
  url: string;
  /** One delivery per key, ever: makes scheduled nudges restart-safe. */
  dedupeKey?: string;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const INBOX_RETENTION_SECONDS = 90 * 24 * 60 * 60;

const notificationSchema = new Schema<INotificationDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, trim: true, maxlength: 60 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, default: '', maxlength: 1000 },
    url: { type: String, default: '/dashboard', maxlength: 300 },
    dedupeKey: { type: String, trim: true, maxlength: 200 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, readAt: 1 });
notificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: INBOX_RETENTION_SECONDS });

const Notification: Model<INotificationDoc> = mongoose.model<INotificationDoc>(
  'Notification',
  notificationSchema
);

export default Notification;
