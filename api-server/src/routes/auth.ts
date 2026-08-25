import { Router } from "express";
import { AuthController } from "../controllers/auth-controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validation.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { AuthService } from "../services/auth-service.js";
import { loginSchema, registerSchema, resetPasswordSchema, confirmResetPasswordSchema, totpCodeSchema } from "../validators/auth.js";

import { OtpService } from "../services/otp-service.js";

const router = Router();
const userRepo = new UserRepository();
const redisRepo = new RedisRepository();
const authService = new AuthService(userRepo, redisRepo);
const otpService = new OtpService(userRepo, redisRepo);
const authController = new AuthController(authService);

// ── Phone & WhatsApp OTP Routes ──────────────────────────────────────────
router.post("/auth/otp/send", async (req, res): Promise<void> => {
  try {
    const { phoneNumber, channel } = req.body;
    const result = await otpService.sendOtp(phoneNumber, channel || "whatsapp");
    res.json({ success: true, message: result.message, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message, errors: ["otp_error"] });
  }
});

router.post("/auth/otp/verify", async (req, res): Promise<void> => {
  try {
    const { phoneNumber, code } = req.body;
    const result = await otpService.verifyOtp(phoneNumber, code);
    res.json({ success: true, message: "Logged in successfully via OTP", data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message, errors: ["otp_verify_error"] });
  }
});

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
