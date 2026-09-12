export type StoryViewExposure = "identified" | "private";

export interface StoryViewEventInput {
  viewerId: string | null;
  exposure: StoryViewExposure;
  viewedAt: string;
}

export interface StoryAnalyticsSummary {
  totalViews: number;
  uniqueViewers: number;
  rewatches: number;
  rewatchRate: number;
  identifiedViews: number;
  privateViews: number;
}

export interface StoryScoreInput {
  relationshipScore: number;
  recencyScore: number;
  engagementScore: number;
  priorityBoost: number;
}

export function calculateStoryAnalytics(events: StoryViewEventInput[]): StoryAnalyticsSummary {
  const seenViewers = new Set<string>();
  let rewatches = 0;
  let identifiedViews = 0;
  let privateViews = 0;

  for (const [index, event] of [...events].sort((a, b) => a.viewedAt.localeCompare(b.viewedAt)).entries()) {
    if (event.exposure === "identified") identifiedViews += 1;
    else privateViews += 1;

    // Authenticated private viewers still have a stable internal identity. A
    // future unauthenticated event has no identity, so it contributes one
    // aggregate unique-view lower bound and can never be treated as a rewatch.
    const identity = event.viewerId ?? `anonymous:${index}`;
    if (seenViewers.has(identity)) rewatches += 1;
    seenViewers.add(identity);
  }

  const totalViews = events.length;
  return {
    totalViews,
    uniqueViewers: seenViewers.size,
    rewatches,
    rewatchRate: totalViews === 0 ? 0 : Number(((rewatches / totalViews) * 100).toFixed(1)),
    identifiedViews,
    privateViews,
  };
}

export function selectViewerExposure(input: {
  storyPrivateViewEnabled: boolean;
  storyViewMode?: "identified" | "private";
}): StoryViewExposure {
  return input.storyPrivateViewEnabled && input.storyViewMode === "private" ? "private" : "identified";
}

export function resolveStoryDurationHours(requestedHours: number | undefined, hasExtendedStory: boolean, maximumHours: number): number {
  const duration = requestedHours ?? 24;
  if (!Number.isInteger(duration) || duration < 24) throw new Error("Story duration must be at least 24 hours");
  if (duration > maximumHours) throw new Error(`Story duration cannot exceed the maximum of ${maximumHours} hours`);
  if (duration > 24 && !hasExtendedStory) throw new Error("Extended story duration requires an entitlement");
  return duration;
}

export function calculateStoryScore({ relationshipScore, recencyScore, engagementScore, priorityBoost }: StoryScoreInput): number {
  return relationshipScore + recencyScore + engagementScore + Math.min(20, Math.max(0, priorityBoost));
}
