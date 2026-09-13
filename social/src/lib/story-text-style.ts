import type { CSSProperties } from 'react';

export type StoryTextStyle = {
  size: 'sm' | 'md' | 'lg' | 'xl';
  weight: 'regular' | 'strong' | 'black';
  align: 'left' | 'center' | 'right';
  background: 'none' | 'glass' | 'solid';
  backgroundOpacity: number;
  positionX: number;
  positionY: number;
  rotation: number;
};

export const DEFAULT_STORY_TEXT_STYLE: StoryTextStyle = {
  size: 'md',
  weight: 'strong',
  align: 'center',
  background: 'none',
  backgroundOpacity: 0,
  positionX: 50,
  positionY: 50,
  rotation: 0,
};

export const STORY_TEXT_SIZE_OPTIONS = [
  { id: 'sm', label: 'Compact' },
  { id: 'md', label: 'Signature' },
  { id: 'lg', label: 'Statement' },
  { id: 'xl', label: 'Poster' },
] as const;

export const STORY_TEXT_WEIGHT_OPTIONS = [
  { id: 'regular', label: 'Regular' },
  { id: 'strong', label: 'Strong' },
  { id: 'black', label: 'Black' },
] as const;

export const STORY_TEXT_BACKGROUND_OPTIONS = [
  { id: 'none', label: 'No panel' },
  { id: 'glass', label: 'Glass panel' },
  { id: 'solid', label: 'Solid panel' },
] as const;

const SIZE_CSS: Record<StoryTextStyle['size'], string> = {
  sm: 'clamp(1.05rem, 4vw, 1.45rem)',
  md: 'clamp(1.35rem, 5vw, 2rem)',
  lg: 'clamp(1.75rem, 7vw, 2.75rem)',
  xl: 'clamp(2.1rem, 9vw, 3.5rem)',
};

const WEIGHT_CSS: Record<StoryTextStyle['weight'], CSSProperties['fontWeight']> = {
  regular: 400,
  strong: 600,
  black: 800,
};

function safeStoryTextStyle(value?: StoryTextStyle | null): StoryTextStyle {
  const candidate = value ?? DEFAULT_STORY_TEXT_STYLE;
  return {
    size: candidate.size in SIZE_CSS ? candidate.size : DEFAULT_STORY_TEXT_STYLE.size,
    weight: candidate.weight in WEIGHT_CSS ? candidate.weight : DEFAULT_STORY_TEXT_STYLE.weight,
    align: candidate.align === 'left' || candidate.align === 'right' ? candidate.align : 'center',
    background: candidate.background === 'glass' || candidate.background === 'solid' ? candidate.background : 'none',
    backgroundOpacity: Number.isFinite(candidate.backgroundOpacity) ? Math.min(100, Math.max(0, candidate.backgroundOpacity)) : 0,
    positionX: Number.isFinite(candidate.positionX) ? Math.min(88, Math.max(12, candidate.positionX)) : 50,
    positionY: Number.isFinite(candidate.positionY) ? Math.min(86, Math.max(14, candidate.positionY)) : 50,
    rotation: Number.isFinite(candidate.rotation) ? Math.min(12, Math.max(-12, candidate.rotation)) : 0,
  };
}

export function storyTextStyleToCss(value?: StoryTextStyle | null): CSSProperties {
  const style = safeStoryTextStyle(value);
  const alpha = style.backgroundOpacity / 100;
  const panelBackground = style.background === 'none'
    ? 'transparent'
    : style.background === 'glass'
      ? `rgba(11, 11, 18, ${Math.max(0.18, alpha * 0.8)})`
      : `rgba(11, 11, 18, ${Math.max(0.35, alpha)})`;

  return {
    position: 'absolute',
    left: `${style.positionX}%`,
    top: `${style.positionY}%`,
    transform: `translate(-50%, -50%) rotate(${style.rotation}deg)`,
    maxWidth: '84%',
    fontSize: SIZE_CSS[style.size],
    fontWeight: WEIGHT_CSS[style.weight],
    textAlign: style.align,
    lineHeight: 1.15,
    color: '#fff',
    background: panelBackground,
    padding: style.background === 'none' ? '0.25rem' : '0.75rem 1rem',
    borderRadius: style.background === 'none' ? '0.5rem' : '1rem',
    border: style.background === 'none' ? '0 solid transparent' : '1px solid rgba(255,255,255,0.16)',
    backdropFilter: style.background === 'none' ? 'none' : 'blur(14px)',
    boxShadow: style.background === 'none' ? '0 4px 24px rgba(0,0,0,0.18)' : '0 10px 32px rgba(0,0,0,0.2)',
    textShadow: '0 2px 14px rgba(0,0,0,0.45)',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  };
}

export function isAdvancedStoryTextStyle(value?: StoryTextStyle | null): boolean {
  const style = safeStoryTextStyle(value);
  return (Object.keys(DEFAULT_STORY_TEXT_STYLE) as Array<keyof StoryTextStyle>)
    .some((key) => style[key] !== DEFAULT_STORY_TEXT_STYLE[key]);
}
