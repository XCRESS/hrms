import mongoose from "mongoose";

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
    required: true
  },
  checkOut: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ["present", "absent", "half-day", "late", "leave"],
    required: true
  },
  workHours: {
    type: Number,
    default: 0
  },
  comments: {
    type: String,
    trim: true
  }
}, { timestamps: true });

// Calculate work hours when checking out
attendanceSchema.pre('save', function(next) {
  if (this.checkIn && this.checkOut) {
    const checkInTime = new Date(this.checkIn).getTime();
    const checkOutTime = new Date(this.checkOut).getTime();
    const milliseconds = checkOutTime - checkInTime;
    this.workHours = parseFloat((milliseconds / (1000 * 60 * 60)).toFixed(2));
    
    // Set status based on work hours
    if (this.workHours < 4) {
      this.status = 'half-day';
    }
  }
  next();
});

// Prevent duplicate attendance records per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;