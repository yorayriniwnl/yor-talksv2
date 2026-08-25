import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().optional().transform(() => process.env.API_PORT || "4000"),
  JWT_SECRET: z.string().default(process.env.JWT_SECRET || "change-me-access"),
  JWT_REFRESH_SECRET: z.string().default(process.env.JWT_REFRESH_SECRET || "change-me-refresh"),
  // Uploads are optional in local development; production still validates all three values below.
  CLOUDINARY_CLOUD_NAME: z.string().default(process.env.CLOUDINARY_CLOUD_NAME || ""),
  CLOUDINARY_API_KEY: z.string().default(process.env.CLOUDINARY_API_KEY || ""),
  CLOUDINARY_API_SECRET: z.string().default(process.env.CLOUDINARY_API_SECRET || ""),
  REDIS_URL: z.string().default(process.env.REDIS_URL || "redis://127.0.0.1:6379"),
  DATABASE_URL: z.string().default(process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/yor_talks"),
  // Comma-separated list of allowed browser origins for CORS. Defaults to the
  // Vite dev server's own origin — in dev, /api is same-origin via Vite's proxy
  // anyway (see social/vite.config.ts), so this default is rarely exercised.
  CORS_ORIGINS: z.string().default(process.env.CORS_ORIGINS || "http://localhost:5173"),
  CLIENT_ORIGIN: z.string().default(process.env.CLIENT_ORIGIN || "http://localhost:5173"),
  OPENAI_API_KEY: z.string().optional().default(process.env.OPENAI_API_KEY || ""),
});

const parsedEnv = envSchema.parse(process.env);
const cloudinaryFields = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

if (parsedEnv.NODE_ENV === "production") {
  const missingCloudinaryConfig = cloudinaryFields.filter((field) => !parsedEnv[field]);
  if (missingCloudinaryConfig.length) {
    console.warn(`[Config Warning] Missing Cloudinary keys: ${missingCloudinaryConfig.join(", ")}. Cloudinary uploads will be disabled.`);
  }
}

export const env = parsedEnv;
export const corsOrigins: string[] = parsedEnv.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
