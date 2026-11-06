import { tool } from 'ai';
import { z } from 'zod';
import Employee from '../../../../models/Employee.model.js';
import User from '../../../../models/User.model.js';
import { announcementSchema } from '../../../../validators/hr.schemas.js';
import { sendAssistantEmailSchema } from '../../../../validators/assistant.schemas.js';
import { escapeRegExp } from '../../../../utils/helpers.js';
import { checkAgainst, draftForModel, nextDraftIdentity, type Draft } from '../../drafts.js';
import type { Cell, ResultView } from '../../views.js';
import { searchDirectory } from '../directory.js';
import { latestTable } from '../tables.js';
import { STAFF_ROLES, type AssistantToolDef, type ToolContext } from '../types.js';

const draftIdInput = z.string().max(40).optional().describe('Pass the existing draftId when revising a draft; omit for a new one.');

export interface AnnouncementFields { title: string; content: string; targetAudience: 'all' | 'employee' | 'hr' | 'admin' }

const draftAnnouncementTool: AssistantToolDef = {
  name: 'draft_announcement',
  roles: STAFF_ROLES,
  build: (ctx) =>
    tool({
      description:
        'Draft (or revise) a company announcement as an editable block. Nothing is published until the user presses Publish. Never name or single out a person unless the user named them.',
      inputSchema: z.object({
        draftId: draftIdInput,
        title: z.string().max(300),
        content: z.string().max(5000),
        targetAudience: z.enum(['all', 'employee', 'hr', 'admin']).optional(),
      }),
      execute: async ({ draftId, title, content, targetAudience }): Promise<Draft<AnnouncementFields>> => {
        const fields: AnnouncementFields = { title, content, targetAudience: targetAudience ?? 'all' };
        return { kind: 'draft', draftKind: 'announcement', ...nextDraftIdentity(ctx.history, draftId), fields, issues: checkAgainst(announcementSchema, fields) };
      },
      toModelOutput: ({ output }) => draftForModel(output),
    }),
};

export interface Recipient { name: string; email: string }
export interface EmailFields {
  to: Recipient[];
  unresolved: { query: string; candidates: Recipient[] }[];
  subject: string;
  body: string;
  table?: { columns: { key: string; label: string }[]; rows: Record<string, Cell>[] } | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TABLE_ROWS = 500;

const cleanName = (first?: string, last?: string) => `${first ?? ''} ${last ?? ''}`.trim().replace(/\s+/g, ' ');

const resolveRecipient = async (query: string, ctx: ToolContext): Promise<Recipient | { query: string; candidates: Recipient[] }> => {
  const q = query.trim();
  if (EMAIL_PATTERN.test(q)) {
    const exact = new RegExp(`^\\s*${escapeRegExp(q)}\\s*$`, 'i');
    const [employee, user] = await Promise.all([
      Employee.findOne({ email: exact }).select('firstName lastName email').lean(),
      User.findOne({ email: exact }).select('name email').lean(),
    ]);
    if (employee?.email) return { name: cleanName(employee.firstName, employee.lastName), email: employee.email.trim() };
    if (user?.email) return { name: user.name, email: user.email };
    if (ctx.latestUserText.toLowerCase().includes(q.toLowerCase())) return { name: q, email: q.toLowerCase() };
    return { query: q, candidates: [] };
  }

  const { rows, exact } = await searchDirectory(q);
  const withEmail = rows.filter((r) => r.email).map((r) => ({ name: cleanName(r.firstName, r.lastName), email: r.email!.trim() }));
  if (exact && withEmail.length === 1) return withEmail[0]!;
  if (exact && withEmail.length > 1) return { query: q, candidates: withEmail.slice(0, 5) };

  const users = await User.find({ name: new RegExp(`^\\s*${escapeRegExp(q)}\\s*$`, 'i'), isActive: true }).select('name email').limit(5).lean();
  if (users.length === 1) return { name: users[0]!.name, email: users[0]!.email };
  return { query: q, candidates: [...users.map((u) => ({ name: u.name, email: u.email })), ...withEmail].slice(0, 5) };
};

const tableForEmail = (view: ResultView): NonNullable<EmailFields['table']> => {
  const columns = view.columns.map(({ key, label }) => ({ key, label }));
  const rows = view.rows.slice(0, MAX_TABLE_ROWS).map((r) => Object.fromEntries(columns.map((c) => [c.key, r[c.key] ?? null])));
  return { columns, rows };
};

const draftEmailTool: AssistantToolDef = {
  name: 'draft_email',
  roles: STAFF_ROLES,
  build: (ctx) =>
    tool({
      description:
        'Draft (or revise) an email as an editable block, sent from the HRMS when the user presses Send. Recipients are names, employee IDs or emails; they are resolved against the company directory, and an address is used only if it is in the directory or the user typed it. A table fetched earlier in the same turn (e.g. attendance) is attached automatically; set includeTable true to attach the latest table from earlier in the conversation, or false to send without one.',
      inputSchema: z.object({
        draftId: draftIdInput,
        recipientQueries: z.array(z.string().trim().min(1).max(200)).max(20),
        subject: z.string().max(200),
        body: z.string().max(5000),
        includeTable: z.boolean().optional(),
      }),
      execute: async ({ draftId, recipientQueries, subject, body, includeTable }): Promise<Draft<EmailFields>> => {
        const resolved = await Promise.all(recipientQueries.map((q) => resolveRecipient(q, ctx)));
        const to = resolved.filter((r): r is Recipient => 'email' in r);
        const unique = [...new Map(to.map((r) => [r.email.toLowerCase(), r])).values()];
        const fields: EmailFields = {
          to: unique,
          unresolved: resolved.filter((r): r is { query: string; candidates: Recipient[] } => !('email' in r)),
          subject,
          body,
          table: null,
        };
        const source = includeTable === false ? undefined : latestTable(ctx, includeTable !== true);
        if (source) fields.table = tableForEmail(source);
        const issues = [
          ...checkAgainst(sendAssistantEmailSchema, { to: unique.map((r) => r.email), subject, body, table: fields.table }),
          ...fields.unresolved.map((u) => (u.candidates.length ? `Pick who "${u.query}" is` : `No one called "${u.query}" in the directory`)),
          ...(includeTable && !fields.table ? ['There is no table in this conversation to attach'] : []),
        ];
        return { kind: 'draft', draftKind: 'email', ...nextDraftIdentity(ctx.history, draftId), fields, issues };
      },
      toModelOutput: ({ output }) => ({
        type: 'json' as const,
        value: {
          ...(draftForModel(output).value as Record<string, string | number | string[]>),
          recipients: output.fields.to.map((r) => r.name),
          unresolved: output.fields.unresolved.map((u) => ({ query: u.query, candidates: u.candidates.map((c) => c.name) })),
          attachedTableRows: output.fields.table?.rows.length ?? 0,
        },
      }),
    }),
};

export const writingDraftTools = [draftAnnouncementTool, draftEmailTool];
