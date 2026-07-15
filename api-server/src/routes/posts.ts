import { Router } from "express";
import { z } from "zod";
import { PostController } from "../controllers/post-controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validateBody, validateParams } from "../middlewares/validation.js";
import { NotificationRepository } from "../repositories/notification-repository.js";
import { PostRepository } from "../repositories/post-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { PostService } from "../services/post-service.js";
import { commentSchema, createPostSchema, editPostSchema, replySchema } from "../validators/post.js";

const router = Router();
const postService = new PostService(new PostRepository(), new UserRepository(), new NotificationRepository());
const postController = new PostController(postService);

router.post("/posts", authenticate, validateBody(createPostSchema), postController.createPost);
router.delete("/posts/:postId", authenticate, validateParams(z.object({ postId: z.string().min(1) })), postController.deletePost);
router.put("/posts/:postId", authenticate, validateParams(z.object({ postId: z.string().min(1) })), validateBody(editPostSchema), postController.editPost);
router.post("/posts/:postId/like", authenticate, validateParams(z.object({ postId: z.string().min(1) })), postController.like);
router.post("/posts/:postId/unlike", authenticate, validateParams(z.object({ postId: z.string().min(1) })), postController.unlike);
router.post("/posts/:postId/comments", authenticate, validateParams(z.object({ postId: z.string().min(1) })), validateBody(commentSchema), postController.comment);
router.post("/posts/:postId/comments/:commentId/replies", authenticate, validateParams(z.object({ postId: z.string().min(1), commentId: z.string().min(1) })), validateBody(replySchema), postController.reply);
router.post("/posts/:postId/bookmark", authenticate, validateParams(z.object({ postId: z.string().min(1) })), postController.bookmark);
router.post("/posts/:postId/share", authenticate, validateParams(z.object({ postId: z.string().min(1) })), postController.share);
router.get("/feed", authenticate, postController.feed);
router.get("/feed/trending", authenticate, postController.trendingFeed);
router.get("/users/:userId/feed", authenticate, validateParams(z.object({ userId: z.string().min(1) })), postController.userFeed);

export default router;
