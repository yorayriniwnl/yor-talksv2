import type { CSSProperties } from 'react';

const SAFE_STORY_BACKGROUNDS: Record<string, string> = {
  'from-rose-500 via-purple-600 to-amber-500': 'linear-gradient(135deg, #f43f5e 0%, #9333ea 52%, #f59e0b 100%)',
  'from-cyan-400 via-blue-600 to-indigo-700': 'linear-gradient(135deg, #22d3ee 0%, #2563eb 52%, #4338ca 100%)',
  'from-amber-300 via-orange-500 to-red-600': 'linear-gradient(135deg, #fcd34d 0%, #f97316 52%, #dc2626 100%)',
  'from-emerald-400 via-teal-600 to-blue-700': 'linear-gradient(135deg, #34d399 0%, #0d9488 52%, #1d4ed8 100%)',
  'from-fuchsia-600 via-purple-900 to-black': 'linear-gradient(135deg, #c026d3 0%, #581c87 52%, #000 100%)',
};

const DEFAULT_STORY_BACKGROUND = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';

/** Resolve only known composer presets; persisted story tokens never become arbitrary CSS. */
export function storyBackgroundToCss(value?: string | null): CSSProperties {
  return { background: (value && SAFE_STORY_BACKGROUNDS[value]) || DEFAULT_STORY_BACKGROUND };
}
