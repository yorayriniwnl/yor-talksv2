import type { IncomingMessage, ServerResponse } from "node:http";

// @ts-ignore
import appModule from "../api-server/dist/app.cjs";

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
  return ((_req: any, res: any) => res.end()) as ExpressHandler;
}

const app = resolveExpressHandler(appModule);

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default async function handler(req: IncomingMessage | any, res: ServerResponse | any) {
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
  } catch (err: any) {
    console.error("[Vercel Handler Error]:", err instanceof Error ? err.message : "unknown error");
    if (!res.headersSent) {
      if (typeof res.status === "function" && typeof res.json === "function") {
        return res.status(500).json({
          success: false,
          message: "Serverless function initialization error",
          data: null,
          errors: ["Internal server error"],
        });
      }
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          message: "Serverless function initialization error",
          data: null,
          errors: ["Internal server error"],
        })
      );
    }
  }
}

