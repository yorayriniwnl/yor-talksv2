const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TICKET_REGEX = /^YT-GRV-[A-Z0-9]{10}$/i;

/**
 * Normalizes request path:
 * - strips query strings and fragments
 * - rejects path traversal (. or ..) and backslashes
 * - removes known mount prefixes (/api/v1, /api, /fixture, /default)
 * - collapses duplicate slashes and removes trailing slash
 */
export function normalizeRequestPath(url: string): string | null {
  if (typeof url !== 'string' || !url) return null;
  let decoded: string;
  try {
    decoded = decodeURI(url);
  } catch {
    return null;
  }
  const clean = decoded.split(/[?#]/)[0];
  // Reject encoded separators and remaining percent encodings instead of
  // allowing a reverse proxy to normalize them differently from Express.
  if (/%(?:2f|5c|2e|25)/i.test(clean)) return null;
  const segments = clean.split('/').filter(Boolean);
  for (const s of segments) {
    if (s === '.' || s === '..' || s.includes('%2e') || s.includes('%2E') || s.includes('\\')) {
      return null;
    }
  }
  let path = '/' + segments.join('/');
  path = path.replace(/^\/(?:api(?:\/v1)?|fixture|default)(?=\/|$)/, '') || '/';
  if (!path.startsWith('/')) path = '/' + path;
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  return path;
}

type RouteMatcher = (path: string) => boolean;

interface RouteRule {
  method: string;
  matches: RouteMatcher;
}

const RESTRICTED_ALLOWED_RULES: RouteRule[] = [
  // User account ownership and rights
  { method: 'GET', matches: p => p === '/users/me' },
  { method: 'DELETE', matches: p => p === '/users/me' },
  { method: 'GET', matches: p => p === '/users/me/export' },
  { method: 'POST', matches: p => p === '/users/me/consent' },
  { method: 'GET', matches: p => p === '/users/me/security' },

  // Eligibility and age assurance progress
  { method: 'GET', matches: p => p === '/users/me/eligibility' },
  { method: 'POST', matches: p => p === '/users/me/eligibility/challenges' },
  {
    method: 'GET',
    matches: p => {
      const parts = p.split('/');
      return parts.length === 6 && parts[1] === 'users' && parts[2] === 'me' && parts[3] === 'eligibility' && parts[4] === 'challenges' && UUID_REGEX.test(parts[5]);
    },
  },

  // Guardian Authorizations (both hyphen and slash mounts)
  { method: 'GET', matches: p => p === '/users/me/guardian-authorizations' || p === '/users/me/guardian/authorizations' },
  { method: 'POST', matches: p => p === '/users/me/guardian-authorizations' || p === '/users/me/guardian/authorizations' },
  {
    method: 'POST',
    matches: p => {
      const parts = p.split('/');
      // /users/me/guardian-authorizations/:id/withdraw
      if (parts.length === 6 && parts[1] === 'users' && parts[2] === 'me' && parts[3] === 'guardian-authorizations' && UUID_REGEX.test(parts[4]) && parts[5] === 'withdraw') {
        return true;
      }
      // /users/me/guardian/authorizations/:id/withdraw
      if (parts.length === 7 && parts[1] === 'users' && parts[2] === 'me' && parts[3] === 'guardian' && parts[4] === 'authorizations' && UUID_REGEX.test(parts[5]) && parts[6] === 'withdraw') {
        return true;
      }
      return false;
    },
  },

  // Authentication session lifecycle
  { method: 'POST', matches: p => p === '/auth/logout' },
  { method: 'POST', matches: p => p === '/auth/logout-all' },
  { method: 'POST', matches: p => p === '/auth/verify-email/resend' },
  { method: 'GET', matches: p => p === '/auth/devices' },

  // Two-factor authentication configuration and login approval
  { method: 'POST', matches: p => p === '/auth/2fa/setup' },
  { method: 'POST', matches: p => p === '/auth/2fa/confirm' },
  { method: 'POST', matches: p => p === '/auth/2fa/disable' },
  { method: 'GET', matches: p => p === '/auth/2fa/challenges' },
  {
    method: 'GET',
    matches: p => {
      const parts = p.split('/');
      return parts.length === 5 && parts[1] === 'auth' && parts[2] === '2fa' && parts[3] === 'challenges' && UUID_REGEX.test(parts[4]);
    },
  },
  {
    method: 'POST',
    matches: p => {
      const parts = p.split('/');
      return parts.length === 6 && parts[1] === 'auth' && parts[2] === '2fa' && parts[3] === 'challenges' && UUID_REGEX.test(parts[4]) && ['approve', 'deny', 'complete'].includes(parts[5]);
    },
  },

  // Harm-reporting and statutory/safety grievance intake
  { method: 'POST', matches: p => p === '/reports' },
  { method: 'POST', matches: p => p === '/reports/grievance' },
  {
    method: 'GET',
    matches: p => {
      const parts = p.split('/');
      return parts.length === 4 && parts[1] === 'reports' && parts[2] === 'grievance' && (TICKET_REGEX.test(parts[3]) || UUID_REGEX.test(parts[3]));
    },
  },

  // Health and service operational diagnostics
  { method: 'GET', matches: p => p === '/health' || p === '/health/live' || p === '/health/ready' || p === '/diagnostics' || p === '/docs' },
];

/**
 * Returns true if an authenticated user with a restricted session (unverified,
 * pending assurance, or restricted experience) is permitted to call the endpoint.
 * Social routes, posting, feeds, messaging, uploads and profile modification
 * are denied.
 */
export function isRestrictedRouteAllowed(method: string, originalUrl: string): boolean {
  if (typeof method !== 'string' || typeof originalUrl !== 'string') return false;
  const normMethod = method.toUpperCase();
  const path = normalizeRequestPath(originalUrl);
  if (!path) return false;

  return RESTRICTED_ALLOWED_RULES.some(rule => rule.method === normMethod && rule.matches(path));
}
