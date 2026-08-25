import { Router } from "express";
import { AuthController } from "../controllers/auth-controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validation.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { AuthService } from "../services/auth-service.js";
import { emailOtpRequestSchema, emailOtpVerifySchema, loginSchema, registerSchema, resetPasswordSchema, confirmResetPasswordSchema, totpCodeSchema } from "../validators/auth.js";

const router = Router();
const userRepo = new UserRepository();
const redisRepo = new RedisRepository();
const authService = new AuthService(userRepo, redisRepo);
const authController = new AuthController(authService);

// Phone/WhatsApp OTP is intentionally unavailable in the college beta: the
// project has no verified SMS provider and must not expose test OTP codes.
router.post("/auth/otp/send", async (req, res): Promise<void> => {
  res.status(410).json({ success: false, message: "Phone OTP is not enabled for the KIIT college beta", errors: ["otp_not_configured"] });
});

router.post("/auth/otp/verify", async (req, res): Promise<void> => {
  res.status(410).json({ success: false, message: "Phone OTP is not enabled for the KIIT college beta", errors: ["otp_not_configured"] });
});

router.post("/auth/register", validateBody(registerSchema), authController.register);
router.post("/auth/login", validateBody(loginSchema), authController.login);
router.post("/auth/email-otp/send", validateBody(emailOtpRequestSchema), authController.requestEmailOtp);
router.post("/auth/email-otp/verify", validateBody(emailOtpVerifySchema), authController.verifyEmailOtp);
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
