import { PostRepository } from "../repositories/post-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { ContactShieldService } from "./contact-shield-service.js";
import { ContentSafetyService } from "./content-safety-service.js";
import { ProfileVisibilityService } from './profile-visibility-service.js';

export class SearchService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly postRepository: PostRepository,
    private readonly contactShieldService: ContactShieldService = new ContactShieldService(),
    private readonly contentSafetyService: ContentSafetyService = new ContentSafetyService(userRepository),
    private readonly profileVisibility = new ProfileVisibilityService(userRepository, contactShieldService),
  ) {}

  async search(query: string, viewerId?: string) {
    const shielded = viewerId ? await this.contactShieldService.getShieldedUserIds(viewerId) : new Set<string>();
    const normalized = query.trim().toLowerCase();
    const contentFilter = await this.contentSafetyService.getViewerFilter(viewerId);
    const [users, candidatePosts] = await Promise.all([
      this.userRepository.list(normalized),
      this.postRepository.search(normalized, 250, [...shielded], contentFilter, viewerId),
    ]);
    const [posts, visibleUsers] = await Promise.all([
      this.contentSafetyService.filterVisibleByAuthor(candidatePosts, viewerId, (post) => post.authorId, { discovery: true }),
      this.profileVisibility.filter(users, viewerId, { discovery: true, shielded }),
    ]);
    return { users: visibleUsers, posts: posts.slice(0, 50) };
  }
}
