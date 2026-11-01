import webpush, { WebPushError } from 'web-push';
import mongoose from 'mongoose';
import PushSubscriptionModel from '../models/PushSubscription.model.js';
import logger from '../utils/logger.js';
import type { NotificationSpec } from './notifications/catalog.js';

export interface PushSubscriptionKeys {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface RenderedPush {
  type: string;
  title: string;
  body: string;
  url: string;
  spec: NotificationSpec;
  tag?: string;
  inboxId?: string;
  badge?: number;
}

const APP_URL = (process.env.APP_URL || 'https://hr.intakesense.com').replace(/\/$/, '');

/** Unknown push-service errors past this many in a row retire the subscription. */
const MAX_CONSECUTIVE_FAILURES = 5;

const SEND_CONCURRENCY = 20;

/**
 * Declarative Web Push format (WebKit, W3C draft). Safari 18.4+ renders it
 * without running the service worker; everywhere else `sw.js` reads the same
 * `notification` object, so one payload serves every browser.
 */
const toDeclarativePayload = (push: RenderedPush) => ({
  web_push: 8030,
  notification: {
    title: push.title,
    body: push.body,
    navigate: `${APP_URL}${push.url}`,
    lang: 'en-IN',
    dir: 'ltr',
    silent: push.spec.urgency === 'very-low',
    ...(push.tag ? { tag: push.tag } : {}),
    ...(push.spec.requireInteraction ? { require_interaction: true } : {}),
    ...(typeof push.badge === 'number' ? { app_badge: String(push.badge) } : {}),
    ...(push.spec.actions
      ? {
          actions: push.spec.actions.map((a) => ({
            action: a.action,
            title: a.title,
            navigate: `${APP_URL}${a.url}`,
          })),
        }
      : {}),
    data: { type: push.type, url: push.url, inboxId: push.inboxId },
  },
});

async function mapWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
      await fn(item);
    }
  });
  await Promise.all(workers);
}

class PushService {
  initialized = false;

  initialize(): void {
    if (this.initialized) return;

    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL } = process.env;
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_EMAIL) {
      logger.info('Push disabled: set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL (npx web-push generate-vapid-keys)');
      return;
    }

    try {
      const contact = VAPID_EMAIL.startsWith('mailto:') ? VAPID_EMAIL : `mailto:${VAPID_EMAIL}`;
      webpush.setVapidDetails(contact, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
      this.initialized = true;
      logger.info('Push service initialized');
    } catch (error) {
      logger.error({ err: error }, 'Push service initialization failed - check VAPID key format');
    }
  }

  /** Deliver to every device of the given users. Never throws. */
  async sendToUsers(userIds: mongoose.Types.ObjectId[], render: (userId: string) => RenderedPush): Promise<number> {
    if (!this.initialized || userIds.length === 0) return 0;

    const subscriptions = await PushSubscriptionModel.find({ user: { $in: userIds } })
      .select('user endpoint keys')
      .lean();

    let delivered = 0;
    await mapWithConcurrency(subscriptions, SEND_CONCURRENCY, async (sub) => {
      if (await this.deliver(sub, render(sub.user.toString()))) delivered++;
    });
    return delivered;
  }

  private async deliver(sub: PushSubscriptionKeys, push: RenderedPush): Promise<boolean> {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify(toDeclarativePayload(push)),
        {
          TTL: push.spec.ttl,
          urgency: push.spec.urgency,
          // Push-service-side collapse: a queued nudge is replaced, not stacked.
          ...(push.tag ? { topic: push.tag.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) } : {}),
        }
      );
      await PushSubscriptionModel.updateOne(
        { endpoint: sub.endpoint },
        { $set: { lastSuccessAt: new Date(), failureCount: 0 } }
      );
      return true;
    } catch (error) {
      if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
        await PushSubscriptionModel.deleteOne({ endpoint: sub.endpoint });
        logger.info({ statusCode: error.statusCode }, 'Pruned expired push subscription');
        return false;
      }

      const updated = await PushSubscriptionModel.findOneAndUpdate(
        { endpoint: sub.endpoint },
        { $inc: { failureCount: 1 } },
        { new: true, projection: { failureCount: 1 } }
      ).lean();
      if (updated && updated.failureCount >= MAX_CONSECUTIVE_FAILURES) {
        await PushSubscriptionModel.deleteOne({ endpoint: sub.endpoint });
        logger.warn('Retired push subscription after repeated failures');
      }
      logger.error({ err: error }, 'Push send failed');
      return false;
    }
  }

  async addSubscription(userId: string, subscription: PushSubscriptionKeys, userAgent?: string): Promise<void> {
    // Keyed on endpoint: a shared device that changes hands moves to the new user.
    await PushSubscriptionModel.updateOne(
      { endpoint: subscription.endpoint },
      {
        $set: {
          user: new mongoose.Types.ObjectId(userId),
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          userAgent: userAgent?.slice(0, 400),
          failureCount: 0,
        },
      },
      { upsert: true }
    );
  }

  /**
   * Swap a rotated subscription. Called by the service worker, which has no
   * auth token; possession of the old endpoint (an unguessable URL) is the proof.
   */
  async replaceSubscription(oldEndpoint: string, subscription: PushSubscriptionKeys): Promise<boolean> {
    const existing = await PushSubscriptionModel.findOne({ endpoint: oldEndpoint }).select('user').lean();
    if (!existing) return false;
    await PushSubscriptionModel.deleteOne({ endpoint: oldEndpoint });
    await this.addSubscription(existing.user.toString(), subscription);
    return true;
  }

  async removeSubscription(userId: string, endpoint?: string): Promise<number> {
    const filter: Record<string, unknown> = { user: new mongoose.Types.ObjectId(userId) };
    if (endpoint) filter.endpoint = endpoint;
    const { deletedCount } = await PushSubscriptionModel.deleteMany(filter);
    return deletedCount;
  }

  async countForUser(userId: string): Promise<number> {
    return PushSubscriptionModel.countDocuments({ user: new mongoose.Types.ObjectId(userId) });
  }
}

export default new PushService();
