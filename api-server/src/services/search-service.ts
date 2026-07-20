import { PostRepository } from "../repositories/post-repository.js";
import { UserRepository } from "../repositories/user-repository.js";

export class SearchService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly postRepository: PostRepository,
  ) {}

  async search(query: string) {
    const normalized = query.toLowerCase();
    const users = await this.userRepository.list(normalized);
    const posts = await this.postRepository.list();
    return {
      users,
      posts: posts.filter((post: any) => post.content.toLowerCase().includes(normalized)),
    };
  }
}
