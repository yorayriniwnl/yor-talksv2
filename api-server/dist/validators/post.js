import { z } from "zod";
export const createPostSchema = z.object({
    content: z.string().min(1).max(5000),
    images: z.array(z.string().url()).optional().default([]),
});
export const editPostSchema = z.object({
    content: z.string().min(1).max(5000),
});
export const commentSchema = z.object({
    content: z.string().min(1).max(2000),
});
export const replySchema = z.object({
    content: z.string().min(1).max(2000),
});
//# sourceMappingURL=post.js.map