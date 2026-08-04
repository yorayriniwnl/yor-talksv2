import type { Request, Response } from "express";
import app from "../api-server/src/app.js";

export default function handler(req: Request, res: Response) {
  try {
    // Standard Express request handling for Vercel Serverless Function
    return app(req, res);
  } catch (err: any) {
    console.error("[Vercel Handler Error]:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      data: null,
      errors: [err?.message || "Serverless invocation error"],
    });
  }
}
