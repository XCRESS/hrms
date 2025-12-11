import mongoose from "mongoose";

const wfhRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    employeeId: {
      type: String,
      required: true,
      trim: true,
    },
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },
    requestDate: {
      type: Date,
      required: true,
    },
    requestedCheckInTime: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    attemptedLocation: {
      latitude: {
        type: Number,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180,
      },
    },
    nearestOffice: {
      type: String,
      trim: true,
    },
    distanceFromOffice: {
      type: Number,
      min: 0,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewComment: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    reviewedAt: {
      type: Date,
    },
    consumedAt: {
      type: Date,
    },
    consumedAttendance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
    },
  },
  { timestamps: true }
);

// Unique compound index to prevent duplicate pending/approved WFH requests for same employee on same date
wfhRequestSchema.index(
  { employee: 1, requestDate: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['pending', 'approved'] }
    },
    name: 'unique_active_wfh_per_employee_per_date'
  }
);

// Query performance indexes
wfhRequestSchema.index({ employee: 1, requestDate: 1 });
wfhRequestSchema.index({ status: 1, requestDate: 1 });
wfhRequestSchema.index({ employeeId: 1, status: 1 });
wfhRequestSchema.index({ consumedAttendance: 1 }); // For reverse lookups

const WFHRequest = mongoose.model("WFHRequest", wfhRequestSchema);

export default WFHRequest;




