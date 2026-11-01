/**
 * Working-day / non-working-day detection for the client.
 *
 * Mirrors the backend source of truth (`services/workCalendar.ts`) so that a
 * warning shown before check-in matches how the attendance record is actually
 * treated afterwards.
 *
 * All evaluation happens in IST, not the browser's timezone.
 */
import type { DateTime } from 'luxon';
import { getISTNow, getISTDateString } from './luxonUtils';
import type { EffectiveSettings, Holiday } from '@/types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th'];

export type NonWorkingDayReason = 'weekend' | 'saturday_off' | 'holiday';

export interface NonWorkingDayWarning {
  isNonWorkingDay: true;
  reason: NonWorkingDayReason;
  dayName?: string;
  saturdayWeek?: number;
  holidayTitle?: string;
  holidayType?: string;
  message: string;
}

type AttendanceRules = Partial<EffectiveSettings>['attendance'];

/** Luxon uses 1=Monday..7=Sunday; settings use JS convention 0=Sunday..6=Saturday. */
const toJsWeekday = (date: DateTime): number => date.weekday % 7;

/** Which Saturday of the month a date falls on, 1-5. */
export const getSaturdayWeekOfMonth = (date: DateTime): number => Math.ceil(date.day / 7);

/**
 * Whether the day is off under the weekly schedule and Saturday rules, ignoring
 * holidays. Without settings, only Sunday is off.
 */
export const getWeeklyOffReason = (
  attendance: AttendanceRules | undefined,
  day: DateTime
): 'weekend' | 'saturday_off' | null => {
  const dayOfWeek = toJsWeekday(day);
  const workingDays = attendance?.workingDays?.length ? attendance.workingDays : [1, 2, 3, 4, 5, 6];
  if (!workingDays.includes(dayOfWeek)) return 'weekend';
  if (dayOfWeek === 6 && (attendance?.saturdayHolidays ?? []).includes(getSaturdayWeekOfMonth(day))) {
    return 'saturday_off';
  }
  return null;
};

/** Only active public holidays close the office; optional/restricted ones are taken as leave. */
export const isOfficeClosingHoliday = (holiday: Holiday): boolean =>
  holiday.isActive !== false && (holiday.type ?? (holiday.isOptional ? 'optional' : 'public')) === 'public';

/**
 * Decide whether the given day is a non-working day, and why.
 * @returns warning payload, or null when it is an ordinary working day
 */
export const getNonWorkingDayWarning = (
  settings: Partial<EffectiveSettings> | undefined,
  holidays: Holiday[] | undefined,
  now: DateTime = getISTNow()
): NonWorkingDayWarning | null => {
  const dayName = DAY_NAMES[toJsWeekday(now)];

  const todayString = getISTDateString(now);
  const todayHoliday = holidays?.find(
    (holiday) => !!holiday?.date && isOfficeClosingHoliday(holiday) && getISTDateString(holiday.date) === todayString
  );

  if (todayHoliday) {
    const title = todayHoliday.title || (todayHoliday as { name?: string }).name || 'a company holiday';
    return {
      isNonWorkingDay: true,
      reason: 'holiday',
      holidayTitle: title,
      holidayType: 'public',
      message: `Today is ${title}. Are you sure you want to check in?`
    };
  }

  const weeklyOff = getWeeklyOffReason(settings?.attendance, now);

  if (weeklyOff === 'weekend') {
    return {
      isNonWorkingDay: true,
      reason: 'weekend',
      dayName,
      message: `Today is ${dayName}, which is configured as a non-working day. Are you sure you want to check in?`
    };
  }

  if (weeklyOff === 'saturday_off') {
    const saturdayWeek = getSaturdayWeekOfMonth(now);
    return {
      isNonWorkingDay: true,
      reason: 'saturday_off',
      dayName,
      saturdayWeek,
      message: `Today is the ${ORDINALS[saturdayWeek]} Saturday of the month, which is configured as a non-working Saturday. Are you sure you want to check in?`
    };
  }

  return null;
};
