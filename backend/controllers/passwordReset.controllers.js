import PasswordResetRequest from "../models/PasswordResetRequest.model.js";
import User from "../models/User.model.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { formatResponse } from "../utils/response.js";

// @desc    Create a new password reset request
// @route   POST /api/password-reset/request
// @access  Public
export const createPasswordResetRequest = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json(formatResponse(false, "Please provide name and email."));
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json(formatResponse(false, "No user found with this email address."));
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Check if there's already a pending request for this user
    const existingRequest = await PasswordResetRequest.findOne({
      email,
      status: "pending",
      resetTokenExpires: { $gt: new Date() }
    });

    if (existingRequest) {
      return res.status(400).json(formatResponse(false, "A password reset request is already pending for this email."));
    }

    const newRequest = new PasswordResetRequest({
      name,
      email,
      resetToken,
      resetTokenExpires,
      userId: user._id,
    });

    await newRequest.save();

    res.status(201).json(formatResponse(true, "Password reset request submitted successfully. It will be reviewed by an administrator."));
  } catch (error) {
    console.error("Error creating password reset request:", error);
    res.status(500).json(formatResponse(false, "Server error while creating request.", null, { error: error.message }));
  }
};

// @desc    Get all password reset requests (or filter by status)
// @route   GET /api/password-reset/requests
// @access  Private (Admin/HR)
export const getAllPasswordResetRequests = async (req, res) => {
  try {
    // HR/Admin might want to filter by status, e.g., only "pending"
    const query = req.query.status ? { status: req.query.status } : {};
    const requests = await PasswordResetRequest.find(query).sort({ createdAt: -1 }); // Newest first

    res.status(200).json(formatResponse(true, "Password reset requests fetched successfully.", { 
      count: requests.length, 
      requests 
    }));
  } catch (error) {
    console.error("Error fetching password reset requests:", error);
    res.status(500).json(formatResponse(false, "Server error while fetching requests.", null, { error: error.message }));
  }
};

// @desc    Approve a password reset request (generates reset link)
// @route   PUT /api/password-reset/request/:id/approve
// @access  Private (Admin/HR)
export const approvePasswordResetRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const request = await PasswordResetRequest.findById(requestId);

    if (!request) {
      return res.status(404).json(formatResponse(false, "Password reset request not found."));
    }

    if (request.status !== "pending") {
      return res.status(400).json(formatResponse(false, `Request is already ${request.status}.`));
    }

    // Check if token is still valid
    if (request.resetTokenExpires < new Date()) {
      await PasswordResetRequest.findByIdAndUpdate(requestId, { status: "expired" });
      return res.status(400).json(formatResponse(false, "Reset token has expired."));
    }

    const user = await User.findOne({ email: request.email });
    if (!user) {
      await PasswordResetRequest.findByIdAndUpdate(requestId, { 
        status: "rejected", 
        remarks: "User not found with this email." 
      });
      return res.status(404).json(formatResponse(false, "User associated with this request not found. Request rejected."));
    }

    // Approve the request
    request.status = "approved";
    await request.save();

    // Return the reset token for the admin to share with user
    res.status(200).json(formatResponse(true, "Password reset request approved. Share the reset token with the user.", {
      resetToken: request.resetToken,
      expiresAt: request.resetTokenExpires
    }));
  } catch (error) {
    console.error("Error approving password reset request:", error);
    res.status(500).json(formatResponse(false, "Server error while approving request.", null, { error: error.message }));
  }
};

// @desc    Reject a password reset request
// @route   PUT /api/password-reset/request/:id/reject
// @access  Private (Admin/HR)
export const rejectPasswordResetRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const { remarks } = req.body; // Optional remarks from admin

    const request = await PasswordResetRequest.findByIdAndUpdate(
      requestId,
      { status: "rejected", remarks: remarks || "Rejected by administrator." },
      { new: true } // Returns the updated document
    );

    if (!request) {
      return res.status(404).json(formatResponse(false, "Password reset request not found."));
    }

    res.status(200).json(formatResponse(true, "Password reset request rejected.", { request }));
  } catch (error) {
    console.error("Error rejecting password reset request:", error);
    res.status(500).json(formatResponse(false, "Server error while rejecting request.", null, { error: error.message }));
  }
};

// @desc    Reset password using approved token
// @route   POST /api/password-reset/reset
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json(formatResponse(false, "Please provide reset token and new password."));
    }

    // Find the approved reset request
    const request = await PasswordResetRequest.findOne({
      resetToken,
      status: "approved",
      resetTokenExpires: { $gt: new Date() }
    });

    if (!request) {
      return res.status(400).json(formatResponse(false, "Invalid or expired reset token."));
    }

    // Find the user
    const user = await User.findById(request.userId);
    if (!user) {
      return res.status(404).json(formatResponse(false, "User not found."));
    }

    // Hash the new password and update user
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Mark request as used by updating status to completed
    request.status = "completed";
    await request.save();

    res.status(200).json(formatResponse(true, "Password has been reset successfully."));
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json(formatResponse(false, "Server error while resetting password.", null, { error: error.message }));
  }
}; 