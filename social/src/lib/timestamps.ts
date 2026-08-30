// The existing database stores UTC timestamps without a timezone suffix. Make
// that convention explicit at the client boundary, not the viewer's local zone.
export function utcTimestamp(value: string): string {
  return /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)
    ? `${value.replace(' ', 'T')}Z`
    : value;
}

export function normalizeApiTimestamps<T>(value: T): T {
  if (Array.isArray(value)) return value.map(normalizeApiTimestamps) as T;
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
    typeof item === 'string' && /(?:At|Timestamp)$/.test(key)
      ? utcTimestamp(item)
      : normalizeApiTimestamps(item),
  ])) as T;
}
