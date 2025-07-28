/**
 * PWA Notification Service
 * Handles sending notifications through service worker and managing notification permissions
 */

class NotificationService {
  constructor() {
    this.registration = null;
    this.initialize();
  }

  async initialize() {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.ready;
        console.log('Notification service initialized');
      } catch (error) {
        console.error('Failed to initialize notification service:', error);
      }
    }
  }

  /**
   * Check if notifications are supported and permission is granted
   */
  isNotificationSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Get current notification permission status
   */
  getPermissionStatus() {
    if (!this.isNotificationSupported()) return 'unsupported';
    return Notification.permission;
  }

  /**
   * Request notification permission from user
   */
  async requestPermission() {
    if (!this.isNotificationSupported()) {
      return 'unsupported';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    const permission = await Notification.requestPermission();
    localStorage.setItem('notificationPermission', permission);
    return permission;
  }

  /**
   * Send a PWA notification through service worker
   */
  async sendNotification(title, options = {}) {
    if (!this.registration) {
      await this.initialize();
    }

    if (!this.registration) {
      console.error('Service worker not available');
      return false;
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    try {
      // Send message to service worker to show notification
      this.registration.active?.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        body: options.body || '',
        data: options.data || {}
      });

      console.log('Notification sent:', title);
      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  }

  /**
   * Send announcement notification
   */
  async sendAnnouncementNotification(announcement) {
    const title = `📢 New Announcement: ${announcement.title}`;
    const body = announcement.content.length > 100 
      ? announcement.content.substring(0, 100) + '...' 
      : announcement.content;

    return this.sendNotification(title, {
      body,
      data: {
        type: 'announcement',
        id: announcement._id,
        url: '/announcements'
      }
    });
  }

  /**
   * Send holiday notification
   */
  async sendHolidayNotification(holiday) {
    const title = `🎉 Holiday Update: ${holiday.title}`;
    const body = `${holiday.description || 'New holiday has been added'}`;

    return this.sendNotification(title, {
      body,
      data: {
        type: 'holiday',
        id: holiday._id,
        url: '/holidays'
      }
    });
  }

  /**
   * Send general system notification
   */
  async sendSystemNotification(title, message, url = '/dashboard') {
    return this.sendNotification(`HRMS: ${title}`, {
      body: message,
      data: {
        type: 'system',
        url
      }
    });
  }

  /**
   * Send check-in reminder (handled by service worker scheduling)
   */
  async sendCheckinReminder() {
    // This is primarily handled by the service worker's scheduled reminders
    // but can be triggered manually if needed
    return this.sendNotification('🕘 Check-in Reminder', {
      body: "Don't forget to check in for work today!",
      data: {
        type: 'checkin',
        url: '/dashboard'
      }
    });
  }

  /**
   * Test notification function
   */
  async testNotification() {
    return this.sendNotification('Test Notification', {
      body: 'This is a test notification from HRMS PWA',
      data: {
        type: 'test',
        url: '/dashboard'
      }
    });
  }

  /**
   * Clear all notifications (if needed)
   */
  async clearNotifications() {
    if (this.registration) {
      const notifications = await this.registration.getNotifications();
      notifications.forEach(notification => notification.close());
    }
  }

  /**
   * Subscribe to push notifications (for future implementation with backend push service)
   */
  async subscribeToPush(vapidPublicKey = null) {
    if (!this.registration) {
      await this.initialize();
    }

    try {
      // Check if already subscribed
      const existingSubscription = await this.registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('Already subscribed to push notifications');
        return existingSubscription;
      }

      const subscriptionOptions = {
        userVisibleOnly: true
      };

      // Add VAPID key if provided
      if (vapidPublicKey) {
        subscriptionOptions.applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);
      }

      const subscription = await this.registration.pushManager.subscribe(subscriptionOptions);
      
      console.log('Push subscription created:', subscription);
      
      // Send subscription to backend (when implemented)
      // await this.sendSubscriptionToBackend(subscription);
      
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  /**
   * Convert VAPID key from base64 to Uint8Array
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush() {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        console.log('Unsubscribed from push notifications');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;

// Named exports for convenience
export const {
  sendNotification,
  sendAnnouncementNotification,
  sendHolidayNotification,
  sendSystemNotification,
  sendCheckinReminder,
  testNotification,
  requestPermission,
  getPermissionStatus,
  isNotificationSupported,
  subscribeToPush,
  unsubscribeFromPush,
  clearNotifications
} = notificationService;