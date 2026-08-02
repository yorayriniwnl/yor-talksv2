import { Router } from "express";
import { StoryController } from "../controllers/story-controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validation.js";
import { StoryRepository } from "../repositories/story-repository.js";
import { StoryService } from "../services/story-service.js";
import { createStorySchema, reactStorySchema } from "../validators/story.js";

const router = Router();
const storyController = new StoryController(new StoryService(new StoryRepository()));

router.post("/stories", authenticate, validateBody(createStorySchema), storyController.create);
router.get("/stories", storyController.listActive);
router.post("/stories/:id/view", authenticate, storyController.view);
router.post("/stories/:id/react", authenticate, validateBody(reactStorySchema), storyController.react);

export default router;
