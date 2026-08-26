import { PostRepository } from "../repositories/post-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { ContactShieldService } from "./contact-shield-service.js";
import { ContentSafetyService } from "./content-safety-service.js";

export class SearchService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly postRepository: PostRepository,
    private readonly contactShieldService: ContactShieldService = new ContactShieldService(),
    private readonly contentSafetyService: ContentSafetyService = new ContentSafetyService(),
  ) {}

  async search(query: string, viewerId?: string) {
    const shieldedUserIds = viewerId ? [...await this.contactShieldService.getShieldedUserIds(viewerId)] : [];
    const normalized = query.trim().toLowerCase();
    const contentFilter = await this.contentSafetyService.getViewerFilter(viewerId);
    const [users, candidatePosts] = await Promise.all([
      this.contactShieldService.filterVisibleUsers(viewerId, await this.userRepository.list(normalized)),
      this.postRepository.search(normalized, 50, shieldedUserIds, contentFilter),
    ]);
    const posts = await this.contentSafetyService.filterVisibleByAuthor(candidatePosts, viewerId, (post) => post.authorId);
    return { users, posts };
  }
}
