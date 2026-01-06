/**
 * Announcement Model - TypeScript + Mongoose
 * Company-wide announcements and notifications
 */

import mongoose, { Schema, type Document } from 'mongoose';

export type AnnouncementAudience = 'all' | 'employee' | 'hr' | 'admin';
export type AnnouncementStatus = 'draft' | 'published';

export interface IAnnouncementDoc extends Document {
  title: string;
  content: string;
  author?: mongoose.Types.ObjectId;
  authorName?: string;
  targetAudience: AnnouncementAudience;
  status: AnnouncementStatus;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncementDoc>(
  {
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Announcement content is required'],
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    authorName: {
      type: String,
      trim: true,
    },
    targetAudience: {
      type: String,
      enum: {
        values: ['all', 'employee', 'hr', 'admin'] as AnnouncementAudience[],
        message: 'Target audience must be all, employee, hr, or admin',
      },
      default: 'all',
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'published'] as AnnouncementStatus[],
        message: 'Status must be draft or published',
      },
      default: 'published',
      index: true,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
announcementSchema.index({ status: 1, createdAt: -1 });
announcementSchema.index({ targetAudience: 1, status: 1 });
announcementSchema.index({ expiresAt: 1 });

const Announcement = mongoose.model<IAnnouncementDoc>('Announcement', announcementSchema);

export default Announcement;
