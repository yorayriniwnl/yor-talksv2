import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Palette, Sparkles, Sun, Moon, Zap } from 'lucide-react';
import { sounds } from '@/lib/sound';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export type ThemePreset = 'default' | 'cyberpunk' | 'vaporwave' | 'gold';

const THEME_PRESETS = [
  { id: 'default', name: 'Default Dark', color: 'from-blue-600 to-indigo-600' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', color: 'from-cyan-400 via-fuchsia-500 to-yellow-400' },
  { id: 'vaporwave', name: 'Vaporwave Sunset', color: 'from-pink-500 via-purple-600 to-cyan-400' },
  { id: 'gold', name: 'Golden Royalty', color: 'from-amber-300 via-orange-500 to-yellow-600' },
];

export function ThemeMorpher() {
  const [activeTheme, setActiveTheme] = useState<ThemePreset>('default');

  const applyTheme = (theme: ThemePreset) => {
    sounds.playChime();
    setActiveTheme(theme);

    const root = document.documentElement;
    if (theme === 'cyberpunk') {
      root.style.setProperty('--primary', '180 100% 50%'); // Cyan
      root.style.setProperty('--accent', '300 100% 50%'); // Neon pink
      toast.success('Switched to Cyberpunk Neon Theme ⚡');
    } else if (theme === 'vaporwave') {
      root.style.setProperty('--primary', '320 90% 60%'); // Pink
      root.style.setProperty('--accent', '190 90% 50%'); // Cyan
      toast.success('Switched to Vaporwave Sunset Theme 🌅');
    } else if (theme === 'gold') {
      root.style.setProperty('--primary', '45 100% 50%'); // Gold
      root.style.setProperty('--accent', '25 100% 55%'); // Amber
      toast.success('Switched to Golden Royalty Theme 👑');
    } else {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--accent');
      toast.info('Restored Default Dark Theme');
    }
  };

  return (
    <div className="flex items-center gap-1.5 p-1 surface-1 rounded-2xl border border-border/40 font-sans">
      {THEME_PRESETS.map((t) => (
        <button
          key={t.id}
          onClick={() => applyTheme(t.id as ThemePreset)}
          className={cn(
            "w-7 h-7 rounded-xl bg-gradient-to-tr transition-all flex items-center justify-center text-white",
            t.color,
            activeTheme === t.id ? "scale-110 ring-2 ring-primary shadow-md" : "opacity-70 hover:opacity-100"
          )}
          title={`Switch to ${t.name}`}
        >
          {activeTheme === t.id && <Sparkles className="w-3.5 h-3.5 fill-white" />}
        </button>
      ))}
    </div>
  );
}
