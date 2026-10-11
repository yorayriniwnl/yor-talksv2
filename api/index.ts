import type { IncomingMessage, ServerResponse } from "node:http";

// This handler is intentionally HTTP-only. Vercel invocations do not own the
// durable Socket.IO listener or notification worker; deploy those as separate
// long-running processes and share DATABASE_URL/REDIS_URL with this function.

type ExpressHandler = (req: any, res: any, next?: (error?: unknown) => void) => unknown;

/**
 * esbuild's CommonJS output can be imported as either the handler itself or
 * one or more `{ default: ... }` wrappers depending on the host bundler.
 * Resolve both forms so Vercel never calls an object as if it were Express.
 */
export function resolveExpressHandler(moduleValue: unknown): ExpressHandler {
  let candidate = moduleValue;
  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof candidate === "function") return candidate as ExpressHandler;
    if (candidate && typeof candidate === "object" && "default" in candidate) {
      candidate = (candidate as { default: unknown }).default;
      continue;
    }
    break;
  }
  throw new TypeError("The API bundle does not export an Express handler");
}

type AppLoader = () => Promise<ExpressHandler>;

async function loadExpressApp(): Promise<ExpressHandler> {
  // Load lazily so invalid or missing production configuration can be returned
  // as an explicit unavailable response instead of escaping during module init
  // as Vercel's opaque FUNCTION_INVOCATION_FAILED response.
  // @ts-ignore The API bundle is emitted by api-server/build.mjs.
  const appModule: unknown = await import("../api-server/dist/app.cjs");
  return resolveExpressHandler(appModule);
}

function sendFailure(res: any, status: number, message: string, error: string) {
  if (res.headersSent) return;
  const body = { success: false, message, data: null, errors: [error] };
  if (typeof res.status === "function" && typeof res.json === "function") {
    return res.status(status).json(body);
  }
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "unknown";
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export function createVercelHandler(loadApp: AppLoader = loadExpressApp) {
  let appPromise: Promise<ExpressHandler> | undefined;

  return async function handler(req: IncomingMessage | any, res: ServerResponse | any) {
    let app: ExpressHandler;
    try {
      appPromise ??= loadApp();
      app = await appPromise;
    } catch (err) {
      // A rejected import must not remain cached for the lifetime of a warm
      // serverless instance. A later invocation may have usable configuration.
      appPromise = undefined;
      console.error("[Vercel Handler Error]: API runtime initialization unavailable", errorName(err));
      return sendFailure(res, 503, "API runtime is unavailable", "Service unavailable");
    }

    try {
      return await new Promise<void>((resolve, reject) => {
        res.on("finish", () => resolve());
        res.on("close", () => resolve());
        res.on("error", (err: Error) => reject(err));
        app(req, res, (err?: any) => {
          if (err) return reject(err);
          resolve();
        });
      });
    } catch (err) {
      console.error("[Vercel Handler Error]: request dispatch failed", errorName(err));
      return sendFailure(res, 500, "Internal server error", "Internal server error");
    }
  };
}

export default createVercelHandler();
