import { apiRouteCatalog, type ApiRouteDefinition } from '../docs/routes.generated.js';
import type { Capability } from './types.js';
import { isRestrictedRouteAllowed, normalizeRequestPath } from './restricted-routes.js';

export type RouteCapabilityPolicy =
  | { kind: 'public' }
  | { kind: 'restricted' }
  | { kind: 'safety' }
  | { kind: 'staff'; roles: readonly string[] }
  | { kind: 'capability'; capability: Capability };

export interface ClassifiedApiRoute {
  method: ApiRouteDefinition['method'];
  path: string;
  operationId: string;
  tag: string;
  authenticated: boolean;
  policy: RouteCapabilityPolicy | null;
}

const sampleId = '00000000-0000-4000-8000-000000000000';
const escapeRegex = (segment: string) => segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function matchesTemplate(path: string, template: string): boolean {
  const normalizedPath = normalizeRequestPath(path);
  const normalizedTemplate = normalizeRequestPath(template);
  if (!normalizedPath || !normalizedTemplate) return false;
  const source = normalizedTemplate.split('/').map((segment) =>
    /^\{[^{}]+\}$/.test(segment) ? '[^/]+' : escapeRegex(segment),
  ).join('/');
  return new RegExp(`^${source}$`).test(normalizedPath);
}

function isSafetyOperation(route: ApiRouteDefinition): boolean {
  return route.operationId === 'postReports'
    || route.operationId === 'postUsersByUserIdBlock'
    || route.operationId === 'postUsersByUserIdUnblock'
    || route.path.startsWith('/users/me/contact-shields');
}

function isStaffOperation(route: ApiRouteDefinition): boolean {
  return route.roles.length > 0 || route.tag === 'diagnostics' || route.tag === 'operations'
    || route.operationId === 'getReportsGrievances' || route.operationId === 'getReportsQueue'
    || route.operationId === 'patchReportsByReportIdStatus'
    || route.operationId === 'patchReportsGrievanceByTicketIdStatus';
}

function capabilityFor(route: ApiRouteDefinition): Capability | undefined {
  const { method, path, tag } = route;

  if (tag === 'ai') return 'ai';
  if (['billing', 'economy', 'premium', 'subscriptions'].includes(tag)) return 'payments';
  if (tag === 'business') return 'seller';
  if (tag === 'streams') return 'live';
  if (['communities', 'projects', 'invites'].includes(tag)) return 'memberships';
  if (tag === 'conversations' || tag === 'messages') return 'messaging';
  if (tag === 'telemetry') return 'analytics';
  if (tag === 'creator') return 'publish';
  if (tag === 'broadcast-channels') {
    return path.includes('/messages') ? 'messaging' : path.endsWith('/notifications') ? 'social' : 'memberships';
  }
  if (tag === 'notifications') {
    return path.includes('/push/') || path.endsWith('/push/subscribe') ? 'analytics' : 'social';
  }
  if (tag === 'articles') return method === 'post' && path.endsWith('/clap') ? 'social' : method === 'get' ? 'social' : 'publish';
  if (tag === 'events') return path.endsWith('/rsvp') ? 'social' : 'publish';
  if (tag === 'feed' || tag === 'search' || tag === 'achievements') return 'social';
  if (tag === 'highlights') return method === 'get' ? 'social' : 'publish';
  if (tag === 'media') return 'publish';
  if (tag === 'notes') return method === 'get' ? 'social' : 'publish';
  if (tag === 'onboarding') return 'social';
  if (tag === 'posts') {
    if (method === 'get') return 'social';
    if (path === '/posts' || path === '/posts/upload-image' || method === 'put' || method === 'delete') return 'publish';
    if (path.endsWith('/comments') && method === 'post' || path.includes('/comments/') && path.endsWith('/replies')) return 'publish';
    if (path.endsWith('/pin') && method === 'post') return 'publish';
    return 'social';
  }
  if (tag === 'products') {
    if (path === '/products' || path === '/products/{id}') return 'seller';
    if (path.includes('/orders')) return 'payments';
    return 'social';
  }
  if (tag === 'reports') return undefined;
  if (tag === 'stories') {
    if (path.endsWith('/analytics') || path.endsWith('/viewers')) return 'analytics';
    if (path === '/stories' || path === '/highlights' || path.endsWith('/priority')) return 'publish';
    return 'social';
  }
  if (tag === 'users') {
    if (path.includes('/profile-comments') && method !== 'get' || path.includes('/showcases') && method !== 'get') return 'publish';
    if (path.includes('/premium-profile')) return 'seller';
    return 'social';
  }
  if (tag === 'videos') {
    if (path === '/videos' || method === 'delete') return 'publish';
    return 'social';
  }
  return undefined;
}

function policyFor(route: ApiRouteDefinition): RouteCapabilityPolicy | null {
  if (isSafetyOperation(route)) return { kind: 'safety' };
  const restrictedPath = route.path.replace(/\{[^{}]+\}/g, sampleId);
  if (isRestrictedRouteAllowed(route.method, restrictedPath)) return { kind: 'restricted' };
  if (!route.authenticated) return { kind: 'public' };
  if (isStaffOperation(route)) return { kind: 'staff', roles: route.roles.length ? route.roles : ['admin', 'moderator'] };
  const capability = capabilityFor(route);
  return capability ? { kind: 'capability', capability } : null;
}

const classifiedRoutes: ClassifiedApiRoute[] = apiRouteCatalog.map((route) => ({
  method: route.method,
  path: route.path,
  operationId: route.operationId,
  tag: route.tag,
  authenticated: route.authenticated,
  policy: policyFor(route),
}));

const routeSpecificity = (route: ClassifiedApiRoute) =>
  route.path.split('/').filter((segment) => segment && !/^\{[^{}]+\}$/.test(segment)).length * 100 + route.path.length;
const matchableRoutes = [...classifiedRoutes].sort((a, b) => routeSpecificity(b) - routeSpecificity(a));

export function classifyApiRoute(method: string, originalUrl: string): ClassifiedApiRoute | null {
  if (typeof method !== 'string' || typeof originalUrl !== 'string') return null;
  const normalizedMethod = method.toLowerCase();
  return matchableRoutes.find((route) => route.method === normalizedMethod && matchesTemplate(originalUrl, route.path)) ?? null;
}

export function authenticatedRouteInventory(): readonly ClassifiedApiRoute[] {
  return classifiedRoutes.filter((route) => route.authenticated);
}
