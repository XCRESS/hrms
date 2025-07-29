import mongoose from "mongoose";

const regularizationSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  requestedCheckIn: { type: Date },
  requestedCheckOut: { type: Date },
  reason: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewComment: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Performance indexes for common queries
regularizationSchema.index({ employeeId: 1, status: 1 }); // Employee regularization queries
regularizationSchema.index({ status: 1, date: 1 }); // Status-based queries with date sorting
regularizationSchema.index({ employeeId: 1, date: 1 }); // Employee + date lookup
regularizationSchema.index({ date: 1 }); // Date range queries

export default mongoose.model("RegularizationRequest", regularizationSchema); 