import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db, pool, userFeatureOverridesTable } from "@workspace/db";
import { PREMIUM_FEATURES, resolveFeatureFlags, type FeatureFlags, type PremiumFeature } from "../features/premium-features.js";

export interface FeatureOverride {
  feature: PremiumFeature;
  enabled: boolean;
  expiresAt: string | null;
}

export interface FeatureOverrideRepository {
  findActiveOverride(userId: string, feature: PremiumFeature): Promise<FeatureOverride | undefined>;
  snapshot?(userId: string): Promise<{ overrides: FeatureOverride[]; paidFeatures: string[] }>;
}

class DrizzleFeatureOverrideRepository implements FeatureOverrideRepository {
  async snapshot(userId: string): Promise<{ overrides: FeatureOverride[]; paidFeatures: string[] }> {
    const result = await pool.query(`SELECT
      coalesce((SELECT jsonb_agg(jsonb_build_object('feature',feature_key,'enabled',enabled,'expiresAt',expires_at AT TIME ZONE 'UTC'))
        FROM user_feature_overrides WHERE user_id=$1 AND status='active' AND (expires_at IS NULL OR expires_at>now())), '[]') AS overrides,
      coalesce((SELECT jsonb_agg(DISTINCT f.feature) FROM premium_access a JOIN premium_orders o ON o.id=a.order_id
        CROSS JOIN LATERAL jsonb_array_elements_text(o.plan_snapshot->'features') f(feature)
        WHERE a.user_id=$1 AND a.status IN ('active','cancelled') AND o.status='paid' AND a.starts_at<=now() AND a.ends_at>now()), '[]') AS paid_features`, [userId]);
    return { overrides: result.rows[0].overrides, paidFeatures: result.rows[0].paid_features };
  }
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
  if (!override) return false;
  // Positive grants must be temporary. Administrative denials may be indefinite.
  if (!override.expiresAt) return !override.enabled;
  const timestamp = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(override.expiresAt)
    ? `${override.expiresAt.replace(' ', 'T')}Z` : override.expiresAt;
  return new Date(timestamp).getTime() > now;
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
    return (await this.getSnapshot(userId))[feature];
  }

  async getSnapshot(userId: string): Promise<FeatureFlags> {
    const snapshot = this.overrideRepository.snapshot ? await this.overrideRepository.snapshot(userId) : {
      overrides: (await Promise.all(PREMIUM_FEATURES.map(feature => this.overrideRepository.findActiveOverride(userId, feature))))
        .filter((override): override is FeatureOverride => Boolean(override)), paidFeatures: [],
    };
    const overrides = new Map(snapshot.overrides.filter(override => isActiveOverride(override)).map(override => [override.feature, override]));
    const entries = PREMIUM_FEATURES.map(feature => [feature,
      this.flags[feature] && (overrides.has(feature) ? overrides.get(feature)!.enabled : snapshot.paidFeatures.includes(feature)),
    ] as const);
    return Object.fromEntries(entries) as FeatureFlags;
  }
}
