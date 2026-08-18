import { Resend } from 'resend';
import Settings from '../models/Settings.model.js';
import logger from '../utils/logger.js';

interface EmailData {
  [key: string]: unknown;
}

interface EmailResult {
  data?: { id: string };
  error?: unknown;
}

interface EmailBatchResult {
  status: 'fulfilled' | 'rejected';
  value?: EmailResult;
  reason?: unknown;
}

interface EmailTemplateItem {
  label: string;
  value: string;
}

interface EmailTemplate {
  subject: string;
  htmlContent: string;
}

type Tone = 'positive' | 'negative' | 'warning' | 'neutral';

interface ToneStyle {
  bg: string;
  border: string;
  text: string;
}

interface HeadingOptions {
  eyebrow: string;
  title: string;
  lede?: string;
}

const APP_URL = process.env.APP_URL || 'https://hr.intakesense.com';

/**
 * Design tokens. Kept flat and literal so every value that lands in an inline
 * style is greppable — email clients strip <style> rules we cannot inline.
 */
const T = {
  pageBg: '#f4f4f5',
  surface: '#ffffff',
  border: '#e4e4e7',
  borderSubtle: '#f0f0f1',
  ink: '#18181b',
  body: '#3f3f46',
  muted: '#71717a',
  faint: '#a1a1aa',
  accent: '#18181b',
  font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif",
  mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace"
} as const;

const TONES: Record<Tone, ToneStyle> = {
  positive: { bg: '#f4fbf6', border: '#cdead8', text: '#15653b' },
  negative: { bg: '#fdf6f6', border: '#f2d4d4', text: '#9f1f1f' },
  warning: { bg: '#fffbf3', border: '#f2e2c0', text: '#8a5a10' },
  neutral: { bg: '#fafafa', border: '#e4e4e7', text: '#3f3f46' }
};

class EmailService {
  resend: Resend | null;
  initialized: boolean;
  transporter: Resend | null;

  constructor() {
    this.resend = null;
    this.initialized = false;
    this.transporter = null;
  }

  async initialize(): Promise<void> {
    try {
      if (!process.env.RESEND_API_KEY) {
        logger.info('Email service skipped - Resend API key not provided');
        logger.info('Required: RESEND_API_KEY (sign up at https://resend.com)');
        return;
      }

      logger.info('Initializing email service with Resend API...');

      // No boot-time probe: the previous `domains.list()` health check cost an
      // API call on every start, is forbidden to send-only keys, and told us
      // nothing an actual send wouldn't. Key problems now surface in `send()`,
      // which logs the Resend error and throws.
      this.resend = new Resend(process.env.RESEND_API_KEY);
      this.transporter = this.resend;
      this.initialized = true;
      logger.info('Resend email service initialized');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error({ err }, 'Email service initialization failed');
      logger.info('Email service will be disabled. Emails will not be sent.');
      logger.info('Check your RESEND_API_KEY at https://resend.com/api-keys');
      this.resend = null;
      this.transporter = null;
      this.initialized = false;
    }
  }

