import express from "express";
import {
  createPasswordResetRequest,
  getAllPasswordResetRequests,
  approvePasswordResetRequest,
  rejectPasswordResetRequest,
  resetPassword,
} from "../controllers/passwordReset.controllers.js";
import authMiddleware from "../middlewares/auth.middlewares.js";

const router = express.Router();

// @route   POST /api/password-reset/request
// @desc    User submits a password reset request
// @access  Public
router.post("/request", createPasswordResetRequest);

// @route   GET /api/password-reset/requests
// @desc    Admin/HR gets all password reset requests (can filter by status e.g., ?status=pending)
// @access  Private (Admin, HR)
router.get("/requests", authMiddleware(["admin", "hr"]), getAllPasswordResetRequests);

// @route   PUT /api/password-reset/request/:id/approve
// @desc    Admin/HR approves a password reset request
// @access  Private (Admin, HR)
router.put("/request/:id/approve", authMiddleware(["admin", "hr"]), approvePasswordResetRequest);

// @route   PUT /api/password-reset/request/:id/reject
// @desc    Admin/HR rejects a password reset request
// @access  Private (Admin, HR)
router.put("/request/:id/reject", authMiddleware(["admin", "hr"]), rejectPasswordResetRequest);

// @route   POST /api/password-reset/reset
// @desc    User resets password using approved token
// @access  Public
router.post("/reset", resetPassword);

export default router; 