import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().default(process.env.PORT || process.env.API_PORT || "4000"),
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
  const insecureSecrets = new Set([
    "change-me-access",
    "change-me-refresh",
    "change-me",
    "replace-with-a-random-secret-at-least-32-characters",
    "replace-with-a-different-random-secret-at-least-32-characters",
    "",
  ]);
  const invalidSecretFields = ["JWT_SECRET", "JWT_REFRESH_SECRET"].filter((field) => {
    const value = parsedEnv[field as "JWT_SECRET" | "JWT_REFRESH_SECRET"];
    return insecureSecrets.has(value) || value.length < 32;
  });
  if (invalidSecretFields.length) {
    throw new Error(`[Config Error] Production requires unique JWT secrets of at least 32 characters: ${invalidSecretFields.join(", ")}`);
  }

  const missingCloudinaryConfig = cloudinaryFields.filter((field) => !parsedEnv[field]);
  if (missingCloudinaryConfig.length) {
    console.warn(`[Config Warning] Missing Cloudinary keys: ${missingCloudinaryConfig.join(", ")}. Image uploads will be disabled.`);
  }

  if (parsedEnv.CORS_ORIGINS.split(",").some((origin) => origin.trim() === "*")) {
    throw new Error("[Config Error] Production CORS_ORIGINS must list explicit browser origins; wildcard is not allowed.");
  }
}

export const env = parsedEnv;
export const corsOrigins: string[] = parsedEnv.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
