import type { NextFunction, Request, RequestHandler, Response } from "express";
import { apiRouteCatalog, type ApiRouteDefinition } from "../docs/routes.generated.js";
import type { Capability } from "./types.js";
import { isRestrictedRightsRouteAllowed, isRestrictedRouteAllowed } from "./restricted-routes.js";
import { createResponse } from "../utils/response.js";

export type RouteAuthority =
  | { kind: "capability"; capability: Capability }
  | { kind: "restricted" }
  | { kind: "safety" };

// A route tag receives a reviewed default only for the current generated
// catalog. Unknown tags and routes outside that catalog have no authority.
const tagCapability: Readonly<Record<string, Capability>> = {
  achievements: "social",
  ai: "ai",
  articles: "social",
  billing: "payments",
  "broadcast-channels": "messaging",
  business: "seller",
  communities: "social",
  contacts: "messaging",
  conversations: "messaging",
  creator: "social",
  diagnostics: "social",
  economy: "payments",
  events: "social",
  feed: "social",
  "group-invitations": "messaging",
  highlights: "social",
  invites: "social",
  media: "social",
  messages: "messaging",
  notes: "social",
  notifications: "social",
  onboarding: "social",
  operations: "payments",
  posts: "social",
  premium: "payments",
  products: "seller",
  projects: "social",
  reports: "social",
  search: "social",
  stories: "social",
  streams: "live",
  subscriptions: "memberships",
  users: "social",
  videos: "social",
};

const publishOperations = new Set([
  "postArticles", "deleteArticlesById", "postCommunities", "postEvents", "deleteEventsById", "postHighlights",
  "deleteMediaById", "postMediaByIdFinalize", "postMediaByIdUpload", "postMediaPresign", "postMediaUpload",
  "postNotes", "deleteNotesById", "postPosts", "putPostsByPostId", "deletePostsByPostId", "postPostsUploadImage",
  "postStories", "patchStoriesByIdPriority", "postVideos", "deleteVideosById",
]);
const analyticsOperations = new Set(["getEconomyAnalytics", "getStoriesByIdAnalytics", "getStoriesByIdViewers", "getTelemetryAnalytics"]);
// Marketplace catalog and buyer actions have different authorities from seller
// operations. Keep the default `products: seller` mapping as a fail-closed
// fallback for newly added operations, then grant each current operation the
// capability it actually needs. Service-level checks still enforce the other
// party's capability (for example, an enabled seller on a buyer checkout).
const marketplacePaymentsOperations = new Set([
  "postProductsByIdOrder", "getProductsOrders", "postProductsOrdersByOrderIdCancel", "postProductsOrdersByOrderIdVerify",
]);
const marketplaceSocialOperations = new Set(["postProductsByIdSave"]);
const marketplaceSellerOperations = new Set(["postProducts", "deleteProductsById", "postProductsOrdersByOrderIdFulfill"]);
const UUID = "3d6f2f91-32bb-45bc-bf1f-7f0e40a3b8a0";

