import { Router } from "express";
import { VideoController } from "../controllers/video-controller.js";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validation.js";
import { VideoRepository } from "../repositories/video-repository.js";
import { VideoService } from "../services/video-service.js";
import { createVideoSchema } from "../validators/video.js";
import { commentSchema } from "../validators/post.js";

const router = Router();
const videoController = new VideoController(new VideoService(new VideoRepository()));

router.post("/videos", authenticate, validateBody(createVideoSchema), videoController.create);
router.get("/videos", optionalAuthenticate, videoController.list);
router.get("/videos/:id", optionalAuthenticate, videoController.get);
router.post("/videos/:id/like", authenticate, videoController.toggleLike);
router.post("/videos/:id/bookmark", authenticate, videoController.toggleBookmark);
router.get("/videos/:id/comments", authenticate, videoController.comments);
router.post("/videos/:id/comments", authenticate, validateBody(commentSchema), videoController.comment);
router.post("/videos/:id/comments/:commentId/like", authenticate, videoController.commentLike);
router.delete("/videos/:id", authenticate, videoController.remove);

export default router;
