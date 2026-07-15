import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().default("4000"),
  JWT_SECRET: z.string().default("dev-secret"),
  JWT_REFRESH_SECRET: z.string().default("dev-refresh-secret"),
  CLOUDINARY_CLOUD_NAME: z.string().default("demo"),
  CLOUDINARY_API_KEY: z.string().default("demo"),
  CLOUDINARY_API_SECRET: z.string().default("demo"),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@127.0.0.1:5432/yor_talks"),
});

export const env = envSchema.parse(process.env);
