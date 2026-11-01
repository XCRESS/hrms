import express, { type Router } from "express";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middlewares/auth.middleware.js";
import type { UserRole } from "../types/index.js";
import { validateBody, validateQuery } from "../middlewares/zodValidation.middleware.js";
import {
  testNotificationSchema,
  pushSubscriptionSchema,
  pushUnsubscribeSchema,
  pushResubscribeSchema,
  inboxQuerySchema,
  markNotificationsReadSchema,
} from "../validators/content.schemas.js";
import {
  getInbox,
  getUnreadCount,
  markRead,
  subscribe,
  unsubscribe,
  resubscribe,
  getVapidKey,
  getStatus,
  sendTest,
} from "../controllers/notification.controllers.js";

const router: Router = express.Router();

const ANY_ROLE: UserRole[] = ['admin', 'hr', 'employee'];

// Unauthenticated (called from the service worker), so throttle it.
const resubscribeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

router.get('/', authMiddleware(ANY_ROLE), validateQuery(inboxQuerySchema), getInbox);
router.get('/unread-count', authMiddleware(ANY_ROLE), getUnreadCount);
router.post('/read', authMiddleware(ANY_ROLE), validateBody(markNotificationsReadSchema), markRead);

router.get('/vapid-key', getVapidKey);
router.post('/subscribe', authMiddleware(ANY_ROLE), validateBody(pushSubscriptionSchema), subscribe);
router.post('/unsubscribe', authMiddleware(ANY_ROLE), validateBody(pushUnsubscribeSchema), unsubscribe);
router.post('/resubscribe', resubscribeLimiter, validateBody(pushResubscribeSchema), resubscribe);

router.get('/status', authMiddleware(['admin', 'hr']), getStatus);
router.post('/test', authMiddleware(ANY_ROLE), validateBody(testNotificationSchema), (req, res, next) => {
  const role = (req as { user?: { role?: string } }).user?.role;
  if (req.body.type !== 'self' && role !== 'admin' && role !== 'hr') {
    res.status(403).json({ success: false, message: 'Only HR can run broadcast tests' });
    return;
  }
  next();
}, sendTest);

export default router;
