import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  bio: z.string().max(280).optional(),
  avatarUrl: z.string().url().optional(),
});

export const searchUsersSchema = z.object({
  q: z.string().optional(),
});

export const settingsSchema = z.object({
  theme: z.enum(["light", "dark"]).optional(),
  notificationsEnabled: z.boolean().optional(),
  privateAccount: z.boolean().optional(),
});

export const privacySchema = z.object({
  profileVisibility: z.enum(["public", "private", "followers"]).optional(),
  messageRequests: z.boolean().optional(),
  allowDmFromStrangers: z.boolean().optional(),
});
