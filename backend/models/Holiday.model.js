import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true, unique: true },
  isOptional: { type: Boolean, default: false },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Performance indexes for date range queries
holidaySchema.index({ date: 1, isOptional: 1 }); // Date-based queries with optional filter

const Holiday = mongoose.model("Holiday", holidaySchema);
export default Holiday;