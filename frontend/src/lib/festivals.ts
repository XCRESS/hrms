import type { CustomTheme, FestiveGameKey, Holiday } from '@/types';

export type FestivalKey = 'diwali';

type MonthDay = { month: number; day: number };

export type FestivalWindow =
  | { kind: 'fixed'; start: MonthDay; end: MonthDay; anchor: MonthDay }
  | { kind: 'holiday'; aliases: readonly string[]; daysBefore: number; daysAfter: number };

export interface Festival {
  key: FestivalKey;
  theme: CustomTheme;
  window: FestivalWindow;
  banner: {
    name: string;
    title: string;
    greeting: (name: string) => string;
    cta: string;
    effect: 'diyas' | 'none';
  };
  games: readonly FestiveGameKey[];
  greetings: readonly string[];
}

/** Dates are calendar days, 'YYYY-MM-DD'. */
export interface ActiveFestival {
  festival: Festival;
  instanceId: string;
  anchorDate: string;
  windowStart: string;
  windowEnd: string;
}

export const FESTIVALS: readonly Festival[] = [
  {
    key: 'diwali',
    theme: 'diwali',
    window: { kind: 'holiday', aliases: ['diwali', 'deepavali', 'deepawali'], daysBefore: 8, daysAfter: 2 },
    banner: {
      name: 'Diwali',
      title: 'Happy Diwali',
      greeting: (name) => `Happy Diwali, ${name}! Wishing you light and laddoos.`,
      cta: 'Play Mithai Match',
      effect: 'diyas',
    },
    games: ['mithai-match'],
    greetings: [
      'May your Diwali be as bright as your best ideas and twice as sweet.',
      'Wishing you a festival of lights with zero blockers and plenty of mithai.',
      "Here's to new beginnings, good company, and a box of kaju katli all to yourself.",
      'May this Diwali light up your home and recharge you for the year ahead.',
      'Lights on, laptops off. Wishing you a warm and joyful Diwali.',
      'May your days be bright, your inbox light, and your sweets plentiful.',
      'Wishing you and your family a Diwali full of warmth, laughter and light.',
      'May the glow of the diyas bring you peace, prosperity and a well-deserved break.',
    ],
  },
];

const pad = (n: number) => String(n).padStart(2, '0');

export function localDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const toKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const keyToUtc = (key: string) => Date.parse(`${key}T00:00:00Z`);
export const addDays = (key: string, days: number) => toKey(keyToUtc(key) + days * 86_400_000);
const monthDayKey = (year: number, md: MonthDay) => `${year}-${pad(md.month)}-${pad(md.day)}`;

type Holidayish = Pick<Holiday, 'title' | 'date' | 'isActive'>;

function resolveWindow(
  festival: Festival,
  today: string,
  holidays: readonly Holidayish[]
): Omit<ActiveFestival, 'festival' | 'instanceId'> | null {
  const year = Number(today.slice(0, 4));
  const w = festival.window;

  if (w.kind === 'fixed') {
    const wraps = monthDayKey(2000, w.start) > monthDayKey(2000, w.end);
    const startYear = wraps && today < monthDayKey(year, w.start) ? year - 1 : year;
    const windowStart = monthDayKey(startYear, w.start);
    const windowEnd = monthDayKey(wraps ? startYear + 1 : startYear, w.end);
    const anchorYear = monthDayKey(2000, w.anchor) >= monthDayKey(2000, w.start) ? startYear : startYear + 1;
    return { anchorDate: monthDayKey(anchorYear, w.anchor), windowStart, windowEnd };
  }

  const anchorDate = holidays
    // Legacy holiday rows can lack `name` (sent as `title`); skip them rather than crash every page.
    .filter((h) => typeof h?.title === 'string' && typeof h.date === 'string')
    .filter((h) => h.isActive !== false)
    .filter((h) => w.aliases.some((alias) => h.title.toLowerCase().includes(alias)))
    // Holiday dates are stored as UTC midnight; the first 10 chars are the calendar day everywhere.
    .map((h) => h.date.slice(0, 10))
    .filter((key) => Number(key.slice(0, 4)) === year)
    .sort()[0];
  if (!anchorDate) return null;
  return { anchorDate, windowStart: addDays(anchorDate, -w.daysBefore), windowEnd: addDays(anchorDate, w.daysAfter) };
}

/** undefined = holidays never loaded, so whether a festival is running is unknown. */
export function resolveFromHolidays(today: string, holidays: readonly Holidayish[] | undefined) {
  return holidays === undefined ? undefined : resolveActiveFestival(today, holidays);
}

export function resolveActiveFestival(
  today: string,
  holidays: readonly Holidayish[],
  festivals: readonly Festival[] = FESTIVALS
): ActiveFestival | null {
  for (const festival of festivals) {
    const win = resolveWindow(festival, today, holidays);
    if (win && win.windowStart <= today && today <= win.windowEnd) {
      return { festival, instanceId: `${festival.key}-${win.anchorDate.slice(0, 4)}`, ...win };
    }
  }
  return null;
}
