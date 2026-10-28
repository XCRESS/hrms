/**
 * Working-day / non-working-day detection for the client.
 *
 * Mirrors the backend source of truth (`SettingsService.isWorkingDay` and
 * `SettingsService.getSaturdayWeekOfMonth`) so that a warning shown before
 * check-in matches how the attendance record is actually treated afterwards.
 *
 * All evaluation happens in IST, not the browser's timezone.
 */
import type { DateTime } from 'luxon';
import { getISTNow, getISTDateString } from './luxonUtils';
import type { EffectiveSettings, Holiday } from '@/types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ORDINALS = ['', '1st', '2nd', '3rd', '4th'];

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

/** Luxon uses 1=Monday..7=Sunday; settings use JS convention 0=Sunday..6=Saturday. */
const toJsWeekday = (date: DateTime): number => (date.weekday === 7 ? 0 : date.weekday);

/**
 * Which Saturday of the month a date falls on, 1-4.
 *
 * Matches `SettingsService.getSaturdayWeekOfMonth`, including its clamp: a 5th
 * Saturday is reported as the 4th, because `saturdayHolidays` only accepts 1-4.
 */
export const getSaturdayWeekOfMonth = (date: DateTime): number => {
  const firstDayWeekday = toJsWeekday(date.startOf('month'));
  const firstSaturday = firstDayWeekday === 6 ? 1 : 7 - firstDayWeekday;
  const saturdayWeek = Math.ceil((date.day - firstSaturday + 1) / 7);
  return Math.max(1, Math.min(4, saturdayWeek));
};

/**
 * Decide whether the given day is a non-working day, and why.
 *
 * Checks, in order:
 *  1. Weekly schedule - `workingDays` is what the backend uses; `nonWorkingDays`
 *     is checked too so drift between the two arrays errs towards warning.
 *  2. Configured non-working Saturdays - `saturdayHolidays` holds the week
 *     numbers (1-4) HR marked off. An empty array means every Saturday is a
 *     working day; any subset is possible.
 *  3. Company holidays falling on this date.
 *
 * @returns warning payload, or null when it is an ordinary working day
 */
export const getNonWorkingDayWarning = (
  settings: Partial<EffectiveSettings> | undefined,
  holidays: Holiday[] | undefined,
  now: DateTime = getISTNow()
): NonWorkingDayWarning | null => {
  const attendance = settings?.attendance;
  const dayOfWeek = toJsWeekday(now);
  const dayName = DAY_NAMES[dayOfWeek];

  const workingDays = attendance?.workingDays;
  const nonWorkingDays = attendance?.nonWorkingDays;
  const excludedFromWorkingDays = !!workingDays?.length && !workingDays.includes(dayOfWeek);
  const listedAsNonWorking = (nonWorkingDays ?? (workingDays?.length ? [] : [0])).includes(dayOfWeek);

  if (excludedFromWorkingDays || listedAsNonWorking) {
    return {
      isNonWorkingDay: true,
      reason: 'weekend',
      dayName,
      message: `Today is ${dayName}, which is configured as a non-working day. Are you sure you want to check in?`
    };
  }

  if (dayOfWeek === 6) {
    const saturdayHolidays = attendance?.saturdayHolidays ?? [];
    const saturdayWeek = getSaturdayWeekOfMonth(now);

    if (saturdayHolidays.includes(saturdayWeek)) {
      return {
        isNonWorkingDay: true,
        reason: 'saturday_off',
        dayName,
        saturdayWeek,
        message: `Today is the ${ORDINALS[saturdayWeek]} Saturday of the month, which is configured as a non-working Saturday. Are you sure you want to check in?`
      };
    }
  }

  const todayString = getISTDateString(now);
  const todayHoliday = holidays?.find(
    (holiday) => !!holiday?.date && getISTDateString(holiday.date) === todayString
  );

  if (todayHoliday) {
    const title = todayHoliday.title || (todayHoliday as { name?: string }).name || 'a company holiday';
    const holidayType = todayHoliday.type || (todayHoliday.isOptional ? 'optional' : 'public');
    const suffix =
      holidayType === 'optional' ? ' (Optional Holiday)' : holidayType === 'restricted' ? ' (Restricted Holiday)' : '';

    return {
      isNonWorkingDay: true,
      reason: 'holiday',
      holidayTitle: title,
      holidayType,
      message: `Today is ${title}${suffix}. Are you sure you want to check in?`
    };
  }

  return null;
};
