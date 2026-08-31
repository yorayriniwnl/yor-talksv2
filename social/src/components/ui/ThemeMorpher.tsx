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

  if (theme === 'midnight') {
    root.style.setProperty('--primary', '0 66% 24%');
    root.style.setProperty('--accent', '4 100% 75%');
  } else if (theme === 'lilac') {
    root.style.setProperty('--primary', '4 100% 75%');
    root.style.setProperty('--accent', '0 77% 60%');
  } else if (theme === 'amber') {
    root.style.setProperty('--primary', '0 77% 60%');
    root.style.setProperty('--accent', '0 66% 24%');
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
