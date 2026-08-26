import { Router } from "express";
import { VideoController } from "../controllers/video-controller.js";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.js";
import { validateBody, validateParams } from "../middlewares/validation.js";
import { VideoRepository } from "../repositories/video-repository.js";
import { VideoService } from "../services/video-service.js";
import { createVideoSchema } from "../validators/video.js";
import { commentSchema } from "../validators/post.js";
import { commentIdParamSchema, uuidParamSchema } from "../validators/params.js";

const router = Router();
const videoController = new VideoController(new VideoService(new VideoRepository()));

router.post("/videos", authenticate, validateBody(createVideoSchema), videoController.create);
router.get("/videos/saved", authenticate, videoController.saved);
router.get("/videos", optionalAuthenticate, videoController.list);
router.get("/videos/:id", optionalAuthenticate, validateParams(uuidParamSchema), videoController.get);
router.post("/videos/:id/like", authenticate, validateParams(uuidParamSchema), videoController.toggleLike);
router.post("/videos/:id/bookmark", authenticate, validateParams(uuidParamSchema), videoController.toggleBookmark);
router.get("/videos/:id/comments", authenticate, validateParams(uuidParamSchema), videoController.comments);
router.post("/videos/:id/comments", authenticate, validateParams(uuidParamSchema), validateBody(commentSchema), videoController.comment);
router.post("/videos/:id/comments/:commentId/like", authenticate, validateParams(uuidParamSchema.merge(commentIdParamSchema)), videoController.commentLike);
router.delete("/videos/:id", authenticate, validateParams(uuidParamSchema), videoController.remove);

export default router;
