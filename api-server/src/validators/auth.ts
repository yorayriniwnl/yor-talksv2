import { z } from "zod";
import { allowedEmailDomains } from "../config/env.js";

export const KIIT_EMAIL_PATTERN = /^\d{7}@kiit\.ac\.in$/i;

export function isKiitCollegeEmail(email: string): boolean {
  return isAllowedEmail(email);
}

export function isAllowedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!z.string().email().safeParse(normalized).success) return false;
  if (allowedEmailDomains.length === 0) return true;
  const domain = normalized.split("@")[1] ?? "";
  return allowedEmailDomains.includes(domain);
}

const allowedEmailSchema = z.string().trim().email().refine(isAllowedEmail, "This email domain is not allowed for this deployment");

export const registerSchema = z.object({
  username: z.string().trim().regex(/^[a-zA-Z0-9_][a-zA-Z0-9_-]{2,23}$/, "Username must be 3-24 characters using letters, numbers, underscores, or hyphens"),
  email: allowedEmailSchema,
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
  identifier: z.string().trim().min(3),
  password: z.string().min(8),
  totpCode: z.string().length(6).optional(),
  challengeId: z.string().uuid("Invalid challenge ID format").optional(),
});

export const googleLoginSchema = z.object({
  credential: z.string().min(1).max(8192),
  totpCode: z.string().length(6).optional(),
  challengeId: z.string().uuid("Invalid challenge ID format").optional(),
});

export const emailOtpRequestSchema = z.object({
  email: z.string().trim().email(),
});

export const emailOtpVerifySchema = z.object({
  email: allowedEmailSchema,
  code: z.string().regex(/^\d{6}$/, "Enter the six-digit sign-in code"),
  totpCode: z.string().length(6).optional(),
  challengeId: z.string().uuid("Invalid challenge ID format").optional(),
});

export const totpCodeSchema = z.object({
  code: z.string().length(6),
});

export const twoFactorApprovalSchema = z.object({
  matchingNumber: z.coerce.number().int().min(1).max(99),
});

export const resetPasswordSchema = z.object({
  email: allowedEmailSchema,
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
