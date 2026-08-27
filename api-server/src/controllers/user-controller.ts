import { type Request, type Response } from "express";
import { AuthService } from "../services/auth-service.js";
import { StorageService } from "../services/storage-service.js";
import { UserService } from "../services/user-service.js";
import { createResponse } from "../utils/response.js";
import { toOwnUser, toPublicUser, toPublicUsers } from "../utils/user-view.js";
import { ContactShieldService, type ContactShieldInput } from "../services/contact-shield-service.js";
import { AccountService, InvalidAccountPasswordError } from "../services/account-service.js";
import { env } from "../config/env.js";
import { assertValidUploadedFile } from "../middlewares/upload.js";

export class UserController {
  private readonly storageService = new StorageService();
  private readonly contactShieldService = new ContactShieldService();

  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly accountService: AccountService,
  ) {}

  getProfile = async (req: Request, res: Response) => {
    const userId = typeof req.params.userId === "string" ? req.params.userId : "";
    const user = await this.userService.getProfile(userId, req.user?.id);
    if (!user) {
      return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
    }
    return res.status(200).json(createResponse("Profile loaded", toPublicUser(user)));
  };

  getProfileByUsername = async (req: Request, res: Response) => {
    const username = typeof req.params.username === "string" ? req.params.username : "";
    const user = await this.userService.getProfileByUsername(username, req.user?.id);
    if (!user) {
      return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
    }
    return res.status(200).json(createResponse("Profile loaded", toPublicUser(user)));
  };

  getCurrentUser = async (req: Request, res: Response) => {
    const user = await this.userService.getProfile(req.user?.id ?? "");
    if (!user) {
      return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
    }
    return res.status(200).json(createResponse("Profile loaded", toOwnUser(user)));
  };

  updateProfile = async (req: Request, res: Response) => {
    const user = await this.userService.updateProfile(req.user?.id ?? "", req.body);
    if (!user) {
      return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
    }
    return res.status(200).json(createResponse("Profile updated", toOwnUser(user)));
  };

  uploadAvatar = async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json(createResponse("No image file provided", null, {}, ["Expected a multipart file field named 'avatar'"]));
    }
    try {
      assertValidUploadedFile(file, "image");
      const avatarUrl = await this.storageService.uploadAvatar(file.buffer, file.originalname);
      const user = await this.userService.uploadAvatar(req.user?.id ?? "", avatarUrl);
      if (!user) {
        return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
      }
      return res.status(200).json(createResponse("Avatar uploaded", toOwnUser(user)));
    } catch (error) {
      if (error instanceof Error && error.name === "InvalidFileTypeError") {
        return res.status(415).json(createResponse("Invalid avatar file", null, {}, [error.message]));
      }
      return res.status(502).json(createResponse("Avatar upload failed", null, {}, ["Upload provider error"]));
    }
  };

  searchUsers = async (req: Request, res: Response) => {
    const users = await this.userService.searchUsers(req.query.q as string | undefined ?? "", req.user?.id);
    return res.status(200).json(createResponse("Users loaded", toPublicUsers(users)));
  };

  followUser = async (req: Request, res: Response) => {
    const targetId = typeof req.params.userId === "string" ? req.params.userId : "";
    const result = await this.userService.followUser(req.user?.id ?? "", targetId);
    if (!result) {
      return res.status(404).json(createResponse("Target user not found", null, {}, ["Target user not found"]));
    }
    return res.status(200).json(createResponse("User followed", { follower: toOwnUser(result.follower), target: toPublicUser(result.target) }));
  };

  unfollowUser = async (req: Request, res: Response) => {
    const targetId = typeof req.params.userId === "string" ? req.params.userId : "";
    const result = await this.userService.unfollowUser(req.user?.id ?? "", targetId);
    if (!result) {
      return res.status(404).json(createResponse("Target user not found", null, {}, ["Target user not found"]));
    }
    return res.status(200).json(createResponse("User unfollowed", { follower: toOwnUser(result.follower), target: toPublicUser(result.target) }));
  };

  followers = async (req: Request, res: Response) => {
    const userId = typeof req.params.userId === "string" ? req.params.userId : "";
    const followers = await this.userService.getFollowers(userId, req.user?.id);
    return res.status(200).json(createResponse("Followers loaded", toPublicUsers(followers)));
  };

  following = async (req: Request, res: Response) => {
    const userId = typeof req.params.userId === "string" ? req.params.userId : "";
    const following = await this.userService.getFollowing(userId, req.user?.id);
    return res.status(200).json(createResponse("Following loaded", toPublicUsers(following)));
  };

  listFavoriteCreators = async (req: Request, res: Response) => {
    const creatorIds = await this.userService.listFavoriteCreatorIds(req.user?.id ?? "");
    return res.status(200).json(createResponse("Favorite creators loaded", creatorIds));
  };

  listCloseFriends = async (req: Request, res: Response) => {
    const users = await this.userService.listCloseFriends(req.user?.id ?? "");
    return res.status(200).json(createResponse("Close Friends loaded", toPublicUsers(users)));
  };

  addCloseFriend = async (req: Request, res: Response) => {
    const friendId = typeof req.params.userId === "string" ? req.params.userId : "";
    try {
      const result = await this.userService.setCloseFriend(req.user?.id ?? "", friendId, true);
      if (!result) return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
      return res.status(200).json(createResponse("Close Friend added", result));
    } catch (error) {
      return res.status(400).json(createResponse("Could not add Close Friend", null, {}, [error instanceof Error ? error.message : "Bad request"]));
    }
  };

  removeCloseFriend = async (req: Request, res: Response) => {
    const friendId = typeof req.params.userId === "string" ? req.params.userId : "";
    try {
      const result = await this.userService.setCloseFriend(req.user?.id ?? "", friendId, false);
      if (!result) return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
      return res.status(200).json(createResponse("Close Friend removed", result));
    } catch (error) {
      return res.status(400).json(createResponse("Could not remove Close Friend", null, {}, [error instanceof Error ? error.message : "Bad request"]));
    }
  };

  favoriteCreator = async (req: Request, res: Response) => {
    const creatorId = typeof req.params.userId === "string" ? req.params.userId : "";
    try {
      const result = await this.userService.setFavoriteCreator(req.user?.id ?? "", creatorId, true);
      if (!result) return res.status(404).json(createResponse("Creator not found", null, {}, ["Creator not found"]));
      return res.status(200).json(createResponse("Creator added to Favorites", result));
    } catch (error) {
      return res.status(400).json(createResponse("Could not add creator to Favorites", null, {}, [error instanceof Error ? error.message : "Bad request"]));
    }
  };

  unfavoriteCreator = async (req: Request, res: Response) => {
    const creatorId = typeof req.params.userId === "string" ? req.params.userId : "";
    try {
      const result = await this.userService.setFavoriteCreator(req.user?.id ?? "", creatorId, false);
      if (!result) return res.status(404).json(createResponse("Creator not found", null, {}, ["Creator not found"]));
      return res.status(200).json(createResponse("Creator removed from Favorites", result));
    } catch (error) {
      return res.status(400).json(createResponse("Could not remove creator from Favorites", null, {}, [error instanceof Error ? error.message : "Bad request"]));
    }
  };

  listFollowRequests = async (req: Request, res: Response) => {
    const requests = await this.userService.listFollowRequests(req.user?.id ?? "");
    return res.status(200).json(createResponse("Follow requests loaded", requests.map(({ request, requester }) => ({
      ...request,
      requester: toPublicUser(requester),
    }))));
  };

  acceptFollowRequest = async (req: Request, res: Response) => {
    const requestId = typeof req.params.requestId === "string" ? req.params.requestId : "";
    const result = await this.userService.acceptFollowRequest(requestId, req.user?.id ?? "");
    if (!result) {
      return res.status(404).json(createResponse("Follow request not found", null, {}, ["Follow request not found"]));
    }
    return res.status(200).json(createResponse("Follow request accepted", {
      request: result.request,
      follower: toOwnUser(result.follower),
      target: toPublicUser(result.target),
    }));
  };

  rejectFollowRequest = async (req: Request, res: Response) => {
    const requestId = typeof req.params.requestId === "string" ? req.params.requestId : "";
    const request = await this.userService.rejectFollowRequest(requestId, req.user?.id ?? "");
    if (!request) {
      return res.status(404).json(createResponse("Follow request not found", null, {}, ["Follow request not found"]));
    }
    return res.status(200).json(createResponse("Follow request declined", request));
  };

  settings = async (req: Request, res: Response) => {
    const user = await this.userService.updateSettings(req.user?.id ?? "", req.body);
    if (!user) {
      return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
    }
    return res.status(200).json(createResponse("Settings updated", user.settings));
  };

  updatePrivacy = async (req: Request, res: Response) => {
    const user = await this.authService.updatePrivacy(req.user?.id ?? "", req.body);
    if (!user) {
      return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
    }
    return res.status(200).json(createResponse("Privacy settings updated", user.privacy));
  };

  blockUser = async (req: Request, res: Response) => {
    const targetId = typeof req.params.userId === "string" ? req.params.userId : "";
    try {
      const user = await this.userService.blockUser(req.user?.id ?? "", targetId);
      if (!user) {
        return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
      }
      return res.status(200).json(createResponse("User blocked", { blockedUsers: user.blockedUsers }));
    } catch (error) {
      return res.status(400).json(createResponse("Cannot block user", null, {}, [error instanceof Error ? error.message : "Bad request"]));
    }
  };

  unblockUser = async (req: Request, res: Response) => {
    const targetId = typeof req.params.userId === "string" ? req.params.userId : "";
    const user = await this.userService.unblockUser(req.user?.id ?? "", targetId);
    if (!user) {
      return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
    }
    return res.status(200).json(createResponse("User unblocked", { blockedUsers: user.blockedUsers }));
  };

  muteUser = async (req: Request, res: Response) => {
    const targetId = typeof req.params.userId === "string" ? req.params.userId : "";
    try {
      const user = await this.userService.muteUser(req.user?.id ?? "", targetId);
      if (!user) {
        return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
      }
      return res.status(200).json(createResponse("User muted", { mutedUsers: user.mutedUsers }));
    } catch (error) {
      return res.status(400).json(createResponse("Cannot mute user", null, {}, [error instanceof Error ? error.message : "Bad request"]));
    }
  };

  unmuteUser = async (req: Request, res: Response) => {
    const targetId = typeof req.params.userId === "string" ? req.params.userId : "";
    const user = await this.userService.unmuteUser(req.user?.id ?? "", targetId);
    if (!user) {
      return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
    }
    return res.status(200).json(createResponse("User unmuted", { mutedUsers: user.mutedUsers }));
  };

  exportAccount = async (req: Request, res: Response) => {
    const data = await this.accountService.exportAccount(req.user?.id ?? "");
    if (!data) {
      return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
    }
    res.setHeader("Content-Disposition", 'attachment; filename="yor-talks-account-export.json"');
    return res.status(200).json(createResponse("Account export ready", data));
  };

  deleteAccount = async (req: Request, res: Response) => {
    try {
      const deleted = await this.accountService.deleteAccount(req.user?.id ?? "", req.body.password);
      if (!deleted) {
        return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
      }
      res.clearCookie("refreshToken", { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: env.NODE_ENV === "production" ? "none" : "lax", path: "/" });
      return res.status(200).json(createResponse("Account deleted", null));
    } catch (error) {
      if (error instanceof InvalidAccountPasswordError) {
        return res.status(401).json(createResponse("Password confirmation failed", null, {}, [error.message]));
      }
      throw error;
    }
  };

  listContactShields = async (req: Request, res: Response) => {
    const shields = await this.contactShieldService.list(req.user?.id ?? "");
    return res.status(200).json(createResponse("Contact shields loaded", shields));
  };

  addContactShields = async (req: Request, res: Response) => {
    try {
      const contacts = req.body.contacts as ContactShieldInput[];
      const shields = await this.contactShieldService.add(req.user?.id ?? "", contacts);
      return res.status(201).json(createResponse("Contact shields updated", shields));
    } catch (error) {
      return res.status(400).json(createResponse("Contact shields could not be updated", null, {}, [error instanceof Error ? error.message : "Invalid contact list"]));
    }
  };

  removeContactShield = async (req: Request, res: Response) => {
    const shieldId = typeof req.params.shieldId === "string" ? req.params.shieldId : "";
    const removed = await this.contactShieldService.remove(req.user?.id ?? "", shieldId);
    if (!removed) {
      return res.status(404).json(createResponse("Contact shield not found", null, {}, ["Contact shield not found"]));
    }
    return res.status(200).json(createResponse("Contact shield removed", null));
  };
}
