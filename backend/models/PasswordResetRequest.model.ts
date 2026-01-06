/**
 * Password Reset Request Model - TypeScript + Mongoose
 * User-initiated password reset requests requiring admin approval
 */

import mongoose, { Schema, type Document } from 'mongoose';

export type PasswordResetStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'completed';

export interface IPasswordResetRequestDoc extends Document {
  name: string;
  email: string;
  newPassword: string;
  status: PasswordResetStatus;
  userId?: mongoose.Types.ObjectId;
  remarks?: string;
  processedBy?: mongoose.Types.ObjectId;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const passwordResetRequestSchema = new Schema<IPasswordResetRequestDoc>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    newPassword: {
      type: String,
      required: [true, 'New password is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected', 'expired', 'completed'] as PasswordResetStatus[],
        message: 'Status must be pending, approved, rejected, expired, or completed',
      },
      default: 'pending',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [500, 'Remarks cannot exceed 500 characters'],
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    processedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
passwordResetRequestSchema.index({ email: 1, status: 1 });
passwordResetRequestSchema.index({ userId: 1, status: 1 });
passwordResetRequestSchema.index({ createdAt: -1 });

const PasswordResetRequest = mongoose.model<IPasswordResetRequestDoc>(
  'PasswordResetRequest',
  passwordResetRequestSchema
);

export default PasswordResetRequest;
