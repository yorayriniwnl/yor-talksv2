export class SearchService {
    userRepository;
    postRepository;
    constructor(userRepository, postRepository) {
        this.userRepository = userRepository;
        this.postRepository = postRepository;
    }
    async search(query) {
        const normalized = query.toLowerCase();
        const users = await this.userRepository.list(normalized);
        const posts = await this.postRepository.list();
        return {
            users,
            posts: posts.filter((post) => post.content.toLowerCase().includes(normalized)),
        };
    }
}
//# sourceMappingURL=search-service.js.map