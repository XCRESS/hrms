import mongoose from 'mongoose';
import Settings from '../models/Settings.model.js';
import Employee from '../models/Employee.model.js';
import User from '../models/User.model.js';
import Notification from '../models/Notification.model.js';
import EmailService from './emailService.js';
import PushService from './pushService.js';
import logger from '../utils/logger.js';
import {
  NOTIFICATION_CATALOG,
  isNotificationType,
  type NotificationData,
  type NotificationSpec,
  type NotificationType,
} from './notifications/catalog.js';

export type Audience = 'all' | 'employee' | 'hr' | 'admin';

interface DeliverOptions {
  /** Per-recipient idempotency key. A recipient whose key exists is skipped entirely. */
  dedupeKey?: (userId: string) => string;
}

const HR_EMAIL_TOGGLES: Partial<Record<NotificationType, string>> = {
  leave_request: 'leaveRequests',
  wfh_request: 'wfhRequests',
  regularization_request: 'regularizationRequests',
  help_request: 'helpRequests',
  employee_milestone: 'employeeMilestones',
  expense_request: 'expenseRequests',
};

const specFor = (type: NotificationType): NotificationSpec => NOTIFICATION_CATALOG[type];

class NotificationService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      await EmailService.initialize();
    } catch (error) {
      logger.warn({ err: error }, 'Email service failed to initialize');
    }
    PushService.initialize();
    this.initialized = true;
  }

  /**
   * Inbox + push for a set of users. Returns the users actually notified
   * (dedupe may skip some). Never throws: a notification must not fail the
   * request that triggered it.
   */
  async deliver(
    userIds: mongoose.Types.ObjectId[],
    type: NotificationType,
    data: NotificationData,
    options: DeliverOptions = {}
  ): Promise<mongoose.Types.ObjectId[]> {
    if (userIds.length === 0) return [];

    try {
      const spec = specFor(type);
      const content = spec.build(data);
      const tag = spec.tag?.(data);
      const inboxIds = new Map<string, string>();

      if (options.dedupeKey) {
        for (const userId of userIds) {
          const dedupeKey = options.dedupeKey(userId.toString());
          const result = await Notification.updateOne(
            { dedupeKey },
            { $setOnInsert: { user: userId, type, ...content, dedupeKey, readAt: null } },
            { upsert: true }
          );
          if (result.upsertedId) inboxIds.set(userId.toString(), result.upsertedId.toString());
        }
      } else {
        const docs = await Notification.insertMany(
          userIds.map((user) => ({ user, type, ...content, readAt: null }))
        );
        for (const doc of docs) inboxIds.set(doc.user.toString(), doc._id.toString());
      }

      const recipients = userIds.filter((id) => inboxIds.has(id.toString()));
      if (recipients.length === 0) return [];

      const settings = await Settings.getGlobalSettings();
      if (settings.notifications.pushEnabled) {
        const badges = await this.unreadCounts(recipients);
        await PushService.sendToUsers(recipients, (userId) => ({
          type,
          ...content,
          spec,
          tag,
          inboxId: inboxIds.get(userId),
          badge: badges.get(userId) ?? 0,
        }));
      }

      return recipients;
    } catch (error) {
      logger.error({ err: error, type }, 'Notification delivery failed');
      return [];
    }
  }

  async notifyHR(type: NotificationType, data: NotificationData): Promise<void> {
    try {
      const staff = await User.find({ role: { $in: ['hr', 'admin'] }, isActive: true }).select('_id').lean();
      await this.deliver(staff.map((u) => u._id), type, data);

      const spec = specFor(type);
      const settings = await Settings.getGlobalSettings();
      const { hrEmails, hrEmailTypes, emailEnabled } = settings.notifications;
      const toggle = HR_EMAIL_TOGGLES[type];
      const allowed = toggle ? hrEmailTypes[toggle as keyof typeof hrEmailTypes] !== false : true;

      if (spec.emailTemplate && emailEnabled && allowed && hrEmails.length > 0) {
        await EmailService.sendNotification(spec.emailTemplate, data, hrEmails);
      }
    } catch (error) {
      logger.error({ err: error, type }, 'Failed to notify HR');
    }
  }

  async notifyEmployee(
    employeeRef: mongoose.Types.ObjectId | null | undefined,
    type: NotificationType,
    data: NotificationData,
    options: DeliverOptions & { email?: boolean } = {}
  ): Promise<void> {
    if (!employeeRef) return;
    try {
      const employee = await Employee.findOne({ _id: employeeRef, isActive: true }).select('_id email').lean();
      if (!employee) return;
      const user = await User.findOne({ employee: employee._id, isActive: true }).select('_id').lean();

      const notified = user ? await this.deliver([user._id], type, data, options) : [];
      const deduped = Boolean(options.dedupeKey) && notified.length === 0 && Boolean(user);

      const spec = specFor(type);
      if (spec.emailTemplate && options.email !== false && employee.email && !deduped) {
        await EmailService.sendNotification(spec.emailTemplate, data, employee.email);
      }
    } catch (error) {
      logger.error({ err: error, type, employee: String(employeeRef) }, 'Failed to notify employee');
    }
  }

  /** Company-wide broadcast, scoped to an announcement-style audience. */
  async notifyAudience(audience: Audience, type: NotificationType, data: NotificationData): Promise<void> {
    try {
      const roleFilter = audience === 'all' ? {} : { role: audience };
      const users = await User.find({ ...roleFilter, isActive: true }).select('_id email').lean();
      await this.deliver(users.map((u) => u._id), type, data);

      const spec = specFor(type);
      const settings = await Settings.getGlobalSettings();
      const emails = users.map((u) => u.email).filter((e): e is string => Boolean(e));
      if (spec.emailTemplate && settings.notifications.emailEnabled && emails.length > 0) {
        await EmailService.sendNotification(spec.emailTemplate, data, emails);
      }
    } catch (error) {
      logger.error({ err: error, type }, 'Failed to broadcast notification');
    }
  }

  async notifyUser(userId: string, type: NotificationType, data: NotificationData = {}): Promise<number> {
    const notified = await this.deliver([new mongoose.Types.ObjectId(userId)], type, data);
    return notified.length;
  }

  private async unreadCounts(userIds: mongoose.Types.ObjectId[]): Promise<Map<string, number>> {
    const rows = await Notification.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { user: { $in: userIds }, readAt: null } },
      { $group: { _id: '$user', count: { $sum: 1 } } },
    ]);
    return new Map(rows.map((r) => [r._id.toString(), r.count]));
  }

  isKnownType(type: string): type is NotificationType {
    return isNotificationType(type);
  }

  getStatus() {
    return {
      initialized: this.initialized,
      emailReady: !!EmailService.transporter,
      pushReady: PushService.initialized,
    };
  }
}

export default new NotificationService();
