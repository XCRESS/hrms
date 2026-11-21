import { tool } from 'ai';
import { z } from 'zod';
import { Types } from 'mongoose';
import Company from '../../../models/Company.model.js';
import Letter from '../../../models/Letter.model.js';
import LetterTemplate from '../../../models/LetterTemplate.model.js';
import { buildDraftValues } from '../../letters/issue.js';
import { fieldLabelsFor, fieldTypesFor, type FieldType, type LetterEmployee } from '../../letters/fields.js';
import { loadLetterhead } from '../../letters/letterheads.js';
import { suggestFieldMapping } from '../../letters/aiMapping.js';
import { applyFieldMapping } from '../../letters/mapping.js';
import { EMPLOYEE_FIELDS, personValues } from '../../letters/person.js';
import { collectFieldKeys } from '../../letters/resolve.js';
import { importWordLetter } from '../../letters/templates.js';
import Employee from '../../../models/Employee.model.js';
import { loadOwnedFile, MEDIA } from '../files/store.js';
import { draftForModel, nextDraftIdentity, type Draft } from '../drafts.js';
import type { JSONValue } from 'ai';
import { emptyView, summarizeForModel, type ModelOutput, type ResultView } from '../views.js';
import { objectId } from './attendance.js';
import { STAFF_ROLES, type AssistantToolDef, type ToolContext } from './types.js';
import type { LetterDoc } from '../../../validators/letter.schemas.js';
import type { IAskField, LetterKind } from '../../../models/LetterTemplate.model.js';

const draftIdInput = z.string().max(40).optional().describe('Pass the existing draftId when revising a draft; omit for a new one.');
const STATUS_LABEL: Record<string, string> = { draft: 'Draft', issuing: 'Issuing', issued: 'Issued', sent: 'Sent', void: 'Void' };

const companyByName = (name: string) => Company.findOne({ name }).collation({ locale: 'en', strength: 2 }).select('name').lean();

const letterTemplatesTool: AssistantToolDef = {
  name: 'letter_templates',
  roles: STAFF_ROLES,
  build: () =>
    tool({
      description: 'The letter templates HR can issue (appointment, offer, experience…), with the details each one asks for. Call before draft_letter to pick the template and learn its detail keys.',
      inputSchema: z.object({}),
      execute: async () => {
        const templates = await LetterTemplate.find({ active: true }).select('name kind company askFields').sort({ name: 1 }).lean();
        const companies = new Map((await Company.find().select('name').lean()).map((c) => [String(c._id), c.name]));
        // Rows also carry the id and detail keys, which have no column: the model needs them, the user doesn't.
        return {
          kind: 'result',
          title: 'Letter templates',
          columns: [
            { key: 'name', label: 'Template', kind: 'text' },
            { key: 'for', label: 'For', kind: 'text' },
            { key: 'company', label: 'Company', kind: 'text' },
            { key: 'details', label: 'Asks for', kind: 'text' },
          ],
          rows: templates.map((t) => ({
            id: String(t._id),
            name: t.name,
            for: t.kind === 'employee' ? 'Employees' : 'Candidates / others',
            company: companies.get(String(t.company)) ?? '',
            details: t.askFields.map((f) => f.label).join(', ') || '—',
            detailKeys: t.askFields.map((f) => `ask.${f.key} = ${f.label}${f.required ? ' (required)' : ''}${f.default ? ` (usually "${f.default}")` : ''}`).join('; '),
          })),
          defaultView: 'table',
          link: { label: 'Open letter templates', href: '/letters/templates' },
        } satisfies ResultView;
      },
      toModelOutput: ({ output }): ModelOutput => ({
        type: 'json',
        value: { templates: output.rows.map((r) => ({ id: r.id ?? null, name: r.name ?? null, for: r.for ?? null, company: r.company ?? null, details: r.detailKeys ?? null })), note: 'The table is shown to the user.' },
      }),
    }),
};

