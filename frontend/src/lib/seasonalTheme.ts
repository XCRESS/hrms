import type { CustomTheme } from '@/types';

export interface SeasonalStore {
  stored: string | null;
  autoApplied: string | null;
  /** A seasonal theme the user switched away from while it was running. */
  declined: string | null;
  autoEnabled: boolean;
}

export type SeasonalAction = { apply: CustomTheme } | { revert: true } | null;

/** owned = themes the festival registry manages; others (e.g. effect #5's Independence) are left alone. */
export function decideSeasonalTheme(
  theme: CustomTheme | null,
  current: CustomTheme,
  s: SeasonalStore,
  owned: readonly string[]
): SeasonalAction {
  if (theme) {
    if (!s.autoEnabled || s.declined === theme) return null;
    const userHasNotChosen = !s.stored || s.stored === 'default' || s.stored === s.autoApplied;
    return userHasNotChosen && s.stored !== theme ? { apply: theme } : null;
  }
  const ownedAuto = s.autoApplied !== null && owned.includes(s.autoApplied);
  return ownedAuto && current === s.autoApplied ? { revert: true } : null;
}

export function onUserThemeChoice(
  chosen: CustomTheme,
  s: SeasonalStore,
  owned: readonly string[]
): { autoApplied: null; declined: string | null } {
  if (s.autoApplied && owned.includes(s.autoApplied) && chosen !== s.autoApplied) {
    return { autoApplied: null, declined: s.autoApplied };
  }
  return { autoApplied: null, declined: s.declined === chosen ? null : s.declined };
}
