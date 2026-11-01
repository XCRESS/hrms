import mongoose from 'mongoose';
import type { DateTime } from 'luxon';
import Employee from '../models/Employee.model.js';
import User from '../models/User.model.js';
import Attendance from '../models/Attendance.model.js';
import Leave from '../models/Leave.model.js';
import WFHRequest from '../models/WFHRequest.model.js';
import RegularizationRequest from '../models/Regularization.model.js';
import Expense from '../models/Expense.model.js';
import Settings, { type IAttendanceNudgeConfig } from '../models/Settings.model.js';
import settingsService from './settings/SettingsService.js';
import NotificationService from './notificationService.js';
import { getHolidayMap, isWorkingDay } from './workCalendar.js';
import { getISTNow, getISTDayBoundaries, toIST } from '../utils/timezone.js';
import logger from '../utils/logger.js';

/**
 * A nudge fires on the first tick inside its window, then never again that day
 * (inbox dedupeKey). The window's far edge stops a late restart from sending a
 * "time to check in" at 4 PM.
 */
const REMINDER_WINDOW_MIN = 30;
const MISSED_CHECKIN_WINDOW_MIN = 3 * 60;
const MISSED_CHECKOUT_WINDOW_MIN = 4 * 60;

interface TodayRoster {
  dayKey: string;
  startOfDay: Date;
  endOfDay: Date;
  attendance: Map<string, { checkIn?: Date; checkOut?: Date }>;
  onLeave: Set<string>;
  filedWFH: Set<string>;
}

interface StaffMember {
  employeeObjId: string;
  employeeId: string;
  department: string | null;
  userId: mongoose.Types.ObjectId;
}

const inWindow = (now: DateTime, start: DateTime, minutes: number): boolean =>
  now >= start && now < start.plus({ minutes });

const clock = (date: Date | DateTime): string =>
  ('toJSDate' in date ? date : toIST(date)).toFormat('h:mm a');

class AttendanceNudgeService {
  private running = false;

  /** One scheduler tick. Re-entrant calls are dropped, not queued. */
  async tick(now: DateTime = getISTNow()): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const settings = await Settings.getGlobalSettings();
      const nudges = settings.notifications.attendanceNudges;
      if (!nudges || !Object.values(nudges).some((n) => n?.enabled)) return;

      const roster = await this.loadRoster(now);
      if (!roster) return;

      const staff = await this.loadStaff();
      await this.nudgeStaff(now, nudges, roster, staff);

