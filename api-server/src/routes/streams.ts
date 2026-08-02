import { Router } from "express";
import { LiveStreamController } from "../controllers/live-stream-controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validation.js";
import { LiveStreamRepository } from "../repositories/live-stream-repository.js";
import { LiveStreamService } from "../services/live-stream-service.js";
import { createStreamSchema, streamStatusSchema } from "../validators/live-stream.js";

const router = Router();
const liveStreamController = new LiveStreamController(new LiveStreamService(new LiveStreamRepository()));

router.post("/streams", authenticate, validateBody(createStreamSchema), liveStreamController.create);
router.get("/streams", liveStreamController.list);
router.get("/streams/:id", liveStreamController.get);
router.put("/streams/:id/status", authenticate, validateBody(streamStatusSchema), liveStreamController.setStatus);

export default router;
