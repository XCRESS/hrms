import PasswordResetRequest from "../models/PasswordResetRequest.model.js";
import User from "../models/User.model.js";
import bcrypt from "bcryptjs";

// @desc    Create a new password reset request
// @route   POST /api/password-reset/request
// @access  Public
export const createPasswordResetRequest = async (req, res) => {
  try {
    const { name, email, newPassword } = req.body;

    if (!name || !email || !newPassword) {
      return res.status(400).json({ success: false, message: "Please provide name, email, and new password." });
    }

    // Optional: Check if user exists
    const user = await User.findOne({ email });
    // We create the request regardless, but knowing if a user exists can be useful.
    // The admin will ultimately verify.

    const newRequest = new PasswordResetRequest({
      name,
      email,
      newPassword, // Stored temporarily, will be hashed upon approval before updating User model
      userId: user ? user._id : undefined,
    });

    await newRequest.save();

    res.status(201).json({ 
      success: true, 
      message: "Password reset request submitted successfully. It will be reviewed by an administrator." 
    });
  } catch (error) {
    console.error("Error creating password reset request:", error);
    res.status(500).json({ success: false, message: "Server error while creating request.", error: error.message });
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

    res.status(200).json({ success: true, count: requests.length, requests });
  } catch (error) {
    console.error("Error fetching password reset requests:", error);
    res.status(500).json({ success: false, message: "Server error while fetching requests.", error: error.message });
  }
};

// @desc    Approve a password reset request
// @route   PUT /api/password-reset/request/:id/approve
// @access  Private (Admin/HR)
export const approvePasswordResetRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const request = await PasswordResetRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ success: false, message: "Password reset request not found." });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ success: false, message: `Request is already ${request.status}.` });
    }

    const user = await User.findOne({ email: request.email });
    if (!user) {
      // If user not found, admin might need to handle this case (e.g., reject or investigate)
      // For now, we'll mark as error and prevent password update
      await PasswordResetRequest.findByIdAndUpdate(requestId, { status: "rejected", remarks: "User not found with this email." });
      return res.status(404).json({ success: false, message: "User associated with this request not found. Request rejected." });
    }

    // Hash the new password before saving
    const hashedPassword = await bcrypt.hash(request.newPassword, 10);
    user.password = hashedPassword;
    // Clear any existing token-based reset fields if they were used previously
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();

    request.status = "approved";
    await request.save();

    res.status(200).json({ success: true, message: "Password reset request approved and password updated." });
  } catch (error) {
    console.error("Error approving password reset request:", error);
    // If something fails, try to set the request back to pending or log details
    // For now, just a generic server error
    res.status(500).json({ success: false, message: "Server error while approving request.", error: error.message });
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
      return res.status(404).json({ success: false, message: "Password reset request not found." });
    }

    res.status(200).json({ success: true, message: "Password reset request rejected.", request });
  } catch (error) {
    console.error("Error rejecting password reset request:", error);
    res.status(500).json({ success: false, message: "Server error while rejecting request.", error: error.message });
  }
}; 