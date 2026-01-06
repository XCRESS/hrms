/**
 * Policy Model - TypeScript + Mongoose
 * Company policies and documents management
 */

import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type PolicyCategory =
  | 'General'
  | 'HR'
  | 'IT'
  | 'Security'
  | 'Leave'
  | 'Attendance'
  | 'Code of Conduct'
  | 'Safety'
  | 'Other';

export type PolicyPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type TargetAudience =
  | 'All Employees'
  | 'HR Only'
  | 'Management Only'
  | 'IT Team'
  | 'Specific Departments';

export interface IAttachment {
  filename: string;
  url: string;
  size: number;
}

export interface IPolicyDoc extends Document {
  title: string;
  content: string;
  category: PolicyCategory;
  priority: PolicyPriority;
  isActive: boolean;
  effectiveDate: Date;
  expiryDate?: Date;
  createdBy: mongoose.Types.ObjectId;
  lastUpdatedBy?: mongoose.Types.ObjectId;
  tags: string[];
  version: number;
  acknowledgmentRequired: boolean;
  targetAudience: TargetAudience;
  attachments: IAttachment[];
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  isEffective: boolean;

  // Methods
  needsAcknowledgment(): boolean;
}

const policySchema = new Schema<IPolicyDoc>(
  {
    title: {
      type: String,
      required: [true, 'Policy title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Policy content is required'],
    },
    category: {
      type: String,
      enum: {
        values: [
          'General',
          'HR',
          'IT',
          'Security',
          'Leave',
          'Attendance',
          'Code of Conduct',
          'Safety',
          'Other',
        ] as PolicyCategory[],
        message: 'Invalid policy category',
      },
      default: 'General',
    },
    priority: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High', 'Critical'] as PolicyPriority[],
        message: 'Priority must be Low, Medium, High, or Critical',
      },
      default: 'Medium',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    effectiveDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator reference is required'],
    },
    lastUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [50, 'Tag cannot exceed 50 characters'],
      },
    ],
    version: {
      type: Number,
      default: 1,
      min: [1, 'Version must be at least 1'],
    },
    acknowledgmentRequired: {
      type: Boolean,
      default: false,
    },
    targetAudience: {
      type: String,
      enum: {
        values: [
          'All Employees',
          'HR Only',
          'Management Only',
          'IT Team',
          'Specific Departments',
        ] as TargetAudience[],
        message: 'Invalid target audience',
      },
      default: 'All Employees',
    },
    attachments: [
      {
        filename: {
          type: String,
          required: true,
          trim: true,
        },
        url: {
          type: String,
          required: true,
          trim: true,
        },
        size: {
          type: Number,
          required: true,
          min: [0, 'File size cannot be negative'],
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for query performance
policySchema.index({ title: 1 });
policySchema.index({ category: 1 });
policySchema.index({ isActive: 1 });
policySchema.index({ effectiveDate: -1 });
policySchema.index({ createdAt: -1 });

/**
 * Virtual: Check if policy is currently effective
 */
policySchema.virtual('isEffective').get(function (this: IPolicyDoc): boolean {
  const now = new Date();
  const effective = this.effectiveDate <= now;
  const notExpired = !this.expiryDate || this.expiryDate > now;
  return this.isActive && effective && notExpired;
});

/**
 * Instance method: Check if policy needs acknowledgment
 */
policySchema.methods.needsAcknowledgment = function (this: IPolicyDoc): boolean {
  return this.acknowledgmentRequired && this.isEffective;
};

/**
 * Static methods interface
 */
interface IPolicyModel extends Model<IPolicyDoc> {
  getActivePolicies(options?: {
    category?: PolicyCategory;
    targetAudience?: TargetAudience;
    limit?: number;
    skip?: number;
  }): Promise<IPolicyDoc[]>;
}

/**
 * Static method: Get active policies with filters
 */
policySchema.static(
  'getActivePolicies',
  function (
    options: {
      category?: PolicyCategory;
      targetAudience?: TargetAudience;
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<IPolicyDoc[]> {
    const { category, targetAudience, limit = 10, skip = 0 } = options;

    const query: Record<string, unknown> = { isActive: true };

    // Add current date filter for effective policies
    const now = new Date();
    query.effectiveDate = { $lte: now };
    query.$or = [{ expiryDate: null }, { expiryDate: { $gt: now } }];

    if (category) query.category = category;
    if (targetAudience) query.targetAudience = targetAudience;

    return this.find(query)
      .populate('createdBy', 'name email')
      .populate('lastUpdatedBy', 'name email')
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }
);

const Policy = mongoose.model<IPolicyDoc, IPolicyModel>('Policy', policySchema);

export default Policy;