const lettersTool: AssistantToolDef = {
  name: 'letters',
  roles: STAFF_ROLES,
  build: (ctx) =>
    tool({
      description: 'Letters issued or drafted by HR, newest first. Filter by employee (id from find_employee), status, or recent days.',
      inputSchema: z.object({
        employee: objectId.optional(),
        status: z.enum(['draft', 'issued', 'sent', 'void']).optional(),
        days: z.number().int().min(1).max(3650).optional().describe('Only letters created in the last N days'),
      }),
      execute: async ({ employee, status, days }) => {
        const since = days ? ctx.now.minus({ days }).toJSDate() : undefined;
        const letters = await Letter.find({
          ...(employee ? { employee: new Types.ObjectId(employee) } : {}),
          ...(status ? { status } : { status: { $ne: 'issuing' } }),
          ...(since ? { createdAt: { $gte: since } } : {}),
        })
          .select('templateName recipient referenceNo status issuedAt createdAt')
          .sort({ createdAt: -1 })
          .limit(200)
          .lean();
        if (!letters.length) return emptyView('Letters', 'No letters match');
        return {
          kind: 'result',
          title: 'Letters',
          columns: [
            { key: 'recipient', label: 'Recipient', kind: 'text' },
            { key: 'letter', label: 'Letter', kind: 'text' },
            { key: 'reference', label: 'Reference', kind: 'text' },
            { key: 'status', label: 'Status', kind: 'status' },
            { key: 'date', label: 'Date', kind: 'date' },
          ],
          rows: letters.map((l) => ({
            recipient: l.recipient.name,
            letter: l.templateName,
            reference: l.referenceNo ?? null,
            status: STATUS_LABEL[l.status] ?? l.status,
            date: (l.issuedAt ?? l.createdAt).toISOString().slice(0, 10),
          })),
          defaultView: 'table',
          link: { label: 'Open letters', href: '/letters' },
        } satisfies ResultView;
      },
      toModelOutput: ({ output }) => summarizeForModel(output, 15),
    }),
};

export interface LetterEntry {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
}

export interface LetterDraftFields {
  templateId: string;
  templateName: string;
  kind: LetterKind;
  employeeId: string | null;
  employeeName: string | null;
  entries: LetterEntry[];
  values: Record<string, string>;
  sendTo: string;
}

const draftLetterTool: AssistantToolDef = {
  name: 'draft_letter',
  roles: STAFF_ROLES,
  build: (ctx: ToolContext) =>
    tool({
      description:
        'Prepare a letter (appointment, offer, experience…) from a template for the user to check, preview, issue and email. ' +
        'Employee templates need an employee id from find_employee; candidate templates need recipient name and email. ' +
        'Pass the details the user gave in values, keyed by the detail keys from letter_templates (e.g. "ask.grade"). Nothing is issued until the user presses the button.',
      inputSchema: z.object({
        draftId: draftIdInput,
        template: objectId.describe('Template id from letter_templates'),
        employee: objectId.optional(),
        recipient: z.object({ name: z.string().min(1).max(150), email: z.email().optional(), address: z.string().max(500).optional() }).optional(),
        values: z.record(z.string().max(60), z.string().max(2000)).optional(),
        sendTo: z.email().optional().describe('Email address to send to, when different from the recipient’s own'),
      }),
      execute: async ({ draftId, template: templateId, employee, recipient, values, sendTo }): Promise<Draft<LetterDraftFields>> => {
        const identity = nextDraftIdentity(ctx.history, draftId);
        const template = await LetterTemplate.findOne({ _id: templateId, active: true }).lean();
        const issues: string[] = [];
        if (!template) {
          return { kind: 'draft', draftKind: 'letter', ...identity, issues: ['That template was not found. Call letter_templates.'], fields: { templateId, templateName: '', kind: 'employee', employeeId: null, employeeName: null, entries: [], values: {}, sendTo: '' } };
        }
        const company = await Company.findById(template.company).select('name address').lean();
        const letterhead = await loadLetterhead(template.company);
        if (!letterhead.configured) issues.push('This company has no letterhead yet — set it up under Letters → Letterheads before issuing.');

        let person: (LetterEmployee & { _id: Types.ObjectId }) | null = null;
        if (template.kind === 'employee') {
          person = employee ? await Employee.findById(employee).select(EMPLOYEE_FIELDS).lean<LetterEmployee & { _id: Types.ObjectId }>() : null;
          if (!person) issues.push('Choose the employee this letter is for.');
        } else if (!recipient) {
          issues.push('Add the recipient’s name and email.');
        }

        const labels = fieldLabelsFor(template.askFields);
        const keyOf = (k: string) => labels[k] !== undefined ? k : Object.entries(labels).find(([, label]) => label.toLowerCase() === k.toLowerCase())?.[0] ?? k;
        const overrides = Object.fromEntries(Object.entries(values ?? {}).map(([k, v]) => [keyOf(k), v]));
        const draftValues = buildDraftValues({
          kind: template.kind,
          askFields: template.askFields,
          employee: person ?? undefined,
          company: company ?? { name: '' },
          letterhead,
          recipient: recipient ? { name: recipient.name, email: recipient.email, address: recipient.address } : undefined,
          overrides,
        });

        const used = collectFieldKeys(template.body).filter((k) => !k.startsWith('letter.'));
        const types = fieldTypesFor(template.askFields);
        const keys = [...new Set([...used, ...template.askFields.map((f) => `ask.${f.key}`), 'recipient.name', 'recipient.email'])];
        const required = new Set([...used, ...template.askFields.filter((f) => f.required).map((f) => `ask.${f.key}`), 'recipient.name']);
        const entries = keys.filter((k) => types[k]).map((k) => ({ key: k, label: labels[k] ?? k, type: types[k]!, required: required.has(k) }));
        const missing = entries.filter((e) => e.required && !draftValues[e.key]?.trim()).map((e) => e.label);
        if (missing.length) issues.push(`Still needed: ${missing.join(', ')}`);

        return {
          kind: 'draft',
          draftKind: 'letter',
          ...identity,
          issues,
          fields: {
            templateId,
            templateName: template.name,
            kind: template.kind,
            employeeId: person ? String(person._id) : null,
            employeeName: person ? `${person.firstName} ${person.lastName}` : null,
            entries,
            values: draftValues,
            sendTo: sendTo ?? draftValues['recipient.email'] ?? '',
          },
        };
      },
      toModelOutput: ({ output }) => draftForModel(output),
    }),
};

