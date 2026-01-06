import type { Request, Response } from 'express';
import PasswordResetRequest from '../models/PasswordResetRequest.model.js';
import User from '../models/User.model.js';
import bcrypt from 'bcryptjs';
import { formatResponse } from '../utils/response.js';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

// @desc    Create a new password reset request
// @route   POST /api/password-reset/request
// @access  Public
export const createPasswordResetRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, newPassword } = req.body;

    if (!name || !email || !newPassword) {
      res.status(400).json(formatResponse(false, 'Please provide name, email, and new password.'));
      return;
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json(formatResponse(false, 'No user found with this email address.'));
      return;
    }

    // Check if there's already a pending request for this user
    const existingRequest = await PasswordResetRequest.findOne({
      email,
      status: 'pending',
    });

    if (existingRequest) {
      res.status(400).json(formatResponse(false, 'A password reset request is already pending for this email.'));
      return;
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const newRequest = new PasswordResetRequest({
      name,
      email,
      newPassword: hashedPassword,
      userId: user._id,
    });

    await newRequest.save();

    res.status(201).json(formatResponse(true, 'Password reset request submitted successfully. It will be reviewed by an administrator.'));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error creating password reset request');
    res.status(500).json(formatResponse(false, 'Server error while creating request.', null, { error: err.message }));
  }
};

export const approvePasswordResetRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const requestId = req.params.id;
    const request = await PasswordResetRequest.findById(requestId);

    if (!request) {
      res.status(404).json(formatResponse(false, 'Password reset request not found.'));
      return;
    }

    if (request.status !== 'pending') {
      res.status(400).json(formatResponse(false, `Request is already ${request.status}.`));
      return;
    }

    const user = await User.findOne({ email: request.email });
    if (!user) {
      await PasswordResetRequest.findByIdAndUpdate(requestId, {
        status: 'rejected',
        remarks: 'User not found with this email.',
      });
      res.status(404).json(formatResponse(false, 'User associated with this request not found. Request rejected.'));
      return;
    }

    // Update user's password
    user.password = request.newPassword;
    await user.save();

    // Update request status
    request.status = 'approved';
    await request.save();

    // Send email notification
    try {
      const subject = '✅ Password Changed Successfully';
      const htmlContent = emailService.getBaseEmailTemplate(`
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 700;">Password Changed</h2>
          <p style="color: #64748b; margin: 5px 0 0 0; font-size: 16px;">Your password has been successfully changed.</p>
        </div>
        <div style="text-align: left;">
          <p style="color: #475569; font-size: 16px; margin-bottom: 20px;">Hi ${user.name},</p>
          <p style="color: #475569; font-size: 16px; margin-bottom: 25px;">
            Your password has been successfully changed as per your request. You can now log in with your new password.
          </p>
        </div>
      `);
      await emailService.send(user.email, subject, htmlContent);
    } catch (emailError) {
      const err = emailError instanceof Error ? emailError : new Error('Unknown email error');
      logger.error({ err }, 'Error sending password change confirmation email');
    }

    res.status(200).json(formatResponse(true, 'Password reset request approved and password updated.'));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error approving password reset request');
    res.status(500).json(formatResponse(false, 'Server error while approving request.', null, { error: err.message }));
  }
};

// @desc    Get all password reset requests (or filter by status)
// @route   GET /api/password-reset/requests
// @access  Private (Admin/HR)
export const getAllPasswordResetRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    // HR/Admin might want to filter by status, e.g., only "pending"
    const query = req.query.status ? { status: req.query.status as string } : {};
    const requests = await PasswordResetRequest.find(query).sort({ createdAt: -1 }); // Newest first

    res.status(200).json(
      formatResponse(true, 'Password reset requests fetched successfully.', {
        count: requests.length,
        requests,
      })
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error fetching password reset requests');
    res.status(500).json(formatResponse(false, 'Server error while fetching requests.', null, { error: err.message }));
  }
};

// @desc    Reject a password reset request
// @route   PUT /api/password-reset/request/:id/reject
// @access  Private (Admin/HR)
export const rejectPasswordResetRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const requestId = req.params.id;
    const { remarks } = req.body; // Optional remarks from admin

    const request = await PasswordResetRequest.findByIdAndUpdate(
      requestId,
      { status: 'rejected', remarks: remarks || 'Rejected by administrator.' },
      { new: true } // Returns the updated document
    );

    if (!request) {
      res.status(404).json(formatResponse(false, 'Password reset request not found.'));
      return;
    }

    res.status(200).json(formatResponse(true, 'Password reset request rejected.', { request }));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error rejecting password reset request');
    res.status(500).json(formatResponse(false, 'Server error while rejecting request.', null, { error: err.message }));
  }
};
