import { z } from "zod";

export const createVideoSchema = z.object({
  title: z.string().min(2).max(200),
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url(),
  type: z.enum(["short", "standard"]),
});
