import { PostRepository } from "../repositories/post-repository.js";
import { UserRepository } from "../repositories/user-repository.js";

export class SearchService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly postRepository: PostRepository,
  ) {}

  async search(query: string) {
    const normalized = query.toLowerCase();
    const [users, posts] = await Promise.all([
      this.userRepository.list(normalized),
      this.postRepository.search(normalized),
    ]);
    return { users, posts };
  }
}
