import { Router } from "express";
import { LiveStreamController } from "../controllers/live-stream-controller.js";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.js";
import { validateBody, validateParams } from "../middlewares/validation.js";
import { LiveStreamRepository } from "../repositories/live-stream-repository.js";
import { LiveStreamService } from "../services/live-stream-service.js";
import { createStreamSchema, streamStatusSchema } from "../validators/live-stream.js";
import { uuidParamSchema } from "../validators/params.js";

const router = Router();
const liveStreamController = new LiveStreamController(new LiveStreamService(new LiveStreamRepository()));

router.post("/streams", authenticate, validateBody(createStreamSchema), liveStreamController.create);
router.get("/streams", optionalAuthenticate, liveStreamController.list);
router.get("/streams/:id/token", authenticate, validateParams(uuidParamSchema), liveStreamController.token);
router.get("/streams/:id", optionalAuthenticate, validateParams(uuidParamSchema), liveStreamController.get);
router.put("/streams/:id/status", authenticate, validateParams(uuidParamSchema), validateBody(streamStatusSchema), liveStreamController.setStatus);

export default router;
