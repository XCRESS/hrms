import { useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useActiveFestival } from '@/hooks/useActiveFestival';

export default function FestiveThemeSync() {
  const active = useActiveFestival();
  const { setSeasonalTheme } = useTheme();
  const theme = active === undefined ? undefined : (active?.festival.theme ?? null);

  useEffect(() => {
    if (theme !== undefined) setSeasonalTheme(theme);
  }, [theme, setSeasonalTheme]);

  return null;
}
