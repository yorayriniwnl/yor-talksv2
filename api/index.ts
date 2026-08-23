import type { IncomingMessage, ServerResponse } from "node:http";

// @ts-ignore
import appModule from "../api-server/dist/app.cjs";
const app = (appModule && (appModule.default || appModule)) || ((_req: any, res: any) => res.end());

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
    console.error("[Vercel Handler Error]:", err);
    if (!res.headersSent) {
      if (typeof res.status === "function" && typeof res.json === "function") {
        return res.status(500).json({
          success: false,
          message: "Serverless function initialization error",
          data: null,
          errors: [err?.message || "Internal server error"],
        });
      }
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          message: "Serverless function initialization error",
          data: null,
          errors: [err?.message || "Internal server error"],
        })
      );
    }
  }
}

