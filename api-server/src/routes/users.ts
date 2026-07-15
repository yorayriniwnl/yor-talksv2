import { Router } from "express";
import { z } from "zod";
import { UserController } from "../controllers/user-controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validation.js";
import { UserRepository } from "../repositories/user-repository.js";
import { UserService } from "../services/user-service.js";
import { searchUsersSchema, settingsSchema, updateProfileSchema } from "../validators/user.js";

const router = Router();
const userService = new UserService(new UserRepository());
const userController = new UserController(userService);

router.get("/users/search", authenticate, validateQuery(searchUsersSchema), userController.searchUsers);
router.get("/users/:userId", authenticate, validateParams(z.object({ userId: z.string().min(1) })), userController.getProfile);
router.put("/users/me", authenticate, validateBody(updateProfileSchema), userController.updateProfile);
router.post("/users/me/avatar", authenticate, userController.uploadAvatar);
router.post("/users/:userId/follow", authenticate, validateParams(z.object({ userId: z.string().min(1) })), userController.followUser);
router.post("/users/:userId/unfollow", authenticate, validateParams(z.object({ userId: z.string().min(1) })), userController.unfollowUser);
router.get("/users/:userId/followers", authenticate, validateParams(z.object({ userId: z.string().min(1) })), userController.followers);
router.get("/users/:userId/following", authenticate, validateParams(z.object({ userId: z.string().min(1) })), userController.following);
router.put("/users/me/settings", authenticate, validateBody(settingsSchema), userController.settings);

export default router;
