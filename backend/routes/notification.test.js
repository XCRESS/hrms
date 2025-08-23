import express from "express";
import authMiddleware from "../middlewares/auth.middlewares.js";
import NotificationService from "../services/notificationService.js";
import SchedulerService from "../services/schedulerService.js";
import PushService from "../services/pushService.js";

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

// Subscribe to push notifications
router.post('/subscribe', authMiddleware(['admin', 'hr', 'employee']), async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user.id;
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription data'
      });
    }
    
    PushService.addSubscription(userId, subscription);
    
    res.json({
      success: true,
      message: 'Push notification subscription successful',
      userId
    });
    
  } catch (error) {
    console.error('Push subscription failed:', error);
    res.status(500).json({
      success: false,
      message: 'Push subscription failed',
      error: error.message
    });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', authMiddleware(['admin', 'hr', 'employee']), async (req, res) => {
  try {
    const userId = req.user.id;
    
    PushService.removeSubscription(userId);
    
    res.json({
      success: true,
      message: 'Push notification unsubscription successful',
      userId
    });
    
  } catch (error) {
    console.error('Push unsubscription failed:', error);
    res.status(500).json({
      success: false,
      message: 'Push unsubscription failed',
      error: error.message
    });
  }
});

// Get VAPID public key for frontend
router.get('/vapid-key', async (req, res) => {
  try {
    const vapidKey = process.env.VAPID_PUBLIC_KEY;
    
    if (!vapidKey) {
      return res.status(500).json({
        success: false,
        message: 'VAPID key not configured'
      });
    }
    
    res.json({
      success: true,
      vapidKey
    });
    
  } catch (error) {
    console.error('Failed to get VAPID key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get VAPID key',
      error: error.message
    });
  }
});

export default router;