import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { ThemeMode, CustomTheme, ThemeContextValue } from '@/types';
import { FESTIVALS } from '@/lib/festivals';
import { decideSeasonalTheme, onUserThemeChoice, type SeasonalStore } from '@/lib/seasonalTheme';

const THEME_MODE_KEY = 'hrms_theme_mode';
const CUSTOM_THEME_KEY = 'hrms_custom_theme';
// Remembers a seasonal theme we switched on by ourselves, so it can be undone
// once the occasion passes without discarding a theme the user chose.
const AUTO_APPLIED_KEY = 'hrms_auto_applied_theme';
const DECLINED_KEY = 'hrms_seasonal_declined';
const SEASONAL_THEMES: readonly string[] = FESTIVALS.map((f) => f.theme);

const readSeasonalStore = (): SeasonalStore => ({
  stored: localStorage.getItem(CUSTOM_THEME_KEY),
  autoApplied: localStorage.getItem(AUTO_APPLIED_KEY),
  declined: localStorage.getItem(DECLINED_KEY),
  autoEnabled: localStorage.getItem('auto_seasonal_theme') !== 'false',
});

const readStored = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/** The slice of storage the date-driven themes read and write. */
interface SeasonalState {
  theme: CustomTheme;
  stored: string | null;
  autoApplied: string | null;
}

const readSeasonalState = (theme: CustomTheme): SeasonalState => ({
  theme,
  stored: readStored(CUSTOM_THEME_KEY),
  autoApplied: readStored(AUTO_APPLIED_KEY),
});

/** Date-driven themes (Independence, Christmas, New Year) that override 'default'. Pure: returns the next state, or null. */
const autoSeasonalStep = (s: SeasonalState, now: Date, autoEnabled: boolean): SeasonalState | null => {
  const month = now.getMonth();
  const day = now.getDate();
  const switchTo = (theme: CustomTheme, autoApplied = s.autoApplied): SeasonalState => ({ theme, stored: theme, autoApplied });

  if (autoEnabled && month === 7 && day >= 10 && day <= 15) {
    return s.theme === 'default' ? switchTo('independence', 'independence') : null;
  }

  if (s.theme === 'independence' && s.autoApplied === 'independence') {
    return switchTo('default', null);
  }

  const isDefaultOrChristmas = !s.stored || s.stored === 'default' || s.stored === 'christmas';
  const shouldAutoApply = s.theme === 'default' || (s.theme === 'christmas' && isDefaultOrChristmas);
  if (!shouldAutoApply || !autoEnabled) return null;

  if (month === 11) {
    if (day > 25) return switchTo('newyear');
    return s.stored === 'default' && s.theme !== 'christmas' ? switchTo('christmas') : null;
  }
  if (month === 0) return switchTo('newyear');
  return null;
};

const settleSeasonal = (start: SeasonalState, now: Date, autoEnabled: boolean): SeasonalState => {
  let s = start;
  for (let i = 0; i < 3; i++) {
    const next = autoSeasonalStep(s, now, autoEnabled);
    if (!next || next.theme === s.theme) break;
    s = next;
  }
  return s;
};

const persistSeasonal = (before: SeasonalState, after: SeasonalState): void => {
  try {
    if (after.stored !== before.stored && after.stored) localStorage.setItem(CUSTOM_THEME_KEY, after.stored);
    if (after.autoApplied !== before.autoApplied) {
      if (after.autoApplied) localStorage.setItem(AUTO_APPLIED_KEY, after.autoApplied);
      else localStorage.removeItem(AUTO_APPLIED_KEY);
    }
  } catch {
    // Storage blocked: seasonal theming is cosmetic, skip it.
  }
};

