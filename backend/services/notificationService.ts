import Settings from '../models/Settings.model.js';
import Employee from '../models/Employee.model.js';
import User from '../models/User.model.js';
import EmailService from './emailService.js';
import PushService from './pushService.js';
import logger from '../utils/logger.js';

interface NotificationStatus {
  initialized: boolean;
  emailReady: boolean;
  pushReady: boolean;
}

interface NotificationData {
  [key: string]: unknown;
}

class NotificationService {
  private initialized: boolean;

  constructor() {
    this.initialized = false;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logger.info('Initializing notification services...');

      await EmailService.initialize();
      PushService.initialize();

      this.initialized = true;
      logger.info('Notification service initialized successfully');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.warn({ err }, 'Notification service initialization warning');
      this.initialized = true;
    }
  }

  async notifyHR(type: string, data: NotificationData): Promise<void> {
    try {
      const settings = await Settings.getGlobalSettings();
      const { hrEmails, hrEmailTypes } = settings.notifications;

      if (hrEmails.length === 0) {
        logger.info('No HR contacts configured for notifications');
        return;
      }

      const emailTypeMap: Record<string, string> = {
        'leave_request': 'leaveRequests',
        'wfh_request': 'wfhRequests',
        'regularization_request': 'regularizationRequests',
        'help_request': 'helpRequests',
        'employee_milestone': 'employeeMilestones',
        'expense_request': 'expenseRequests'
      };

      const emailTypeKey = emailTypeMap[type];
      const shouldSendEmail = emailTypeKey && hrEmailTypes
        ? (hrEmailTypes[emailTypeKey as keyof typeof hrEmailTypes] ?? true)
        : true;

      const promises: Promise<void>[] = [];

      if (settings.notifications.emailEnabled && hrEmails.length > 0 && shouldSendEmail) {
        promises.push(
          EmailService.sendNotification(type, data, hrEmails)
            .then(() => undefined)
            .catch((error: unknown) => {
              const err = error instanceof Error ? error : new Error('Unknown error');
              logger.error({ err }, 'Email notification failed');
            })
        );
      } else if (!shouldSendEmail) {
        logger.info(`HR email notifications disabled for type: ${type}`);
      }

      if (settings.notifications.pushEnabled) {
        const hrSubscriptions = await PushService.getHRSubscriptions();
        if (hrSubscriptions.length > 0) {
          promises.push(
            PushService.sendNotification(type, data, hrSubscriptions)
              .catch((error: unknown) => {
                const err = error instanceof Error ? error : new Error('Unknown error');
                logger.error({ err }, 'Push notification failed');
              })
          );
        }
      }

      await Promise.allSettled(promises);
      logger.info(`HR notification sent: ${type}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error({ err }, 'Failed to notify HR');
    }
  }

  async notifyAllEmployees(type: string, data: NotificationData): Promise<void> {
    try {
      const settings = await Settings.getGlobalSettings();
      const employees = await Employee.find({ isActive: true });

      if (employees.length === 0) {
        logger.info('No active employees found for notifications');
        return;
      }

      const promises: Promise<void>[] = [];

      if (settings.notifications.emailEnabled) {
        const emailAddresses = employees.map(emp => emp.email).filter((email): email is string => Boolean(email));
        if (emailAddresses.length > 0) {
          promises.push(
            EmailService.sendNotification(type, data, emailAddresses)
              .then(() => undefined)
              .catch((error: unknown) => {
                const err = error instanceof Error ? error : new Error('Unknown error');
                logger.error({ err }, 'Email notification failed');
              })
          );
        }
      }

      if (settings.notifications.pushEnabled) {
        const allSubscriptions = await PushService.getAllSubscriptions();
        if (allSubscriptions.length > 0) {
          promises.push(
            PushService.sendNotification(type, data, allSubscriptions)
              .catch((error: unknown) => {
                const err = error instanceof Error ? error : new Error('Unknown error');
                logger.error({ err }, 'Push notification failed');
              })
          );
        }
      }

      await Promise.allSettled(promises);
      logger.info(`Employee notification sent to ${employees.length} employees: ${type}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error({ err }, 'Failed to notify employees');
    }
  }

  async notifyEmployee(employeeId: string, type: string, data: NotificationData): Promise<void> {
    try {
      const settings = await Settings.getGlobalSettings();
      const employee = await Employee.findOne({ employeeId, isActive: true });

      if (!employee) {
        logger.info(`Employee ${employeeId} not found or inactive`);
        return;
      }

      const promises: Promise<void>[] = [];

      if (settings.notifications.emailEnabled && employee.email) {
        promises.push(
          EmailService.sendNotification(type, data, employee.email)
            .then(() => undefined)
            .catch((error: unknown) => {
              const err = error instanceof Error ? error : new Error('Unknown error');
              logger.error({ err }, 'Email notification failed');
            })
        );
      }

      if (settings.notifications.pushEnabled) {
        // Only this employee's own devices. This used to fan out to every
        // stored subscription, so one person's leave decision would have been
        // pushed to the whole company once delivery actually worked.
        const user = await User.findOne({ employeeId, isActive: true }).select('_id').lean();
        const subscriptions = user
          ? await PushService.getSubscriptionsForUser(user._id.toString())
          : [];

        if (subscriptions.length > 0) {
          promises.push(
            PushService.sendNotification(type, data, subscriptions)
              .catch((error: unknown) => {
                const err = error instanceof Error ? error : new Error('Unknown error');
                logger.error({ err }, 'Push notification failed');
              })
          );
        }
      }

      await Promise.allSettled(promises);
      logger.info(`Employee notification sent to ${employee.firstName} ${employee.lastName}: ${type}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error({ err }, `Failed to notify employee ${employeeId}`);
    }
  }

  async testNotifications(): Promise<void> {
    try {
      const settings = await Settings.getGlobalSettings();

      const testData: NotificationData = {
        employee: 'Test Employee',
        type: 'full-day',
        date: new Date(),
        reason: 'Test notification system'
      };

      logger.info('Testing notification system...');

      if (settings.notifications.hrEmails.length > 0) {
        await this.notifyHR('leave_request', testData);
        logger.info('HR notification test completed');
      }

      const firstEmployee = await Employee.findOne({ isActive: true });
      if (firstEmployee) {
        await this.notifyEmployee(firstEmployee.employeeId, 'holiday_reminder', {
          title: 'Test Holiday',
          date: new Date().toDateString()
        });
        logger.info('Employee notification test completed');
      }

      logger.info('Notification system test completed');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error({ err }, 'Notification system test failed');
    }
  }

  getStatus(): NotificationStatus {
    return {
      initialized: this.initialized,
      emailReady: !!EmailService.transporter,
      pushReady: PushService.initialized
    };
  }
}

export default new NotificationService();
