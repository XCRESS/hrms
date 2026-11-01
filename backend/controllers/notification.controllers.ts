import type { Response } from 'express';
import mongoose from 'mongoose';
import Notification from '../models/Notification.model.js';
import NotificationService from '../services/notificationService.js';
import PushService from '../services/pushService.js';
import SchedulerService from '../services/schedulerService.js';
import AttendanceNudgeService from '../services/attendanceNudgeService.js';
import { getValidatedQuery } from '../middlewares/zodValidation.middleware.js';
import { formatResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import type { IAuthRequest } from '../types/index.js';
import type {
  InboxQuery,
  MarkNotificationsReadInput,
  PushResubscribeInput,
  PushSubscriptionInput,
  PushUnsubscribeInput,
  TestNotificationInput,
} from '../validators/content.schemas.js';

const fail = (res: Response, error: unknown, message: string): void => {
  logger.error({ err: error }, message);
  res.status(500).json(formatResponse(false, message));
};

const currentUserId = (req: IAuthRequest): mongoose.Types.ObjectId =>
  new mongoose.Types.ObjectId(String(req.user?._id));

export const getInbox = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { before, limit } = getValidatedQuery<InboxQuery>(req);
    const user = currentUserId(req);
    const filter: Record<string, unknown> = { user };
    if (before) filter._id = { $lt: new mongoose.Types.ObjectId(before) };

    const [items, unread] = await Promise.all([
      Notification.find(filter)
        .sort({ _id: -1 })
        .limit(limit + 1)
        .select('type title body url readAt createdAt')
        .lean(),
      Notification.countDocuments({ user, readAt: null }),
    ]);

    const page = items.slice(0, limit);
    const last = page.at(-1);
    res.json(
      formatResponse(true, 'Notifications retrieved', {
        items: page,
        unread,
        nextCursor: items.length > limit && last ? String(last._id) : null,
      })
    );
  } catch (error) {
    fail(res, error, 'Failed to load notifications');
  }
};

export const getUnreadCount = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const unread = await Notification.countDocuments({ user: currentUserId(req), readAt: null });
    res.json(formatResponse(true, 'Unread count', { unread }));
  } catch (error) {
    fail(res, error, 'Failed to count notifications');
  }
};

export const markRead = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { ids, all } = req.body as MarkNotificationsReadInput;
    const user = currentUserId(req);
    const filter: Record<string, unknown> = { user, readAt: null };
    if (!all) filter._id = { $in: (ids ?? []).map((id) => new mongoose.Types.ObjectId(id)) };

    await Notification.updateMany(filter, { $set: { readAt: new Date() } });
    const unread = await Notification.countDocuments({ user, readAt: null });
    res.json(formatResponse(true, 'Marked as read', { unread }));
  } catch (error) {
    fail(res, error, 'Failed to update notifications');
  }
};

export const subscribe = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { subscription } = req.body as PushSubscriptionInput;
    await PushService.addSubscription(String(req.user?._id), subscription, req.get('user-agent'));
    res.json(formatResponse(true, 'Subscribed', { pushReady: PushService.initialized }));
  } catch (error) {
    fail(res, error, 'Push subscription failed');
  }
};

export const unsubscribe = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { endpoint } = req.body as PushUnsubscribeInput;
    const removed = await PushService.removeSubscription(String(req.user?._id), endpoint ?? undefined);
    res.json(formatResponse(true, 'Unsubscribed', { removed }));
  } catch (error) {
    fail(res, error, 'Push unsubscription failed');
  }
};

export const resubscribe = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { oldEndpoint, subscription } = req.body as PushResubscribeInput;
    const replaced = await PushService.replaceSubscription(oldEndpoint, subscription);
    res.status(replaced ? 200 : 404).json(formatResponse(replaced, replaced ? 'Subscription rotated' : 'Unknown subscription'));
  } catch (error) {
    fail(res, error, 'Push resubscription failed');
  }
};

export const getVapidKey = (req: IAuthRequest, res: Response): void => {
  const vapidKey = process.env.VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    res.status(503).json(formatResponse(false, 'Push notifications are not configured'));
    return;
  }
  res.json(formatResponse(true, 'VAPID key', { vapidKey }));
};

export const getStatus = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    res.json(
      formatResponse(true, 'Notification status', {
        ...NotificationService.getStatus(),
        scheduler: SchedulerService.getStatus(),
        myDevices: await PushService.countForUser(String(req.user?._id)),
      })
    );
  } catch (error) {
    fail(res, error, 'Failed to get notification status');
  }
};

export const sendTest = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.body as TestNotificationInput;
    const userId = String(req.user?._id);

    switch (type) {
      case 'self': {
        const devices = await PushService.countForUser(userId);
        await NotificationService.notifyUser(userId, 'test');
        res.json(formatResponse(true, devices > 0 ? `Sent to ${devices} device(s)` : 'Added to your inbox; this account has no push devices', { devices }));
        return;
      }
      case 'hr':
        await NotificationService.notifyHR('leave_request', {
          employee: 'Test Employee',
          type: 'full-day',
          date: new Date().toDateString(),
          reason: 'Notification system test',
        });
        break;
      case 'all':
        await NotificationService.notifyAudience('all', 'holiday_reminder', {
          title: 'Test Holiday',
          date: new Date().toDateString(),
        });
        break;
      case 'milestone':
        await SchedulerService.triggerMilestoneCheck();
        break;
      case 'holiday':
        await SchedulerService.triggerHolidayReminder();
        break;
      case 'nudges':
        await AttendanceNudgeService.tick();
        break;
    }

    res.json(formatResponse(true, `Notification test (${type}) completed`, NotificationService.getStatus()));
  } catch (error) {
    fail(res, error, 'Notification test failed');
  }
};
