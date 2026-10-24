import { UserRepository } from '../repositories/user-repository.js';
import type { UserRecord } from '../types/index.js';
import { ContactShieldService } from './contact-shield-service.js';
import { EligibilityService } from './eligibility-service.js';

type ProfileVisibilityOptions = { discovery?: boolean; shielded?: ReadonlySet<string> };

/** Current profile authority shared by profiles, discovery and profile interactions. */
export class ProfileVisibilityService {
  constructor(
    private readonly users = new UserRepository(),
    private readonly shields = new ContactShieldService(),
    private readonly eligibility = new EligibilityService(),
  ) {}

  async filter(candidates: UserRecord[], viewerId?: string, options: ProfileVisibilityOptions = {}): Promise<UserRecord[]> {
    // No trusted territory context exists here to authorize guest profile access.
    if (!viewerId || !candidates.length) return [];
    const targets = [...new Set(candidates.filter(user => user.id !== viewerId
      && !['suspended', 'deactivated', 'deleted'].includes(user.accountStatus ?? 'active')).map(user => user.id))];
    if (!targets.length) return candidates.filter(user => user.id === viewerId);
    const [shielded, relationships, decisions] = await Promise.all([
      options.shielded ? Promise.resolve(options.shielded)
        : typeof this.shields.getShieldedUserIds === 'function' ? this.shields.getShieldedUserIds(viewerId)
        : Promise.all(targets.map(async id => [id, await this.shields.canView(viewerId, id)] as const))
          .then(rows => new Set(rows.filter(([, allowed]) => !allowed).map(([id]) => id))),
      typeof this.users.audienceRelationships === 'function' ? this.users.audienceRelationships(viewerId, targets)
        : Promise.all(targets.map(async id => [id, await this.users.isFollowing(viewerId, id)] as const))
          .then(rows => ({ following: new Set(rows.filter(([, follows]) => follows).map(([id]) => id)) })),
      typeof this.eligibility.decisionForMany === 'function' ? this.eligibility.decisionForMany([viewerId, ...targets])
        : Promise.all([viewerId, ...targets].map(async id => [id, await this.eligibility.decisionFor(id)] as const))
          .then(rows => new Map(rows)),
    ]);
    const viewer = decisions.get(viewerId);
    return candidates.filter(user => {
      if (user.id === viewerId) return true;
      if (['suspended', 'deactivated', 'deleted'].includes(user.accountStatus ?? 'active') || shielded.has(user.id)) return false;
      const target = decisions.get(user.id);
      if (!viewer?.activated || !viewer.capabilities.social || !target?.activated) return false;
      const minor = target.experience !== 'adult_18_plus';
      if (options.discovery && minor) return false;
      const visibility = minor ? 'private'
        : user.privacy?.profileVisibility ?? (user.settings?.privateAccount ? 'private' : 'public');
      return visibility === 'public' || relationships.following.has(user.id);
    });
  }

  async canView(user: UserRecord, viewerId?: string): Promise<boolean> {
    return (await this.filter([user], viewerId)).length === 1;
  }
}
