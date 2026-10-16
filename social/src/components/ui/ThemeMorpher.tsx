import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { sounds } from '@/lib/sound';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export type ThemePreset = 'default' | 'midnight' | 'lilac' | 'amber';

const THEME_PRESETS = [
  { id: 'default', name: 'Signal', swatch: 'bg-rose-500' },
  { id: 'midnight', name: 'Deep signal', swatch: 'bg-red-950' },
  { id: 'lilac', name: 'Soft signal', swatch: 'bg-[#ff8a7f]' },
  { id: 'amber', name: 'Warm signal', swatch: 'bg-red-600' },
] as const;

const THEME_STORAGE_KEY = 'yor-talks-accent-theme';

function setThemeVariables(theme: ThemePreset) {
  const root = document.documentElement;
  // CSS selects readable light/dark pairs even after this control unmounts.
  // Fixed inline colors previously survived theme changes with unreadable
  // primary text and button labels in the opposite mode.
  root.style.removeProperty('--primary');
  root.style.removeProperty('--accent');
  if (theme === 'default') delete root.dataset.yorAccent;
  else root.dataset.yorAccent = theme;
}

export function ThemeMorpher() {
  const [activeTheme, setActiveTheme] = useState<ThemePreset>('default');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && THEME_PRESETS.some((theme) => theme.id === stored)) {
        const theme = stored as ThemePreset;
        setThemeVariables(theme);
        setActiveTheme(theme);
      }
    } catch { /* Appearance choices still work when browser storage is blocked. */ }
  }, []);

  const applyTheme = (theme: ThemePreset) => {
    sounds.playChime();
    setActiveTheme(theme);
    setThemeVariables(theme);
    try { window.localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* Keep this page's choice. */ }
    toast.success(`${THEME_PRESETS.find((preset) => preset.id === theme)?.name} accent applied`);
  };

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-muted/35 p-1 font-sans" aria-label="Choose accent theme">
      {THEME_PRESETS.map((theme) => (
        <button
          key={theme.id}
          type="button"
          onClick={() => applyTheme(theme.id)}
          className={cn(
            'grid h-7 w-7 place-items-center rounded-lg transition-all',
            theme.swatch,
            activeTheme === theme.id ? cn('scale-100 shadow-sm ring-2 ring-background', theme.id === 'lilac' ? 'text-black' : 'text-white') : 'opacity-55 hover:scale-105 hover:opacity-100'
          )}
          title={`${theme.name} accent`}
          aria-label={`Use ${theme.name} accent`}
          aria-pressed={activeTheme === theme.id}
        >
          {activeTheme === theme.id && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
        </button>
      ))}
    </div>
  );
}
