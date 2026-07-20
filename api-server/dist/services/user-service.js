export class UserService {
    userRepository;
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async getProfile(userId) {
        return this.userRepository.findById(userId);
    }
    async updateProfile(userId, updates) {
        return this.userRepository.update(userId, updates);
    }
    async uploadAvatar(userId, avatarUrl) {
        return this.userRepository.update(userId, { avatarUrl });
    }
    async searchUsers(search) {
        return this.userRepository.list(search);
    }
    async followUser(userId, targetId) {
        const follower = await this.userRepository.findById(userId);
        const target = await this.userRepository.findById(targetId);
        if (!follower || !target) {
            return undefined;
        }
        if (!follower.following.includes(targetId)) {
            follower.following.push(targetId);
            target.followers.push(userId);
            await this.userRepository.update(userId, { following: follower.following });
            await this.userRepository.update(targetId, { followers: target.followers });
        }
        return { follower, target };
    }
    async unfollowUser(userId, targetId) {
        const follower = await this.userRepository.findById(userId);
        const target = await this.userRepository.findById(targetId);
        if (!follower || !target) {
            return undefined;
        }
        follower.following = follower.following.filter((entry) => entry !== targetId);
        target.followers = target.followers.filter((entry) => entry !== userId);
        await this.userRepository.update(userId, { following: follower.following });
        await this.userRepository.update(targetId, { followers: target.followers });
        return { follower, target };
    }
    async getFollowers(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            return [];
        }
        const followers = await Promise.all(user.followers.map((id) => this.userRepository.findById(id)));
        return followers.filter(Boolean);
    }
    async getFollowing(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            return [];
        }
        const following = await Promise.all(user.following.map((id) => this.userRepository.findById(id)));
        return following.filter(Boolean);
    }
    async updateSettings(userId, settings) {
        return this.userRepository.update(userId, { settings });
    }
}
//# sourceMappingURL=user-service.js.map