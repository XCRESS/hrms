import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  name: String,
  date: { type: Date, required: true },
  status: {
    type: String,
    enum: ["present", "absent", "half-day"],
    default: "absent",
    required: true,
    },
  checkIn: { type: Date },
  checkOut: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Prevent duplicate attendance records per employee per day
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;