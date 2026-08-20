/**
 * PushSubscription Model - TypeScript + Mongoose
 * Web Push endpoints registered per user.
 *
 * These used to live in an in-process Map, which meant every Railway restart
 * silently dropped every subscription (and the subscribe flow only runs on
 * login, so they were rarely re-registered). They are persisted so delivery
 * survives a deploy.
 */

import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IPushSubscriptionDoc extends Document {
  user: mongoose.Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
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
  },
  { timestamps: true }
);

// The endpoint is the browser's identity for a subscription: one row per
// endpoint, so re-subscribing on the same device updates rather than duplicates.
pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });
pushSubscriptionSchema.index({ user: 1 });

const PushSubscription: Model<IPushSubscriptionDoc> = mongoose.model<IPushSubscriptionDoc>(
  'PushSubscription',
  pushSubscriptionSchema
);

export default PushSubscription;
