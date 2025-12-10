import mongoose from "mongoose";
import { calculateWorkHours } from "../utils/timezoneUtils.js";

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  checkIn: {
    type: Date,
    required: function () {
      return this.status !== 'absent';
    },
    default: null
  },
  checkOut: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ["present", "absent", "half-day"],
    required: true
  },
  workHours: {
    type: Number,
    default: 0
  },
  comments: {
    type: String,
    trim: true
  },
  reason: {
    type: String,
    trim: true
  },
  location: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    },
    accuracy: {
      type: Number,
      min: 0
    },
    capturedAt: {
      type: Date,
      default: Date.now
    }
  },
  geofence: {
    enforced: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['onsite', 'wfh'],
    },
    office: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OfficeLocation"
    },
    officeName: {
      type: String,
      trim: true,
      maxlength: 120
    },
    distance: Number,
    radius: Number,
    validatedAt: Date,
    wfhRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WFHRequest"
    },
    notes: String
  },
  checkoutLocation: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    },
    accuracy: {
      type: Number,
      min: 0
    },
    capturedAt: Date
  }
}, { timestamps: true });

// Calculate work hours only - business logic moved to service layer
attendanceSchema.pre('save', async function (next) {
  try {
    // Use IST-aware work hours calculation instead of basic math
    if (this.checkIn && this.checkOut) {
      this.workHours = calculateWorkHours(this.checkIn, this.checkOut);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Prevent duplicate attendance records per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

// Performance indexes for common queries
attendanceSchema.index({ date: 1, status: 1 }); // Admin queries with date range and status filter
attendanceSchema.index({ employee: 1, date: -1 }); // Employee attendance history (recent first)
attendanceSchema.index({ date: 1 }); // Date range queries
attendanceSchema.index({ status: 1, date: 1 }); // Status-based queries with date sorting
attendanceSchema.index({
  employee: 1,
  date: 1,
  checkIn: 1,
  checkOut: 1
}); // Missing checkout queries

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;