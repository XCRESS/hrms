import { createContext, useContext, useEffect, useState } from 'react';

const THEME_MODE_KEY = 'hrms_theme_mode';
const CUSTOM_THEME_KEY = 'hrms_custom_theme';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', 'system'
  const [customTheme, setCustomTheme] = useState('default'); // 'default', 'christmas', 'ocean', 'forest'

  // Initialize themes from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem(THEME_MODE_KEY) || 'system';
    const savedCustom = localStorage.getItem(CUSTOM_THEME_KEY) || 'default';

    setThemeMode(savedMode);
    setCustomTheme(savedCustom);
    applyTheme(savedMode, savedCustom);
  }, []);

  const applyTheme = (mode, custom) => {
    const root = window.document.documentElement;

    // Remove existing dark/light classes
    root.classList.remove('dark', 'light');

    // Determine if dark mode should be active
    const isDark = mode === 'dark' ||
                   (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Apply dark/light class
    root.classList.add(isDark ? 'dark' : 'light');

    // Apply custom theme data attribute
    if (custom && custom !== 'default') {
      root.setAttribute('data-theme', custom);
    } else {
      root.removeAttribute('data-theme');
    }
  };

  // Update theme mode (light/dark/system)
  const updateThemeMode = (newMode) => {
    setThemeMode(newMode);
    localStorage.setItem(THEME_MODE_KEY, newMode);
    applyTheme(newMode, customTheme);
  };

  // Update custom theme (default/christmas/ocean/forest)
  const updateCustomTheme = (newCustom) => {
    setCustomTheme(newCustom);
    localStorage.setItem(CUSTOM_THEME_KEY, newCustom);
    applyTheme(themeMode, newCustom);
  };

  // Toggle between light and dark (keeping custom theme)
  const toggleTheme = () => {
    const newMode = themeMode === 'dark' ? 'light' : 'dark';
    updateThemeMode(newMode);
  };

  // Listen for system theme changes
  useEffect(() => {
    if (themeMode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      applyTheme('system', customTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode, customTheme]);

  // Auto-detect seasonal themes (optional feature)
  useEffect(() => {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const day = now.getDate();

    // Check if we should auto-apply seasonal themes
    // We act if the current theme is 'default' OR if it was previously auto-set to 'christmas'
    const savedCustom = localStorage.getItem(CUSTOM_THEME_KEY);
    
    // allow overriding 'christmas' during New Year period since it might have been auto-set
    const isDefaultOrChristmas = !savedCustom || savedCustom === 'default' || savedCustom === 'christmas';
    const shouldAutoApply = customTheme === 'default' || (customTheme === 'christmas' && isDefaultOrChristmas);

    if (shouldAutoApply) {
      const autoSeasonalEnabled = localStorage.getItem('auto_seasonal_theme') !== 'false';
      if (autoSeasonalEnabled) {
        // December: Christmas (1-25) -> New Year (26-31)
        if (month === 11) {
          if (day > 25) {
             // If we are in New Year period, only override if current is not already newyear (and is default/christmas)
             if (customTheme !== 'newyear') updateCustomTheme('newyear');
          } else {
             // Before Dec 25, ensure it matches christmas if it was default
             if (savedCustom === 'default' && customTheme !== 'christmas') updateCustomTheme('christmas');
          }
        } 
        // January: New Year
        else if (month === 0) {
           if (customTheme !== 'newyear') updateCustomTheme('newyear');
        }
      }
    }
  }, [customTheme]); // Run when customTheme changes to ensure proper override check, guards prevent loops

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