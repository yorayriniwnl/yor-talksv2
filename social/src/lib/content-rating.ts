export const CONTENT_RATING_OPTIONS = [
  { value: 'child_safe', label: 'Child-safe', description: 'Appropriate for children' },
  { value: 'regular', label: 'Regular', description: 'Everyday community content' },
  { value: 'mature', label: 'Mature', description: 'Adults only' },
] as const;

export type ContentRating = (typeof CONTENT_RATING_OPTIONS)[number]['value'];
export const DEFAULT_CONTENT_RATING: ContentRating = 'regular';

export function contentRatingLabel(value: ContentRating | undefined) {
  return CONTENT_RATING_OPTIONS.find((option) => option.value === value)?.label ?? 'Regular';
}
