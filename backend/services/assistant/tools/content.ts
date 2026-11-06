import { tool } from 'ai';
import { z } from 'zod';
import { Types } from 'mongoose';
import TaskReport from '../../../models/TaskReport.model.js';
import Holiday from '../../../models/Holiday.model.js';
import Announcement from '../../../models/Announcement.model.js';
import Policy from '../../../models/Policy.model.js';
import Help from '../../../models/Help.model.js';
import { escapeRegExp } from '../../../utils/helpers.js';
import { parseISTDateString, toIST } from '../../../utils/timezone.js';
import { emptyView, splitByPersonInput, summarizeForModel, withPersonTabs, type ResultView } from '../views.js';
import { ALL_ROLES, STAFF_ROLES, type AssistantToolDef } from './types.js';
import { isoDate, objectId, resolveRange } from './attendance.js';

const cleanName = (first?: string, last?: string) => `${first ?? ''} ${last ?? ''}`.trim().replace(/\s+/g, ' ');
const day = (d: unknown) => (d ? toIST(d as Date).toISODate() : null);

const taskReportView = async (filter: Record<string, unknown>, title: string, withPerson: boolean): Promise<ResultView> => {
  const reports = (await TaskReport.find(filter)
    .sort({ date: -1 })
    .limit(500)
    .populate('employee', 'firstName lastName')
    .lean()) as unknown as { _id: Types.ObjectId; date: Date; tasks: string[]; employee?: { firstName?: string; lastName?: string } | null }[];
  if (!reports.length) return emptyView(title, 'No task reports in this period');
  return {
    kind: 'result',
    title,
    columns: [
      { key: 'date', label: 'Date', kind: 'date' },
      ...(withPerson ? [{ key: 'name', label: 'Name', kind: 'text' as const }] : []),
      { key: 'tasks', label: 'Tasks', kind: 'text' },
      { key: 'count', label: 'Items', kind: 'number' },
    ],
    rows: reports.map((r) => ({
      id: r._id.toString(),
      date: day(r.date),
      name: cleanName(r.employee?.firstName, r.employee?.lastName),
      tasks: r.tasks.join(' · '),
      count: r.tasks.length,
    })),
    tiles: [{ key: 'reports', label: 'Reports', value: reports.length }],
    defaultView: 'table',
    link: { label: 'Task reports', href: '/task-reports' },
  };
};

const taskReportsTool: AssistantToolDef = {
  name: 'task_reports',
  roles: STAFF_ROLES,
  build: (ctx) =>
    tool({
      description: 'Submitted daily task reports in a date range (max 93 days), for everyone or only the given employees (ids from find_employee).',
      inputSchema: z.object({ startDate: isoDate, endDate: isoDate, employees: z.array(objectId).max(20).optional(), splitByPerson: splitByPersonInput }),
      execute: async ({ startDate, endDate, employees, splitByPerson }) => {
        const range = resolveRange(startDate, endDate, ctx.now);
        if ('error' in range) return emptyView('Task reports', range.error);
        const end = toIST(range.end).endOf('day').toJSDate();
        const view = await taskReportView(
          { date: { $gte: range.start, $lte: end }, ...(employees?.length ? { employee: { $in: employees.map((id) => new Types.ObjectId(id)) } } : {}) },
          'Task reports',
          employees?.length !== 1
        );
        return withPersonTabs(view, splitByPerson);
      },
      toModelOutput: ({ output }) => summarizeForModel(output),
    }),
};

const myTaskReportsTool: AssistantToolDef = {
  name: 'my_task_reports',
  roles: ALL_ROLES,
  build: (ctx) =>
    tool({
      description: "The current user's own task reports in a date range (max 93 days).",
      inputSchema: z.object({ startDate: isoDate, endDate: isoDate }),
      execute: async ({ startDate, endDate }) => {
        if (!ctx.caller.employee) return emptyView('My task reports', 'No employee profile is linked to your account.');
        const range = resolveRange(startDate, endDate, ctx.now);
        if ('error' in range) return emptyView('My task reports', range.error);
        const end = toIST(range.end).endOf('day').toJSDate();
        return taskReportView({ employee: ctx.caller.employee, date: { $gte: range.start, $lte: end } }, 'My task reports', false);
      },
      toModelOutput: ({ output }) => summarizeForModel(output),
    }),
};

const holidaysTool: AssistantToolDef = {
  name: 'holidays',
  roles: ALL_ROLES,
  build: () =>
    tool({
      description: "The company's active holidays for a year, as configured in the HRMS.",
      inputSchema: z.object({ year: z.number().int().min(2000).max(2100) }),
      execute: async ({ year }): Promise<ResultView> => {
        const start = parseISTDateString(`${year}-01-01`).startOf('day').toJSDate();
        const end = parseISTDateString(`${year}-12-31`).endOf('day').toJSDate();
        const holidays = await Holiday.find({ isActive: true, date: { $gte: start, $lte: end } }).sort({ date: 1 }).lean();
        if (!holidays.length) return emptyView(`Holidays ${year}`, 'No holidays configured for this year');
        return {
          kind: 'result',
          title: `Holidays ${year}`,
          columns: [
            { key: 'date', label: 'Date', kind: 'date' },
            { key: 'day', label: 'Day', kind: 'text' },
            { key: 'name', label: 'Holiday', kind: 'text' },
            { key: 'type', label: 'Type', kind: 'status' },
          ],
          rows: holidays.map((h) => ({
            id: h._id.toString(),
            date: day(h.date),
            day: toIST(h.date).toFormat('ccc'),
            name: h.name,
            type: h.type ?? 'public',
          })),
          tiles: [{ key: 'count', label: 'Holidays', value: holidays.length }],
          defaultView: 'table',
          link: { label: 'Holidays', href: '/holidays' },
        };
      },
      toModelOutput: ({ output }) => summarizeForModel(output, 30),
    }),
};

