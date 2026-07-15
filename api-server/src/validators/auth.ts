import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().min(3).max(24),
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
});

export const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(8),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
});
