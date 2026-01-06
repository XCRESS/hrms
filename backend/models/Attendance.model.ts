/**
 * Attendance Model - TypeScript + Mongoose
 * Employee attendance tracking with geofencing and work hours calculation
 */

import mongoose, { Schema, type Model } from 'mongoose';
import type { IAttendance, AttendanceStatus, GeofenceStatus, ILocation } from '../types/index.js';
import { calculateWorkHours, getISTDayBoundaries } from '../utils/timezone.js';

const locationSchema = new Schema<ILocation>(
  {
    latitude: {
      type: Number,
      required: true,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90'],
    },
    longitude: {
      type: Number,
      required: true,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180'],
    },
    accuracy: {
      type: Number,
      required: true,
      min: [0, 'Accuracy must be a positive number'],
    },
    capturedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { _id: false }
);

const attendanceSchema = new Schema<IAttendance>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
    },
    employeeName: {
      type: String,
      required: [true, 'Employee name is required'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    checkIn: {
      type: Date,
      required: function (this: IAttendance): boolean {
        return this.status !== 'absent';
      },
      default: null,
    },
    checkOut: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['present', 'absent', 'half-day'] as AttendanceStatus[],
        message: 'Status must be one of: present, absent, half-day',
      },
      required: [true, 'Status is required'],
    },
    workHours: {
      type: Number,
      default: 0,
      min: [0, 'Work hours cannot be negative'],
      max: [24, 'Work hours cannot exceed 24'],
    },
    comments: {
      type: String,
      trim: true,
      maxlength: [500, 'Comments cannot exceed 500 characters'],
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    location: {
      type: locationSchema,
      default: null,
    },
    geofence: {
      enforced: {
        type: Boolean,
        default: false,
      },
      status: {
        type: String,
        enum: {
          values: ['onsite', 'wfh'] as GeofenceStatus[],
          message: 'Geofence status must be one of: onsite, wfh',
        },
      },
      office: {
        type: Schema.Types.ObjectId,
        ref: 'OfficeLocation',
      },
      officeName: {
        type: String,
        trim: true,
        maxlength: [120, 'Office name cannot exceed 120 characters'],
      },
      distance: {
        type: Number,
        min: [0, 'Distance cannot be negative'],
      },
      radius: {
        type: Number,
        min: [0, 'Radius cannot be negative'],
      },
      validatedAt: {
        type: Date,
      },
      wfhRequest: {
        type: Schema.Types.ObjectId,
        ref: 'WFHRequest',
      },
      notes: {
        type: String,
        maxlength: [500, 'Notes cannot exceed 500 characters'],
      },
    },
    checkoutLocation: {
      type: locationSchema,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Pre-save hook: Calculate work hours using IST-aware calculation
 */
attendanceSchema.pre('save', async function (next) {
  try {
    // Use IST-aware work hours calculation
    if (this.checkIn && this.checkOut) {
      this.workHours = calculateWorkHours(this.checkIn, this.checkOut);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * Pre-save hook: Normalize date to IST start of day
 * Ensures unique constraint works correctly
 */
attendanceSchema.pre('save', async function (next) {
  if (this.date && this.isModified('date')) {
    try {
      const { startOfDay } = getISTDayBoundaries(this.date);
      this.date = startOfDay.toJSDate();
      next();
    } catch (error) {
      next(error as Error);
    }
  } else {
    next();
  }
});

// Indexes for performance optimization

// Prevent duplicate attendance records per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

// Admin queries with date range and status filter
attendanceSchema.index({ date: 1, status: 1 });

// Employee attendance history (recent first)
attendanceSchema.index({ employee: 1, date: -1 });

// Date range queries
attendanceSchema.index({ date: 1 });

// Status-based queries with date sorting
attendanceSchema.index({ status: 1, date: 1 });

// Missing checkout queries
attendanceSchema.index({
  employee: 1,
  date: 1,
  checkIn: 1,
  checkOut: 1,
});

// Composite index for common dashboard queries
attendanceSchema.index({ date: 1, employee: 1, status: 1 });

/**
 * Virtual: Check if late arrival
 */
attendanceSchema.virtual('isLate').get(function (this: IAttendance) {
  if (!this.checkIn) return false;

  const checkInTime = new Date(this.checkIn);
  const lateThreshold = new Date(this.checkIn);
  lateThreshold.setHours(9, 55, 0, 0); // 9:55 AM

  return checkInTime > lateThreshold;
});

/**
 * Virtual: Check if full day (>= 8 hours)
 */
attendanceSchema.virtual('isFullDay').get(function (this: IAttendance) {
  return this.workHours >= 8;
});

/**
 * Static method: Find attendance by date range
 */
attendanceSchema.statics.findByDateRange = function (startDate: Date, endDate: Date) {
  return this.find({
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ date: -1 });
};

/**
 * Static method: Find employee attendance for a specific month
 */
attendanceSchema.statics.findByEmployeeMonth = function (
  employeeId: mongoose.Types.ObjectId,
  year: number,
  month: number
) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return this.find({
    employee: employeeId,
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ date: 1 });
};

/**
 * Static method: Find today's attendance for all employees
 */
attendanceSchema.statics.findToday = function () {
  const { startOfDay, endOfDay } = getISTDayBoundaries();

  return this.find({
    date: {
      $gte: startOfDay.toJSDate(),
      $lte: endOfDay.toJSDate(),
    },
  })
    .populate('employee', 'firstName lastName employeeId department')
    .sort({ checkIn: -1 });
};

/**
 * Static method: Find pending checkouts (checked in but not checked out)
 */
attendanceSchema.statics.findPendingCheckouts = function (date?: Date) {
  const { startOfDay, endOfDay } = getISTDayBoundaries(date);

  return this.find({
    date: {
      $gte: startOfDay.toJSDate(),
      $lte: endOfDay.toJSDate(),
    },
    checkIn: { $ne: null },
    checkOut: null,
  }).populate('employee', 'firstName lastName employeeId');
};

/**
 * Instance method: Mark as checked out
 */
attendanceSchema.methods.markCheckout = function (
  this: IAttendance,
  checkoutTime: Date,
  location?: ILocation
) {
  this.checkOut = checkoutTime;
  if (location) {
    this.checkoutLocation = location;
  }
  return this.save();
};

/**
 * Instance method: Update status
 */
attendanceSchema.methods.updateStatus = function (
  this: IAttendance,
  status: AttendanceStatus,
  reason?: string
) {
  this.status = status;
  if (reason) {
    this.reason = reason;
  }
  return this.save();
};

// Extend IAttendance interface with custom properties and methods
declare module '../types/index.js' {
  interface IAttendance {
    isLate: boolean;
    isFullDay: boolean;
    markCheckout(checkoutTime: Date, location?: ILocation): Promise<IAttendance>;
    updateStatus(status: AttendanceStatus, reason?: string): Promise<IAttendance>;
  }
}

// Extend model with static methods
interface IAttendanceModel extends Model<IAttendance> {
  findByDateRange(startDate: Date, endDate: Date): Promise<IAttendance[]>;
  findByEmployeeMonth(
    employeeId: mongoose.Types.ObjectId,
    year: number,
    month: number
  ): Promise<IAttendance[]>;
  findToday(): Promise<IAttendance[]>;
  findPendingCheckouts(date?: Date): Promise<IAttendance[]>;
}

const Attendance = mongoose.model<IAttendance, IAttendanceModel>('Attendance', attendanceSchema);

export default Attendance;
