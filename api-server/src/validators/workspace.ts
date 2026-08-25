import { z } from "zod";

export const workspaceKindSchema = z.enum([
  "draft",
  "scheduled",
  "collection",
  "collaboration",
  "quest",
  "preference",
]);

export const workspaceItemSchema = z.object({
  kind: workspaceKindSchema,
  itemKey: z.string().trim().min(1).max(120),
  payload: z.record(z.unknown()).default({}),
});

export const workspaceQuerySchema = z.object({
  kind: workspaceKindSchema.optional(),
});

export const workspaceItemParamSchema = z.object({
  kind: workspaceKindSchema,
  itemKey: z.string().trim().min(1).max(120),
});
