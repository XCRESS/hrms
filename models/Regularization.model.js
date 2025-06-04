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

export default mongoose.model("RegularizationRequest", regularizationSchema); 