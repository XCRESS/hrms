import type { Response } from 'express';
import type { IAuthRequest } from '../types/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { formatResponse } from '../utils/response.js';
import { AuthenticationError } from '../utils/errors.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import logger from '../utils/logger.js';
import emailService from '../services/emailService.js';
import type { SendAssistantEmailInput } from '../validators/assistant.schemas.js';

const formatCell = (value: string | number | null): string =>
  value === null ? '—' : typeof value === 'number' ? value.toLocaleString('en-IN') : value;

const buildHtml = ({ body, table }: Pick<SendAssistantEmailInput, 'body' | 'table'>): string => {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => emailService.getParagraph(escapeHtml(p).replace(/\n/g, '<br>')))
    .join('');
  const tableHtml = table?.rows.length
    ? emailService.getDataTable(
        table.columns.map((c) => escapeHtml(c.label)),
        table.rows.map((row) => table.columns.map((c) => escapeHtml(formatCell(row[c.key] ?? null))))
      )
    : '';
  return emailService.getBaseEmailTemplate(paragraphs + tableHtml);
};

export const sendAssistantEmail = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const user = req.user;
  if (!user) throw new AuthenticationError();
  const { to, subject, body, table } = req.body as SendAssistantEmailInput;

  const html = buildHtml({ body, table });
  const sent: string[] = [];
  const failed: { email: string; message: string }[] = [];
  for (const email of [...new Set(to)]) {
    try {
      await emailService.send(email, subject, html, { replyTo: user.email });
      sent.push(email);
    } catch (err) {
      logger.error({ err, userId: String(user._id) }, 'HR Buddy email failed');
      failed.push({ email, message: err instanceof Error ? err.message : 'Could not send' });
    }
  }

  const status = sent.length ? 200 : 502;
  res.status(status).json(
    formatResponse(sent.length > 0, sent.length ? `Sent to ${sent.length} recipient(s)` : 'The email could not be sent', { sent, failed }, sent.length ? null : { failed })
  );
});