const announcementsTool: AssistantToolDef = {
  name: 'announcements',
  roles: ALL_ROLES,
  build: (ctx) =>
    tool({
      description: 'Recent announcements the user can see, newest first.',
      inputSchema: z.object({ limit: z.number().int().min(1).max(20).optional() }),
      execute: async ({ limit }): Promise<ResultView> => {
        const isStaff = ctx.caller.role === 'admin' || ctx.caller.role === 'hr';
        const query = isStaff ? {} : { status: 'published', targetAudience: { $in: ['all', ctx.caller.role] } };
        const items = await Announcement.find(query).sort({ createdAt: -1 }).limit(limit ?? 10).lean();
        if (!items.length) return emptyView('Announcements', 'No announcements');
        return {
          kind: 'result',
          title: 'Announcements',
          columns: [
            { key: 'date', label: 'Date', kind: 'date' },
            { key: 'title', label: 'Title', kind: 'text' },
            { key: 'audience', label: 'Audience', kind: 'text' },
            ...(isStaff ? [{ key: 'status', label: 'Status', kind: 'status' as const }] : []),
          ],
          rows: items.map((a) => ({
            id: a._id.toString(),
            date: day(a.createdAt),
            title: a.title,
            audience: a.targetAudience ?? 'all',
            status: a.status ?? null,
            excerpt: a.content.slice(0, 280),
          })),
          defaultView: 'table',
          link: { label: 'Announcements', href: '/announcements' },
        };
      },
      toModelOutput: ({ output }) => summarizeForModel(output, 10),
    }),
};

const policiesTool: AssistantToolDef = {
  name: 'policies',
  roles: ALL_ROLES,
  build: () =>
    tool({
      description: "Company policy text, to answer questions about rules (leave, attendance, conduct, etc.). Pass a keyword to search; answer from the returned text and name the policy.",
      inputSchema: z.object({ query: z.string().trim().max(100).optional() }),
      execute: async ({ query }) => {
        const match = query ? new RegExp(escapeRegExp(query), 'i') : null;
        const policies = await Policy.find({ isActive: true, ...(match ? { $or: [{ title: match }, { content: match }, { category: match }] } : {}) })
          .sort({ priority: -1, effectiveDate: -1 })
          .limit(3)
          .select('title category content effectiveDate')
          .lean();
        return {
          policies: policies.map((p) => ({ title: p.title, category: p.category, effectiveDate: day(p.effectiveDate), text: String(p.content ?? '').slice(0, 1500) })),
        };
      },
      toModelOutput: ({ output }) => ({
        type: 'text' as const,
        value: output.policies.length
          ? output.policies.map((p) => `## ${p.title} (${p.category ?? 'general'})\n${p.text}`).join('\n\n')
          : 'No matching policy found.',
      }),
    }),
};

const helpView = async (filter: Record<string, unknown>, title: string, withPerson: boolean): Promise<ResultView> => {
  const inquiries = (await Help.find(filter).sort({ createdAt: -1 }).limit(200).populate('userId', 'name').lean()) as unknown as {
    _id: Types.ObjectId;
    subject: string;
    category?: string;
    priority?: string;
    status: string;
    createdAt?: Date;
    response?: string;
    userId?: { name?: string } | null;
  }[];
  if (!inquiries.length) return emptyView(title, 'No help requests');
  return {
    kind: 'result',
    title,
    columns: [
      { key: 'date', label: 'Raised', kind: 'date' },
      ...(withPerson ? [{ key: 'name', label: 'Name', kind: 'text' as const }] : []),
      { key: 'subject', label: 'Subject', kind: 'text' },
      { key: 'priority', label: 'Priority', kind: 'text' },
      { key: 'status', label: 'Status', kind: 'status' },
    ],
    rows: inquiries.map((h) => ({
      id: h._id.toString(),
      date: day(h.createdAt),
      name: h.userId?.name ?? null,
      subject: h.subject,
      priority: h.priority ?? null,
      status: h.status,
      response: h.response ?? null,
    })),
    tiles: ['pending', 'in-progress', 'resolved'].map((s) => ({
      key: s,
      label: s === 'in-progress' ? 'In progress' : s[0]!.toUpperCase() + s.slice(1),
      value: inquiries.filter((h) => h.status === s).length,
      filter: { column: 'status', equals: s },
    })),
    defaultView: 'table',
  };
};

const helpRequestsTool: AssistantToolDef = {
  name: 'help_requests',
  roles: STAFF_ROLES,
  build: () =>
    tool({
      description: 'Help-desk requests raised by employees, optionally by status.',
      inputSchema: z.object({ status: z.enum(['pending', 'in-progress', 'resolved']).optional() }),
      execute: async ({ status }) => helpView(status ? { status } : {}, 'Help requests', true),
      toModelOutput: ({ output }) => summarizeForModel(output),
    }),
};

const myHelpRequestsTool: AssistantToolDef = {
  name: 'my_help_requests',
  roles: ALL_ROLES,
  build: (ctx) =>
    tool({
      description: "The current user's own help-desk requests and HR's responses.",
      inputSchema: z.object({}),
      execute: async () => helpView({ userId: ctx.caller.userId }, 'My help requests', false),
      toModelOutput: ({ output }) => summarizeForModel(output),
    }),
};

export const contentTools = [taskReportsTool, myTaskReportsTool, holidaysTool, announcementsTool, policiesTool, helpRequestsTool, myHelpRequestsTool];
