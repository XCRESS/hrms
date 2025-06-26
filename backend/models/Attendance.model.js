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
    required: function() {
      return this.status !== 'absent';
    }
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

// Calculate work hours and auto-detect status
attendanceSchema.pre('save', async function(next) {
  try {
    // Calculate work hours when checking out
    if (this.checkIn && this.checkOut) {
      const checkInTime = new Date(this.checkIn).getTime();
      const checkOutTime = new Date(this.checkOut).getTime();
      const milliseconds = checkOutTime - checkInTime;
      this.workHours = parseFloat((milliseconds / (1000 * 60 * 60)).toFixed(2));
      
      // Set status based on work hours if not manually set to specific statuses
      if (this.workHours < 4 && !['late', 'leave'].includes(this.status)) {
        this.status = 'half-day';
      }
    }
    
    // Auto-detect late status based on check-in time (after 9:55 AM)
    if (this.checkIn && this.status === 'present') {
      const checkInDate = new Date(this.checkIn);
      const checkInHour = checkInDate.getHours();
      const checkInMinutes = checkInDate.getMinutes();
      const checkInDecimal = checkInHour + (checkInMinutes / 60);
      
      // Mark as late if check-in is after 9:55 AM (9.9167 hours)
      if (checkInDecimal > 9.9167) {
        this.status = 'late';
      }
    }
    
    // Check for approved leave - this would need to be done at the controller level
    // since we need access to the Leave model
    
    next();
  } catch (error) {
    next(error);
  }
});

// Prevent duplicate attendance records per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;