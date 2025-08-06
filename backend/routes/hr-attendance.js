import express from 'express';
import hrAttendanceController from '../controllers/hr-attendance.controller.js';
import authMiddleware from '../middlewares/auth.middlewares.js';

/**
 * HR Attendance API Routes
 * Unified REST API for HR operations
 */

const router = express.Router();

// Apply HR/Admin authentication to all routes
router.use(authMiddleware(['admin', 'hr']));

// Main HR Attendance Endpoints
router.get('/attendance', hrAttendanceController.handleAttendanceRequest);
router.post('/attendance', hrAttendanceController.handleAttendanceRequest);
router.put('/attendance', hrAttendanceController.handleAttendanceRequest);

// Health Check
router.get('/attendance/health', (req, res) => {
  res.json({
    success: true,
    message: 'HR Attendance API is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;