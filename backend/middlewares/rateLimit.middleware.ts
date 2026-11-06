import type { Request } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { verifyToken } from '../utils/jwt.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const clientIp = (req: Request): string => ipKeyGenerator(req.ip ?? '');

// Keyed by user rather than IP: a whole office shares one NAT address.
// The token is verified, not just decoded, so forged IDs can't mint fresh buckets.
const userOrIpKey = (req: Request): string => {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (token) {
    try {
      const { userId, id } = verifyToken(token);
      const subject = userId || id;
      if (subject) return `user:${subject}`;
    } catch {
      // fall through to IP
    }
  }
  return `ip:${clientIp(req)}`;
};

export const generalLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 1000,
  keyGenerator: userOrIpKey,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const loginAccountLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `${clientIp(req)}:${email}`;
  },
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const loginIpLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 50,
  skipSuccessfulRequests: true,
  keyGenerator: clientIp,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const assistantLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  keyGenerator: userOrIpKey,
  message: 'HR Buddy is getting a lot of messages from you. Please wait a few minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});
