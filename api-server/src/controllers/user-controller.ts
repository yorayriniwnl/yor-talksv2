import { type Request, type Response } from "express";
import { UserService } from "../services/user-service.js";
import { createResponse } from "../utils/response.js";

export class UserController {
  constructor(private readonly userService: UserService) {}

  getProfile = (req: Request, res: Response) => {
    const user = this.userService.getProfile(req.params.userId);
    if (!user) {
      return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
    }
    return res.status(200).json(createResponse("Profile loaded", user));
  };

  updateProfile = (req: Request, res: Response) => {
    const user = this.userService.updateProfile(req.user?.id ?? "", req.body);
    if (!user) {
      return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
    }
    return res.status(200).json(createResponse("Profile updated", user));
  };

  uploadAvatar = (req: Request, res: Response) => {
    const avatarUrl = req.body.avatarUrl ?? "https://res.cloudinary.com/demo/image/upload/default-avatar.png";
    const user = this.userService.uploadAvatar(req.user?.id ?? "", avatarUrl);
    if (!user) {
      return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
    }
    return res.status(200).json(createResponse("Avatar uploaded", user));
  };

  searchUsers = (req: Request, res: Response) => {
    const users = this.userService.searchUsers(req.query.q as string | undefined ?? "");
    return res.status(200).json(createResponse("Users loaded", users));
  };

  followUser = (req: Request, res: Response) => {
    const result = this.userService.followUser(req.user?.id ?? "", req.params.userId);
    if (!result) {
      return res.status(404).json(createResponse("Target user not found", null, {}, ["Target user not found"]));
    }
    return res.status(200).json(createResponse("User followed", result));
  };

  unfollowUser = (req: Request, res: Response) => {
    const result = this.userService.unfollowUser(req.user?.id ?? "", req.params.userId);
    if (!result) {
      return res.status(404).json(createResponse("Target user not found", null, {}, ["Target user not found"]));
    }
    return res.status(200).json(createResponse("User unfollowed", result));
  };

  followers = (req: Request, res: Response) => {
    const followers = this.userService.getFollowers(req.params.userId);
    return res.status(200).json(createResponse("Followers loaded", followers));
  };

  following = (req: Request, res: Response) => {
    const following = this.userService.getFollowing(req.params.userId);
    return res.status(200).json(createResponse("Following loaded", following));
  };

  settings = (req: Request, res: Response) => {
    const user = this.userService.updateSettings(req.user?.id ?? "", req.body);
    if (!user) {
      return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
    }
    return res.status(200).json(createResponse("Settings updated", user.settings));
  };
}
