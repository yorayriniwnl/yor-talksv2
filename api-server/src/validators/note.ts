import { z } from "zod";
import { contentCategorySchema } from "../utils/content-category.js";

const contentRatingSchema = z.enum(["child_safe", "regular", "mature"]);

export const createNoteSchema = z.object({
  content: z.string().trim().min(1, "Note cannot be empty").max(180, "Note must be 180 characters or fewer"),
  audience: z.enum(["followers", "close_friends", "public"]).default("followers"),
  contentCategory: contentCategorySchema.default("other"),
  contentRating: contentRatingSchema.default("regular"),
});
