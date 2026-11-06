import type { Types } from 'mongoose';
import Leave from '../models/Leave.model.js';
import WFHRequest from '../models/WFHRequest.model.js';
import RegularizationRequest from '../models/Regularization.model.js';
import Employee from '../models/Employee.model.js';
import User from '../models/User.model.js';
import { expenseQuery } from './expenseQueries.js';
import { toIST } from '../utils/timezone.js';

export interface RequestFilter {
  employee?: Types.ObjectId | Types.ObjectId[];
  status?: string;
  createdFrom?: Date;
  createdTo?: Date;
  /** The day(s) the request is for, rather than when it was made. */
  occursFrom?: Date;
  occursTo?: Date;
}

const between = (from?: Date, to?: Date) => ({ ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) });
const occurs = (filter: RequestFilter) => Boolean(filter.occursFrom || filter.occursTo);

/** Same semantics as the Requests page: date bounds apply to when the request was made. */
export const requestFilter = ({ employee, status, createdFrom, createdTo }: RequestFilter) => ({
  ...(employee ? { employee: Array.isArray(employee) ? { $in: employee } : employee } : {}),
  ...(status ? { status } : {}),
  ...(createdFrom || createdTo
    ? { createdAt: { ...(createdFrom ? { $gte: createdFrom } : {}), ...(createdTo ? { $lte: createdTo } : {}) } }
    : {}),
});

export type RequestDomain = 'leave' | 'wfh' | 'regularization' | 'expense';

export interface RequestItem {
  id: string;
  domain: RequestDomain;
  employee: string | null;
  employeeName: string;
  date: string | null;
  dateLabel: string;
  detail: string;
  status: string;
  requestedOn: string | null;
}

const clock = (value: unknown): string => {
  if (!value) return '—';
  if (typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value)) return value;
  const parsed = toIST(value as Date);
  return parsed.isValid ? parsed.toFormat('HH:mm') : String(value);
};
const isoDate = (d: unknown) => (d ? toIST(d as Date).toISODate() : null);
const shortDate = (d: unknown) => (d ? toIST(d as Date).toFormat('d LLL yyyy') : '');
const cleanName = (first?: string, last?: string) => `${first ?? ''} ${last ?? ''}`.trim().replace(/\s+/g, ' ');

const namesById = async (ids: (Types.ObjectId | undefined | null)[]) => {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  const employees = await Employee.find({ _id: { $in: unique } }).select('firstName lastName').lean();
  return new Map(employees.map((e) => [e._id.toString(), cleanName(e.firstName, e.lastName)]));
};

const MAX_ITEMS = 500;

export const listRequestItems = async (domain: RequestDomain, filter: RequestFilter): Promise<RequestItem[]> => {
  if (domain === 'leave') {
    const leaves = await Leave.find({
      ...requestFilter(filter),
      ...(occurs(filter)
        ? { ...(filter.occursTo ? { startDate: { $lte: filter.occursTo } } : {}), ...(filter.occursFrom ? { endDate: { $gte: filter.occursFrom } } : {}) }
        : {}),
    })
      .sort({ createdAt: -1 })
      .limit(MAX_ITEMS)
      .lean();
    const names = await namesById(leaves.map((l) => l.employee));
    return leaves.map((l) => {
      const range = isoDate(l.startDate) === isoDate(l.endDate) ? shortDate(l.startDate) : `${shortDate(l.startDate)} – ${shortDate(l.endDate)}`;
      return {
        id: l._id.toString(),
        domain,
        employee: l.employee ? String(l.employee) : null,
        employeeName: names.get(String(l.employee)) ?? l.employeeName ?? 'Unknown',
        date: isoDate(l.startDate),
        dateLabel: range,
        detail: `${l.leaveType}${l.numberOfDays ? ` · ${l.numberOfDays} day(s)` : ''} · ${l.reason ?? ''}`.trim(),
        status: l.status,
        requestedOn: isoDate(l.createdAt),
      };
    });
  }

  if (domain === 'wfh') {
    const requests = await WFHRequest.find({ ...requestFilter(filter), ...(occurs(filter) ? { requestDate: between(filter.occursFrom, filter.occursTo) } : {}) })
      .sort({ createdAt: -1 })
      .limit(MAX_ITEMS)
      .lean();
    const names = await namesById(requests.map((r) => r.employee));
    return requests.map((r) => ({
      id: r._id.toString(),
      domain,
      employee: r.employee ? String(r.employee) : null,
      employeeName: names.get(String(r.employee)) ?? r.employeeName ?? 'Unknown',
      date: isoDate(r.requestDate),
      dateLabel: shortDate(r.requestDate),
      detail: r.reason ?? '',
      status: r.status,
      requestedOn: isoDate(r.createdAt),
    }));
  }

  if (domain === 'regularization') {
    const regs = await RegularizationRequest.find({ ...requestFilter(filter), ...(occurs(filter) ? { date: between(filter.occursFrom, filter.occursTo) } : {}) })
      .sort({ createdAt: -1 })
      .limit(MAX_ITEMS)
      .lean();
    const names = await namesById(regs.map((r) => r.employee));
    const users = new Map(
      (await User.find({ _id: { $in: regs.map((r) => r.user).filter(Boolean) } }).select('name').lean()).map((u) => [u._id.toString(), u.name])
    );
    return regs.map((r) => ({
      id: r._id.toString(),
      domain,
      employee: r.employee ? String(r.employee) : null,
      employeeName: names.get(String(r.employee)) ?? users.get(String(r.user)) ?? 'Unknown',
      date: isoDate(r.date),
      dateLabel: shortDate(r.date),
      detail: `${clock(r.requestedCheckIn)} → ${clock(r.requestedCheckOut)} · ${r.reason ?? ''}`.trim(),
      status: r.status,
      requestedOn: isoDate(r.createdAt),
    }));
  }

  const expenses = (await expenseQuery({
    ...(filter.employee ? { employee: filter.employee } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    ...((filter.occursFrom ?? filter.createdFrom) ? { startDate: filter.occursFrom ?? filter.createdFrom } : {}),
    ...((filter.occursTo ?? filter.createdTo) ? { endDate: filter.occursTo ?? filter.createdTo } : {}),
  })
    .limit(MAX_ITEMS)
    .lean()) as unknown as {
    _id: Types.ObjectId;
    employee?: { _id: Types.ObjectId; firstName?: string; lastName?: string } | null;
    employeeName?: string;
    date: Date;
    item: string;
    amount: number;
    status: string;
    createdAt?: Date;
  }[];
  return expenses.map((e) => ({
    id: e._id.toString(),
    domain,
    employee: e.employee ? e.employee._id.toString() : null,
    employeeName: e.employee ? cleanName(e.employee.firstName, e.employee.lastName) : (e.employeeName ?? 'Unknown'),
    date: isoDate(e.date),
    dateLabel: shortDate(e.date),
    detail: `${e.item} · ₹${e.amount.toLocaleString('en-IN')}`,
    status: e.status,
    requestedOn: isoDate(e.createdAt),
  }));
};
