import { z } from "zod";

const defaultNodeEnvironment = process.env.NODE_ENV || (process.env.VERCEL ? "production" : "development");
const booleanFromEnv = (value: unknown, fallback = false): unknown => {
  if (value === undefined || (typeof value === "string" && value.trim() === "")) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  // Return the invalid value so Zod rejects it instead of silently treating a
  // typo such as "treu" as false and changing the deployment's safety gates.
  return value;
};

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default(defaultNodeEnvironment as "development" | "test" | "production"),
  PORT: z.string().default(process.env.PORT || process.env.API_PORT || "4000"),
  JWT_SECRET: z.string().default(process.env.JWT_SECRET || "change-me-access"),
  JWT_REFRESH_SECRET: z.string().default(process.env.JWT_REFRESH_SECRET || "change-me-refresh"),
  // Provider-backed uploads are optional in local development and required for
  // a complete production launch.
  CLOUDINARY_CLOUD_NAME: z.string().default(process.env.CLOUDINARY_CLOUD_NAME || ""),
  CLOUDINARY_API_KEY: z.string().default(process.env.CLOUDINARY_API_KEY || ""),
  CLOUDINARY_API_SECRET: z.string().default(process.env.CLOUDINARY_API_SECRET || ""),
  CLOUDINARY_MEDIA_IMAGE_PRESET: z.string().trim().regex(/^[A-Za-z0-9_-]*$/).default(""),
  CLOUDINARY_MEDIA_VIDEO_PRESET: z.string().trim().regex(/^[A-Za-z0-9_-]*$/).default(""),
  CLOUDINARY_MEDIA_AUDIO_PRESET: z.string().trim().regex(/^[A-Za-z0-9_-]*$/).default(""),
  MEDIA_FFPROBE_PATH: z.string().min(1).default("ffprobe"),
  MEDIA_FFMPEG_PATH: z.string().min(1).default("ffmpeg"),
  MEDIA_DECODE_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(30000),
  MEDIA_DECODE_CONCURRENCY: z.coerce.number().int().min(1).max(4).default(2),
  MEDIA_PROVIDER_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(15000),
  MEDIA_MODERATION_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(30000),
  MEDIA_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(30).max(900).default(300),
  MEDIA_DELIVERY_ORIGIN: z.string().url().or(z.literal('')).default(''),
  MEDIA_GEMINI_MODEL: z.enum(["gemini-2.5-flash", "gemini-2.5-pro", "gemini-3.5-flash", "gemini-3.8-flash"]).default("gemini-2.5-flash"),
  REDIS_URL: z.string().default(process.env.REDIS_URL || "redis://127.0.0.1:6379"),
  DATABASE_URL: z.string().default(process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/yor_talks"),
  // Comma-separated list of allowed browser origins for CORS. Defaults to the
  // Vite dev server's own origin — in dev, /api is same-origin via Vite's proxy
  // anyway (see social/vite.config.ts), so this default is rarely exercised.
  CORS_ORIGINS: z.string().default(process.env.CORS_ORIGINS || "http://localhost:5173"),
  CLIENT_ORIGIN: z.string().default(process.env.CLIENT_ORIGIN || "http://localhost:5173"),
  AUTH_COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default((process.env.AUTH_COOKIE_SAME_SITE || "lax") as "lax" | "strict" | "none"),
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
  RAZORPAY_WEBHOOK_SECRET: z.string().default(process.env.RAZORPAY_WEBHOOK_SECRET || ""),
  RAZORPAY_ACCOUNT_ID: z.string().default(''),
  PAYMENT_EVENT_ENCRYPTION_KEY: z.string().default(''),
  YOR_PREMIUM_ENABLED: z.preprocess(value => booleanFromEnv(value), z.boolean()),
  YOR_PREMIUM_PRICE_MINOR: z.coerce.number().int().min(0).max(2147483647).default(0),
  YOR_PREMIUM_DURATION_DAYS: z.coerce.number().int().min(1).max(366).default(30),
  YOR_PREMIUM_TERMS_VERSION: z.string().trim().max(100).default(''),
  YOR_PREMIUM_REFUND_POLICY: z.string().trim().max(4000).default(''),
  LIVEKIT_URL: z.string().default(process.env.LIVEKIT_URL || ""),
  LIVEKIT_API_KEY: z.string().default(process.env.LIVEKIT_API_KEY || ""),
  LIVEKIT_API_SECRET: z.string().default(process.env.LIVEKIT_API_SECRET || ""),
  OPENAI_API_KEY: z.string().optional().default(process.env.OPENAI_API_KEY || ""),
  GEMINI_API_KEY: z.string().optional().default(process.env.GEMINI_API_KEY || ""),
  CONTACT_SHIELD_SECRET: z.string().default(process.env.CONTACT_SHIELD_SECRET || "contact-shield-development-secret-change-me"),
  TOTP_ENCRYPTION_KEY: z.string().default(process.env.TOTP_ENCRYPTION_KEY || "totp-development-encryption-key-change-me"),
  METRICS_BEARER_TOKEN_FILE: z.string().default(process.env.METRICS_BEARER_TOKEN_FILE || "/run/secrets/metrics_bearer_token"),
  TERMS_VERSION: z.string().trim().default(process.env.TERMS_VERSION || "development"),
  MINIMUM_AGE: z.coerce.number().int().min(13).default(Number(process.env.MINIMUM_AGE || 18)),
  PUBLIC_BETA: z.preprocess((value) => booleanFromEnv(value), z.boolean()),
  PAYMENTS_ENABLED: z.preprocess((value) => booleanFromEnv(value), z.boolean()),
  SELLER_ENABLED: z.preprocess((value) => booleanFromEnv(value), z.boolean()),
  MEMBERSHIPS_ENABLED: z.preprocess((value) => booleanFromEnv(value), z.boolean()),
  AI_COMPANION_ENABLED: z.preprocess((value) => booleanFromEnv(value), z.boolean()),
  ELIGIBILITY_ASSURANCE_ADAPTER: z.enum(['unavailable']).default('unavailable'),
  ELIGIBILITY_POLICY_SOURCE: z.enum(['approved_registry']).default('approved_registry'),
  LIVE_ROOMS_ENABLED: z.preprocess((value) => booleanFromEnv(value), z.boolean()),
  WEB_PUSH_ENABLED: z.preprocess((value) => booleanFromEnv(value), z.boolean()),
  RTC_CALLS_ENABLED: z.preprocess((value) => booleanFromEnv(value), z.boolean()),
  LEGAL_OPERATOR_NAME: z.string().default(process.env.LEGAL_OPERATOR_NAME || ""),
  LEGAL_OPERATOR_ADDRESS: z.string().default(process.env.LEGAL_OPERATOR_ADDRESS || ""),
  LEGAL_EFFECTIVE_DATE: z.string().default(process.env.LEGAL_EFFECTIVE_DATE || ""),
  LEGAL_GOVERNING_LAW: z.string().default(process.env.LEGAL_GOVERNING_LAW || ""),
  PRIVACY_CONTACT_EMAIL: z.string().default(process.env.PRIVACY_CONTACT_EMAIL || ""),
  SUPPORT_EMAIL: z.string().default(process.env.SUPPORT_EMAIL || ""),
  GRIEVANCE_OFFICER_NAME: z.string().default(process.env.GRIEVANCE_OFFICER_NAME || ""),
  GRIEVANCE_CONTACT_EMAIL: z.string().default(process.env.GRIEVANCE_CONTACT_EMAIL || ""),
});

