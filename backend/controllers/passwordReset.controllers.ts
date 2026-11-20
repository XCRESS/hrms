import type { ConfirmPasswordResetInput, RequestPasswordResetInput } from '../validators/auth.schemas.js';
import type { Request, Response } from 'express';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BadRequestError } from '../utils/errors.js';
import { ensureJWTSecret } from '../utils/jwt.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatResponse } from '../utils/response.js';
import PasswordResetCode from '../models/PasswordResetCode.model.js';
import User from '../models/User.model.js';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const REQUEST_ACCEPTED = 'If an account exists for that email, a reset code is on its way.';
const CODE_REJECTED = 'That code is invalid or has expired. Request a new one.';

const hashCode = (code: string): Buffer => createHmac('sha256', ensureJWTSecret()).update(code).digest();

const sendInBackground = (to: string, subject: string, html: string, what: string): void => {
  emailService.send(to, subject, html).catch((err: unknown) => logger.error({ err }, `Failed to send ${what}`));
};

// Same response whether or not the account exists, and the email is not awaited,
// so neither the body nor the timing reveals which addresses are registered.
export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as RequestPasswordResetInput;

  const user = await User.findOne({ email, isActive: true }).select('_id name email').lean();
  if (user) {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await PasswordResetCode.findOneAndUpdate(
      { user: user._id },
      { codeHash: hashCode(code).toString('hex'), attempts: 0, expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000) },
      { upsert: true }
    );

    const html = emailService.getBaseEmailTemplate(`
      ${emailService.getHeading({
        eyebrow: 'Security',
        title: 'Reset your password',
        lede: `Hi ${escapeHtml(user.name)}, use this code to set a new password.`,
      })}
      ${emailService.getOneTimeCode(code)}
      ${emailService.getParagraph(`The code expires in ${CODE_TTL_MINUTES} minutes and can only be used once.`)}
      ${emailService.getCallout('If you did not ask to reset your password, ignore this email. Your password will not change.', 'neutral')}
    `);
    sendInBackground(user.email, `${code} is your HRMS password reset code`, html, 'password reset code');
  }

  res.status(200).json(formatResponse(true, REQUEST_ACCEPTED));
});

export const confirmPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body as ConfirmPasswordResetInput;

  const user = await User.findOne({ email, isActive: true }).select('_id name email').lean();
  if (!user) throw new BadRequestError(CODE_REJECTED);

  // The attempt is counted before comparing, so parallel guesses can't exceed the cap.
  const record = await PasswordResetCode.findOneAndUpdate(
    { user: user._id, expiresAt: { $gt: new Date() }, attempts: { $lt: MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { new: true }
  ).lean();
  if (!record || !timingSafeEqual(Buffer.from(record.codeHash, 'hex'), hashCode(code))) {
    throw new BadRequestError(CODE_REJECTED);
  }

  const { deletedCount } = await PasswordResetCode.deleteOne({ _id: record._id });
  if (deletedCount !== 1) throw new BadRequestError(CODE_REJECTED);

  const password = await bcrypt.hash(newPassword, 10);
  await User.updateOne({ _id: user._id }, { $set: { password }, $inc: { tokenVersion: 1 } });

  const html = emailService.getBaseEmailTemplate(`
    ${emailService.getHeading({
      eyebrow: 'Security',
      title: 'Your password was changed',
      lede: `Hi ${escapeHtml(user.name)}, the password for your HRMS account was just reset.`,
    })}
    ${emailService.getParagraph('Every device that was signed in has been signed out.')}
    ${emailService.getCallout('If you did not make this change, contact your HR administrator immediately.', 'warning')}
    ${emailService.getActionButton('Sign in')}
  `);
  sendInBackground(user.email, 'Your HRMS password was changed', html, 'password change confirmation');

  res.status(200).json(formatResponse(true, 'Password updated. Sign in with your new password.'));
});
