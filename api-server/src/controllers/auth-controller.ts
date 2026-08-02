import { type Request, type Response } from "express";
import { env } from "../config/env.js";
import { AuthService, TooManyAttemptsError, TwoFactorRequiredError } from "../services/auth-service.js";
import { createResponse } from "../utils/response.js";
import { toOwnUser } from "../utils/user-view.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.register(req.body);
      return res.status(201).json(createResponse("User registered", { ...result, user: toOwnUser(result.user) }, { authenticated: true }));
    } catch (error) {
      return res.status(409).json(createResponse("Registration failed", null, {}, [error instanceof Error ? error.message : "Unknown error"]));
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.login(req.body);
      return res.status(200).json(createResponse("Login successful", { ...result, user: toOwnUser(result.user) }, { authenticated: true }));
    } catch (error) {
      if (error instanceof TooManyAttemptsError) {
        return res.status(429).json(createResponse("Too many attempts", null, {}, [error.message]));
      }
      if (error instanceof TwoFactorRequiredError) {
        return res.status(200).json(createResponse("Two-factor code required", null, { requiresTwoFactor: true }));
      }
      return res.status(401).json(createResponse("Login failed", null, {}, [error instanceof Error ? error.message : "Unknown error"]));
    }
  };

  beginTwoFactorSetup = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const result = await this.authService.beginTwoFactorSetup(userId);
    if (!result) {
      return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
    }
    return res.status(200).json(createResponse("Scan this with an authenticator app", result));
  };

  confirmTwoFactorSetup = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const ok = await this.authService.confirmTwoFactorSetup(userId, req.body.code);
    if (!ok) {
      return res.status(400).json(createResponse("Invalid or expired code", null, {}, ["Invalid or expired code"]));
    }
    return res.status(200).json(createResponse("Two-factor authentication enabled", null));
  };

  disableTwoFactor = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const ok = await this.authService.disableTwoFactor(userId, req.body.code);
    if (!ok) {
      return res.status(400).json(createResponse("Invalid code", null, {}, ["Invalid code"]));
    }
    return res.status(200).json(createResponse("Two-factor authentication disabled", null));
  };

  refresh = async (req: Request, res: Response) => {
    try {
      const refreshToken = req.body.refreshToken as string | undefined;
      if (!refreshToken) {
        return res.status(400).json(createResponse("Refresh token required", null, {}, ["Missing refresh token"]));
      }
      const tokens = await this.authService.refreshAccessToken(refreshToken);
      if (!tokens) {
        return res.status(401).json(createResponse("Invalid refresh token", null, {}, ["Unauthorized"]));
      }
      return res.status(200).json(createResponse("Token refreshed", tokens, { authenticated: true }));
    } catch (error) {
      return res.status(500).json(createResponse("Token refresh failed", null, {}, [error instanceof Error ? error.message : "Unknown error"]));
    }
  };

  logout = async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    if (refreshToken) {
      await this.authService.logoutByToken(refreshToken);
    }
    res.clearCookie("refreshToken");
    res.clearCookie("accessToken");
    return res.status(200).json(createResponse("Logged out", null));
  };

  logoutAllDevices = async (req: Request, res: Response) => {
    try {
      await this.authService.logoutAllDevices(req.user?.id ?? "");
      return res.status(200).json(createResponse("All sessions revoked", null));
    } catch (error) {
      return res.status(500).json(createResponse("Failed to revoke sessions", null, {}, [error instanceof Error ? error.message : "Unknown error"]));
    }
  };

  resetPassword = async (req: Request, res: Response) => {
    try {
      const token = await this.authService.requestPasswordReset(req.body.email);
      // Always return the same success response whether or not the email is
      // registered, so this endpoint can't be used to enumerate accounts.
      // No email transport is configured yet, so outside production we return
      // the token directly (and log it) — swap this for a real send once one exists.
      const data = token && env.NODE_ENV !== "production" ? { devResetToken: token } : null;
      return res.status(200).json(createResponse("If that email is registered, a reset link has been sent", data));
    } catch (error) {
      return res.status(500).json(createResponse("Password reset failed", null, {}, [error instanceof Error ? error.message : "Unknown error"]));
    }
  };

  confirmResetPassword = async (req: Request, res: Response) => {
    try {
      const ok = await this.authService.confirmPasswordReset(req.body.token, req.body.newPassword);
      if (!ok) {
        return res.status(400).json(createResponse("Invalid or expired reset token", null, {}, ["Invalid or expired token"]));
      }
      return res.status(200).json(createResponse("Password updated. Please log in again.", null));
    } catch (error) {
      return res.status(500).json(createResponse("Password reset failed", null, {}, [error instanceof Error ? error.message : "Unknown error"]));
    }
  };

  resendVerificationEmail = async (req: Request, res: Response) => {
    try {
      const token = await this.authService.requestEmailVerification(req.user?.id ?? "");
      const data = token && env.NODE_ENV !== "production" ? { devVerificationToken: token } : null;
      return res.status(200).json(createResponse("Verification email sent", data));
    } catch (error) {
      return res.status(500).json(createResponse("Failed to send verification email", null, {}, [error instanceof Error ? error.message : "Unknown error"]));
    }
  };

  verifyEmail = async (req: Request, res: Response) => {
    try {
      const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
      const user = await this.authService.confirmEmailVerification(token);
      if (!user) {
        return res.status(400).json(createResponse("Invalid or expired verification token", null, {}, ["Invalid or expired token"]));
      }
      return res.status(200).json(createResponse("Email verified", { user: toOwnUser(user) }));
    } catch (error) {
      return res.status(500).json(createResponse("Email verification failed", null, {}, [error instanceof Error ? error.message : "Unknown error"]));
    }
  };
}
