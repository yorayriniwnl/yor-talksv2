import { createResponse } from "../utils/response.js";
export class UserController {
    userService;
    constructor(userService) {
        this.userService = userService;
    }
    getProfile = async (req, res) => {
        const userId = typeof req.params.userId === "string" ? req.params.userId : "";
        const user = await this.userService.getProfile(userId);
        if (!user) {
            return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
        }
        return res.status(200).json(createResponse("Profile loaded", user));
    };
    updateProfile = async (req, res) => {
        const user = await this.userService.updateProfile(req.user?.id ?? "", req.body);
        if (!user) {
            return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
        }
        return res.status(200).json(createResponse("Profile updated", user));
    };
    uploadAvatar = async (req, res) => {
        const avatarUrl = req.body.avatarUrl ?? "https://res.cloudinary.com/demo/image/upload/default-avatar.png";
        const user = await this.userService.uploadAvatar(req.user?.id ?? "", avatarUrl);
        if (!user) {
            return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
        }
        return res.status(200).json(createResponse("Avatar uploaded", user));
    };
    searchUsers = async (req, res) => {
        const users = await this.userService.searchUsers(req.query.q ?? "");
        return res.status(200).json(createResponse("Users loaded", users));
    };
    followUser = async (req, res) => {
        const targetId = typeof req.params.userId === "string" ? req.params.userId : "";
        const result = await this.userService.followUser(req.user?.id ?? "", targetId);
        if (!result) {
            return res.status(404).json(createResponse("Target user not found", null, {}, ["Target user not found"]));
        }
        return res.status(200).json(createResponse("User followed", result));
    };
    unfollowUser = async (req, res) => {
        const targetId = typeof req.params.userId === "string" ? req.params.userId : "";
        const result = await this.userService.unfollowUser(req.user?.id ?? "", targetId);
        if (!result) {
            return res.status(404).json(createResponse("Target user not found", null, {}, ["Target user not found"]));
        }
        return res.status(200).json(createResponse("User unfollowed", result));
    };
    followers = async (req, res) => {
        const userId = typeof req.params.userId === "string" ? req.params.userId : "";
        const followers = await this.userService.getFollowers(userId);
        return res.status(200).json(createResponse("Followers loaded", followers));
    };
    following = async (req, res) => {
        const userId = typeof req.params.userId === "string" ? req.params.userId : "";
        const following = await this.userService.getFollowing(userId);
        return res.status(200).json(createResponse("Following loaded", following));
    };
    settings = async (req, res) => {
        const user = await this.userService.updateSettings(req.user?.id ?? "", req.body);
        if (!user) {
            return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
        }
        return res.status(200).json(createResponse("Settings updated", user.settings));
    };
}
//# sourceMappingURL=user-controller.js.map