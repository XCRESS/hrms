import type { DateTime } from 'luxon';
import Holiday from '../models/Holiday.model.js';
import settingsService from './settings/SettingsService.js';
import { toIST, getISTDateString } from '../utils/timezone.js';

/**
 * The single source of truth for "is this a working day". Every rule lives in
 * classifyDay; everything else here only loads its inputs.
 */

export interface WorkCalendarRules {
  /** JS weekday numbers, 0 = Sunday. */
  workingDays: number[];
  /** Which Saturdays of the month (1-5) are off. */
  saturdayHolidays: number[];
}

export type DayType =
  | { type: 'working' }
  | { type: 'weekend'; reason: string }
  | { type: 'holiday'; holidayTitle: string };

/** Keyed by IST date string (yyyy-MM-dd). */
export type HolidayMap = Map<string, { name?: string }>;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th'];

const jsWeekday = (day: DateTime): number => day.weekday % 7;

export const saturdayOfMonth = (day: DateTime): number => Math.ceil(day.day / 7);

export const classifyDay = (date: Date | DateTime, rules: WorkCalendarRules, holidays: HolidayMap): DayType => {
  const day = toIST(date);
  const holiday = holidays.get(day.toFormat('yyyy-MM-dd'));
  if (holiday) return { type: 'holiday', holidayTitle: holiday.name || 'Holiday' };

  const weekday = jsWeekday(day);
  if (!rules.workingDays.includes(weekday)) {
    return { type: 'weekend', reason: DAY_NAMES[weekday] ?? 'Weekend' };
  }

  if (weekday === 6) {
    const nth = saturdayOfMonth(day);
    if (rules.saturdayHolidays.includes(nth)) return { type: 'weekend', reason: `${ORDINALS[nth]} Saturday` };
  }

  return { type: 'working' };
};

export const getRules = async (department: string | null = null): Promise<WorkCalendarRules> => {
  const { workingDays, saturdayHolidays } = await settingsService.getAttendanceSettings(department);
  return { workingDays: workingDays ?? [1, 2, 3, 4, 5, 6], saturdayHolidays: saturdayHolidays ?? [] };
};

/**
 * Only active public holidays close the office. Optional and restricted ones
 * are an individual's choice, taken as leave.
 */
export const getHolidayMap = async (start: Date | DateTime, end: Date | DateTime): Promise<HolidayMap> => {
  const holidays = await Holiday.find({
    date: { $gte: toIST(start).startOf('day').toJSDate(), $lte: toIST(end).endOf('day').toJSDate() },
    isActive: true,
    type: 'public',
  })
    .select('name date')
    .lean();
  return new Map(holidays.map((h) => [getISTDateString(h.date), { name: h.name }]));
};

export const getDayType = async (date: Date | DateTime, department: string | null = null): Promise<DayType> => {
  const [rules, holidays] = await Promise.all([getRules(department), getHolidayMap(date, date)]);
  return classifyDay(date, rules, holidays);
};

export const isWorkingDay = async (date: Date | DateTime, department: string | null = null): Promise<boolean> =>
  (await getDayType(date, department)).type === 'working';

export interface WorkingDaysResult {
  workingDays: number;
  excludedDays: number;
  breakdown: { weeklyOffs: number; saturdayHolidays: number; holidays: number };
}

/** Inclusive of both ends, counted in IST calendar days. */
export const countWorkingDays = async (
  start: Date,
  end: Date,
  department: string | null = null
): Promise<WorkingDaysResult> => {
  const [rules, holidays] = await Promise.all([getRules(department), getHolidayMap(start, end)]);
  const breakdown = { weeklyOffs: 0, saturdayHolidays: 0, holidays: 0 };
  let workingDays = 0;

  const last = toIST(end).startOf('day');
  for (let day = toIST(start).startOf('day'); day <= last; day = day.plus({ days: 1 })) {
    const dayType = classifyDay(day, rules, holidays);
    if (dayType.type === 'working') workingDays++;
    else if (dayType.type === 'holiday') breakdown.holidays++;
    else if (jsWeekday(day) === 6 && rules.workingDays.includes(6)) breakdown.saturdayHolidays++;
    else breakdown.weeklyOffs++;
  }

  return {
    workingDays,
    excludedDays: breakdown.weeklyOffs + breakdown.saturdayHolidays + breakdown.holidays,
    breakdown,
  };
};
