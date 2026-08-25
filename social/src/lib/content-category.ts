export const CONTENT_CATEGORIES = [
  { value: 'campus', label: 'Campus & Community', emoji: '🎓' },
  { value: 'technology', label: 'Technology & AI', emoji: '🤖' },
  { value: 'gaming', label: 'Gaming & Esports', emoji: '🎮' },
  { value: 'arts', label: 'Arts & Design', emoji: '🎨' },
  { value: 'music', label: 'Music & Sound', emoji: '🎵' },
  { value: 'education', label: 'Education & Science', emoji: '🔬' },
  { value: 'sports', label: 'Sports & Fitness', emoji: '🏆' },
  { value: 'lifestyle', label: 'Lifestyle & Culture', emoji: '🌏' },
  { value: 'news', label: 'News & Announcements', emoji: '📰' },
  { value: 'other', label: 'Other', emoji: '✨' },
] as const;

export type ContentCategory = typeof CONTENT_CATEGORIES[number]['value'];
export const DEFAULT_CONTENT_CATEGORY: ContentCategory = 'other';

export function resolveContentCategory(value?: string) {
  const normalized = value?.trim().toLowerCase();
  const match = CONTENT_CATEGORIES.find((category) => category.value === normalized || category.label.toLowerCase() === normalized);

  if (match) return match;

  return {
    value: DEFAULT_CONTENT_CATEGORY,
    label: value?.trim() || 'Other',
    emoji: '✨',
  } as const;
}
