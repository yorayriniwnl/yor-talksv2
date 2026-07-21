import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().default("4000"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
  // Uploads are optional in local development; production still validates all three values below.
  CLOUDINARY_CLOUD_NAME: z.string().default(""),
  CLOUDINARY_API_KEY: z.string().default(""),
  CLOUDINARY_API_SECRET: z.string().default(""),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
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
    throw new Error(`${missingCloudinaryConfig.join(", ")} must be configured in production`);
  }
}

export const env = parsedEnv;
