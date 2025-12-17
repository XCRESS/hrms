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
    const savedCustom = localStorage.getItem(CUSTOM_THEME_KEY) || 'christmas';

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

    // Auto-enable Christmas theme in December if user hasn't set a custom theme
    if (month === 11 && customTheme === 'default') {
      const autoSeasonalEnabled = localStorage.getItem('auto_seasonal_theme') !== 'false';
      if (autoSeasonalEnabled) {
        updateCustomTheme('christmas');
      }
    }
  }, []); // Only run once on mount

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