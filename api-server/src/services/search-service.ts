import { PostRepository } from "../repositories/post-repository.js";
import { UserRepository } from "../repositories/user-repository.js";

export class SearchService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly postRepository: PostRepository,
  ) {}

  search(query: string) {
    const normalized = query.toLowerCase();
    return {
      users: this.userRepository.list(normalized),
      posts: this.postRepository.list().filter((post) => post.content.toLowerCase().includes(normalized)),
    };
  }
}
