import { z } from "zod";

export const createProjectSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  visibility: z.enum(["public", "private"]).default("public"),
  lookingForCollaborators: z.boolean().default(false),
});

export const inviteProjectCollaboratorSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["collaborator", "advisor"]).default("collaborator"),
});
