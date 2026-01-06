/**
 * WFH Request Model - TypeScript + Mongoose
 * Work From Home requests for attendance geofencing bypass
 */

import mongoose, { Schema, type Document } from 'mongoose';

export type WFHStatus = 'pending' | 'approved' | 'rejected';

export interface IAttemptedLocation {
  latitude: number;
  longitude: number;
}

export interface IWFHRequestDoc extends Document {
  employee: mongoose.Types.ObjectId;
  employeeId: string;
  employeeName: string;
  requestDate: Date;
  requestedCheckInTime: Date;
  reason: string;
  status: WFHStatus;
  attemptedLocation?: IAttemptedLocation;
  nearestOffice?: string;
  distanceFromOffice?: number;
  approvedBy?: mongoose.Types.ObjectId;
  reviewComment?: string;
  reviewedAt?: Date;
  consumedAt?: Date;
  consumedAttendance?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const wfhRequestSchema = new Schema<IWFHRequestDoc>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
    },
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      trim: true,
    },
    employeeName: {
      type: String,
      required: [true, 'Employee name is required'],
      trim: true,
    },
    requestDate: {
      type: Date,
      required: [true, 'Request date is required'],
    },
    requestedCheckInTime: {
      type: Date,
      required: [true, 'Requested check-in time is required'],
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected'] as WFHStatus[],
        message: 'Status must be pending, approved, or rejected',
      },
      default: 'pending',
    },
    attemptedLocation: {
      latitude: {
        type: Number,
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90'],
      },
      longitude: {
        type: Number,
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180'],
      },
    },
    nearestOffice: {
      type: String,
      trim: true,
    },
    distanceFromOffice: {
      type: Number,
      min: [0, 'Distance cannot be negative'],
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewComment: {
      type: String,
      trim: true,
      maxlength: [500, 'Review comment cannot exceed 500 characters'],
    },
    reviewedAt: {
      type: Date,
    },
    consumedAt: {
      type: Date,
    },
    consumedAttendance: {
      type: Schema.Types.ObjectId,
      ref: 'Attendance',
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index to prevent duplicate pending/approved WFH requests
wfhRequestSchema.index(
  { employee: 1, requestDate: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['pending', 'approved'] },
    },
    name: 'unique_active_wfh_per_employee_per_date',
  }
);

// Query performance indexes
wfhRequestSchema.index({ employee: 1, requestDate: 1 });
wfhRequestSchema.index({ status: 1, requestDate: 1 });
wfhRequestSchema.index({ employeeId: 1, status: 1 });
wfhRequestSchema.index({ consumedAttendance: 1 }); // For reverse lookups

const WFHRequest = mongoose.model<IWFHRequestDoc>('WFHRequest', wfhRequestSchema);

export default WFHRequest;
