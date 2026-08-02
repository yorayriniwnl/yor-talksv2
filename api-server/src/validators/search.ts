import { z } from "zod";

export const searchQuerySchema = z.object({
  q: z.string().min(1, "Search query must not be empty").max(200),
});
