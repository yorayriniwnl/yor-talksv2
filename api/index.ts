import type { Request, Response } from "express";
import path from "node:path";
import { pathToFileURL } from "node:url";

let cachedApp: any = null;

async function getExpressApp() {
  if (cachedApp) return cachedApp;

  // Attempt 1: Relative import of pre-bundled production app
  try {
    // @ts-ignore
    const distModule = await import("../api-server/dist/app.mjs");
    cachedApp = distModule.default || distModule;
    return cachedApp;
  } catch (err1) {
    // Attempt 2: Absolute file URL from process.cwd()
    try {
      const cwdDistPath = path.resolve(process.cwd(), "api-server/dist/app.mjs");
      const distModule = await import(pathToFileURL(cwdDistPath).href);
      cachedApp = distModule.default || distModule;
      return cachedApp;
    } catch (err2) {
      // Attempt 3: Fallback to source app (useful in development/tsx or unbundled deployments)
      try {
        // @ts-ignore
        const srcModule = await import("../api-server/src/app");
        cachedApp = srcModule.default || srcModule;
        return cachedApp;
      } catch (err3) {
        console.error("[Vercel Handler] Failed to load Express app across all strategies:", { err1, err2, err3 });
        throw new Error("Failed to initialize serverless application instance");
      }
    }
  }
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default async function handler(req: Request, res: Response) {
  try {
    const app = await getExpressApp();
    return app(req, res);
  } catch (err: any) {
    console.error("[Vercel Handler Error]:", err);
    return res.status(500).json({
      success: false,
      message: "Serverless function initialization error",
      data: null,
      errors: [err?.message || "Internal server error"],
    });
  }
}
