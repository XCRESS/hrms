import webpush from 'web-push';
import Settings from '../models/Settings.model.js';

class PushService {
  constructor() {
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;

    // Check if VAPID keys are properly configured
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_EMAIL) {
      console.log('Push service skipped - VAPID keys not configured');
      console.log('Required: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL');
      console.log('Generate keys with: npx web-push generate-vapid-keys');
      return;
    }

    const vapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY
    };

    webpush.setVapidDetails(
      process.env.VAPID_EMAIL,
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );

    this.initialized = true;
    console.log('Push service initialized successfully');
  }

  async send(subscription, payload) {
    if (!this.initialized) {
      this.initialize();
    }

    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      console.log('Push notification sent successfully');
      return true;
    } catch (error) {
      console.error('Failed to send push notification:', error);
      throw error;
    }
  }

  async sendToMultiple(subscriptions, payload) {
    const promises = subscriptions.map(sub => this.send(sub, payload));
    return Promise.allSettled(promises);
  }

  async sendNotification(type, data, subscriptions) {
    const settings = await Settings.getGlobalSettings();
    if (!settings.notifications.pushEnabled) {
      console.log('Push notifications are disabled');
      return;
    }

    const payload = this.getTemplate(type, data);
    
    if (Array.isArray(subscriptions)) {
      return this.sendToMultiple(subscriptions, payload);
    } else {
      return this.send(subscriptions, payload);
    }
  }

  getTemplate(type, data) {
    const templates = {
      leave_request: {
        title: 'New Leave Request',
        body: `${data.employee} has requested ${data.type} leave`,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: { type: 'leave_request', url: '/hr/leaves' }
      },
      help_request: {
        title: 'New Help Request',
        body: `${data.employee} needs help with ${data.subject}`,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: { type: 'help_request', url: '/hr/help' }
      },
      regularization_request: {
        title: 'New Regularization Request',
        body: `${data.employee} has requested attendance regularization`,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: { type: 'regularization_request', url: '/hr/regularization' }
      },
      holiday_reminder: {
        title: 'Holiday Reminder',
        body: `${data.title} is coming up on ${data.date}`,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: { type: 'holiday_reminder', url: '/dashboard' }
      },
      announcement: {
        title: 'New Announcement',
        body: data.title,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: { type: 'announcement', url: '/announcements' }
      },
      employee_milestone: {
        title: 'Employee Milestone',
        body: `${data.employee} has completed ${data.milestone}`,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: { type: 'employee_milestone', url: '/hr/employees' }
      }
    };

    return templates[type] || {
      title: 'HRMS Notification',
      body: 'You have a new notification',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png'
    };
  }
}

export default new PushService();