import { type Request, type Response } from "express";
import { env } from "../config/env.js";
import { AuthService, EmailOtpInvalidError, EmailVerificationRequiredError, GoogleSignInNotConfiguredError, RegistrationNotAllowedError, TooManyAttemptsError, TwoFactorRequiredError, UserAlreadyExistsError } from "../services/auth-service.js";
import { EmailDeliveryNotConfiguredError, EmailDeliveryProviderError } from "../services/email-service.js";
import { createResponse } from "../utils/response.js";
import { toOwnUser } from "../utils/user-view.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshCookie(res: Response, refreshToken: string): void {
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie("refreshToken", { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "lax", path: "/" });
  }

  private clientTokens(tokens: { accessToken: string; expiresAt?: string }) {
    return { accessToken: tokens.accessToken, expiresAt: tokens.expiresAt };
  }

  private twoFactorChallengeData(error: TwoFactorRequiredError) {
    return { requiresTwoFactor: true as const, ...(error.challenge ?? {}) };
  }

  private challengeId(req: Request): string {
    return Array.isArray(req.params.challengeId) ? req.params.challengeId[0] : req.params.challengeId;
  }

  register = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.register(req.body);
      const data = {
        user: toOwnUser(result.user),
        verificationRequired: true,
        ...(result.verificationToken && env.NODE_ENV !== "production" ? { devVerificationToken: result.verificationToken } : {}),
      };
      return res.status(201).json(createResponse("Check your email to verify your account", data, { authenticated: false }));
    } catch (error) {
      if (error instanceof EmailDeliveryNotConfiguredError) {
        return res.status(503).json(createResponse("Registration is temporarily unavailable", null, {}, [error.message]));
      }
      if (error instanceof EmailDeliveryProviderError) {
        return res.status(502).json(createResponse("Registration email could not be delivered", null, {}, [error.message]));
      }
      if (error instanceof RegistrationNotAllowedError) {
        return res.status(400).json(createResponse("Registration is not available for this email domain", null, {}, [error.message]));
      }
      if (error instanceof UserAlreadyExistsError) {
        return res.status(409).json(createResponse("An account already exists for that email or username", null, {}, [error.message]));
      }
      return res.status(503).json(createResponse("Registration is temporarily unavailable", null, {}, ["Please try again shortly"]));
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.login(req.body);
      this.setRefreshCookie(res, result.tokens.refreshToken);
      return res.status(200).json(createResponse("Login successful", { user: toOwnUser(result.user), tokens: this.clientTokens(result.tokens) }, { authenticated: true }));
    } catch (error) {
      if (error instanceof TooManyAttemptsError) {
        return res.status(429).json(createResponse("Too many attempts", null, {}, [error.message]));
      }
      if (error instanceof TwoFactorRequiredError) {
        return res.status(200).json(createResponse("Approve this sign-in in your Yor app", this.twoFactorChallengeData(error), { requiresTwoFactor: true }));
      }
      if (error instanceof EmailVerificationRequiredError) {
        return res.status(403).json(createResponse("Email verification required", null, { emailVerificationRequired: true }, [error.message]));
      }
      return res.status(401).json(createResponse("Login failed", null, {}, ["Invalid credentials"]));
    }
  };

  googleLogin = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.loginWithGoogle(req.body);
      this.setRefreshCookie(res, result.tokens.refreshToken);
      return res.status(200).json(createResponse("Login successful", { user: toOwnUser(result.user), tokens: this.clientTokens(result.tokens) }, { authenticated: true }));
    } catch (error) {
      if (error instanceof GoogleSignInNotConfiguredError) {
        return res.status(503).json(createResponse("Google sign-in is unavailable", null, {}, [error.message]));
      }
      if (error instanceof TwoFactorRequiredError) {
        return res.status(200).json(createResponse("Approve this sign-in in your Yor app", this.twoFactorChallengeData(error), { requiresTwoFactor: true }));
      }
      return res.status(401).json(createResponse("Google sign-in failed", null, {}, ["Google sign-in failed"]));
    }
  };

  requestEmailOtp = async (req: Request, res: Response) => {
    try {
      await this.authService.requestEmailOtp(req.body.email);
      return res.status(202).json(createResponse("If that email is registered, a sign-in code has been sent", null));
    } catch (error) {
      if (error instanceof EmailOtpInvalidError) {
        return res.status(400).json(createResponse("Sign-in code request failed", null, {}, [error.message]));
      }
      if (error instanceof TooManyAttemptsError) {
        return res.status(429).json(createResponse("Please wait before requesting another code", null, {}, [error.message]));
      }
      if (error instanceof EmailDeliveryNotConfiguredError) {
        return res.status(503).json(createResponse("Email sign-in is unavailable", null, {}, [error.message]));
      }
      if (error instanceof EmailDeliveryProviderError) {
        return res.status(502).json(createResponse("Email sign-in delivery failed", null, {}, [error.message]));
      }
      return res.status(500).json(createResponse("Sign-in code request failed", null, {}, ["Sign-in code request failed"]));
    }
  };

  verifyEmailOtp = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.loginWithEmailOtp(req.body);
      this.setRefreshCookie(res, result.tokens.refreshToken);
      return res.status(200).json(createResponse("Login successful", { user: toOwnUser(result.user), tokens: this.clientTokens(result.tokens) }, { authenticated: true }));
    } catch (error) {
      if (error instanceof TwoFactorRequiredError) {
        return res.status(200).json(createResponse("Approve this sign-in in your Yor app", this.twoFactorChallengeData(error), { requiresTwoFactor: true }));
      }
      if (error instanceof EmailOtpInvalidError) {
        return res.status(401).json(createResponse("Email sign-in failed", null, {}, [error.message]));
      }
      return res.status(500).json(createResponse("Email sign-in failed", null, {}, ["Email sign-in failed"]));
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

  listTwoFactorChallenges = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    try {
      const challenges = await this.authService.listPendingTwoFactorChallenges(userId);
      return res.status(200).json(createResponse("Pending sign-in approvals", challenges));
    } catch (error) {
      return res.status(500).json(createResponse("Could not load sign-in approvals", null, {}, ["Sign-in approvals are temporarily unavailable"]));
    }
  };

  getTwoFactorChallengeStatus = async (req: Request, res: Response) => {
    try {
      const challenge = await this.authService.getTwoFactorChallengeStatus(this.challengeId(req));
      if (!challenge) {
        return res.status(404).json(createResponse("Sign-in request not found", null, {}, ["Challenge not found"]));
      }
      return res.status(200).json(createResponse("Sign-in request status", challenge));
    } catch (error) {
      return res.status(500).json(createResponse("Could not check sign-in request", null, {}, ["Sign-in request status is temporarily unavailable"]));
    }
  };

  approveTwoFactorChallenge = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    try {
      const approved = await this.authService.approveTwoFactorChallenge(userId, this.challengeId(req), req.body.matchingNumber);
      if (!approved) {
        return res.status(400).json(createResponse("The number did not match or the request expired", null, {}, ["Approval failed"]));
      }
      return res.status(200).json(createResponse("Sign-in approved", null));
    } catch (error) {
      return res.status(500).json(createResponse("Could not approve sign-in", null, {}, ["Sign-in approval is temporarily unavailable"]));
    }
  };

  denyTwoFactorChallenge = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    try {
      const denied = await this.authService.denyTwoFactorChallenge(userId, this.challengeId(req));
      if (!denied) {
        return res.status(400).json(createResponse("Sign-in request is no longer pending", null, {}, ["Request cannot be denied"]));
      }
      return res.status(200).json(createResponse("Sign-in denied", null));
    } catch (error) {
      return res.status(500).json(createResponse("Could not deny sign-in", null, {}, ["Sign-in approval is temporarily unavailable"]));
    }
  };

  completeTwoFactorLogin = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.completeTwoFactorLogin(this.challengeId(req));
      if (!result) {
        return res.status(401).json(createResponse("Sign-in approval is missing or expired", null, {}, ["Approval required"]));
      }
      this.setRefreshCookie(res, result.tokens.refreshToken);
      return res.status(200).json(createResponse("Login successful", { user: toOwnUser(result.user), tokens: this.clientTokens(result.tokens) }, { authenticated: true }));
    } catch (error) {
      return res.status(500).json(createResponse("Could not complete sign-in", null, {}, ["Sign-in completion is temporarily unavailable"]));
    }
  };

  refresh = async (req: Request, res: Response) => {
    try {
      // Refresh credentials are deliberately accepted only from an
      // HttpOnly cookie. Accepting them in JSON makes them readable by any
      // injected script and defeats the point of the cookie boundary.
      const refreshToken = req.cookies?.refreshToken as string | undefined;
      if (!refreshToken) {
        return res.status(401).json(createResponse("Refresh session required", null, {}, ["Missing refresh session"]));
      }
      const tokens = await this.authService.refreshAccessToken(refreshToken);
      if (!tokens) {
        return res.status(401).json(createResponse("Invalid refresh token", null, {}, ["Unauthorized"]));
      }
      this.setRefreshCookie(res, tokens.refreshToken);
      return res.status(200).json(createResponse("Token refreshed", this.clientTokens(tokens), { authenticated: true }));
    } catch (error) {
      return res.status(500).json(createResponse("Token refresh failed", null, {}, ["Token refresh is temporarily unavailable"]));
    }
  };

  logout = async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await this.authService.logoutByToken(refreshToken);
    }
    this.clearRefreshCookie(res);
    return res.status(200).json(createResponse("Logged out", null));
  };

  resendVerificationEmailPublic = async (req: Request, res: Response) => {
    try {
      await this.authService.requestEmailVerificationByEmail(req.body.email);
      return res.status(202).json(createResponse("If that account needs verification, an email has been sent", null));
    } catch (error) {
      if (error instanceof TooManyAttemptsError) {
        return res.status(429).json(createResponse("Please wait before requesting another email", null, {}, [error.message]));
      }
      if (error instanceof EmailDeliveryNotConfiguredError) {
        return res.status(503).json(createResponse("Email verification is unavailable", null, {}, [error.message]));
      }
      if (error instanceof EmailDeliveryProviderError) {
        return res.status(502).json(createResponse("Email verification delivery failed", null, {}, [error.message]));
      }
      return res.status(500).json(createResponse("Could not send verification email", null, {}, ["Verification email could not be sent"]));
    }
  };

  logoutAllDevices = async (req: Request, res: Response) => {
    try {
      await this.authService.logoutAllDevices(req.user?.id ?? "");
      return res.status(200).json(createResponse("All sessions revoked", null));
    } catch (error) {
      return res.status(500).json(createResponse("Failed to revoke sessions", null, {}, ["Sessions could not be revoked"]));
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
      if (error instanceof EmailDeliveryNotConfiguredError) {
        return res.status(503).json(createResponse("Password reset is unavailable", null, {}, [error.message]));
      }
      if (error instanceof EmailDeliveryProviderError) {
        return res.status(502).json(createResponse("Password reset delivery failed", null, {}, [error.message]));
      }
      return res.status(500).json(createResponse("Password reset failed", null, {}, ["Password reset is temporarily unavailable"]));
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
      return res.status(500).json(createResponse("Password reset failed", null, {}, ["Password reset is temporarily unavailable"]));
    }
  };

  resendVerificationEmail = async (req: Request, res: Response) => {
    try {
      const token = await this.authService.requestEmailVerification(req.user?.id ?? "");
      const data = token && env.NODE_ENV !== "production" ? { devVerificationToken: token } : null;
      return res.status(200).json(createResponse("Verification email sent", data));
    } catch (error) {
      if (error instanceof EmailDeliveryNotConfiguredError) {
        return res.status(503).json(createResponse("Email verification is unavailable", null, {}, [error.message]));
      }
      if (error instanceof EmailDeliveryProviderError) {
        return res.status(502).json(createResponse("Email verification delivery failed", null, {}, [error.message]));
      }
      return res.status(500).json(createResponse("Failed to send verification email", null, {}, ["Verification email could not be sent"]));
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
      return res.status(500).json(createResponse("Email verification failed", null, {}, ["Email verification is temporarily unavailable"]));
    }
  };
}
