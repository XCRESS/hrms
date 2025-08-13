import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      ref: "Employee",
      required: true,
    },
    leaveType: {
      type: String,
      enum: ["full-day", "half-day"],
      required: true,
    },
    leaveDate: {
      type: Date,
      required: true,
    },
    leaveReason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }
  },
  { timestamps: true }
);

// Performance indexes for common queries
leaveSchema.index({ employeeId: 1, status: 1 }); // Employee leave queries with status filter
leaveSchema.index({ status: 1, leaveDate: 1 }); // Status-based queries with date sorting
leaveSchema.index({ leaveDate: 1, status: 1 }); // Date range queries for approved leaves
leaveSchema.index({ employeeId: 1, leaveDate: -1 }); // Employee leave history

const Leave = mongoose.model("Leave", leaveSchema);

export default Leave; 