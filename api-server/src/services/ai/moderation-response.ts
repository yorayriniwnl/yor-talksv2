import { z } from "zod";

const geminiModerationSchema = z.object({
  spam: z.boolean(),
  toxicity: z.boolean(),
  nsfw: z.boolean(),
});

// Required by the moderation model used by OpenAIProvider. Additional categories
// are allowed so a new safety category is preserved rather than silently dropped.
const requiredCategories = [
  "harassment", "harassment/threatening", "hate", "hate/threatening",
  "illicit", "illicit/violent", "self-harm", "self-harm/intent",
  "self-harm/instructions", "sexual", "sexual/minors", "violence", "violence/graphic",
];
const openAIModerationSchema = z.object({
  results: z.array(z.object({
    flagged: z.boolean(),
    categories: z.record(z.boolean()).refine((values) => requiredCategories.every((key) => key in values)),
    category_scores: z.record(z.number().finite().min(0).max(1))
      .refine((values) => requiredCategories.every((key) => key in values)),
  })).min(1),
});

export function parseGeminiModeration(text: string) {
  let json: unknown;
  try {
    json = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
  } catch {
    throw new Error("Invalid Gemini moderation response");
  }
  const parsed = geminiModerationSchema.safeParse(json);
  if (!parsed.success) throw new Error("Invalid Gemini moderation response");
  return parsed.data;
}

export function parseOpenAIModeration(response: unknown) {
  const parsed = openAIModerationSchema.safeParse(response);
  if (!parsed.success) throw new Error("Invalid OpenAI moderation response");
  const result = parsed.data.results[0];
  const flags = Object.entries(result.categories).filter(([, flagged]) => flagged).map(([name]) => name);
  return {
    isToxic: result.flagged || flags.length > 0,
    score: Math.max(0, ...Object.values(result.category_scores)),
    flags,
  };
}
