import type { NextFunction, Request, Response } from "express";
import { corsOrigins, env } from "../config/env.js";
import { createResponse } from "../utils/response.js";

function normalizedOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const trustedOrigins = new Set([
  ...corsOrigins.map(normalizedOrigin),
  normalizedOrigin(env.CLIENT_ORIGIN),
].filter((origin): origin is string => Boolean(origin)));

/**
 * Cookie-authenticated mutations need an origin check because CORS only
 * controls whether a browser can read a response; it does not prevent every
 * cross-site request from reaching the server.
 */
export function requireTrustedOrigin(req: Request, res: Response, next: NextFunction): void {
  const origin = req.get("origin");
  // Native clients, server-to-server callers, and same-origin HTTP tooling may
  // omit Origin. Browsers include it on cross-origin fetches and form posts.
  if (!origin) {
    next();
    return;
  }
  const normalized = normalizedOrigin(origin);
  if (!normalized || !trustedOrigins.has(normalized)) {
    res.status(403).json(createResponse("Request origin is not trusted", null, {}, ["Forbidden origin"]));
    return;
  }
  next();
}
