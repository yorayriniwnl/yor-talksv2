const externalHosts = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);

/** User-supplied external video links are content, never storage delivery grants. */
export function allowedExternalVideoUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  let url: URL;
  try { url = new URL(value); } catch { return undefined; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !externalHosts.has(url.hostname) || url.pathname === '/') return undefined;
  return url.href;
}
