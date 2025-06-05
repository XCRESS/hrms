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
      // We can add an index here for faster lookups if needed
      // index: true, 
    },
    // Storing the new password directly in the request is part of the current flow.
    // Ideally, a token-based system would be more secure.
    // The newPassword will be used to update the user's password upon approval.
    newPassword: {
      type: String,
      required: [true, "New password is required"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    // Optional: to link the request to an actual user ID if found.
    // This can be populated when the request is processed.
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }
  },
  { timestamps: true }
);

const PasswordResetRequest = mongoose.model("PasswordResetRequest", passwordResetRequestSchema);
export default PasswordResetRequest; 