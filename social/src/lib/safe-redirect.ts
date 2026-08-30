/** Only app-local paths may be restored after authentication. */
export function safeInternalRedirect(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return '/';
  try {
    const decodedPath = decodeURIComponent(value.split(/[?#]/)[0]);
    if (decodedPath.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(decodedPath)) return '/';
    const target = new URL(value, 'https://yor.invalid');
    if (target.origin !== 'https://yor.invalid' || /^\/auth\/?$/.test(target.pathname)) return '/';
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return '/';
  }
}
