import type { Request, Response } from "express";

let cachedApp: any = null;

async function getExpressApp() {
  if (cachedApp) return cachedApp;

  try {
    // Attempt 1: Load pre-bundled production app from dist
    const distModule = await import("../api-server/dist/app.mjs");
    cachedApp = distModule.default || distModule;
    return cachedApp;
  } catch (distErr) {
    try {
      // Attempt 2: Fallback to source app (useful in development/tsx or unbundled deployments)
      const srcModule = await import("../api-server/src/app.js");
      cachedApp = srcModule.default || srcModule;
      return cachedApp;
    } catch (srcErr) {
      console.error("[Vercel Handler] Failed to load Express app from dist and src:", { distErr, srcErr });
      throw new Error("Failed to initialize serverless application instance");
    }
  }
}

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
