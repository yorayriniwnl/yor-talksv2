import { type Request, type Response } from "express";
import { AuthService } from "../services/auth-service.js";
import { createResponse } from "../utils/response.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.register(req.body);
      return res.status(201).json(createResponse("User registered", result, { authenticated: true }));
    } catch (error) {
      return res.status(409).json(createResponse("Registration failed", null, {}, [error instanceof Error ? error.message : "Unknown error"]));
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.login(req.body);
      return res.status(200).json(createResponse("Login successful", result, { authenticated: true }));
    } catch (error) {
      return res.status(401).json(createResponse("Login failed", null, {}, [error instanceof Error ? error.message : "Unknown error"]));
    }
  };

  logout = (_req: Request, res: Response) => {
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
      await this.authService.resetPassword(req.body.email);
      return res.status(200).json(createResponse("Password reset requested", null));
    } catch (error) {
      return res.status(500).json(createResponse("Password reset failed", null, {}, [error instanceof Error ? error.message : "Unknown error"]));
    }
  };
}