const parsedEnv = envSchema.parse(process.env);

if (parsedEnv.NODE_ENV === "production") {
  const insecureSecrets = new Set([
    "change-me-access",
    "change-me-refresh",
    "change-me",
    "replace-with-a-random-secret-at-least-32-characters",
    "replace-with-a-different-random-secret-at-least-32-characters",
    "contact-shield-development-secret-change-me",
    "totp-development-encryption-key-change-me",
    "metrics-development-token-change-me",
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

  if (parsedEnv.TOTP_ENCRYPTION_KEY.length < 32 || insecureSecrets.has(parsedEnv.TOTP_ENCRYPTION_KEY)) {
    throw new Error("[Config Error] Production requires a unique TOTP_ENCRYPTION_KEY of at least 32 characters");
  }

  if (!parsedEnv.METRICS_BEARER_TOKEN_FILE.startsWith("/run/secrets/")) {
    throw new Error("[Config Error] Production metrics token must be mounted as a Docker secret under /run/secrets");
  }

  const requiredProductionConfig = [
    ["DATABASE_URL", parsedEnv.DATABASE_URL],
    ["REDIS_URL", parsedEnv.REDIS_URL],
    ["CORS_ORIGINS", parsedEnv.CORS_ORIGINS],
    ["CLIENT_ORIGIN", parsedEnv.CLIENT_ORIGIN],
    ["CLOUDINARY_CLOUD_NAME", parsedEnv.CLOUDINARY_CLOUD_NAME],
    ["CLOUDINARY_API_KEY", parsedEnv.CLOUDINARY_API_KEY],
    ["CLOUDINARY_API_SECRET", parsedEnv.CLOUDINARY_API_SECRET],
    ["RESEND_API_KEY", parsedEnv.RESEND_API_KEY],
    ["EMAIL_FROM", parsedEnv.EMAIL_FROM],
    ["METRICS_BEARER_TOKEN_FILE", parsedEnv.METRICS_BEARER_TOKEN_FILE],
  ] as const;
  const placeholderPattern = /change_me|change-me|replace-with|your-domain\.example/i;
  const missingProductionConfig = requiredProductionConfig
    .filter(([, value]) => !value || /localhost|127\.0\.0\.1/i.test(value) || placeholderPattern.test(value))
    .map(([field]) => field);
  if (missingProductionConfig.length) {
    throw new Error(`[Config Error] Production requires deployed values for: ${missingProductionConfig.join(", ")}`);
  }

  if (![parsedEnv.OPENAI_API_KEY, parsedEnv.GEMINI_API_KEY].some((value) => value && !placeholderPattern.test(value))) {
    throw new Error("[Config Error] Production requires OPENAI_API_KEY or GEMINI_API_KEY for content safety checks");
  }
  if (parsedEnv.CORS_ORIGINS.split(",").some((origin) => origin.trim() === "*")) {
    throw new Error("[Config Error] Production CORS_ORIGINS must list explicit browser origins; wildcard is not allowed.");
  }
  const productionOrigins = [parsedEnv.CLIENT_ORIGIN, ...parsedEnv.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)];
  const invalidOrigins = productionOrigins.filter((origin) => {
    try {
      const parsed = new URL(origin);
      return parsed.protocol !== "https:" || parsed.origin !== origin || parsed.username !== "" || parsed.password !== "";
    } catch {
      return true;
    }
  });
  if (invalidOrigins.length) {
    throw new Error("[Config Error] Production CLIENT_ORIGIN and CORS_ORIGINS must be canonical HTTPS origins without paths or credentials");
  }
  if (parsedEnv.MEDIA_DELIVERY_ORIGIN) {
    const mediaOrigin = new URL(parsedEnv.MEDIA_DELIVERY_ORIGIN);
    if (mediaOrigin.protocol !== 'https:' || mediaOrigin.origin !== parsedEnv.MEDIA_DELIVERY_ORIGIN) {
      throw new Error('[Config Error] Production MEDIA_DELIVERY_ORIGIN must be a canonical HTTPS origin');
    }
  }
  if (parsedEnv.AUTH_COOKIE_SAME_SITE === "none" && !parsedEnv.CLIENT_ORIGIN.startsWith("https://")) {
    throw new Error("[Config Error] AUTH_COOKIE_SAME_SITE=none requires an HTTPS CLIENT_ORIGIN");
  }
}

if (parsedEnv.PUBLIC_BETA) {
  const placeholderPattern = /change_me|change-me|replace-with|your-domain\.example|^development$/i;
  const requiredPublicBetaConfig = [
    ["TERMS_VERSION", parsedEnv.TERMS_VERSION],
    ["LEGAL_OPERATOR_NAME", parsedEnv.LEGAL_OPERATOR_NAME],
    ["LEGAL_OPERATOR_ADDRESS", parsedEnv.LEGAL_OPERATOR_ADDRESS],
    ["LEGAL_EFFECTIVE_DATE", parsedEnv.LEGAL_EFFECTIVE_DATE],
    ["LEGAL_GOVERNING_LAW", parsedEnv.LEGAL_GOVERNING_LAW],
    ["PRIVACY_CONTACT_EMAIL", parsedEnv.PRIVACY_CONTACT_EMAIL],
    ["SUPPORT_EMAIL", parsedEnv.SUPPORT_EMAIL],
    ["GRIEVANCE_OFFICER_NAME", parsedEnv.GRIEVANCE_OFFICER_NAME],
    ["GRIEVANCE_CONTACT_EMAIL", parsedEnv.GRIEVANCE_CONTACT_EMAIL],
    ["GOOGLE_CLIENT_ID", parsedEnv.GOOGLE_CLIENT_ID],
  ] as const;
  const missingPublicBetaConfig = requiredPublicBetaConfig
    .filter(([, value]) => !value || placeholderPattern.test(value))
    .map(([field]) => field);
  if (missingPublicBetaConfig.length) {
    throw new Error(`[Config Error] PUBLIC_BETA requires configured legal and sign-in values: ${missingPublicBetaConfig.join(", ")}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsedEnv.LEGAL_EFFECTIVE_DATE) || Number.isNaN(Date.parse(parsedEnv.LEGAL_EFFECTIVE_DATE))) {
    throw new Error("[Config Error] LEGAL_EFFECTIVE_DATE must be an ISO date (YYYY-MM-DD)");
  }
  for (const [field, value] of [["PRIVACY_CONTACT_EMAIL", parsedEnv.PRIVACY_CONTACT_EMAIL], ["SUPPORT_EMAIL", parsedEnv.SUPPORT_EMAIL], ["GRIEVANCE_CONTACT_EMAIL", parsedEnv.GRIEVANCE_CONTACT_EMAIL]] as const) {
    if (!z.string().email().safeParse(value).success) throw new Error(`[Config Error] ${field} must be a valid email address`);
  }
}

if (parsedEnv.PAYMENTS_ENABLED && (!parsedEnv.RAZORPAY_KEY_ID || !parsedEnv.RAZORPAY_KEY_SECRET || !parsedEnv.RAZORPAY_WEBHOOK_SECRET)) {
  throw new Error("[Config Error] PAYMENTS_ENABLED requires Razorpay keys and RAZORPAY_WEBHOOK_SECRET");
}

if (parsedEnv.PAYMENTS_ENABLED && parsedEnv.NODE_ENV === 'production' &&
  (!/^acc_[A-Za-z0-9]+$/.test(parsedEnv.RAZORPAY_ACCOUNT_ID) || parsedEnv.PAYMENT_EVENT_ENCRYPTION_KEY.length < 32)) {
  throw new Error('[Config Error] Payments require the expected RAZORPAY_ACCOUNT_ID and a separate PAYMENT_EVENT_ENCRYPTION_KEY of at least 32 characters');
}
if (parsedEnv.YOR_PREMIUM_ENABLED && (!parsedEnv.PAYMENTS_ENABLED || parsedEnv.YOR_PREMIUM_PRICE_MINOR < 100 ||
  !parsedEnv.YOR_PREMIUM_TERMS_VERSION || !parsedEnv.YOR_PREMIUM_REFUND_POLICY || !z.string().email().safeParse(parsedEnv.SUPPORT_EMAIL).success)) {
  throw new Error('[Config Error] Yor Premium requires payments, a configured price, terms version, refund policy and support email');
}

if (parsedEnv.LIVE_ROOMS_ENABLED && (!parsedEnv.LIVEKIT_URL || !parsedEnv.LIVEKIT_API_KEY || !parsedEnv.LIVEKIT_API_SECRET)) {
  throw new Error("[Config Error] LIVE_ROOMS_ENABLED requires complete LiveKit configuration");
}

if (parsedEnv.WEB_PUSH_ENABLED && (!parsedEnv.WEB_PUSH_VAPID_PUBLIC_KEY || !parsedEnv.WEB_PUSH_VAPID_PRIVATE_KEY)) {
  throw new Error("[Config Error] WEB_PUSH_ENABLED requires Web Push VAPID keys");
}

export const env = parsedEnv;
export const corsOrigins: string[] = parsedEnv.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
export const allowedEmailDomains: string[] = parsedEnv.ALLOWED_EMAIL_DOMAINS
  .split(",")
  .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
  .filter(Boolean);
