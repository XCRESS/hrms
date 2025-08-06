import express from 'express';
import hrTaskReportsController from '../controllers/hr-task-reports.controller.js';
import authMiddleware from '../middlewares/auth.middlewares.js';

/**
 * HR Task Reports API Routes
 * Unified REST API for task analytics and insights
 */

const router = express.Router();

// Apply HR/Admin authentication to all routes
router.use(authMiddleware(['admin', 'hr']));

// Main HR Task Reports Endpoints
router.get('/task-reports', hrTaskReportsController.handleTaskReportsRequest);
router.post('/task-reports', hrTaskReportsController.handleTaskReportsRequest);
router.put('/task-reports', hrTaskReportsController.handleTaskReportsRequest);

// Health Check
router.get('/task-reports/health', (req, res) => {
  res.json({
    success: true,
    message: 'HR Task Reports API is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: {
      taskAnalytics: 'enabled',
      productivityInsights: 'enabled',
      aiRecommendations: 'enabled'
    }
  });
});

export default router;