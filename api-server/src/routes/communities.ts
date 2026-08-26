import { Router } from "express";
import { z } from "zod";
import { CommunityController } from "../controllers/community-controller.js";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.js";
import { validateBody, validateParams } from "../middlewares/validation.js";
import { CommunityService } from "../services/community-service.js";
import { createCommunitySchema } from "../validators/community.js";
import { createDiscussionSchema } from "../validators/discussion.js";

const router = Router();
const communityController = new CommunityController(new CommunityService());

router.post("/communities", authenticate, validateBody(createCommunitySchema), communityController.create);
router.get("/communities", optionalAuthenticate, communityController.list);
router.get("/communities/:id", optionalAuthenticate, communityController.getBySlugOrId);
router.get("/communities/:id/discussions", optionalAuthenticate, communityController.listDiscussions);
router.post("/communities/:id/join", authenticate, communityController.join);
router.post("/communities/:id/leave", authenticate, communityController.leave);
router.post("/communities/:id/discussions", authenticate, validateBody(createDiscussionSchema), communityController.createDiscussion);
router.post("/communities/:id/discussions/:discussionId/like", authenticate, validateParams(z.object({ id: z.string(), discussionId: z.string().uuid() })), communityController.likeDiscussion);

export default router;
