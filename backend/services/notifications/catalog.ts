/**
 * Every notification the HRMS can send, and how. Adding a type here is the
 * only way to make it deliverable — the dispatcher refuses unknown types.
 */

export type NotificationData = Record<string, unknown>;

export type PushUrgency = 'very-low' | 'low' | 'normal' | 'high';

export interface NotificationSpec {
  /** Short label shown in the inbox filter and settings. */
  category: 'request' | 'decision' | 'attendance' | 'payroll' | 'company' | 'people';
  build: (data: NotificationData) => { title: string; body: string; url: string };
  /** emailService template key; omitted = never emailed. */
  emailTemplate?: string;
  /** Seconds the push service may hold an undelivered message. */
  ttl: number;
  urgency: PushUrgency;
  /** Same tag replaces the previous notification instead of stacking. */
  tag?: (data: NotificationData) => string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string; url: string }>;
}

const HOUR = 60 * 60;
const DAY = 24 * HOUR;

const text = (value: unknown, fallback = ''): string =>
  value == null || value === '' ? fallback : String(value);

const rupees = (value: unknown): string => `₹${Number(value ?? 0).toLocaleString('en-IN')}`;

const decision = (status: unknown): string => {
  const s = text(status, 'reviewed');
  return s === 'approved' ? 'approved ✅' : s === 'rejected' ? 'rejected' : s;
};

