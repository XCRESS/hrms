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
      enum: ["full-day", "half-day", "sick-leave", "vacation", "personal"],
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

const Leave = mongoose.model("Leave", leaveSchema);

export default Leave; 