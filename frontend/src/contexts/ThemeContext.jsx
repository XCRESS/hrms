import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const THEME_MODE_KEY = 'hrms_theme_mode';
const CUSTOM_THEME_KEY = 'hrms_custom_theme';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', 'system'
  const [customTheme, setCustomTheme] = useState('default'); // 'default', 'christmas', 'ocean', 'forest'

  // Initialize themes from localStorage
  // 1. applyTheme - Memoized
  const applyTheme = useCallback((mode, custom) => {
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

  // 2. State Updaters - Memoized
  const updateThemeMode = useCallback((newMode) => {
    setThemeMode(newMode);
    localStorage.setItem(THEME_MODE_KEY, newMode);
    applyTheme(newMode, customTheme);
  }, [customTheme, applyTheme]);

  const updateCustomTheme = useCallback((newCustom) => {
    setCustomTheme(newCustom);
    localStorage.setItem(CUSTOM_THEME_KEY, newCustom);
    applyTheme(themeMode, newCustom);
  }, [themeMode, applyTheme]);

  const toggleTheme = useCallback(() => {
    // If currently 'system', we switch to explicit 'dark' or 'light'
    // based on what it currently looks like? Or just default behavior.
    // Original logic: themeMode === 'dark' ? 'light' : 'dark'
    // If system (effectively light), we go dark.
    // If system (effectively dark), we go dark (since themeMode != dark). 
    // This seems biased to dark, but keeping original logic for consistency.
    const newMode = themeMode === 'dark' ? 'light' : 'dark';
    updateThemeMode(newMode);
  }, [themeMode, updateThemeMode]);

  // 3. Init Effect
  useEffect(() => {
    const savedMode = localStorage.getItem(THEME_MODE_KEY) || 'system';
    const savedCustom = localStorage.getItem(CUSTOM_THEME_KEY) || 'default';

    setThemeMode(savedMode);
    setCustomTheme(savedCustom);
    applyTheme(savedMode, savedCustom);
  }, [applyTheme]);

  // 4. System Theme Listener
  useEffect(() => {
    if (themeMode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('system', customTheme);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode, customTheme, applyTheme]);

  // 5. Auto Seasonal Theme
  useEffect(() => {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();

    const savedCustom = localStorage.getItem(CUSTOM_THEME_KEY);
    const isDefaultOrChristmas = !savedCustom || savedCustom === 'default' || savedCustom === 'christmas';
    const shouldAutoApply = customTheme === 'default' || (customTheme === 'christmas' && isDefaultOrChristmas);

    if (shouldAutoApply) {
      const autoSeasonalEnabled = localStorage.getItem('auto_seasonal_theme') !== 'false';
      if (autoSeasonalEnabled) {
        if (month === 11) { // December
          if (day > 25) {
             if (customTheme !== 'newyear') updateCustomTheme('newyear');
          } else {
             if (savedCustom === 'default' && customTheme !== 'christmas') updateCustomTheme('christmas');
          }
        } else if (month === 0) { // January
           if (customTheme !== 'newyear') updateCustomTheme('newyear');
        }
      }
    }
  }, [customTheme, updateCustomTheme]);

  return (
    <ThemeContext.Provider value={{
      themeMode,
      customTheme,
      setThemeMode: updateThemeMode,
      setCustomTheme: updateCustomTheme,
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

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext; 