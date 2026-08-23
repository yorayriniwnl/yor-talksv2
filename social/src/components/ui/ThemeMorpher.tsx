import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { sounds } from '@/lib/sound';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export type ThemePreset = 'default' | 'midnight' | 'lilac' | 'amber';

const THEME_PRESETS = [
  { id: 'default', name: 'Signature', swatch: 'bg-violet-500' },
  { id: 'midnight', name: 'Midnight', swatch: 'bg-sky-500' },
  { id: 'lilac', name: 'Lilac', swatch: 'bg-fuchsia-500' },
  { id: 'amber', name: 'Amber', swatch: 'bg-amber-500' },
] as const;

const THEME_STORAGE_KEY = 'yor-talks-accent-theme';

function setThemeVariables(theme: ThemePreset) {
  const root = document.documentElement;

  if (theme === 'midnight') {
    root.style.setProperty('--primary', '201 92% 55%');
    root.style.setProperty('--accent', '186 78% 47%');
  } else if (theme === 'lilac') {
    root.style.setProperty('--primary', '284 76% 66%');
    root.style.setProperty('--accent', '320 76% 62%');
  } else if (theme === 'amber') {
    root.style.setProperty('--primary', '37 93% 57%');
    root.style.setProperty('--accent', '18 89% 58%');
  } else {
    root.style.removeProperty('--primary');
    root.style.removeProperty('--accent');
  }
}

export function ThemeMorpher() {
  const [activeTheme, setActiveTheme] = useState<ThemePreset>('default');

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && THEME_PRESETS.some((theme) => theme.id === stored)) {
      const theme = stored as ThemePreset;
      setThemeVariables(theme);
      setActiveTheme(theme);
    }
  }, []);

  const applyTheme = (theme: ThemePreset) => {
    sounds.playChime();
    setActiveTheme(theme);
    setThemeVariables(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
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
            activeTheme === theme.id ? 'scale-100 text-white shadow-sm ring-2 ring-background' : 'opacity-55 hover:scale-105 hover:opacity-100'
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
