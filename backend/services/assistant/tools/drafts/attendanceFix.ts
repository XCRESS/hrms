import { tool } from 'ai';
import { z } from 'zod';
import { Types } from 'mongoose';
import Attendance from '../../../../models/Attendance.model.js';
import Employee from '../../../../models/Employee.model.js';
import RegularizationRequest from '../../../../models/Regularization.model.js';
import { toIST } from '../../../../utils/timezone.js';
import { BULK_CONFIRM_THRESHOLD, draftForModel, nextDraftIdentity, type Draft } from '../../drafts.js';
import { STAFF_ROLES, type AssistantToolDef } from '../types.js';
import { isoDate, objectId, resolveRange } from '../attendance.js';

export interface AttendanceFixRow { recordId: string; date: string; checkIn: string; preselected: boolean; flag?: string }
export interface AttendanceFixFields { employeeName: string; checkOutTime: string; rows: AttendanceFixRow[] }

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:mm');

const draftMissingCheckoutsTool: AssistantToolDef = {
  name: 'draft_missing_checkouts',
  roles: STAFF_ROLES,
  build: (ctx) =>
    tool({
      description:
        "Set a check-out time on an employee's days that have a check-in but no check-out, in a date range (today excluded). Shows a checklist the user confirms; nothing changes until then. Times are 24-hour HH:mm in IST (4:30 PM = 16:30).",
      inputSchema: z.object({ draftId: z.string().max(40).optional(), employee: objectId, startDate: isoDate, endDate: isoDate, checkOutTime: hhmm }),
      execute: async ({ draftId, employee, startDate, endDate, checkOutTime }): Promise<Draft<AttendanceFixFields>> => {
        const id = new Types.ObjectId(employee);
        const emp = await Employee.findById(id).select('firstName lastName').lean();
        const employeeName = `${emp?.firstName ?? ''} ${emp?.lastName ?? ''}`.trim().replace(/\s+/g, ' ');
        const range = resolveRange(startDate, endDate, ctx.now.minus({ days: 1 }));
        const base = { kind: 'draft' as const, draftKind: 'attendanceFix' as const, ...nextDraftIdentity(ctx.history, draftId) };
        if ('error' in range) return { ...base, fields: { employeeName, checkOutTime, rows: [] }, issues: [range.error] };

        const end = toIST(range.end).endOf('day').toJSDate();
        const [records, pendingRegs] = await Promise.all([
          Attendance.find({ employee: id, date: { $gte: range.start, $lte: end }, checkIn: { $ne: null }, $or: [{ checkOut: null }, { checkOut: { $exists: false } }] })
            .select('_id date checkIn')
            .sort({ date: 1 })
            .lean(),
          RegularizationRequest.find({ employee: id, status: 'pending', date: { $gte: range.start, $lte: end } }).select('date').lean(),
        ]);
        const pendingDays = new Set(pendingRegs.map((r) => toIST(r.date).toISODate()));

        const rows: AttendanceFixRow[] = records.map((r) => {
          const day = toIST(r.date).toISODate()!;
          const checkIn = toIST(r.checkIn as Date).toFormat('HH:mm');
          const flag = pendingDays.has(day)
            ? 'A regularization request is pending for this day'
            : checkIn >= checkOutTime
              ? `Checked in at ${checkIn}, after ${checkOutTime}`
              : undefined;
          return { recordId: r._id.toString(), date: day, checkIn, preselected: !flag, ...(flag ? { flag } : {}) };
        });
        const count = rows.filter((r) => r.preselected).length;
        return {
          ...base,
          fields: { employeeName, checkOutTime, rows },
          issues: emp ? (rows.length ? [] : ['No days with a missing check-out in that range.']) : ['Employee not found'],
          bulk: { count, requiresSecondConfirm: count > BULK_CONFIRM_THRESHOLD },
        };
      },
      toModelOutput: ({ output }) => ({
        type: 'json' as const,
        value: {
          ...(draftForModel(output).value as Record<string, string | number | string[]>),
          days: output.fields.rows.map((r) => `${r.date}${r.flag ? ` (${r.flag})` : ''}`),
        },
      }),
    }),
};

export const attendanceFixDraftTools = [draftMissingCheckoutsTool];