const autoSeasonalEnabled = () => readStored('auto_seasonal_theme') !== 'false';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    () => (readStored(THEME_MODE_KEY) as ThemeMode | null) || 'system'
  );
  const [bootSeasonal] = useState(() => {
    const before = readSeasonalState((readStored(CUSTOM_THEME_KEY) as CustomTheme | null) || 'default');
    return { before, after: settleSeasonal(before, new Date(), autoSeasonalEnabled()) };
  });
  const [customTheme, setCustomTheme] = useState<CustomTheme>(bootSeasonal.after.theme);

  useEffect(() => {
    persistSeasonal(bootSeasonal.before, bootSeasonal.after);
  }, [bootSeasonal]);

  const applyTheme = useCallback((mode: ThemeMode, custom: CustomTheme) => {
    const root = window.document.documentElement;
    root.classList.remove('dark', 'light');

    const isDark = mode === 'dark' ||
                   (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    root.classList.add(isDark ? 'dark' : 'light');

    if (custom && custom !== 'default') {
      root.setAttribute('data-theme', custom);
    } else {
      root.removeAttribute('data-theme');
    }
  }, []);

  const updateThemeMode = useCallback((newMode: ThemeMode) => {
    setThemeMode(newMode);
    try {
      localStorage.setItem(THEME_MODE_KEY, newMode);
    } catch {
      // Storage blocked: the mode still applies for this session.
    }
  }, []);

  const updateCustomTheme = useCallback((newCustom: CustomTheme) => {
    const before = { ...readSeasonalState(newCustom), stored: newCustom };
    const after = settleSeasonal(before, new Date(), autoSeasonalEnabled());
    try {
      localStorage.setItem(CUSTOM_THEME_KEY, newCustom);
    } catch {
      // Storage blocked: the theme still applies for this session.
    }
    persistSeasonal(before, after);
    setCustomTheme(after.theme);
  }, []);

  const setSeasonalTheme = useCallback((theme: CustomTheme | null) => {
    try {
      const action = decideSeasonalTheme(theme, customTheme, readSeasonalStore(), SEASONAL_THEMES);
      if (!theme) {
        const declined = localStorage.getItem(DECLINED_KEY);
        if (declined && SEASONAL_THEMES.includes(declined)) localStorage.removeItem(DECLINED_KEY);
      }
      if (action && 'apply' in action) {
        localStorage.setItem(AUTO_APPLIED_KEY, action.apply);
        updateCustomTheme(action.apply);
      } else if (action) {
        localStorage.removeItem(AUTO_APPLIED_KEY);
        updateCustomTheme('default');
      }
    } catch {
      // Storage blocked: seasonal theming is cosmetic, skip it.
    }
  }, [customTheme, updateCustomTheme]);

  const chooseTheme = useCallback((chosen: CustomTheme) => {
    try {
      const { declined } = onUserThemeChoice(chosen, readSeasonalStore(), SEASONAL_THEMES);
      localStorage.removeItem(AUTO_APPLIED_KEY);
      if (declined) localStorage.setItem(DECLINED_KEY, declined);
      else localStorage.removeItem(DECLINED_KEY);
    } catch {
      // Storage blocked: the choice still applies for this session.
    }
    updateCustomTheme(chosen);
  }, [updateCustomTheme]);

  const toggleTheme = useCallback(() => {
    // If currently 'system', we switch to explicit 'dark' or 'light'
    // based on what it currently looks like? Or just default behavior.
    // Original logic: themeMode === 'dark' ? 'light' : 'dark'
    // If system (effectively light), we go dark.
    // If system (effectively dark), we go dark (since themeMode != dark).
    // This seems biased to dark, but keeping original logic for consistency.
    const newMode: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    updateThemeMode(newMode);
  }, [themeMode, updateThemeMode]);

  useEffect(() => {
    applyTheme(themeMode, customTheme);
  }, [themeMode, customTheme, applyTheme]);

  useEffect(() => {
    if (themeMode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('system', customTheme);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode, customTheme, applyTheme]);

  return (
    <ThemeContext.Provider value={{
      themeMode,
      customTheme,
      setThemeMode: updateThemeMode,
      setCustomTheme: chooseTheme,
      setSeasonalTheme,
      toggleTheme,
      applyTheme: () => applyTheme(themeMode, customTheme),
      // Legacy support for existing code
      theme: themeMode,
      setTheme: updateThemeMode
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
