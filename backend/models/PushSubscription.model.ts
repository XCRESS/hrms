import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IPushSubscriptionDoc extends Document {
  user: mongoose.Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  lastSuccessAt?: Date;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const pushSubscriptionSchema = new Schema<IPushSubscriptionDoc>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    endpoint: {
      type: String,
      required: [true, 'Push endpoint is required'],
      trim: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: [true, 'p256dh key is required'],
      },
      auth: {
        type: String,
        required: [true, 'auth key is required'],
      },
    },
    userAgent: { type: String, maxlength: 400 },
    lastSuccessAt: { type: Date },
    failureCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// One row per endpoint: re-subscribing on the same device updates, never duplicates.
pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });
pushSubscriptionSchema.index({ user: 1 });

const PushSubscription: Model<IPushSubscriptionDoc> = mongoose.model<IPushSubscriptionDoc>(
  'PushSubscription',
  pushSubscriptionSchema
);

export default PushSubscription;
