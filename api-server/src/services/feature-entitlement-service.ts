import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db, userFeatureOverridesTable } from "@workspace/db";
import { PREMIUM_FEATURES, resolveFeatureFlags, type FeatureFlags, type PremiumFeature } from "../features/premium-features.js";

export interface FeatureOverride {
  feature: PremiumFeature;
  enabled: boolean;
  expiresAt: string | null;
}

export interface FeatureOverrideRepository {
  findActiveOverride(userId: string, feature: PremiumFeature): Promise<FeatureOverride | undefined>;
}

class DrizzleFeatureOverrideRepository implements FeatureOverrideRepository {
  async findActiveOverride(userId: string, feature: PremiumFeature): Promise<FeatureOverride | undefined> {
    const [override] = await db.select({
      feature: userFeatureOverridesTable.featureKey,
      enabled: userFeatureOverridesTable.enabled,
      expiresAt: userFeatureOverridesTable.expiresAt,
    }).from(userFeatureOverridesTable).where(and(
      eq(userFeatureOverridesTable.userId, userId),
      eq(userFeatureOverridesTable.featureKey, feature),
      eq(userFeatureOverridesTable.status, "active"),
      or(isNull(userFeatureOverridesTable.expiresAt), gt(userFeatureOverridesTable.expiresAt, new Date().toISOString())),
    )).limit(1);

    return override ? {
      feature: override.feature as PremiumFeature,
      enabled: override.enabled,
      expiresAt: override.expiresAt,
    } : undefined;
  }
}

function isActiveOverride(override: FeatureOverride | undefined, now = Date.now()): boolean {
  return Boolean(override && (!override.expiresAt || new Date(override.expiresAt).getTime() > now));
}

export class FeatureEntitlementService {
  constructor(
    private readonly overrideRepository: FeatureOverrideRepository = new DrizzleFeatureOverrideRepository(),
    flags: Partial<FeatureFlags> = {},
  ) {
    this.flags = { ...resolveFeatureFlags(), ...flags };
  }

  private readonly flags: FeatureFlags;

  async hasFeature(userId: string, feature: PremiumFeature): Promise<boolean> {
    const override = await this.overrideRepository.findActiveOverride(userId, feature);
    if (isActiveOverride(override)) return override!.enabled;
    return this.flags[feature] === true;
  }

  async getSnapshot(userId: string): Promise<FeatureFlags> {
    const entries = await Promise.all(PREMIUM_FEATURES.map(async (feature) => [feature, await this.hasFeature(userId, feature)] as const));
    return Object.fromEntries(entries) as FeatureFlags;
  }
}
