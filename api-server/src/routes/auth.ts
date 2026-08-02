import { Router } from "express";
import { AuthController } from "../controllers/auth-controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validation.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { AuthService } from "../services/auth-service.js";
import { loginSchema, registerSchema, resetPasswordSchema, confirmResetPasswordSchema, totpCodeSchema } from "../validators/auth.js";

const router = Router();
const authService = new AuthService(new UserRepository(), new RedisRepository());
const authController = new AuthController(authService);

router.post("/auth/register", validateBody(registerSchema), authController.register);
router.post("/auth/login", validateBody(loginSchema), authController.login);
router.post("/auth/refresh", authController.refresh);
router.post("/auth/logout", authenticate, authController.logout);
router.post("/auth/logout-all", authenticate, authController.logoutAllDevices);
router.post("/auth/reset-password", validateBody(resetPasswordSchema), authController.resetPassword);
router.post("/auth/reset-password/confirm", validateBody(confirmResetPasswordSchema), authController.confirmResetPassword);
router.post("/auth/verify-email/resend", authenticate, authController.resendVerificationEmail);
router.get("/auth/verify-email/:token", authController.verifyEmail);
router.post("/auth/2fa/setup", authenticate, authController.beginTwoFactorSetup);
router.post("/auth/2fa/confirm", authenticate, validateBody(totpCodeSchema), authController.confirmTwoFactorSetup);
router.post("/auth/2fa/disable", authenticate, validateBody(totpCodeSchema), authController.disableTwoFactor);

export default router;