  async send(to: string, subject: string, htmlContent: string): Promise<EmailResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized || !this.resend) {
      throw new Error('Email service not initialized');
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: process.env.EMAIL_FROM || 'HRMS System <onboarding@resend.dev>',
        to: [to],
        subject,
        html: htmlContent
      });

      if (error) {
        logger.error({ error }, `Failed to send email to ${to}`);
        throw new Error(`Email sending failed: ${JSON.stringify(error)}`);
      }

      logger.info(`Email sent to ${to} via Resend: ${data?.id}`);
      return { data, error };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error({ err }, `Failed to send email to ${to}`);
      throw error;
    }
  }

  async sendToMultiple(emails: string[], subject: string, htmlContent: string): Promise<EmailBatchResult[]> {
    const results: EmailBatchResult[] = [];
    const delay = 600;

    logger.info(`Sending ${emails.length} emails with rate limiting...`);

    for (let i = 0; i < emails.length; i++) {
      try {
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const result = await this.send(emails[i] as string, subject, htmlContent);
        results.push({ status: 'fulfilled', value: result });

        logger.info(`Progress: ${i + 1}/${emails.length} emails sent`);
      } catch (error) {
        results.push({ status: 'rejected', reason: error });
        const err = error instanceof Error ? error : new Error('Unknown error');
        logger.error({ err }, `Failed to send email ${i + 1}/${emails.length} to ${emails[i]}`);
      }
    }

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    logger.info(`Email batch completed: ${successful} successful, ${failed} failed`);

    return results;
  }

  async sendBatchWithCallback(emailCallbacks: (() => Promise<unknown>)[]): Promise<EmailBatchResult[]> {
    const results: EmailBatchResult[] = [];
    const delay = 600;

    logger.info(`Processing ${emailCallbacks.length} email operations with rate limiting...`);

    for (let i = 0; i < emailCallbacks.length; i++) {
      try {
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const callback = emailCallbacks[i];
        if (callback) {
          const result = await callback();
          results.push({ status: 'fulfilled', value: result as EmailResult });
        }

        logger.info(`Progress: ${i + 1}/${emailCallbacks.length} operations completed`);
      } catch (error) {
        results.push({ status: 'rejected', reason: error });
        const err = error instanceof Error ? error : new Error('Unknown error');
        logger.error({ err }, `Failed operation ${i + 1}/${emailCallbacks.length}`);
      }
    }

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    logger.info(`Batch operations completed: ${successful} successful, ${failed} failed`);

    return results;
  }

  async sendNotification(type: string, data: EmailData, recipients: string | string[]): Promise<EmailResult | EmailBatchResult[] | undefined> {
    const settings = await Settings.getGlobalSettings();
    if (!settings.notifications.emailEnabled) {
      logger.info('Email notifications are disabled');
      return;
    }

    const { subject, htmlContent } = this.getTemplate(type, data);

    if (Array.isArray(recipients)) {
      return this.sendToMultiple(recipients, subject, htmlContent);
    } else {
      return this.send(recipients, subject, htmlContent);
    }
  }

  // ---------------------------------------------------------------------------
  // Layout primitives
  // ---------------------------------------------------------------------------

  getEmailHeader(): string {
    return `
      <tr>
        <td class="px" style="padding: 24px 40px; border-bottom: 1px solid ${T.borderSubtle};">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-right: 10px; line-height: 0;">
                <img src="${APP_URL}/icon-192x192.png" alt="" width="28" height="28" style="display: block; width: 28px; height: 28px; border-radius: 6px; border: 1px solid ${T.borderSubtle};" />
              </td>
              <td style="vertical-align: middle;">
                <span style="font-family: ${T.font}; font-size: 15px; font-weight: 600; color: ${T.ink}; letter-spacing: -0.01em;">HRMS</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }

  getEmailFooter(): string {
    return `
      <tr>
        <td class="px" style="padding: 24px 40px 32px; border-top: 1px solid ${T.borderSubtle};">
          <p style="margin: 0 0 6px; font-family: ${T.font}; font-size: 12px; line-height: 1.6; color: ${T.muted};">
            Sent automatically by HRMS. Replies to this address are not monitored.
          </p>
          <p style="margin: 0; font-family: ${T.font}; font-size: 12px; line-height: 1.6; color: ${T.faint};">
            &copy; ${new Date().getFullYear()} HRMS &middot; Human Resource Management System
          </p>
        </td>
      </tr>
    `;
  }

  getBaseEmailTemplate(content: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>HRMS</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, h1, h2, h3, a { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    a { color: ${T.ink}; }

    @media only screen and (max-width: 620px) {
      .shell { padding: 0 !important; }
      .card { border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; }
      .px { padding-left: 24px !important; padding-right: 24px !important; }
      .title { font-size: 20px !important; }
      .stack { display: block !important; width: 100% !important; text-align: left !important; padding-left: 0 !important; }
      .stack-value { text-align: left !important; padding-top: 2px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: ${T.pageBg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${T.pageBg};">
    <tr>
      <td class="shell" align="center" style="padding: 40px 16px;">
        <table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 600px; max-width: 600px; background-color: ${T.surface}; border: 1px solid ${T.border}; border-radius: 10px;">
          ${this.getEmailHeader()}
          <tr>
            <td class="px" style="padding: 32px 40px;">
              ${content}
            </td>
          </tr>
          ${this.getEmailFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /** Eyebrow + headline + optional lede. Opens every message. */
  getHeading({ eyebrow, title, lede }: HeadingOptions): string {
    return `
      <p style="margin: 0 0 10px; font-family: ${T.font}; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ${T.muted};">${eyebrow}</p>
      <h1 class="title" style="margin: 0; font-family: ${T.font}; font-size: 23px; line-height: 1.3; font-weight: 600; letter-spacing: -0.02em; color: ${T.ink};">${title}</h1>
      ${lede ? `<p style="margin: 10px 0 0; font-family: ${T.font}; font-size: 15px; line-height: 1.6; color: ${T.body};">${lede}</p>` : ''}
    `;
  }

  getParagraph(text: string): string {
    return `<p style="margin: 0 0 16px; font-family: ${T.font}; font-size: 15px; line-height: 1.65; color: ${T.body};">${text}</p>`;
  }

  getStatusBadge(status: string): string {
    const key = (status || '').toLowerCase();
    const map: Record<string, Tone> = {
      approved: 'positive',
      completed: 'positive',
      low: 'positive',
      rejected: 'negative',
      declined: 'negative',
      high: 'negative',
      pending: 'warning',
      medium: 'warning'
    };
    const tone = TONES[map[key] || 'neutral'];

    return `<span style="display: inline-block; font-family: ${T.font}; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: ${tone.text}; background-color: ${tone.bg}; border: 1px solid ${tone.border}; border-radius: 5px; padding: 4px 8px; white-space: nowrap;">${status}</span>`;
  }

  /** Single primary action. Bulletproof enough for Outlook via the VML fallback. */
  getActionButton(text: string, href: string = APP_URL): string {
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 4px;">
        <tr>
          <td style="background-color: ${T.accent}; border-radius: 6px;">
            <a href="${href}" style="display: inline-block; padding: 11px 20px; font-family: ${T.font}; font-size: 14px; font-weight: 500; line-height: 1; color: #ffffff; text-decoration: none; border-radius: 6px;">${text}</a>
          </td>
        </tr>
      </table>
    `;
  }

  /** Key/value spec list. Values right-aligned on desktop, stacked on mobile. */
  getInfoCard(items: EmailTemplateItem[]): string {
    const rows = items
      .filter(item => item && item.value !== undefined && item.value !== null && item.value !== '')
      .map((item, index) => `
      <tr>
        <td class="stack" width="40%" style="padding: ${index === 0 ? '0' : '10px'} 12px 10px 0; border-top: ${index === 0 ? 'none' : `1px solid ${T.borderSubtle}`}; font-family: ${T.font}; font-size: 13px; line-height: 1.5; color: ${T.muted}; vertical-align: top;">${item.label}</td>
        <td class="stack stack-value" width="60%" align="right" style="padding: ${index === 0 ? '0' : '10px'} 0 10px; border-top: ${index === 0 ? 'none' : `1px solid ${T.borderSubtle}`}; font-family: ${T.font}; font-size: 13px; line-height: 1.5; font-weight: 500; color: ${T.ink}; text-align: right; vertical-align: top; word-break: break-word;">${item.value}</td>
      </tr>
    `).join('');

    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0; border: 1px solid ${T.border}; border-radius: 8px;">
        <tr>
          <td style="padding: 16px 18px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
          </td>
        </tr>
      </table>
    `;
  }

  /** Tinted note. Used for status outcomes and short contextual remarks. */
  getCallout(text: string, tone: Tone = 'neutral', footnote?: { label: string; value: string }): string {
    const t = TONES[tone];
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0; background-color: ${t.bg}; border: 1px solid ${t.border}; border-radius: 8px;">
        <tr>
          <td style="padding: 14px 16px;">
            <p style="margin: 0; font-family: ${T.font}; font-size: 14px; line-height: 1.6; color: ${t.text};">${text}</p>
            ${footnote ? `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid ${t.border};">
              <p style="margin: 0 0 4px; font-family: ${T.font}; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: ${t.text}; opacity: 0.75;">${footnote.label}</p>
              <p style="margin: 0; font-family: ${T.font}; font-size: 14px; line-height: 1.6; color: ${t.text};">${footnote.value}</p>
            </div>` : ''}
          </td>
        </tr>
      </table>
    `;
  }

  /** Long-form body copy (announcements, ticket descriptions). */
  getProse(label: string, body: string, attribution?: string): string {
    const paragraphs = String(body)
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => `<p style="margin: 0 0 12px; font-family: ${T.font}; font-size: 15px; line-height: 1.7; color: ${T.body}; word-break: break-word;">${line}</p>`)
      .join('');

    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0; border: 1px solid ${T.border}; border-radius: 8px;">
        <tr>
          <td style="padding: 18px;">
            <p style="margin: 0 0 12px; font-family: ${T.font}; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ${T.muted};">${label}</p>
            ${paragraphs}
            ${attribution ? `<p style="margin: 16px 0 0; padding-top: 14px; border-top: 1px solid ${T.borderSubtle}; font-family: ${T.font}; font-size: 13px; color: ${T.muted};">${attribution}</p>` : ''}
          </td>
        </tr>
      </table>
    `;
  }

  // ---------------------------------------------------------------------------
  // Formatting helpers
  // ---------------------------------------------------------------------------

  formatDate(value: unknown): string {
    if (!value) return '—';
    const date = new Date(value as string);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatAmount(value: unknown): string {
    return `<span style="font-family: ${T.mono}; font-size: 13px;">₹${Number(value || 0).toLocaleString('en-IN')}</span>`;
  }

  private statusTone(status?: string): Tone {
    if (status === 'approved') return 'positive';
    if (status === 'rejected' || status === 'declined') return 'negative';
    return 'warning';
  }

  private titleCase(value?: string): string {
    if (!value) return 'Updated';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  // ---------------------------------------------------------------------------
  // Templates
  // ---------------------------------------------------------------------------

  getTemplate(type: string, data: EmailData): EmailTemplate {
    const templates: Record<string, () => EmailTemplate> = {
      leave_request: () => ({
        subject: `Leave request from ${data.employee as string}`,
        htmlContent: this.getBaseEmailTemplate(`
          ${this.getHeading({
            eyebrow: 'Leave request',
            title: `${data.employee as string} requested leave`,
            lede: 'This request is waiting for your review in HRMS.'
          })}

          ${this.getInfoCard([
            { label: 'Employee', value: data.employee as string },
            { label: 'Leave type', value: data.type as string },
            { label: 'Date', value: this.formatDate(data.date) },
            { label: 'Reason', value: data.reason as string }
          ])}

          ${this.getActionButton('Review request', `${APP_URL}/admin/requests`)}
        `)
      }),

      expense_request: () => ({
        subject: `Expense claim from ${data.employee as string} · ₹${Number(data.amount || 0).toLocaleString('en-IN')}`,
        htmlContent: this.getBaseEmailTemplate(`
          ${this.getHeading({
            eyebrow: 'Expense claim',
            title: `${data.employee as string} submitted an expense`,
            lede: 'Review the claim and approve or decline it in HRMS.'
          })}

          ${this.getInfoCard([
            { label: 'Employee', value: data.employee as string },
            { label: 'Employee ID', value: data.employeeId as string },
            { label: 'Description', value: data.item as string },
            { label: 'Amount', value: this.formatAmount(data.amount) },
            { label: 'Date', value: this.formatDate(data.date) }
          ])}

          ${this.getActionButton('Review expense', `${APP_URL}/admin/expenses`)}
        `)
      }),

      expense_status_update: () => {
        const status = data.status as string;
        const tone = this.statusTone(status);
        const message = status === 'approved'
          ? 'Your expense has been approved and is queued for reimbursement.'
          : status === 'rejected'
            ? 'Your expense claim was not approved.'
            : 'Your expense claim is still under review.';

        return {
          subject: `Expense claim ${this.titleCase(status).toLowerCase()}`,
          htmlContent: this.getBaseEmailTemplate(`
            ${this.getHeading({
              eyebrow: 'Expense claim',
              title: `Your expense was ${this.titleCase(status).toLowerCase()}`
            })}

            ${this.getCallout(
              message,
              tone,
              data.comment ? { label: 'Reviewer note', value: data.comment as string } : undefined
            )}

            ${this.getInfoCard([
              { label: 'Description', value: data.item as string },
              { label: 'Amount', value: this.formatAmount(data.amount) },
              { label: 'Status', value: this.getStatusBadge(status) }
            ])}

            ${this.getActionButton('View in HRMS', `${APP_URL}/expenses/my`)}
          `)
        };
      },

      wfh_request: () => ({
        subject: `Work from home request from ${data.employee as string}`,
        htmlContent: this.getBaseEmailTemplate(`
          ${this.getHeading({
            eyebrow: 'Work from home',
            title: `${data.employee as string} requested to work remotely`,
            lede: 'The employee is requesting to check in from outside the office geofence.'
          })}

          ${this.getInfoCard([
            { label: 'Employee', value: data.employee as string },
            { label: 'Employee ID', value: data.employeeId as string },
            { label: 'Requested for', value: this.formatDate(data.requestDate) },
            { label: 'Reason', value: data.reason as string }
          ])}

          ${this.getActionButton('Review request', `${APP_URL}/admin/requests`)}
        `)
      }),

      help_request: () => ({
        subject: `Help request from ${data.employee as string} · ${data.subject as string}`,
        htmlContent: this.getBaseEmailTemplate(`
          ${this.getHeading({
            eyebrow: 'Help request',
            title: data.subject as string,
            lede: `${data.employee as string} opened a support request.`
          })}

          ${this.getInfoCard([
            { label: 'Employee', value: data.employee as string },
            { label: 'Category', value: data.category as string },
            { label: 'Priority', value: this.getStatusBadge(data.priority as string) }
          ])}

          ${this.getProse('Description', data.description as string)}

          ${this.getActionButton('Respond in HRMS', `${APP_URL}/admin/requests`)}
        `)
      }),

      regularization_request: () => ({
        subject: `Attendance regularization from ${data.employee as string}`,
        htmlContent: this.getBaseEmailTemplate(`
          ${this.getHeading({
            eyebrow: 'Regularization',
            title: `${data.employee as string} requested an attendance correction`,
            lede: 'Verify the reported hours before approving the correction.'
          })}

          ${this.getInfoCard([
            { label: 'Employee', value: data.employee as string },
            { label: 'Date', value: this.formatDate(data.date) },
            { label: 'Check in', value: (data.checkIn as string) || 'Not specified' },
            { label: 'Check out', value: (data.checkOut as string) || 'Not specified' },
            { label: 'Reason', value: data.reason as string }
          ])}

          ${this.getActionButton('Review request', `${APP_URL}/admin/requests`)}
        `)
      }),

      leave_status_update: () => {
        const status = data.status as string;
        const tone = this.statusTone(status);
        const message = status === 'approved'
          ? 'Your leave has been approved and your attendance will be adjusted automatically.'
          : status === 'rejected'
            ? 'Your leave request was not approved.'
            : 'Your leave request is still under review.';

        return {
          subject: `Leave request ${this.titleCase(status).toLowerCase()}`,
          htmlContent: this.getBaseEmailTemplate(`
            ${this.getHeading({
              eyebrow: 'Leave request',
              title: `Your leave request was ${this.titleCase(status).toLowerCase()}`
            })}

            ${this.getCallout(
              message,
              tone,
              data.comment ? { label: 'Reviewer note', value: data.comment as string } : undefined
            )}

            ${this.getInfoCard([
              { label: 'Leave type', value: data.type as string },
              { label: 'Date', value: this.formatDate(data.date) },
              { label: 'Reason', value: data.reason as string },
              { label: 'Status', value: this.getStatusBadge(status) }
            ])}

            ${this.getActionButton('View in HRMS', `${APP_URL}/requests`)}
          `)
        };
      },

      regularization_status_update: () => {
        const status = data.status as string;
        const tone = this.statusTone(status);
        const message = status === 'approved'
          ? 'Your attendance record has been corrected.'
          : status === 'rejected'
            ? 'Your regularization request was not approved.'
            : 'Your regularization request is still under review.';

        return {
          subject: `Attendance regularization ${this.titleCase(status).toLowerCase()}`,
          htmlContent: this.getBaseEmailTemplate(`
            ${this.getHeading({
              eyebrow: 'Regularization',
              title: `Your regularization was ${this.titleCase(status).toLowerCase()}`
            })}

            ${this.getCallout(
              message,
              tone,
              data.comment ? { label: 'Reviewer note', value: data.comment as string } : undefined
            )}

            ${this.getInfoCard([
              { label: 'Date', value: this.formatDate(data.date) },
              { label: 'Check in', value: (data.checkIn as string) || 'Not specified' },
              { label: 'Check out', value: (data.checkOut as string) || 'Not specified' },
              { label: 'Reason', value: data.reason as string },
              { label: 'Status', value: this.getStatusBadge(status) }
            ])}

            ${this.getActionButton('View attendance', `${APP_URL}/attendance/my`)}
          `)
        };
      },

      holiday_reminder: () => ({
        subject: `Upcoming holiday · ${data.title as string}`,
        htmlContent: this.getBaseEmailTemplate(`
          ${this.getHeading({
            eyebrow: 'Holiday',
            title: data.title as string,
            lede: 'The office will be closed. Plan your schedule accordingly.'
          })}

          ${this.getInfoCard([
            { label: 'Date', value: data.date as string },
            { label: 'Type', value: data.isOptional ? this.getStatusBadge('Optional') : 'Company holiday' },
            ...(data.description ? [{ label: 'Details', value: data.description as string }] : [])
          ])}

          ${this.getActionButton('View holiday calendar', `${APP_URL}/holidays`)}
        `)
      }),

      announcement: () => ({
        subject: `${data.title as string}`,
        htmlContent: this.getBaseEmailTemplate(`
          ${this.getHeading({
            eyebrow: 'Announcement',
            title: data.title as string
          })}

          ${this.getProse('Message', data.content as string, `Posted by ${data.author as string}`)}

          ${this.getActionButton('Open announcements', `${APP_URL}/announcements`)}
        `)
      }),

      employee_milestone: () => ({
        subject: `Work anniversary · ${data.employee as string}`,
        htmlContent: this.getBaseEmailTemplate(`
          ${this.getHeading({
            eyebrow: 'Work anniversary',
            title: `${data.employee as string} completed ${data.milestone as string}`,
            lede: 'A good moment to recognise their contribution to the team.'
          })}

          ${this.getInfoCard([
            { label: 'Employee', value: data.employee as string },
            { label: 'Employee ID', value: data.employeeId as string },
            { label: 'Milestone', value: `${data.milestone as string} with the company` },
            { label: 'Joined', value: this.formatDate(data.joiningDate) },
            ...(data.department ? [{ label: 'Department', value: data.department as string }] : []),
            ...(data.position ? [{ label: 'Position', value: data.position as string }] : [])
          ])}

          ${this.getActionButton('Open employee profile', `${APP_URL}/employees`)}
        `)
      }),

      birthday_wish: () => ({
        subject: `Happy birthday, ${data.employee as string}`,
        htmlContent: this.getBaseEmailTemplate(`
          ${this.getHeading({
            eyebrow: 'Birthday',
            title: `Happy birthday, ${data.employee as string}`
          })}

          ${this.getParagraph('Wishing you a great day and a strong year ahead.')}
          ${this.getParagraph(
            data.department
              ? `From your ${data.department as string} team and everyone at the company.`
              : 'From everyone at the company.'
          )}
        `)
      }),

      daily_hr_attendance_report: () => {
        const officeGroups = (data.officeGroups as Array<{
          officeAddress: string;
          presentEmployees: Array<{ name: string; checkIn?: string; checkOut?: string }>;
          absentEmployees: Array<{ name: string }>;
        }>) || [];

        const stat = (label: string, value: number, color: string) => `
          <td class="stack" width="33%" style="padding: 0 12px 0 0; vertical-align: top;">
            <p style="margin: 0; font-family: ${T.mono}; font-size: 28px; line-height: 1.1; font-weight: 600; letter-spacing: -0.02em; color: ${color};">${value}</p>
            <p style="margin: 6px 0 0; font-family: ${T.font}; font-size: 12px; color: ${T.muted};">${label}</p>
          </td>
        `;

        const th = (label: string, align = 'left') => `
          <th align="${align}" style="padding: 0 0 8px; border-bottom: 1px solid ${T.border}; font-family: ${T.font}; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: ${T.muted}; text-align: ${align};">${label}</th>
        `;

        const sections = officeGroups.map(group => `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 0; border-top: 1px solid ${T.border};">
            <tr>
              <td style="padding: 20px 0 0;">
                <p style="margin: 0 0 4px; font-family: ${T.font}; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ${T.muted};">Location</p>
                <p style="margin: 0 0 16px; font-family: ${T.font}; font-size: 15px; font-weight: 600; color: ${T.ink};">${group.officeAddress}</p>

                ${group.presentEmployees.length > 0 ? `
                <p style="margin: 0 0 10px; font-family: ${T.font}; font-size: 13px; font-weight: 500; color: ${T.body};">Present &middot; ${group.presentEmployees.length}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 20px;">
                  <tr>
                    ${th('Name')}${th('In', 'right')}${th('Out', 'right')}
                  </tr>
                  ${group.presentEmployees.map(emp => `
                  <tr>
                    <td style="padding: 9px 0; border-bottom: 1px solid ${T.borderSubtle}; font-family: ${T.font}; font-size: 13px; color: ${T.ink};">${emp.name}</td>
                    <td align="right" style="padding: 9px 0; border-bottom: 1px solid ${T.borderSubtle}; font-family: ${T.mono}; font-size: 12px; color: ${T.body}; text-align: right;">${emp.checkIn || '—'}</td>
                    <td align="right" style="padding: 9px 0; border-bottom: 1px solid ${T.borderSubtle}; font-family: ${T.mono}; font-size: 12px; color: ${emp.checkOut ? T.body : TONES.warning.text}; text-align: right;">${emp.checkOut || 'Open'}</td>
                  </tr>`).join('')}
                </table>` : `
                <p style="margin: 0 0 20px; font-family: ${T.font}; font-size: 13px; color: ${T.muted};">No employees marked present.</p>`}

                ${group.absentEmployees.length > 0 ? `
                <p style="margin: 0 0 10px; font-family: ${T.font}; font-size: 13px; font-weight: 500; color: ${T.body};">Absent &middot; ${group.absentEmployees.length}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>${th('Name')}</tr>
                  ${group.absentEmployees.map(emp => `
                  <tr>
                    <td style="padding: 9px 0; border-bottom: 1px solid ${T.borderSubtle}; font-family: ${T.font}; font-size: 13px; color: ${T.ink};">${emp.name}</td>
                  </tr>`).join('')}
                </table>` : ''}
              </td>
            </tr>
          </table>
        `).join('');

        return {
          subject: (data.subjectLine as string) || `Daily attendance report · ${data.reportDateFormatted as string}`,
          htmlContent: this.getBaseEmailTemplate(`
            ${this.getHeading({
              eyebrow: 'Daily report',
              title: 'Attendance summary',
              lede: data.reportDateFormatted as string
            })}

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 0;">
              <tr>
                ${stat('Employees', data.totalEmployees as number, T.ink)}
                ${stat('Present', data.totalPresent as number, TONES.positive.text)}
                ${stat('Absent', data.totalAbsent as number, (data.totalAbsent as number) > 0 ? TONES.negative.text : T.faint)}
              </tr>
            </table>

            ${sections}

            <p style="margin: 28px 0 0; padding-top: 20px; border-top: 1px solid ${T.borderSubtle}; font-family: ${T.font}; font-size: 12px; color: ${T.faint};">
              Generated ${data.generatedAt as string} IST
            </p>
          `)
        };
      }
    };

    const template = templates[type];
    if (template) {
      return template();
    }

    return {
      subject: 'HRMS notification',
      htmlContent: this.getBaseEmailTemplate(`
        ${this.getHeading({
          eyebrow: 'Notification',
          title: 'You have a new notification',
          lede: 'Open HRMS to see the details.'
        })}

        ${this.getActionButton('Open HRMS')}
      `)
    };
  }
}

export default new EmailService();