export const NOTIFICATION_CATALOG = {
  leave_request: {
    category: 'request',
    build: (d) => ({
      title: 'Leave request',
      body: `${text(d.employee, 'An employee')} requested ${text(d.type, 'full-day')} leave on ${text(d.date)}`,
      url: '/admin/requests',
    }),
    emailTemplate: 'leave_request',
    ttl: 2 * DAY,
    urgency: 'normal',
  },
  wfh_request: {
    category: 'request',
    // Filed from a blocked check-in: the employee is waiting on this right now.
    build: (d) => ({
      title: 'WFH request — waiting to check in',
      body: `${text(d.employee, 'An employee')}: ${text(d.reason)}`,
      url: '/admin/requests',
    }),
    emailTemplate: 'wfh_request',
    ttl: 6 * HOUR,
    urgency: 'high',
    requireInteraction: true,
  },
  regularization_request: {
    category: 'request',
    build: (d) => ({
      title: 'Regularization request',
      body: `${text(d.employee, 'An employee')} wants to correct ${text(d.date)}`,
      url: '/admin/requests',
    }),
    emailTemplate: 'regularization_request',
    ttl: 2 * DAY,
    urgency: 'normal',
  },
  expense_request: {
    category: 'request',
    build: (d) => ({
      title: 'Expense claim',
      body: `${text(d.employee, 'An employee')} claimed ${rupees(d.amount)} for ${text(d.item, 'an expense')}`,
      url: '/admin/requests',
    }),
    emailTemplate: 'expense_request',
    ttl: 2 * DAY,
    urgency: 'normal',
  },
  help_request: {
    category: 'request',
    build: (d) => ({
      title: d.priority === 'high' ? 'Urgent help request' : 'Help request',
      body: `${text(d.employee, 'An employee')}: ${text(d.subject, 'needs assistance')}`,
      url: '/admin/requests',
    }),
    emailTemplate: 'help_request',
    ttl: 2 * DAY,
    urgency: 'normal',
  },

  leave_status_update: {
    category: 'decision',
    build: (d) => ({
      title: `Leave ${decision(d.status)}`,
      body: `Your ${text(d.type, 'full-day')} leave for ${text(d.date)} was ${text(d.status, 'reviewed')}`,
      url: '/requests',
    }),
    emailTemplate: 'leave_status_update',
    ttl: 3 * DAY,
    urgency: 'normal',
  },
  wfh_status_update: {
    category: 'decision',
    build: (d) => ({
      title: `WFH ${decision(d.status)}`,
      body:
        d.status === 'approved'
          ? `You're checked in for ${text(d.date)} as work from home`
          : `Your WFH request for ${text(d.date)} was rejected${d.comment ? `: ${text(d.comment)}` : ''}`,
      url: '/dashboard',
    }),
    ttl: DAY,
    urgency: 'high',
  },
  regularization_status_update: {
    category: 'decision',
    build: (d) => ({
      title: `Regularization ${decision(d.status)}`,
      body: `Your correction for ${text(d.date)} was ${text(d.status, 'reviewed')}`,
      url: '/requests',
    }),
    emailTemplate: 'regularization_status_update',
    ttl: 3 * DAY,
    urgency: 'normal',
  },
  expense_status_update: {
    category: 'decision',
    build: (d) => ({
      title: `Expense ${decision(d.status)}`,
      body: `${text(d.item, 'Your claim')} · ${rupees(d.amount)}`,
      url: '/requests',
    }),
    emailTemplate: 'expense_status_update',
    ttl: 3 * DAY,
    urgency: 'normal',
  },

  checkin_reminder: {
    category: 'attendance',
    build: (d) => ({
      title: 'Time to check in',
      body: `You'll be marked late after ${text(d.lateThreshold)}`,
      url: '/dashboard?action=check-in',
    }),
    // Worthless once the late mark passes.
    ttl: 30 * 60,
    urgency: 'high',
    tag: () => 'attendance-nudge',
    actions: [{ action: 'check-in', title: 'Check in', url: '/dashboard?action=check-in' }],
  },
  missed_checkin: {
    category: 'attendance',
    build: (d) => ({
      title: "You haven't checked in",
      body: `It's past ${text(d.lateThreshold)}. Check in now, or apply for leave so you aren't marked absent.`,
      url: '/dashboard?action=check-in',
    }),
    ttl: 4 * HOUR,
    urgency: 'high',
    tag: () => 'attendance-nudge',
    requireInteraction: true,
    actions: [
      { action: 'check-in', title: 'Check in', url: '/dashboard?action=check-in' },
      { action: 'leave', title: 'Apply leave', url: '/dashboard?action=leave' },
    ],
  },
  missed_checkout: {
    category: 'attendance',
    build: (d) => ({
      title: 'Forgot to check out?',
      body: `You checked in at ${text(d.checkIn)} and haven't checked out.`,
      url: '/dashboard?action=check-out',
    }),
    ttl: 6 * HOUR,
    urgency: 'normal',
    tag: () => 'attendance-nudge',
    actions: [{ action: 'check-out', title: 'Check out', url: '/dashboard?action=check-out' }],
  },
  hr_attendance_digest: {
    category: 'attendance',
    build: (d) => ({
      title: `Attendance · ${text(d.time)}`,
      body: `${text(d.present, '0')} in · ${text(d.late, '0')} late · ${text(d.notIn, '0')} not in · ${text(d.onLeave, '0')} on leave${Number(d.pending) > 0 ? ` · ${text(d.pending)} requests pending` : ''}`,
      url: '/dashboard',
    }),
    ttl: 4 * HOUR,
    urgency: 'low',
    tag: () => 'hr-digest',
  },

  payslip_published: {
    category: 'payroll',
    build: (d) => ({
      title: 'Payslip ready',
      body: `Your payslip for ${text(d.period, 'this month')} is available`,
      url: '/salary-slips/my',
    }),
    ttl: 7 * DAY,
    urgency: 'low',
  },

  announcement: {
    category: 'company',
    build: (d) => ({
      title: text(d.title, 'New announcement'),
      body: text(d.content, 'Tap to read').slice(0, 180),
      url: '/announcements',
    }),
    emailTemplate: 'announcement',
    ttl: 3 * DAY,
    urgency: 'low',
  },
  holiday_reminder: {
    category: 'company',
    build: (d) => ({
      title: `Holiday: ${text(d.title, 'Holiday')}`,
      body: `${text(d.date)}${d.isOptional ? ' · optional' : ''}`,
      url: '/holidays',
    }),
    emailTemplate: 'holiday_reminder',
    ttl: DAY,
    urgency: 'low',
  },
  holiday_added: {
    category: 'company',
    build: (d) => ({
      title: 'Added to the holiday calendar',
      body: `${text(d.title, 'Holiday')} · ${text(d.date)}`,
      url: '/holidays',
    }),
    ttl: 3 * DAY,
    urgency: 'very-low',
  },

  employee_milestone: {
    category: 'people',
    build: (d) => ({
      title: 'Work anniversary',
      body: `${text(d.employee, 'An employee')} completes ${text(d.milestone, 'a milestone')} today`,
      url: '/employees',
    }),
    emailTemplate: 'employee_milestone',
    ttl: DAY,
    urgency: 'low',
  },
  birthday_wish: {
    category: 'people',
    build: () => ({
      title: 'Happy birthday! 🎂',
      body: 'Wishing you a wonderful year ahead from everyone at the team.',
      url: '/dashboard',
    }),
    emailTemplate: 'birthday_wish',
    ttl: DAY,
    urgency: 'low',
  },
  test: {
    category: 'company',
    build: () => ({
      title: 'Notifications are working',
      body: 'This device will receive HRMS alerts.',
      url: '/dashboard',
    }),
    ttl: HOUR,
    urgency: 'normal',
  },
} satisfies Record<string, NotificationSpec>;

export type NotificationType = keyof typeof NOTIFICATION_CATALOG;

export const isNotificationType = (value: string): value is NotificationType =>
  Object.hasOwn(NOTIFICATION_CATALOG, value);
