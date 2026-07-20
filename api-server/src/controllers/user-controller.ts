import { type Request, type Response } from "express";
import { UserService } from "../services/user-service.js";
import { createResponse } from "../utils/response.js";

export class UserController {
  constructor(private readonly userService: UserService) {}

  getProfile = async (req: Request, res: Response) => {
    const userId = typeof req.params.userId === "string" ? req.params.userId : "";
    const user = await this.userService.getProfile(userId);
    if (!user) {
      return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
    }
    return res.status(200).json(createResponse("Profile loaded", user));
  };

  updateProfile = async (req: Request, res: Response) => {
    const user = await this.userService.updateProfile(req.user?.id ?? "", req.body);
    if (!user) {
      return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
    }
    return res.status(200).json(createResponse("Profile updated", user));
  };

  uploadAvatar = async (req: Request, res: Response) => {
    const avatarUrl = req.body.avatarUrl ?? "https://res.cloudinary.com/demo/image/upload/default-avatar.png";
    const user = await this.userService.uploadAvatar(req.user?.id ?? "", avatarUrl);
    if (!user) {
      return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
    }
    return res.status(200).json(createResponse("Avatar uploaded", user));
  };

  searchUsers = async (req: Request, res: Response) => {
    const users = await this.userService.searchUsers(req.query.q as string | undefined ?? "");
    return res.status(200).json(createResponse("Users loaded", users));
  };

  followUser = async (req: Request, res: Response) => {
    const targetId = typeof req.params.userId === "string" ? req.params.userId : "";
    const result = await this.userService.followUser(req.user?.id ?? "", targetId);
    if (!result) {
      return res.status(404).json(createResponse("Target user not found", null, {}, ["Target user not found"]));
    }
    return res.status(200).json(createResponse("User followed", result));
  };

  unfollowUser = async (req: Request, res: Response) => {
    const targetId = typeof req.params.userId === "string" ? req.params.userId : "";
    const result = await this.userService.unfollowUser(req.user?.id ?? "", targetId);
    if (!result) {
      return res.status(404).json(createResponse("Target user not found", null, {}, ["Target user not found"]));
    }
    return res.status(200).json(createResponse("User unfollowed", result));
  };

  followers = async (req: Request, res: Response) => {
    const userId = typeof req.params.userId === "string" ? req.params.userId : "";
    const followers = await this.userService.getFollowers(userId);
    return res.status(200).json(createResponse("Followers loaded", followers));
  };

  following = async (req: Request, res: Response) => {
    const userId = typeof req.params.userId === "string" ? req.params.userId : "";
    const following = await this.userService.getFollowing(userId);
    return res.status(200).json(createResponse("Following loaded", following));
  };

  settings = async (req: Request, res: Response) => {
    const user = await this.userService.updateSettings(req.user?.id ?? "", req.body);
    if (!user) {
      return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
    }
    return res.status(200).json(createResponse("Settings updated", user.settings));
  };
}
