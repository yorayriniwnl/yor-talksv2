import { Router } from "express";
import { StoryController } from "../controllers/story-controller.js";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.js";
import { validateBody, validateParams } from "../middlewares/validation.js";
import { StoryRepository } from "../repositories/story-repository.js";
import { StoryService } from "../services/story-service.js";
import { createStorySchema, reactStorySchema, storyPollVoteSchema } from "../validators/story.js";
import { uuidParamSchema } from "../validators/params.js";

const router = Router();
const storyController = new StoryController(new StoryService(new StoryRepository()));

router.post("/stories", authenticate, validateBody(createStorySchema), storyController.create);
router.get("/stories", optionalAuthenticate, storyController.listActive);
router.post("/stories/:id/view", authenticate, validateParams(uuidParamSchema), storyController.view);
router.post("/stories/:id/react", authenticate, validateParams(uuidParamSchema), validateBody(reactStorySchema), storyController.react);
router.post("/stories/:id/poll/vote", authenticate, validateParams(uuidParamSchema), validateBody(storyPollVoteSchema), storyController.votePoll);

export default router;
