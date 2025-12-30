import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Sun, Moon, Monitor, Palette, Check, Sparkles, Waves, Trees, Snowflake } from 'lucide-react';

const AppearanceSettings = () => {
  const { themeMode, customTheme, setThemeMode, setCustomTheme } = useTheme();

  const THEME_MODES = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'Auto', icon: Monitor }
  ];

  const CUSTOM_THEMES = [
    {
      value: 'default',
      label: 'Default',
      icon: Palette,
      colors: ['#212121', '#f5f5f5', '#e5e5e5']
    },
    {
      value: 'christmas',
      label: 'Christmas',
      icon: Sparkles,
      colors: ['#A73121', '#2D5F4B', '#C89F5D']
    },
    {
      value: 'newyear',
      label: 'New Year',
      icon: Snowflake,
      colors: ['#06B6D4', '#E2E8F0', '#F0F9FF']
    },
    {
      value: 'ocean',
      label: 'Ocean',
      icon: Waves,
      colors: ['#3B82F6', '#14B8A6', '#06B6D4']
    },
    {
      value: 'forest',
      label: 'Forest',
      icon: Trees,
      colors: ['#059669', '#92400E', '#84CC16']
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-1">
          Appearance
        </h2>
        <p className="text-sm text-muted-foreground">
          Customize your dashboard theme
        </p>
      </div>

      {/* Compact Inline Controls */}
      <div className="space-y-6">
        {/* Theme Mode - Compact Pills */}
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">
            Mode
          </label>
          <div className="inline-flex p-1 rounded-lg bg-muted">
            {THEME_MODES.map((mode) => {
              const Icon = mode.icon;
              const isActive = themeMode === mode.value;
              return (
                <button
                  key={mode.value}
                  onClick={() => setThemeMode(mode.value)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Schemes - Compact Grid */}
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">
            Color Scheme
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {CUSTOM_THEMES.map((theme) => {
              const Icon = theme.icon;
              const isActive = customTheme === theme.value;

              return (
                <button
                  key={theme.value}
                  onClick={() => setCustomTheme(theme.value)}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left group ${
                    isActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  {/* Check Icon */}
                  {isActive && (
                    <div className="absolute top-2 right-2">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                  )}

                  {/* Theme Icon */}
                  <div className="mb-3">
                    <Icon className={`h-5 w-5 ${
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    }`} />
                  </div>

                  {/* Theme Name */}
                  <div className="mb-2">
                    <div className={`text-sm font-semibold ${
                      isActive ? 'text-primary' : 'text-foreground'
                    }`}>
                      {theme.label}
                    </div>
                    {theme.subtitle && (
                      <div className="text-xs text-muted-foreground">
                        {theme.subtitle}
                      </div>
                    )}
                  </div>

                  {/* Color Dots */}
                  <div className="flex gap-1.5">
                    {theme.colors.map((color, idx) => (
                      <div
                        key={idx}
                        className="w-5 h-5 rounded-full border-2 border-background shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Preview - Compact */}
        <div className="p-6 rounded-lg border border-border bg-card">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">Preview</div>
                <div className="text-xs text-muted-foreground">How your theme looks</div>
              </div>
              <div className="flex gap-2">
                <div className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium">
                  Primary
                </div>
                <div className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium">
                  Secondary
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted border border-border">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Sparkles className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground mb-1">Sample Card</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    This card shows how content appears with your selected theme in both light and dark modes.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
          <Sparkles className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
          <div className="text-xs text-foreground/80">
            <span className="font-medium">Tip:</span> Seasonal themes (Christmas & New Year) auto-activate based on date. Change anytime here.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;
