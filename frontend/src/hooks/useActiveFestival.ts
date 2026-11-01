import { useHolidays } from '@/hooks/queries/useHolidays';
import { FESTIVALS, addDays, localDateKey, resolveFromHolidays, type ActiveFestival } from '@/lib/festivals';

function devForcedFestival(today: string): ActiveFestival | null {
  if (!import.meta.env.DEV) return null;
  const key = new URLSearchParams(window.location.search).get('festival');
  const festival = FESTIVALS.find((f) => f.key === key);
  if (!festival) return null;
  const anchorDate = addDays(today, 3);
  return {
    festival,
    instanceId: `${festival.key}-${anchorDate.slice(0, 4)}`,
    anchorDate,
    windowStart: today,
    windowEnd: addDays(anchorDate, 2),
  };
}

/**
 * The festival running today, or null when none is.
 * undefined = holidays never loaded — callers must not treat that as "no festival".
 * Calls the holidays API, so only use it inside authenticated routes.
 */
export function useActiveFestival(): ActiveFestival | null | undefined {
  // Mounted on every authenticated page: a failed refetch must not reach the root error boundary.
  const { data: holidays } = useHolidays({ throwOnError: false });
  const today = localDateKey();
  return devForcedFestival(today) ?? resolveFromHolidays(today, holidays);
}