export interface LetterTemplateDraftFields {
  name: string;
  kind: LetterKind;
  companyId: string | null;
  body: LetterDoc;
  askFields: IAskField[];
  applied: Array<{ text: string; label: string; count: number }>;
  warnings: string[];
}

const templateFromWordTool: AssistantToolDef = {
  name: 'template_from_word',
  roles: STAFF_ROLES,
  build: (ctx: ToolContext) =>
    tool({
      description:
        'Turn an attached Word (.docx) letter into a reusable letter template: keeps its formatting and finds the details that change per letter (name, dates, grade, address…). ' +
        'Pass the file id from the attachment. Pass writtenFor (employee id) when the user says who the letter was written for. The user reviews and saves it.',
      inputSchema: z.object({
        draftId: draftIdInput,
        file: z.string().max(40).describe('The attached file id'),
        name: z.string().min(1).max(100).optional().describe('Template name, e.g. "Appointment letter"'),
        kind: z.enum(['employee', 'manual']).describe('employee: for existing employees; manual: offer letters and other people not in the HRMS'),
        company: z.string().max(100).optional().describe('Company name whose letterhead the template uses'),
        writtenFor: objectId.optional(),
      }),
      execute: async ({ draftId, file: fileId, name, kind, company, writtenFor }): Promise<Draft<LetterTemplateDraftFields>> => {
        const identity = nextDraftIdentity(ctx.history, draftId);
        const empty: LetterTemplateDraftFields = { name: name ?? '', kind, companyId: null, body: { type: 'doc', content: [{ type: 'paragraph' }] }, askFields: [], applied: [], warnings: [] };
        const file = await loadOwnedFile(fileId, ctx.caller.userId);
        if (file.mediaType !== MEDIA.docx) return { kind: 'draft', draftKind: 'letterTemplate', ...identity, issues: ['That file is not a Word (.docx) document.'], fields: empty };

        const values = writtenFor ? await personValues(writtenFor) : undefined;
        const imported = await importWordLetter(file.data, values);
        const suggestions = await suggestFieldMapping(imported.doc, kind, ctx.caller.role);
        const mapped = applyFieldMapping(imported.doc, kind, [], suggestions);

        const companyName = company ?? (values ? values['company.name'] : undefined);
        const match = companyName ? await companyByName(companyName) : null;
        const issues = [...(match ? [] : ['Choose the company whose letterhead this template uses.']), ...(name ? [] : ['Give the template a name.'])];

        return {
          kind: 'draft',
          draftKind: 'letterTemplate',
          ...identity,
          issues,
          fields: {
            name: name ?? '',
            kind,
            companyId: match ? String(match._id) : null,
            body: mapped.doc,
            askFields: mapped.askFields,
            applied: [...imported.found.map((f) => ({ text: f.label, label: f.label, count: f.count })), ...mapped.applied],
            warnings: imported.warnings,
          },
        };
      },
      toModelOutput: ({ output }): ModelOutput => {
        const base = draftForModel(output);
        if (base.type !== 'json') return base;
        return {
          type: 'json',
          value: {
            ...(base.value as { [key: string]: JSONValue }),
            fieldsFound: output.fields.applied.map((a) => a.label),
            detailsToFill: output.fields.askFields.map((f) => f.label),
          },
        };
      },
    }),
};

export const letterTools: AssistantToolDef[] = [letterTemplatesTool, lettersTool, draftLetterTool, templateFromWordTool];