      if (nudges.hrDigest?.enabled) {
        await this.maybeSendDigest(now, nudges, roster, staff);
      }
    } catch (error) {
      logger.error({ err: error }, '[Nudges] tick failed');
    } finally {
      this.running = false;
    }
  }

  private async loadRoster(now: DateTime): Promise<TodayRoster | null> {
    const { startOfDay, endOfDay } = getISTDayBoundaries(now);
    const start = startOfDay.toJSDate();
    const end = endOfDay.toJSDate();

    if ((await getHolidayMap(now, now)).size > 0) return null;

    const [records, leaves, wfh] = await Promise.all([
      Attendance.find({ date: { $gte: start, $lte: end } }).select('employee checkIn checkOut').lean(),
      Leave.find({ status: 'approved', startDate: { $lte: end }, endDate: { $gte: start } }).select('employee').lean(),
      WFHRequest.find({ requestDate: { $gte: start, $lte: end }, status: { $in: ['pending', 'approved'] } })
        .select('employee')
        .lean(),
    ]);

    return {
      dayKey: startOfDay.toFormat('yyyy-MM-dd'),
      startOfDay: start,
      endOfDay: end,
      attendance: new Map(
        records.map((r) => [r.employee.toString(), { checkIn: r.checkIn ?? undefined, checkOut: r.checkOut ?? undefined }])
      ),
      onLeave: new Set(leaves.map((l) => l.employee.toString())),
      filedWFH: new Set(wfh.map((w) => w.employee.toString())),
    };
  }

  private async loadStaff(): Promise<StaffMember[]> {
    const employees = await Employee.find({ isActive: true }).select('_id employeeId department').lean();
    const users = await User.find({
      employee: { $in: employees.map((e) => e._id) },
      isActive: true,
    })
      .select('_id employee')
      .lean();
    const userByEmployee = new Map(users.map((u) => [String(u.employee), u._id]));

    return employees.flatMap((e) => {
      const userId = userByEmployee.get(e._id.toString());
      return userId
        ? [{ employeeObjId: e._id.toString(), employeeId: e.employeeId, department: e.department || null, userId }]
        : [];
    });
  }

  private async nudgeStaff(
    now: DateTime,
    nudges: IAttendanceNudgeConfig,
    roster: TodayRoster,
    staff: StaffMember[]
  ): Promise<void> {
    const byDepartment = new Map<string | null, StaffMember[]>();
    for (const member of staff) {
      const list = byDepartment.get(member.department) ?? [];
      list.push(member);
      byDepartment.set(member.department, list);
    }

    for (const [department, members] of byDepartment) {
      if (!(await isWorkingDay(roster.startOfDay, department))) continue;

      const hours = await settingsService.getBusinessHours(now, department);
      const attendanceSettings = await settingsService.getAttendanceSettings(department);
      const lateAt = toIST(hours.lateThreshold);
      const isHalfSaturday = now.weekday === 6 && attendanceSettings.saturdayWorkType === 'half';
      const endAt = toIST(isHalfSaturday ? hours.halfDayEnd : hours.workEnd);
      const lateLabel = clock(lateAt);

      const notCheckedIn = members.filter(
        (m) =>
          !roster.attendance.get(m.employeeObjId)?.checkIn &&
          !roster.onLeave.has(m.employeeObjId) &&
          !roster.filedWFH.has(m.employeeObjId)
      );

      if (nudges.checkInReminder?.enabled) {
        const at = lateAt.minus({ minutes: nudges.checkInReminder.minutesBefore });
        if (inWindow(now, at, Math.min(REMINDER_WINDOW_MIN, nudges.checkInReminder.minutesBefore))) {
          await this.send(notCheckedIn, 'checkin_reminder', { lateThreshold: lateLabel }, roster.dayKey);
        }
      }

      if (nudges.missedCheckIn?.enabled) {
        const at = lateAt.plus({ minutes: nudges.missedCheckIn.minutesAfter });
        if (inWindow(now, at, MISSED_CHECKIN_WINDOW_MIN)) {
          await this.send(notCheckedIn, 'missed_checkin', { lateThreshold: lateLabel }, roster.dayKey);
        }
      }

      if (nudges.missedCheckOut?.enabled) {
        const at = endAt.plus({ minutes: nudges.missedCheckOut.minutesAfter });
        if (inWindow(now, at, MISSED_CHECKOUT_WINDOW_MIN)) {
          const stillIn = members.filter((m) => {
            const record = roster.attendance.get(m.employeeObjId);
            return record?.checkIn && !record.checkOut;
          });
          for (const member of stillIn) {
            const checkIn = roster.attendance.get(member.employeeObjId)?.checkIn;
            await this.send([member], 'missed_checkout', { checkIn: checkIn ? clock(checkIn) : '' }, roster.dayKey);
          }
        }
      }
    }
  }

  private async send(
    members: StaffMember[],
    type: 'checkin_reminder' | 'missed_checkin' | 'missed_checkout',
    data: Record<string, unknown>,
    dayKey: string
  ): Promise<void> {
    if (members.length === 0) return;
    const sent = await NotificationService.deliver(
      members.map((m) => m.userId),
      type,
      data,
      { dedupeKey: (userId) => `nudge:${type}:${userId}:${dayKey}` }
    );
    if (sent.length > 0) logger.info({ type, count: sent.length }, '[Nudges] sent');
  }

  private async maybeSendDigest(
    now: DateTime,
    nudges: IAttendanceNudgeConfig,
    roster: TodayRoster,
    staff: StaffMember[]
  ): Promise<void> {
    if (!(await isWorkingDay(roster.startOfDay))) return;

    const hours = await settingsService.getBusinessHours(now);
    const lateAt = toIST(hours.lateThreshold);
    const at = toIST(hours.workStart).plus({ minutes: nudges.hrDigest.minutesAfter });
    if (!inWindow(now, at, MISSED_CHECKIN_WINDOW_MIN)) return;

    let present = 0;
    let late = 0;
    let onLeave = 0;
    for (const member of staff) {
      const checkIn = roster.attendance.get(member.employeeObjId)?.checkIn;
      if (checkIn) {
        present++;
        if (toIST(checkIn) > lateAt) late++;
      } else if (roster.onLeave.has(member.employeeObjId)) {
        onLeave++;
      }
    }

    const [leaves, wfh, regularizations, expenses] = await Promise.all([
      Leave.countDocuments({ status: 'pending' }),
      WFHRequest.countDocuments({ status: 'pending' }),
      RegularizationRequest.countDocuments({ status: 'pending' }),
      Expense.countDocuments({ status: 'pending' }),
    ]);

    const hr = await User.find({ role: { $in: ['hr', 'admin'] }, isActive: true }).select('_id').lean();
    await NotificationService.deliver(
      hr.map((u) => u._id),
      'hr_attendance_digest',
      {
        time: clock(now),
        present,
        late,
        notIn: staff.length - present - onLeave,
        onLeave,
        pending: leaves + wfh + regularizations + expenses,
      },
      { dedupeKey: (userId) => `digest:${userId}:${roster.dayKey}` }
    );
  }
}

export default new AttendanceNudgeService();
