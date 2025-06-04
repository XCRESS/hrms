import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true, unique: true },
  isOptional: { type: Boolean, default: false },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const Holiday = mongoose.model("Holiday", holidaySchema);
export default Holiday;