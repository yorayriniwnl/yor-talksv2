import { AIService } from "./ai-service.js";

export type ContentModerationResult = { spam: boolean; toxicity: boolean; nsfw: boolean };

export class ContentPolicyViolationError extends Error {
  constructor(message: string, public readonly moderation: ContentModerationResult) {
    super(message);
    this.name = "ContentPolicyViolationError";
  }
}

/**
 * Applies one publication gate to every user-authored text surface. The AI
 * provider is deliberately injectable so tests and future moderation workers
 * can use a deterministic implementation without changing the services.
 */
export async function enforceTextContentPolicy(
  content: string,
  aiService = new AIService(),
  subject = "content",
): Promise<void> {
  const normalized = content.trim();
  if (!normalized) return;
  const moderation = await aiService.moderate(normalized.slice(0, 12_000));
  if (moderation.spam || moderation.toxicity || moderation.nsfw) {
    throw new ContentPolicyViolationError(`This ${subject} was blocked by the safety filter`, moderation);
  }
}
