import logger from '../utils/logger.js';

interface NotificationData {
  [key: string]: unknown;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class PushService {
  initialized: boolean;
  subscriptions: Map<string, PushSubscription>;

  constructor() {
    this.initialized = false;
    this.subscriptions = new Map();
  }

  initialize(): void {
    if (this.initialized) return;

    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_EMAIL) {
      logger.info('Push service skipped - VAPID keys not configured');
      logger.info('Required: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL');
      logger.info('Generate keys with: npx web-push generate-vapid-keys');
      return;
    }

    this.initialized = true;
    logger.info('Push service initialized successfully');
  }

  async send(subscription: PushSubscription, payload: NotificationData): Promise<boolean> {
    logger.info({ subscription, payload }, 'Push notification skipped - service not initialized');
    return false;
  }

  async sendNotification(type: string, data: NotificationData, subscriptions: PushSubscription[]): Promise<void> {
    logger.info({ type, count: subscriptions.length }, 'Push notifications skipped - service not initialized');
  }

  addSubscription(userId: string, subscription: PushSubscription): void {
    this.subscriptions.set(userId, subscription);
    logger.info({ userId }, 'Push subscription added for user');
  }

  removeSubscription(userId: string): void {
    this.subscriptions.delete(userId);
    logger.info({ userId }, 'Push subscription removed for user');
  }

  getHRSubscriptions(): PushSubscription[] {
    // For now return all subscriptions - in real app you'd filter by role
    return this.getAllSubscriptions();
  }

  getAllSubscriptions(): PushSubscription[] {
    return Array.from(this.subscriptions.values());
  }
}

export default new PushService();
