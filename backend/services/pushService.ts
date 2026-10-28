import webpush, { WebPushError } from 'web-push';
import mongoose from 'mongoose';
import PushSubscriptionModel from '../models/PushSubscription.model.js';
import User from '../models/User.model.js';
import logger from '../utils/logger.js';

interface NotificationData {
  [key: string]: unknown;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * What the service worker renders. `frontend/public/sw.js` spreads this over
 * its defaults and calls showNotification(title, data), reading `data.url` on
 * click — so anything without a `title`/`body` shows the generic fallback.
 */
interface PushPayload {
  title: string;
  body: string;
  tag: string;
  data: { url: string; type: string };
}

const asText = (value: unknown, fallback = ''): string =>
  value == null ? fallback : String(value);

class PushService {
  initialized: boolean;

  constructor() {
    this.initialized = false;
  }

  initialize(): void {
    if (this.initialized) return;

    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL } = process.env;

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_EMAIL) {
      logger.info('Push service skipped - VAPID keys not configured');
      logger.info('Required: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL');
      logger.info('Generate keys with: npx web-push generate-vapid-keys');
      return;
    }

    try {
      const contact = VAPID_EMAIL.startsWith('mailto:') ? VAPID_EMAIL : `mailto:${VAPID_EMAIL}`;
      webpush.setVapidDetails(contact, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
      this.initialized = true;
      logger.info('Push service initialized successfully');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error({ err }, 'Push service initialization failed - check VAPID key format');
    }
  }

  /**
   * Build what the service worker needs from the loosely-typed notification
   * data the callers pass around. Mirrors the subject lines in emailService.
   */
  buildPayload(type: string, data: NotificationData): PushPayload {
    const employee = asText(data.employee, 'An employee');
    const status = asText(data.status);

    const builders: Record<string, () => { title: string; body: string; url: string }> = {
      leave_request: () => ({
        title: 'New leave request',
        body: `${employee} requested ${asText(data.type, 'leave')} on ${asText(data.date)}`,
        url: '/admin/requests',
      }),
      wfh_request: () => ({
        title: 'New work from home request',
        body: `${employee} requested WFH on ${asText(data.date)}`,
        url: '/admin/requests',
      }),
      regularization_request: () => ({
        title: 'New attendance regularization',
        body: `${employee} requested regularization for ${asText(data.date)}`,
        url: '/admin/requests',
      }),
      expense_request: () => ({
        title: 'New expense claim',
        body: `${employee} claimed ₹${Number(data.amount ?? 0).toLocaleString('en-IN')}`,
        url: '/admin/requests',
      }),
      help_request: () => ({
        title: 'New help request',
        body: `${employee}: ${asText(data.subject, 'needs assistance')}`,
        url: '/admin/requests',
      }),
      leave_status: () => ({
        title: `Leave request ${status || 'updated'}`,
        body: `Your leave for ${asText(data.date)} was ${status || 'reviewed'}`,
        url: '/my-requests',
      }),
      regularization_status: () => ({
        title: `Regularization ${status || 'updated'}`,
        body: `Your request for ${asText(data.date)} was ${status || 'reviewed'}`,
        url: '/my-requests',
      }),
      expense_status: () => ({
        title: `Expense claim ${status || 'updated'}`,
        body: `Your claim was ${status || 'reviewed'}`,
        url: '/my-requests',
      }),
      holiday_reminder: () => ({
        title: 'Upcoming holiday',
        body: `${asText(data.title, 'Holiday')} on ${asText(data.date)}`,
        url: '/dashboard',
      }),
      employee_milestone: () => ({
        title: 'Employee milestone',
        body: `${employee} · ${asText(data.title, 'milestone today')}`,
        url: '/dashboard',
      }),
      announcement: () => ({
        title: asText(data.title, 'New announcement'),
        body: asText(data.message ?? data.content, 'Tap to read the announcement'),
        url: '/dashboard',
      }),
      checkin_reminder: () => ({
        title: 'Check-in reminder',
        body: asText(data.message, "Don't forget to check in today"),
        url: '/dashboard',
      }),
    };

    const built = builders[type]?.() ?? {
      title: 'HRMS notification',
      body: asText(data.message ?? data.reason, 'You have a new notification'),
      url: '/dashboard',
    };

    return {
      title: built.title,
      body: built.body,
      // Same tag per type so a burst collapses instead of stacking.
      tag: `hrms-${type}`,
      data: { url: built.url, type },
    };
  }

