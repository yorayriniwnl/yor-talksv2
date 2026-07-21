import { randomUUID } from "node:crypto";
export class PostService {
    postRepository;
    userRepository;
    notificationRepository;
    constructor(postRepository, userRepository, notificationRepository) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
    }
    async createPost(authorId, content, images) {
        const mentions = this.extractMentions(content);
        const tags = this.extractHashtags(content);
        const post = {
            id: randomUUID(),
            authorId,
            content,
            images,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            likedBy: [],
            comments: [],
            bookmarkedBy: [],
            shareCount: 0,
            reactions: {},
            tags,
            mentions,
            score: this.calculateScore({ likes: 0, shares: 0, comments: 0 }),
        };
        return this.postRepository.create(post);
    }
    async deletePost(postId) {
        return this.postRepository.delete(postId);
    }
    async editPost(postId, content) {
        return this.postRepository.update(postId, { content, updatedAt: new Date().toISOString() });
    }
    async likePost(postId, userId) {
        const post = await this.postRepository.findById(postId);
        if (!post) {
            return undefined;
        }
        if (!post.likedBy.includes(userId)) {
            post.likedBy.push(userId);
            post.score = this.calculateScore({ likes: post.likedBy.length, shares: post.shareCount, comments: post.comments.length });
            await this.postRepository.update(postId, { likedBy: post.likedBy, score: post.score });
            const author = await this.userRepository.findById(post.authorId);
            if (author) {
                await this.notificationRepository.create({
                    id: randomUUID(),
                    recipientId: author.id,
                    type: "like",
                    title: "New like",
                    message: `${userId} liked your post`,
                    relatedId: post.id,
                    createdAt: new Date().toISOString(),
                    readAt: null,
                });
            }
        }
        return post;
    }
    async unlikePost(postId, userId) {
        const post = await this.postRepository.findById(postId);
        if (!post) {
            return undefined;
        }
        post.likedBy = post.likedBy.filter((entry) => entry !== userId);
        post.score = this.calculateScore({ likes: post.likedBy.length, shares: post.shareCount, comments: post.comments.length });
        return this.postRepository.update(postId, { likedBy: post.likedBy, score: post.score });
    }
    async commentOnPost(postId, authorId, content) {
        const post = await this.postRepository.findById(postId);
        if (!post) {
            return undefined;
        }
        const comment = {
            id: randomUUID(),
            authorId,
            content,
            createdAt: new Date().toISOString(),
            replies: [],
            reactions: {},
        };
        post.comments.push(comment);
        post.score = this.calculateScore({ likes: post.likedBy.length, shares: post.shareCount, comments: post.comments.length });
        await this.postRepository.update(postId, { comments: post.comments, score: post.score });
        return { post, comment };
    }
    async replyToComment(postId, commentId, authorId, content) {
        const post = await this.postRepository.findById(postId);
        if (!post) {
            return undefined;
        }
        const comment = post.comments.find((entry) => entry.id === commentId);
        if (!comment) {
            return undefined;
        }
        const reply = {
            id: randomUUID(),
            authorId,
            content,
            createdAt: new Date().toISOString(),
            reactions: {},
        };
        comment.replies.push(reply);
        post.score = this.calculateScore({ likes: post.likedBy.length, shares: post.shareCount, comments: post.comments.length });
        await this.postRepository.update(postId, { comments: post.comments, score: post.score });
        return { post, reply };
    }
    async bookmarkPost(postId, userId) {
        const post = await this.postRepository.findById(postId);
        if (!post) {
            return undefined;
        }
        if (!post.bookmarkedBy.includes(userId)) {
            post.bookmarkedBy.push(userId);
            await this.postRepository.update(postId, { bookmarkedBy: post.bookmarkedBy });
        }
        return post;
    }
    async sharePost(postId) {
        const post = await this.postRepository.findById(postId);
        if (!post) {
            return undefined;
        }
        post.shareCount += 1;
        post.score = this.calculateScore({ likes: post.likedBy.length, shares: post.shareCount, comments: post.comments.length });
        return this.postRepository.update(postId, { shareCount: post.shareCount, score: post.score });
    }
    async addReaction(postId, userId, reaction) {
        const post = await this.postRepository.findById(postId);
        if (!post) {
            return undefined;
        }
        const reactions = post.reactions ?? {};
        const current = reactions[reaction] ?? [];
        if (!current.includes(userId)) {
            current.push(userId);
            reactions[reaction] = current;
            post.reactions = reactions;
            await this.postRepository.update(postId, { reactions: post.reactions });
        }
        return post;
    }
    async getFeed() {
        return this.sortPosts(await this.postRepository.list());
    }
    async getTrendingFeed() {
        const posts = await this.postRepository.list();
        return this.sortPosts(posts).slice(0, 10);
    }
    async getUserFeed(userId) {
        return this.sortPosts(await this.postRepository.listByUser(userId));
    }
    extractMentions(content) {
        return [...content.matchAll(/@([a-zA-Z0-9_]+)/g)].map((match) => match[1]);
    }
    extractHashtags(content) {
        return [...content.matchAll(/#([a-zA-Z0-9_]+)/g)].map((match) => match[1]);
    }
    calculateScore(input) {
        return input.likes * 3 + input.shares * 5 + input.comments * 2;
    }
    sortPosts(posts) {
        return [...posts].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }
}
//# sourceMappingURL=post-service.js.map