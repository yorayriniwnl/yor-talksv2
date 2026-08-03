import { Router } from "express";
import { PostController } from "../controllers/post-controller.js";
import { authenticate } from "../middlewares/auth.js";
import { upload } from "../middlewares/upload.js";
import { validateBody, validateParams } from "../middlewares/validation.js";
import { NotificationRepository } from "../repositories/notification-repository.js";
import { PostRepository } from "../repositories/post-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { PostService } from "../services/post-service.js";
import { QueueService } from "../services/queue-service.js";
import { commentSchema, createPostSchema, editPostSchema, replySchema } from "../validators/post.js";
import { postIdParamSchema, userIdParamSchema, commentIdParamSchema } from "../validators/params.js";

const router = Router();
const postService = new PostService(new PostRepository(), new UserRepository(), new NotificationRepository(), new QueueService());
const postController = new PostController(postService);

router.post("/posts/upload-image", authenticate, upload.single("image"), postController.uploadImage);
router.post("/posts", authenticate, validateBody(createPostSchema), postController.createPost);
router.get("/posts/:postId", authenticate, validateParams(postIdParamSchema), postController.getPost);
router.delete("/posts/:postId", authenticate, validateParams(postIdParamSchema), postController.deletePost);
router.put("/posts/:postId", authenticate, validateParams(postIdParamSchema), validateBody(editPostSchema), postController.editPost);
router.post("/posts/:postId/like", authenticate, validateParams(postIdParamSchema), postController.like);
router.post("/posts/:postId/unlike", authenticate, validateParams(postIdParamSchema), postController.unlike);
router.post("/posts/:postId/comments", authenticate, validateParams(postIdParamSchema), validateBody(commentSchema), postController.comment);
router.post("/posts/:postId/comments/:commentId/replies", authenticate, validateParams(postIdParamSchema.merge(commentIdParamSchema)), validateBody(replySchema), postController.reply);
router.post("/posts/:postId/bookmark", authenticate, validateParams(postIdParamSchema), postController.bookmark);
router.post("/posts/:postId/share", authenticate, validateParams(postIdParamSchema), postController.share);
router.get("/feed", authenticate, postController.feed);
router.get("/feed/trending", authenticate, postController.trendingFeed);
router.get("/users/:userId/feed", authenticate, validateParams(userIdParamSchema), postController.userFeed);

export default router;
