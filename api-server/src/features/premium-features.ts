export const PREMIUM_FEATURES = [
  "STORY_PRIVATE_VIEW",
  "STORY_REWATCH_ANALYTICS",
  "MESSAGE_UNREAD_PREVIEW",
  "CUSTOM_BIO_FONT",
  "CUSTOM_APP_ICON",
  "STORY_PRIORITY",
  "SUPER_HEART",
  "EXTENDED_STORY",
  "SIX_PINNED_POSTS",
  "CUSTOM_STORY_AUDIENCE",
  "PROFILE_ONLY_POST",
  "DIRECT_HIGHLIGHT",
  "MESSAGE_FONT",
  "STORY_FONT",
  "STORY_VIEW_TIMESTAMPS",
] as const;

export type PremiumFeature = typeof PREMIUM_FEATURES[number];
export type FeatureFlags = Record<PremiumFeature, boolean>;

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  if (value.trim().toLowerCase() === "true") return true;
  if (value.trim().toLowerCase() === "false") return false;
  return undefined;
}

function featureEnvKey(feature: PremiumFeature): string {
  return `YOR_FEATURE_${feature}`;
}

/**
 * Resolve rollout configuration without coupling feature code to a billing
 * provider. The beta default is enabled so the product can be exercised
 * locally; deployments can turn the complete suite or individual features off.
 */
export function resolveFeatureFlags(source: Record<string, string | undefined> = process.env): FeatureFlags {
  const defaultEnabled = parseBoolean(source.YOR_ADVANCED_DEFAULT_ENABLED) ?? true;
  return Object.fromEntries(
    PREMIUM_FEATURES.map((feature) => [feature, parseBoolean(source[featureEnvKey(feature)]) ?? defaultEnabled]),
  ) as FeatureFlags;
}

export function isPremiumFeature(value: string): value is PremiumFeature {
  return (PREMIUM_FEATURES as readonly string[]).includes(value);
}