function pathOnly(originalUrl: string): string | undefined {
  const path = originalUrl.split(/[?#]/, 1)[0];
  if (!path.startsWith("/") || path.includes("\\") || path.includes("%") || path.includes("//")) return undefined;
  if (path === "/api" || path === "/api/v1") return "/";
  if (path.startsWith("/api/v1/")) return path.slice("/api/v1".length);
  if (path.startsWith("/api/")) return path.slice("/api".length);
  return path;
}

function templateMatches(template: string, path: string): boolean {
  const expected = template.replace(/\/+$/, "").toLowerCase().split("/");
  const actual = path.replace(/\/+$/, "").toLowerCase().split("/");
  if (expected.length !== actual.length) return false;
  return expected.every((segment, index) => {
    if (segment.startsWith("{") && segment.endsWith("}")) return actual[index].length > 0;
    return segment === actual[index];
  });
}

function restrictedCatalogRoute(route: ApiRouteDefinition): boolean {
  const concrete = route.path.replace(/\{[^/]+\}/g, UUID);
  return isRestrictedRouteAllowed(route.method, `/api${concrete}`);
}

function authorityFor(route: ApiRouteDefinition): RouteAuthority | undefined {
  if (!route.authenticated) return undefined;
  if (route.method === "post" && route.path === "/reports") return { kind: "safety" };
  if (restrictedCatalogRoute(route)) return { kind: "restricted" };
  if (route.tag === "auth" || route.tag === "eligibility") return undefined;
  if (marketplacePaymentsOperations.has(route.operationId)) return { kind: "capability", capability: "payments" };
  if (marketplaceSocialOperations.has(route.operationId)) return { kind: "capability", capability: "social" };
  if (marketplaceSellerOperations.has(route.operationId)) return { kind: "capability", capability: "seller" };
  if (analyticsOperations.has(route.operationId)) return { kind: "capability", capability: "analytics" };
  if (publishOperations.has(route.operationId)) return { kind: "capability", capability: "publish" };
  const capability = tagCapability[route.tag];
  return capability ? { kind: "capability", capability } : undefined;
}

function findCatalogRoute(method: string, originalUrl: string): ApiRouteDefinition | undefined {
  const path = pathOnly(originalUrl);
  if (!path) return undefined;
  const normalizedMethod = method.toLowerCase();
  const matches = apiRouteCatalog.filter(route => route.method === normalizedMethod && templateMatches(route.path, path));
  matches.sort((a, b) => {
    const staticSegments = (route: ApiRouteDefinition) => route.path.split("/").filter(segment => !segment.startsWith("{")).length;
    return staticSegments(b) - staticSegments(a);
  });
  return matches[0];
}

/** Resolve only routes present in the generated API catalog. Unmapped is deny. */
export function classifyApiRoute(method: string, originalUrl: string): RouteAuthority | undefined {
  const route = findCatalogRoute(method, originalUrl);
  return route ? authorityFor(route) : undefined;
}

export function isApiRouteCapabilityMapped(method: string, originalUrl: string): boolean {
  return classifyApiRoute(method, originalUrl) !== undefined;
}

/** Every authenticated operation in the checked-in catalog must have an authority class. */
export function unmappedAuthenticatedCatalogRoutes(): ApiRouteDefinition[] {
  return apiRouteCatalog.filter(route => route.authenticated && !authorityFor(route));
}

export const rejectUnmappedProtectedRoute: RequestHandler = (req, res, next) => {
  const route = findCatalogRoute(req.method, req.originalUrl);
  if (route?.authenticated && !authorityFor(route)) {
    return res.status(403).json(createResponse("This operation has no approved access capability", null, {}, ["unmapped_route"]));
  }
  return next();
};

export function requireCapability(capability: Capability): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json(createResponse("Authentication required", null, {}, ["Unauthorized"]));
    const decision = req.eligibility;
    if (!decision) return res.status(503).json(createResponse("Eligibility status is temporarily unavailable", null));
    if (!decision.activated || !decision.capabilities[capability]) {
      return res.status(403).json(createResponse("This capability is unavailable for the current account", null, {}, ["capability_unavailable"]));
    }
    return next();
  };
}

/** Default-deny request boundary for authenticated routes, including restricted and safety authority. */
export const enforceRouteAuthority: RequestHandler = (req, res, next) => {
  const authority = classifyApiRoute(req.method, req.originalUrl);
  if (!authority) return res.status(403).json(createResponse("This operation has no approved access capability", null, {}, ["unmapped_route"]));
  if (authority.kind === "safety") return next();
  if (authority.kind === "restricted") {
    const moderationRestricted = ["suspended", "deactivated"].includes(req.user?.accountStatus ?? "active")
      || req.eligibility?.reason === "account_restricted"
      || Boolean((req.user as any)?.processingRestricted);
    const allowed = moderationRestricted
      ? isRestrictedRightsRouteAllowed(req.method, req.originalUrl)
      : isRestrictedRouteAllowed(req.method, req.originalUrl);
    if (allowed) return next();
    return res.status(403).json(createResponse("Account access is restricted", null, {}, ["eligibility_required"]));
  }
  return requireCapability(authority.capability)(req, res, next);
}
