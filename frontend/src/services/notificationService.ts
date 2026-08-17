/**
 * PWA Notification Service
 * Handles sending notifications through service worker and managing notification permissions
 */

import { axiosInstance } from '../lib/axios';
import { logger } from '../utils/logger';

export type PermissionStatus = NotificationPermission | 'unsupported';

export interface SendNotificationOptions {
  body?: string;
  data?: Record<string, unknown>;
}

export interface AnnouncementLike {
  _id: string;
  title: string;
  content: string;
}

export interface HolidayLike {
  _id: string;
  title: string;
  description?: string;
}

interface VapidKeyResponse {
  data?: { publicKey?: string };
  vapidKey?: string;
}

class NotificationService {
  private registration: ServiceWorkerRegistration | null = null;
  private vapidKey: string | null = null;
  isSubscribed = false;

  constructor() {
    void this.initialize();
  }

  async initialize(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.ready;
        logger.log('Notification service initialized');

        // Get VAPID key from backend
        await this.loadVapidKey();
      } catch (error) {
        logger.error('Failed to initialize notification service:', error);
      }
    }
  }

  /**
   * Ensure the service worker registration is available.
   */
  private async ensureRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!this.registration) {
      await this.initialize();
    }
    return this.registration;
  }

  /**
   * Load VAPID key from backend
   */
  async loadVapidKey(): Promise<void> {
    try {
      const { data } = await axiosInstance.get<VapidKeyResponse>('/notifications/vapid-key');

      // Handle different response formats - the API returns { success: true, data: { publicKey: "..." } }
      this.vapidKey = data.data?.publicKey || data.vapidKey || null;

      if (this.vapidKey) {
        logger.log('VAPID key loaded successfully');
      } else {
        logger.warn('VAPID key not found in response:', data);
      }
    } catch (error) {
      logger.error('Failed to load VAPID key:', error);
    }
  }

  /**
   * Auto-subscribe user to push notifications (only if permission already granted)
   * This respects user choice and GDPR compliance
   */
  async autoSubscribe(): Promise<boolean> {
    try {
      // IMPORTANT: Only auto-subscribe if user has already granted permission
      if (Notification.permission !== 'granted') {
        logger.log('Skipping auto-subscribe: User has not granted notification permission');
        return false;
      }

      if (!this.vapidKey) {
        await this.loadVapidKey();
      }

      if (!this.vapidKey) {
        logger.warn('Cannot auto-subscribe: VAPID key not available');
        return false;
      }

      // Always refresh subscription to avoid 410 errors
      const subscription = await this.refreshSubscription();
      this.isSubscribed = !!subscription;
      return this.isSubscribed;
    } catch (error) {
      logger.error('Auto-subscribe failed:', error);
      return false;
    }
  }

  /**
   * Refresh push subscription (unsubscribe and resubscribe)
   */
  async refreshSubscription(): Promise<PushSubscription | null> {
    try {
      const registration = await this.ensureRegistration();
      if (!registration) {
        logger.error('Service worker not available');
        return null;
      }

      if (!this.vapidKey) {
        logger.warn('Cannot refresh subscription: VAPID key not available');
        return null;
      }

      // Unsubscribe from any existing subscription
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
        logger.log('Unsubscribed from previous subscription');
      }

      // Create new subscription
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidKey)
      });
      logger.log('New push subscription created:', newSubscription);

      // Send new subscription to backend
      await this.sendSubscriptionToBackend(newSubscription);

      return newSubscription;
    } catch (error) {
      logger.error('Failed to refresh subscription:', error);
      return null;
    }
  }

  /**
   * Check if notifications are supported and permission is granted
   */
  isNotificationSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Get current notification permission status
   */
  getPermissionStatus(): PermissionStatus {
    if (!this.isNotificationSupported()) return 'unsupported';
    return Notification.permission;
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<PermissionStatus> {
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
  async sendNotification(title: string, options: SendNotificationOptions = {}): Promise<boolean> {
    const registration = await this.ensureRegistration();

    if (!registration) {
      logger.error('Service worker not available');
      return false;
    }

    if (Notification.permission !== 'granted') {
      logger.warn('Notification permission not granted');
      return false;
    }

    try {
      // Send message to service worker to show notification
      registration.active?.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        body: options.body || '',
        data: options.data || {}
      });

      logger.log('Notification sent:', title);
      return true;
    } catch (error) {
      logger.error('Failed to send notification:', error);
      return false;
    }
  }

  /**
   * Send announcement notification
   */
  async sendAnnouncementNotification(announcement: AnnouncementLike): Promise<boolean> {
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
  async sendHolidayNotification(holiday: HolidayLike): Promise<boolean> {
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
  async sendSystemNotification(
    title: string,
    message: string,
    url: string = '/dashboard'
  ): Promise<boolean> {
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
  async sendCheckinReminder(): Promise<boolean> {
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
  async testNotification(): Promise<boolean> {
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
  async clearNotifications(): Promise<void> {
    if (this.registration) {
      const notifications = await this.registration.getNotifications();
      notifications.forEach((notification) => notification.close());
    }
  }

  /**
   * Subscribe to push notifications and send to backend
   */
  async subscribeToPush(vapidPublicKey: string | null = null): Promise<PushSubscription | null> {
    const registration = await this.ensureRegistration();
    if (!registration) {
      logger.error('Service worker not available');
      return null;
    }

    try {
      // Request permission first
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        logger.warn('Notification permission not granted');
        return null;
      }

      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        logger.log('Already subscribed to push notifications');
        // Send existing subscription to backend
        await this.sendSubscriptionToBackend(existingSubscription);
        return existingSubscription;
      }

      const subscriptionOptions: PushSubscriptionOptionsInit = {
        userVisibleOnly: true
      };

      // Add VAPID key if provided
      if (vapidPublicKey) {
        subscriptionOptions.applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);
      }

      const subscription = await registration.pushManager.subscribe(subscriptionOptions);

      logger.log('Push subscription created:', subscription);

      // Send subscription to backend
      await this.sendSubscriptionToBackend(subscription);

      return subscription;
    } catch (error) {
      logger.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  /**
   * Send subscription to backend
   */
  async sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
    try {
      await axiosInstance.post('/notifications/subscribe', subscription);
      logger.log('Subscription sent to backend successfully');
    } catch (error) {
      logger.error('Failed to send subscription to backend:', error);
    }
  }

  /**
   * Convert VAPID key from base64 to Uint8Array
   */
  urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    // Explicit ArrayBuffer keeps this assignable to BufferSource (applicationServerKey).
    const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        logger.log('Unsubscribed from push notifications');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;

// Named exports for convenience.
// NOTE: these must be bound — destructuring the methods off the instance
// (as the previous JS version did) silently drops `this` and throws at call time.
export const sendNotification = notificationService.sendNotification.bind(notificationService);
export const sendAnnouncementNotification =
  notificationService.sendAnnouncementNotification.bind(notificationService);
export const sendHolidayNotification =
  notificationService.sendHolidayNotification.bind(notificationService);
export const sendSystemNotification =
  notificationService.sendSystemNotification.bind(notificationService);
export const sendCheckinReminder = notificationService.sendCheckinReminder.bind(notificationService);
export const testNotification = notificationService.testNotification.bind(notificationService);
export const requestPermission = notificationService.requestPermission.bind(notificationService);
export const getPermissionStatus = notificationService.getPermissionStatus.bind(notificationService);
export const isNotificationSupported =
  notificationService.isNotificationSupported.bind(notificationService);
export const subscribeToPush = notificationService.subscribeToPush.bind(notificationService);
export const unsubscribeFromPush = notificationService.unsubscribeFromPush.bind(notificationService);
export const clearNotifications = notificationService.clearNotifications.bind(notificationService);
export const autoSubscribe = notificationService.autoSubscribe.bind(notificationService);
