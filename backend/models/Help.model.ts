/**
 * Help Model - TypeScript + Mongoose
 * Employee help desk tickets and support requests
 */

import mongoose, { Schema, type Document } from 'mongoose';

export type HelpCategory = 'technical' | 'hr' | 'payroll' | 'other';
export type HelpStatus = 'pending' | 'in-progress' | 'resolved';
export type HelpPriority = 'low' | 'medium' | 'high';

export interface IHelpDoc extends Document {
  userId: mongoose.Types.ObjectId;
  subject: string;
  description: string;
  category: HelpCategory;
  status: HelpStatus;
  priority: HelpPriority;
  response?: string;
  respondedBy?: mongoose.Types.ObjectId;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const helpSchema = new Schema<IHelpDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      enum: {
        values: ['technical', 'hr', 'payroll', 'other'] as HelpCategory[],
        message: 'Category must be technical, hr, payroll, or other',
      },
      default: 'other',
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'in-progress', 'resolved'] as HelpStatus[],
        message: 'Status must be pending, in-progress, or resolved',
      },
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high'] as HelpPriority[],
        message: 'Priority must be low, medium, or high',
      },
      default: 'medium',
      index: true,
    },
    response: {
      type: String,
      trim: true,
      maxlength: [2000, 'Response cannot exceed 2000 characters'],
    },
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    respondedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
helpSchema.index({ userId: 1, status: 1 });
helpSchema.index({ status: 1, priority: -1, createdAt: -1 });
helpSchema.index({ category: 1, status: 1 });

const Help = mongoose.model<IHelpDoc>('Help', helpSchema);

export default Help;
