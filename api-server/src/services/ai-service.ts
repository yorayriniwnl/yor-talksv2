export interface AIRecommendation {
  reason: string;
  score: number;
}

export class AIService {
  async moderate(content: string): Promise<{ spam: boolean; toxicity: boolean; nsfw: boolean }> {
    const lowered = content.toLowerCase();
    const spam = lowered.includes("buy now") || lowered.includes("click here");
    const toxicity = lowered.includes("idiot") || lowered.includes("stupid");
    const nsfw = lowered.includes("explicit") || lowered.includes("nsfw");
    return { spam, toxicity, nsfw };
  }

  async recommend(content: string): Promise<AIRecommendation[]> {
    return [
      { reason: "topic relevance", score: 0.84 },
      { reason: "engagement similarity", score: 0.77 },
    ].filter(() => content.length > 0);
  }

  async tag(content: string): Promise<string[]> {
    return content.split(/\s+/).filter((token) => token.startsWith("#")).map((token) => token.slice(1));
  }
}
