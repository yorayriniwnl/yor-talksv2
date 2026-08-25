import { z } from "zod";

const contentRatingSchema = z.enum(["child_safe", "regular", "mature"]);

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
  contentFilter: contentRatingSchema.optional(),
});

export const privacySchema = z.object({
  profileVisibility: z.enum(["public", "private", "followers"]).optional(),
  messageRequests: z.boolean().optional(),
  allowDmFromStrangers: z.boolean().optional(),
});

export const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE"),
  password: z.string().min(8),
});

export const contactShieldSchema = z.object({
  contacts: z.array(z.object({
    type: z.enum(["email", "phone"]),
    value: z.string().trim().min(3).max(320),
  })).min(1).max(500),
});
