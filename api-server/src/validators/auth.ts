import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().min(3).max(24),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  fullName: z.string().min(2),
});

export const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(8),
  totpCode: z.string().length(6).optional(),
});

export const totpCodeSchema = z.object({
  code: z.string().length(6),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
});

const passwordRule = z
  .string()
  .min(8)
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const confirmResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordRule,
});
