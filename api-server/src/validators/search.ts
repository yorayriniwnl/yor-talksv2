import { z } from "zod";

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "Search query must not be empty").max(200),
});
