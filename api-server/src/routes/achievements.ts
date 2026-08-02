import { Router } from "express";
import { AchievementController } from "../controllers/achievement-controller.js";
import { authenticate } from "../middlewares/auth.js";
import { PostRepository } from "../repositories/post-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { AchievementService } from "../services/achievement-service.js";
import { CommunityService } from "../services/community-service.js";

const router = Router();
const achievementController = new AchievementController(
  new AchievementService(new PostRepository(), new UserRepository(), new CommunityService()),
);

router.get("/achievements/me", authenticate, achievementController.getMine);

export default router;
