const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_PATH = "[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

type RouteRule = { method: string; path: RegExp };
const exact = (method: string, path: string): RouteRule => ({ method, path: new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) });
const parameter = (method: string, before: string, after = ""): RouteRule => ({
  method,
  path: new RegExp(`^${before.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/${UUID_PATH}${after.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
});

const restrictedRoutes: RouteRule[] = [
  exact("GET", "/users/me"),
  exact("POST", "/users/me/consent"),
  exact("GET", "/users/me/eligibility"),
  exact("POST", "/users/me/eligibility/challenges"),
  parameter("GET", "/users/me/eligibility/challenges"),
  exact("POST", "/users/me/guardian-authorizations"),
  exact("GET", "/users/me/guardian-authorizations"),
  parameter("POST", "/users/me/guardian-authorizations", "/withdraw"),
  exact("POST", "/auth/verify-email/resend"),
  exact("POST", "/auth/2fa/setup"),
  exact("POST", "/auth/2fa/confirm"),
  exact("POST", "/auth/2fa/disable"),
  exact("GET", "/auth/2fa/challenges"),
  parameter("POST", "/auth/2fa/challenges", "/approve"),
  parameter("POST", "/auth/2fa/challenges", "/deny"),
  exact("GET", "/users/me/export"),
  exact("DELETE", "/users/me"),
  exact("POST", "/users/me/restriction"),
  exact("DELETE", "/users/me/restriction"),
  exact("POST", "/users/me/consent-withdrawal"),
  exact("POST", "/auth/logout"),
  exact("POST", "/auth/logout-all"),
];

const restrictedRightsRoutes: RouteRule[] = [
  exact("GET", "/users/me"),
  exact("GET", "/users/me/export"),
  exact("DELETE", "/users/me"),
  exact("POST", "/users/me/restriction"),
  exact("DELETE", "/users/me/restriction"),
  exact("POST", "/users/me/consent-withdrawal"),
  exact("POST", "/auth/logout"),
  exact("POST", "/auth/logout-all"),
  exact("POST", "/auth/verify-email/resend"),
  exact("POST", "/auth/2fa/setup"),
  exact("POST", "/auth/2fa/confirm"),
  exact("POST", "/auth/2fa/disable"),
  exact("GET", "/auth/2fa/challenges"),
  parameter("POST", "/auth/2fa/challenges", "/approve"),
  parameter("POST", "/auth/2fa/challenges", "/deny"),
];

/** Strip only the two supported API mounts and ignore query parameters. */
function normalizedPath(originalUrl: string): string | undefined {
  const pathname = originalUrl.split(/[?#]/, 1)[0];
  if (!pathname.startsWith("/") || pathname.includes("\\") || pathname.includes("%") || pathname.includes("//")) return undefined;
  if (pathname === "/api" || pathname === "/api/v1") return "/";
  if (pathname.startsWith("/api/v1/")) return pathname.slice("/api/v1".length);
  if (pathname.startsWith("/api/")) return pathname.slice("/api".length);
  return pathname;
}

function matches(rules: RouteRule[], method: string, originalUrl: string): boolean {
  const path = normalizedPath(originalUrl);
  if (!path) return false;
  const normalizedMethod = method.toUpperCase();
  return rules.some(rule => rule.method === normalizedMethod && rule.path.test(path));
}

/** Identity-only sessions may reach only reviewed account, security, assurance and rights routes. */
export function isRestrictedRouteAllowed(method: string, originalUrl: string): boolean {
  return matches(restrictedRoutes, method, originalUrl);
}

/** Moderation-restricted accounts retain only security and data-rights actions. */
export function isRestrictedRightsRouteAllowed(method: string, originalUrl: string): boolean {
  return matches(restrictedRightsRoutes, method, originalUrl);
}
