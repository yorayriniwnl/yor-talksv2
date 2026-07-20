import { Router } from "express";
import { AuthController } from "../controllers/auth-controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validation.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { AuthService } from "../services/auth-service.js";
import { loginSchema, registerSchema, resetPasswordSchema } from "../validators/auth.js";
const router = Router();
const authService = new AuthService(new UserRepository(), new RedisRepository());
const authController = new AuthController(authService);
router.post("/register", validateBody(registerSchema), authController.register);
router.post("/login", validateBody(loginSchema), authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authenticate, authController.logout);
router.post("/logout-all", authenticate, authController.logoutAllDevices);
router.post("/reset-password", validateBody(resetPasswordSchema), authController.resetPassword);
export default router;
//# sourceMappingURL=auth.js.map