import { tool } from 'ai';
import { z } from 'zod';
import { listRequestItems, type RequestDomain, type RequestFilter, type RequestItem } from '../../requestQueries.js';
import { parseISTDateString } from '../../../utils/timezone.js';
import { emptyView, splitByPersonInput, summarizeForModel, withPersonTabs, type ResultView } from '../views.js';
import { ALL_ROLES, STAFF_ROLES, type AssistantToolDef } from './types.js';
import { Types } from 'mongoose';
import { isoDate, objectId } from './attendance.js';

const DOMAINS = ['leave', 'wfh', 'regularization', 'expense'] as const satisfies readonly RequestDomain[];
const DOMAIN_LABEL: Record<RequestDomain, string> = { leave: 'Leave', wfh: 'WFH', regularization: 'Regularization', expense: 'Expense' };
const LINKS: Record<RequestDomain, string> = { leave: '/admin/requests', wfh: '/admin/requests', regularization: '/admin/requests', expense: '/admin/expenses' };

export const occurringRange = (startDate?: string, endDate?: string): Pick<RequestFilter, 'occursFrom' | 'occursTo'> => ({
  ...(startDate ? { occursFrom: parseISTDateString(startDate).startOf('day').toJSDate() } : {}),
  ...(endDate ? { occursTo: parseISTDateString(endDate).endOf('day').toJSDate() } : {}),
});

export const createdRange = (startDate?: string, endDate?: string): Pick<RequestFilter, 'createdFrom' | 'createdTo'> => ({
  ...(startDate ? { createdFrom: parseISTDateString(startDate).startOf('day').toJSDate() } : {}),
  ...(endDate ? { createdTo: parseISTDateString(endDate).endOf('day').toJSDate() } : {}),
});

const requestsView = (items: RequestItem[], title: string, withPerson: boolean, link?: string): ResultView => ({
  kind: 'result',
  title,
  columns: [
    { key: 'type', label: 'Type', kind: 'text' },
    ...(withPerson ? [{ key: 'name', label: 'Name', kind: 'text' as const }] : []),
    { key: 'when', label: 'For', kind: 'text' },
    { key: 'detail', label: 'Details', kind: 'text' },
    { key: 'status', label: 'Status', kind: 'status' },
    { key: 'requestedOn', label: 'Requested', kind: 'date' },
  ],
  rows: items.map((i) => ({
    id: i.id,
    type: DOMAIN_LABEL[i.domain],
    name: i.employeeName,
    when: i.dateLabel,
    detail: i.detail,
    status: i.status,
    requestedOn: i.requestedOn,
  })),
  tiles: DOMAINS.map((d) => ({
    key: d,
    label: DOMAIN_LABEL[d],
    value: items.filter((i) => i.domain === d).length,
    filter: { column: 'type', equals: DOMAIN_LABEL[d] },
  })).filter((t) => t.value > 0),
  defaultView: 'table',
  ...(link ? { link: { label: 'Requests', href: link } } : {}),
});

const typeInput = z.enum([...DOMAINS, 'all']);

const pendingRequestsTool: AssistantToolDef = {
  name: 'requests',
  roles: STAFF_ROLES,
  build: () =>
    tool({
      description:
        'Leave, WFH, regularization and expense requests, for everyone or only the given employees (ids from find_employee). ' +
        'match "occurring" filters by the day(s) the request is for (use it for "Kunal’s leaves last month"); "requested" filters by when it was made, like the Requests page (use it for queues such as "pending requests from last week").',
      inputSchema: z.object({
        type: typeInput,
        status: z.enum(['pending', 'approved', 'rejected', 'all']).optional().describe('Defaults to all for named employees, otherwise pending'),
        match: z.enum(['occurring', 'requested']).optional(),
        startDate: isoDate.optional(),
        endDate: isoDate.optional(),
        employees: z.array(objectId).max(50).optional().describe('Only these employees'),
        splitByPerson: splitByPersonInput,
      }),
      execute: async ({ type, status, match, startDate, endDate, employees, splitByPerson }) => {
        const named = Boolean(employees?.length);
        const effectiveStatus = status ?? (named ? 'all' : 'pending');
        const range = (match ?? (named ? 'occurring' : 'requested')) === 'occurring' ? occurringRange(startDate, endDate) : createdRange(startDate, endDate);
        const filter: RequestFilter = {
          ...(effectiveStatus === 'all' ? {} : { status: effectiveStatus }),
          ...range,
          ...(named ? { employee: employees!.map((id) => new Types.ObjectId(id)) } : {}),
        };
        const domains = type === 'all' ? DOMAINS : [type];
        const items = (await Promise.all(domains.map((d) => listRequestItems(d, filter)))).flat();
        const people = named ? ` · ${[...new Set(items.map((i) => i.employeeName))].join(', ')}` : '';
        const title = `${type === 'all' ? 'Requests' : `${DOMAIN_LABEL[type]} requests`}${effectiveStatus === 'all' ? '' : ` · ${effectiveStatus}`}${people}`;
        if (!items.length) return emptyView(title, 'None found');
        return withPersonTabs(requestsView(items, title, true, type === 'all' ? '/admin/requests' : LINKS[type]), splitByPerson);
      },
      toModelOutput: ({ output }) => summarizeForModel(output),
    }),
};

const myRequestsTool: AssistantToolDef = {
  name: 'my_requests',
  roles: ALL_ROLES,
  build: (ctx) =>
    tool({
      description: "The current user's own leave, WFH, regularization and expense requests.",
      inputSchema: z.object({ type: typeInput, status: z.enum(['pending', 'approved', 'rejected']).optional() }),
      execute: async ({ type, status }) => {
        if (!ctx.caller.employee) return emptyView('My requests', 'No employee profile is linked to your account.');
        const filter: RequestFilter = { employee: ctx.caller.employee, ...(status ? { status } : {}) };
        const domains = type === 'all' ? DOMAINS : [type];
        const items = (await Promise.all(domains.map((d) => listRequestItems(d, filter)))).flat();
        if (!items.length) return emptyView('My requests', 'None found');
        return requestsView(items, 'My requests', false);
      },
      toModelOutput: ({ output }) => summarizeForModel(output),
    }),
};

export const requestTools = [pendingRequestsTool, myRequestsTool];