  /**
   * Send to one endpoint. Returns false rather than throwing: a dead
   * subscription is normal and must not fail the surrounding request.
   */
  async send(subscription: PushSubscription, payload: PushPayload | NotificationData): Promise<boolean> {
    if (!this.initialized) {
      logger.info('Push notification skipped - service not initialized');
      return false;
    }

    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        },
        JSON.stringify(payload)
      );
      return true;
    } catch (error) {
      // 404/410 mean the browser dropped the subscription - prune it so we
      // stop paying for it on every future send.
      if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
        await PushSubscriptionModel.deleteOne({ endpoint: subscription.endpoint });
        logger.info({ statusCode: error.statusCode }, 'Pruned expired push subscription');
        return false;
      }

      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error({ err }, 'Push notification send failed');
      return false;
    }
  }

  async sendNotification(
    type: string,
    data: NotificationData,
    subscriptions: PushSubscription[]
  ): Promise<void> {
    if (!this.initialized || subscriptions.length === 0) {
      logger.info({ type, count: subscriptions.length }, 'Push notifications skipped');
      return;
    }

    const payload = this.buildPayload(type, data);
    const results = await Promise.allSettled(
      subscriptions.map((subscription) => this.send(subscription, payload))
    );

    const sent = results.filter((r) => r.status === 'fulfilled' && r.value).length;
    logger.info({ type, sent, total: subscriptions.length }, 'Push notifications dispatched');
  }

  async addSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    // Keyed on endpoint, not user: one person may have several devices, and a
    // device re-subscribing must update its row rather than add a duplicate.
    await PushSubscriptionModel.updateOne(
      { endpoint: subscription.endpoint },
      {
        $set: {
          user: new mongoose.Types.ObjectId(userId),
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        },
      },
      { upsert: true }
    );
    logger.info({ userId }, 'Push subscription saved for user');
  }

  /**
   * Remove one device when the caller knows which endpoint, otherwise every
   * device for the user.
   */
  async removeSubscription(userId: string, endpoint?: string): Promise<void> {
    const filter: Record<string, unknown> = { user: new mongoose.Types.ObjectId(userId) };
    if (endpoint) filter.endpoint = endpoint;

    const { deletedCount } = await PushSubscriptionModel.deleteMany(filter);
    logger.info({ userId, deletedCount }, 'Push subscription(s) removed for user');
  }

  async getHRSubscriptions(): Promise<PushSubscription[]> {
    // Previously returned every subscription, which would have pushed HR-only
    // content (leave reasons, expense amounts) to the whole company.
    const staff = await User.find({ role: { $in: ['hr', 'admin'] }, isActive: true })
      .select('_id')
      .lean();

    if (staff.length === 0) return [];

    return this.findByUsers(staff.map((user) => user._id));
  }

  async getAllSubscriptions(): Promise<PushSubscription[]> {
    const subscriptions = await PushSubscriptionModel.find().select('endpoint keys').lean();
    return subscriptions.map(({ endpoint, keys }) => ({ endpoint, keys }));
  }

  async getSubscriptionsForUser(userId: string): Promise<PushSubscription[]> {
    return this.findByUsers([new mongoose.Types.ObjectId(userId)]);
  }

  private async findByUsers(userIds: mongoose.Types.ObjectId[]): Promise<PushSubscription[]> {
    const subscriptions = await PushSubscriptionModel.find({ user: { $in: userIds } })
      .select('endpoint keys')
      .lean();
    return subscriptions.map(({ endpoint, keys }) => ({ endpoint, keys }));
  }
}

export default new PushService();
