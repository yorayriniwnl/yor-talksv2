/** Keep query credentials and email-verification path credentials out of logs. */
export function requestLogPath(url?: string): string | undefined {
  return url?.split(/[?#]/, 1)[0]?.replace(/(\/auth\/verify-email\/)[^/]+/gi, '$1[redacted]');
}
