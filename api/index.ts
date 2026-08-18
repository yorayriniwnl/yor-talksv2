import type { Request, Response } from "express";

// @ts-ignore
import appModule from "../api-server/dist/app.cjs";
const app = appModule.default || appModule;

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default async function handler(req: Request, res: Response) {
  try {
    return new Promise((resolve, reject) => {
      res.on("finish", resolve);
      res.on("close", resolve);
      res.on("error", reject);
      app(req, res, (err: any) => {
        if (err) return reject(err);
        resolve(undefined);
      });
    });
  } catch (err: any) {
    console.error("[Vercel Handler Error]:", err);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Serverless function initialization error",
        data: null,
        errors: [err?.message || "Internal server error"],
      });
    }
  }
}

