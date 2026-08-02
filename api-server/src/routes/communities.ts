import { Router } from "express";
import { CommunityController } from "../controllers/community-controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validation.js";
import { CommunityService } from "../services/community-service.js";
import { createCommunitySchema } from "../validators/community.js";

const router = Router();
const communityController = new CommunityController(new CommunityService());

router.post("/communities", authenticate, validateBody(createCommunitySchema), communityController.create);
router.get("/communities", communityController.list);
router.get("/communities/:id", communityController.getBySlugOrId);
router.post("/communities/:id/join", authenticate, communityController.join);
router.post("/communities/:id/leave", authenticate, communityController.leave);

export default router;
