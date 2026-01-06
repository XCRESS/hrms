import express, { type Router, type Response } from "express";
import authMiddleware from "../middlewares/auth.middlewares.js";
import NotificationService from "../services/notificationService.js";
import SchedulerService from "../services/schedulerService.js";
import PushService from "../services/pushService.js";
import type { IAuthRequest } from "../types/index.js";
import logger from "../utils/logger.js";

const router: Router = express.Router();

// Test notification system - Admin/HR only
router.post('/test', authMiddleware(['admin', 'hr']), async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.body as { type?: string };

    logger.info('Testing notification system...');

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
        res.status(400).json({
          success: false,
          message: 'Invalid test type. Use: hr, all, milestone, or holiday'
        });
        return;
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
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Notification test failed');
    res.status(500).json({
      success: false,
      message: 'Notification test failed',
      error: err.message
    });
  }
});

// Get notification system status - Admin/HR only
router.get('/status', authMiddleware(['admin', 'hr']), async (req: IAuthRequest, res: Response) => {
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
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Failed to get notification status');
    res.status(500).json({
      success: false,
      message: 'Failed to get notification status',
      error: err.message
    });
  }
});

// Subscribe to push notifications
router.post('/subscribe', authMiddleware(['admin', 'hr', 'employee']), async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { subscription } = req.body as { subscription?: { endpoint: string; keys: { p256dh: string; auth: string } } };
    const userId = req.user?.id;

    if (!subscription || !subscription.endpoint) {
      res.status(400).json({
        success: false,
        message: 'Invalid subscription data'
      });
      return;
    }

    PushService.addSubscription(userId, subscription);

    res.json({
      success: true,
      message: 'Push notification subscription successful',
      userId
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Push subscription failed');
    res.status(500).json({
      success: false,
      message: 'Push subscription failed',
      error: err.message
    });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', authMiddleware(['admin', 'hr', 'employee']), async (req: IAuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    PushService.removeSubscription(userId);
    
    res.json({
      success: true,
      message: 'Push notification unsubscription successful',
      userId
    });
    
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Push unsubscription failed');
    res.status(500).json({
      success: false,
      message: 'Push unsubscription failed',
      error: err.message
    });
  }
});

// Get VAPID public key for frontend
router.get('/vapid-key', async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const vapidKey = process.env.VAPID_PUBLIC_KEY;

    if (!vapidKey) {
      res.status(500).json({
        success: false,
        message: 'VAPID key not configured'
      });
      return;
    }

    res.json({
      success: true,
      vapidKey
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Failed to get VAPID key');
    res.status(500).json({
      success: false,
      message: 'Failed to get VAPID key',
      error: err.message
    });
  }
});

export default router;