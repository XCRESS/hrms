import mongoose from "mongoose";

const passwordResetRequestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      index: true,
    },
    // Secure token-based system instead of storing plain text passwords
    resetToken: {
      type: String,
      required: [true, "Reset token is required"],
      unique: true,
    },
    resetTokenExpires: {
      type: Date,
      required: [true, "Reset token expiry is required"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired", "completed"],
      default: "pending",
    },
    // Link to actual user ID
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Optional remarks from admin
    remarks: {
      type: String,
    }
  },
  { timestamps: true }
);

const PasswordResetRequest = mongoose.model("PasswordResetRequest", passwordResetRequestSchema);
export default PasswordResetRequest; 