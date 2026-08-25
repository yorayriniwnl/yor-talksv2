import { PostRepository } from "../repositories/post-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { CommunityService } from "./community-service.js";

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  goal: number;
  xp: number;
  metric: "postCount" | "followerCount" | "communityCount";
}

export interface AchievementProgress extends AchievementDefinition {
  progress: number;
  unlocked: boolean;
}

// A small, fixed set of achievement types — not user-generated content, so
// these live as constants rather than needing their own database table.
const DEFINITIONS: AchievementDefinition[] = [
  { id: "first-post", title: "First Post", description: "Publish your first post", icon: "Sparkles", goal: 1, xp: 50, metric: "postCount" },
  { id: "rising-voice", title: "Rising Voice", description: "Reach 1,000 followers", icon: "TrendingUp", goal: 1000, xp: 200, metric: "followerCount" },
  { id: "community-builder", title: "Community Builder", description: "Join 5 communities", icon: "Users", goal: 5, xp: 100, metric: "communityCount" },
];

export class AchievementService {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly userRepository: UserRepository,
    private readonly communityService: CommunityService,
  ) {}

  async getProgressForUser(userId: string): Promise<AchievementProgress[]> {
    const [posts, user, communities] = await Promise.all([
      this.postRepository.listByUser(userId),
      this.userRepository.findById(userId),
      this.communityService.listCommunities(),
    ]);

    const metrics: Record<AchievementDefinition["metric"], number> = {
      postCount: posts.length,
      followerCount: user?.followerCount ?? 0,
      communityCount: communities.filter((c) => c.memberIds.includes(userId)).length,
    };

    return DEFINITIONS.map((def) => {
      const progress = Math.min(metrics[def.metric], def.goal);
      return { ...def, progress, unlocked: progress >= def.goal };
    });
  }
}
