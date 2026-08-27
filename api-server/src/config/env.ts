import { z } from "zod";

const defaultNodeEnvironment = process.env.NODE_ENV || (process.env.VERCEL ? "production" : "development");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default(defaultNodeEnvironment as "development" | "test" | "production"),
  PORT: z.string().default(process.env.PORT || process.env.API_PORT || "4000"),
  JWT_SECRET: z.string().default(process.env.JWT_SECRET || "change-me-access"),
  JWT_REFRESH_SECRET: z.string().default(process.env.JWT_REFRESH_SECRET || "change-me-refresh"),
  // Provider-backed uploads are optional in local development and fail closed
  // in production when Cloudinary is missing.
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
  // Empty means open registration for a global launch. Closed-beta
  // deployments can set a comma-separated allow-list such as
  // "kiit.ac.in,example.edu".
  ALLOWED_EMAIL_DOMAINS: z.string().default(process.env.ALLOWED_EMAIL_DOMAINS || ""),
  GOOGLE_CLIENT_ID: z.string().default(process.env.GOOGLE_CLIENT_ID || ""),
  RESEND_API_KEY: z.string().default(process.env.RESEND_API_KEY || ""),
  EMAIL_FROM: z.string().default(process.env.EMAIL_FROM || ""),
  WEB_PUSH_VAPID_PUBLIC_KEY: z.string().default(process.env.WEB_PUSH_VAPID_PUBLIC_KEY || ""),
  WEB_PUSH_VAPID_PRIVATE_KEY: z.string().default(process.env.WEB_PUSH_VAPID_PRIVATE_KEY || ""),
  WEB_PUSH_VAPID_SUBJECT: z.string().default(process.env.WEB_PUSH_VAPID_SUBJECT || "mailto:security@yortalks.com"),
  RAZORPAY_KEY_ID: z.string().default(process.env.RAZORPAY_KEY_ID || ""),
  RAZORPAY_KEY_SECRET: z.string().default(process.env.RAZORPAY_KEY_SECRET || ""),
  LIVEKIT_URL: z.string().default(process.env.LIVEKIT_URL || ""),
  LIVEKIT_API_KEY: z.string().default(process.env.LIVEKIT_API_KEY || ""),
  LIVEKIT_API_SECRET: z.string().default(process.env.LIVEKIT_API_SECRET || ""),
  OPENAI_API_KEY: z.string().optional().default(process.env.OPENAI_API_KEY || ""),
  GEMINI_API_KEY: z.string().optional().default(process.env.GEMINI_API_KEY || ""),
  CONTACT_SHIELD_SECRET: z.string().default(process.env.CONTACT_SHIELD_SECRET || "contact-shield-development-secret-change-me"),
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
    "contact-shield-development-secret-change-me",
    "",
  ]);
  const invalidSecretFields = ["JWT_SECRET", "JWT_REFRESH_SECRET"].filter((field) => {
    const value = parsedEnv[field as "JWT_SECRET" | "JWT_REFRESH_SECRET"];
    return insecureSecrets.has(value) || value.length < 32;
  });
  if (invalidSecretFields.length) {
    throw new Error(`[Config Error] Production requires unique JWT secrets of at least 32 characters: ${invalidSecretFields.join(", ")}`);
  }

  if (parsedEnv.CONTACT_SHIELD_SECRET.length < 32 || insecureSecrets.has(parsedEnv.CONTACT_SHIELD_SECRET)) {
    throw new Error("[Config Error] Production requires a unique CONTACT_SHIELD_SECRET of at least 32 characters");
  }

  const requiredProductionConfig = [
    ["DATABASE_URL", parsedEnv.DATABASE_URL],
    ["REDIS_URL", parsedEnv.REDIS_URL],
    ["CORS_ORIGINS", parsedEnv.CORS_ORIGINS],
    ["CLIENT_ORIGIN", parsedEnv.CLIENT_ORIGIN],
  ] as const;
  const missingProductionConfig = requiredProductionConfig
    .filter(([, value]) => !value || /localhost|127\.0\.0\.1/i.test(value))
    .map(([field]) => field);
  if (missingProductionConfig.length) {
    throw new Error(`[Config Error] Production requires deployed values for: ${missingProductionConfig.join(", ")}`);
  }

  const missingCloudinaryConfig = cloudinaryFields.filter((field) => !parsedEnv[field]);
  if (missingCloudinaryConfig.length) {
    console.warn(`[Config Warning] Missing Cloudinary keys: ${missingCloudinaryConfig.join(", ")}. Image uploads will be disabled.`);
  }

  if (!parsedEnv.RESEND_API_KEY || !parsedEnv.EMAIL_FROM) {
    console.warn("[Config Warning] Resend is not fully configured. Password reset, verification, and email OTP delivery will be disabled.");
  }
  if (!parsedEnv.WEB_PUSH_VAPID_PUBLIC_KEY || !parsedEnv.WEB_PUSH_VAPID_PRIVATE_KEY) {
    console.warn("[Config Warning] Web Push VAPID keys are not configured. Device push delivery will be disabled.");
  }
  if (!parsedEnv.GOOGLE_CLIENT_ID) {
    console.warn("[Config Warning] GOOGLE_CLIENT_ID is not configured. Google sign-in will be disabled.");
  }
  if (!parsedEnv.RAZORPAY_KEY_ID || !parsedEnv.RAZORPAY_KEY_SECRET) {
    console.warn("[Config Warning] Razorpay is not configured. Tip orders and payment settlement will be disabled.");
  }
  if (!parsedEnv.LIVEKIT_URL || !parsedEnv.LIVEKIT_API_KEY || !parsedEnv.LIVEKIT_API_SECRET) {
    console.warn("[Config Warning] LiveKit is not fully configured. Live rooms will be disabled.");
  }
  if (!parsedEnv.OPENAI_API_KEY && !parsedEnv.GEMINI_API_KEY) {
    console.warn("[Config Warning] No AI moderation provider is configured. User-authored text publication will be unavailable.");
  }

  if (parsedEnv.CORS_ORIGINS.split(",").some((origin) => origin.trim() === "*")) {
    throw new Error("[Config Error] Production CORS_ORIGINS must list explicit browser origins; wildcard is not allowed.");
  }
}

export const env = parsedEnv;
export const corsOrigins: string[] = parsedEnv.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
export const allowedEmailDomains: string[] = parsedEnv.ALLOWED_EMAIL_DOMAINS
  .split(",")
  .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
  .filter(Boolean);
