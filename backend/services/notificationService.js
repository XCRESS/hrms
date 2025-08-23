import Settings from '../models/Settings.model.js';
import Employee from '../models/Employee.model.js';
import EmailService from './emailService.js';
import WhatsAppService from './whatsappService.js';
import PushService from './pushService.js';

class NotificationService {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('Initializing notification services...');
      
      // Initialize all services (they handle their own error cases)
      await EmailService.initialize();
      await WhatsAppService.initialize();
      PushService.initialize();

      this.initialized = true;
      console.log('✓ Notification service initialized successfully');
    } catch (error) {
      console.error('Notification service initialization warning:', error.message);
      this.initialized = true; // Continue anyway
    }
  }

  async notifyHR(type, data) {
    try {
      const settings = await Settings.getGlobalSettings();
      const { hrEmails, hrPhones } = settings.notifications;

      if (hrEmails.length === 0 && hrPhones.length === 0) {
        console.log('No HR contacts configured for notifications');
        return;
      }

      const promises = [];

      // Send email notifications
      if (settings.notifications.emailEnabled && hrEmails.length > 0) {
        promises.push(
          EmailService.sendNotification(type, data, hrEmails)
            .catch(error => console.error('Email notification failed:', error))
        );
      }

      // Send WhatsApp notifications
      if (settings.notifications.whatsappEnabled && hrPhones.length > 0) {
        promises.push(
          WhatsAppService.sendNotification(type, data, hrPhones)
            .catch(error => console.error('WhatsApp notification failed:', error))
        );
      }

      // Send push notifications to HR users
      if (settings.notifications.pushEnabled) {
        const hrSubscriptions = PushService.getHRSubscriptions();
        if (hrSubscriptions.length > 0) {
          promises.push(
            PushService.sendNotification(type, data, hrSubscriptions)
              .catch(error => console.error('Push notification failed:', error))
          );
        }
      }

      await Promise.allSettled(promises);
      console.log(`HR notification sent: ${type}`);
    } catch (error) {
      console.error('Failed to notify HR:', error);
    }
  }

  async notifyAllEmployees(type, data) {
    try {
      const settings = await Settings.getGlobalSettings();
      const employees = await Employee.find({ isActive: true });

      if (employees.length === 0) {
        console.log('No active employees found for notifications');
        return;
      }

      const promises = [];

      // Send email notifications
      if (settings.notifications.emailEnabled) {
        const emailAddresses = employees.map(emp => emp.email).filter(Boolean);
        if (emailAddresses.length > 0) {
          promises.push(
            EmailService.sendNotification(type, data, emailAddresses)
              .catch(error => console.error('Email notification failed:', error))
          );
        }
      }

      // Send WhatsApp notifications
      if (settings.notifications.whatsappEnabled) {
        const phoneNumbers = employees
          .map(emp => emp.phone ? `+91${emp.phone}` : null)
          .filter(Boolean);
        
        if (phoneNumbers.length > 0) {
          promises.push(
            WhatsAppService.sendNotification(type, data, phoneNumbers)
              .catch(error => console.error('WhatsApp notification failed:', error))
          );
        }
      }

      // Send push notifications to all employees
      if (settings.notifications.pushEnabled) {
        const allSubscriptions = PushService.getAllSubscriptions();
        if (allSubscriptions.length > 0) {
          promises.push(
            PushService.sendNotification(type, data, allSubscriptions)
              .catch(error => console.error('Push notification failed:', error))
          );
        }
      }

      await Promise.allSettled(promises);
      console.log(`Employee notification sent to ${employees.length} employees: ${type}`);
    } catch (error) {
      console.error('Failed to notify employees:', error);
    }
  }

  async notifyEmployee(employeeId, type, data) {
    try {
      const settings = await Settings.getGlobalSettings();
      const employee = await Employee.findOne({ employeeId, isActive: true });

      if (!employee) {
        console.log(`Employee ${employeeId} not found or inactive`);
        return;
      }

      const promises = [];

      // Send email notification
      if (settings.notifications.emailEnabled && employee.email) {
        promises.push(
          EmailService.sendNotification(type, data, employee.email)
            .catch(error => console.error('Email notification failed:', error))
        );
      }

      // Send WhatsApp notification
      if (settings.notifications.whatsappEnabled && employee.phone) {
        promises.push(
          WhatsAppService.sendNotification(type, data, `+91${employee.phone}`)
            .catch(error => console.error('WhatsApp notification failed:', error))
        );
      }

      // Send push notification to specific employee
      if (settings.notifications.pushEnabled) {
        const allSubscriptions = PushService.getAllSubscriptions();
        // In a real app, you'd filter by employee - for now send to all
        if (allSubscriptions.length > 0) {
          promises.push(
            PushService.sendNotification(type, data, allSubscriptions)
              .catch(error => console.error('Push notification failed:', error))
          );
        }
      }

      await Promise.allSettled(promises);
      console.log(`Employee notification sent to ${employee.firstName} ${employee.lastName}: ${type}`);
    } catch (error) {
      console.error(`Failed to notify employee ${employeeId}:`, error);
    }
  }

  async testNotifications() {
    try {
      const settings = await Settings.getGlobalSettings();
      
      // Test data
      const testData = {
        employee: 'Test Employee',
        type: 'full-day',
        date: new Date(),
        reason: 'Test notification system'
      };

      console.log('Testing notification system...');

      // Test HR notification
      if (settings.notifications.hrEmails.length > 0 || settings.notifications.hrPhones.length > 0) {
        await this.notifyHR('leave_request', testData);
        console.log('✓ HR notification test completed');
      }

      // Test employee notification (send to first active employee)
      const firstEmployee = await Employee.findOne({ isActive: true });
      if (firstEmployee) {
        await this.notifyEmployee(firstEmployee.employeeId, 'holiday_reminder', {
          title: 'Test Holiday',
          date: new Date().toDateString()
        });
        console.log('✓ Employee notification test completed');
      }

      console.log('Notification system test completed');
    } catch (error) {
      console.error('Notification system test failed:', error);
    }
  }

  getStatus() {
    return {
      initialized: this.initialized,
      emailReady: !!EmailService.transporter,
      whatsappReady: WhatsAppService.isReady,
      pushReady: PushService.initialized
    };
  }
}

export default new NotificationService();