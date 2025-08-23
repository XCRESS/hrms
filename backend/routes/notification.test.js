import express from "express";
import authMiddleware from "../middlewares/auth.middlewares.js";
import NotificationService from "../services/notificationService.js";
import SchedulerService from "../services/schedulerService.js";

const router = express.Router();

// Test notification system - Admin/HR only
router.post('/test', authMiddleware(['admin', 'hr']), async (req, res) => {
  try {
    const { type } = req.body;
    
    console.log('Testing notification system...');
    
    // Check notification service status first
    const status = NotificationService.getStatus();
    
    switch (type) {
      case 'hr':
        await NotificationService.notifyHR('leave_request', {
          employee: 'Test Employee',
          employeeId: 'TEST001',
          type: 'full-day',
          date: new Date().toDateString(),
          reason: 'Test notification from HRMS system - Generic greeting from admin'
        });
        break;
        
      case 'all':
        await NotificationService.notifyAllEmployees('holiday_reminder', {
          title: 'Test Holiday',
          date: new Date().toDateString()
        });
        break;
        
      case 'milestone':
        await SchedulerService.triggerMilestoneCheck();
        break;
        
      case 'holiday':
        await SchedulerService.triggerHolidayReminder();
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid test type. Use: hr, all, milestone, or holiday'
        });
    }
    
    res.json({
      success: true,
      message: `Notification test (${type}) completed successfully`,
      serviceStatus: status,
      details: {
        emailReady: status.emailReady,
        whatsappReady: status.whatsappReady,
        pushReady: status.pushReady
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Notification test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Notification test failed',
      error: error.message
    });
  }
});

// Get notification system status - Admin/HR only
router.get('/status', authMiddleware(['admin', 'hr']), async (req, res) => {
  try {
    const notificationStatus = NotificationService.getStatus();
    const schedulerStatus = SchedulerService.getStatus();
    
    res.json({
      success: true,
      status: {
        notification: notificationStatus,
        scheduler: schedulerStatus
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Failed to get notification status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification status',
      error: error.message
    });
  }
});

export default router;