import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sliders, Sparkles, Sun, Moon, Film, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';

export type FilterStyle = 'normal' | 'cyber' | 'vintage' | 'golden' | 'noir' | 'rose';

export const STORY_FILTERS: { id: FilterStyle; name: string; icon: any; filterCss: string }[] = [
  { id: 'normal', name: 'Normal', icon: Sun, filterCss: '' },
  { id: 'cyber', name: 'Cyber Neon', icon: Sparkles, filterCss: 'hue-rotate-[140deg] contrast-125 saturate-150' },
  { id: 'vintage', name: 'Vintage 90s', icon: Film, filterCss: 'sepia-[0.35] contrast-110 brightness-95' },
  { id: 'golden', name: 'Golden Hour', icon: Flame, filterCss: 'sepia-[0.25] saturate-150 hue-rotate-[-10deg]' },
  { id: 'noir', name: 'B&W Noir', icon: Moon, filterCss: 'grayscale contrast-150' },
  { id: 'rose', name: 'Rose Glow', icon: Sparkles, filterCss: 'hue-rotate-[300deg] saturate-125' },
];

interface StoryFilterSelectorProps {
  activeFilter: FilterStyle;
  onSelectFilter: (filter: FilterStyle) => void;
}

export function StoryFilterSelector({ activeFilter, onSelectFilter }: StoryFilterSelectorProps) {
  return (
    <div className="flex gap-2 items-center overflow-x-auto hide-scrollbar py-2 px-3 surface-1 rounded-full border border-border/40 max-w-full z-20 backdrop-blur-md">
      {STORY_FILTERS.map((f) => {
        const Icon = f.icon;
        const isSelected = activeFilter === f.id;

        return (
          <button
            key={f.id}
            onClick={(e) => {
              e.stopPropagation();
              sounds.playPop();
              onSelectFilter(f.id);
            }}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap",
              isSelected
                ? "bg-primary text-primary-foreground shadow-md glow-neon-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Icon className="w-3 h-3" />
            {f.name}
          </button>
        );
      })}
    </div>
  );
}
