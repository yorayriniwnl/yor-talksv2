import { env } from "../../config/env.js";
import { parseOpenAIModeration } from "./moderation-response.js";

// Core interface for all AI models
export interface AIProvider {
  generateText(prompt: string, context?: any): Promise<string>;
  generateEmbeddings(text: string): Promise<number[]>;
  analyzeToxicity(text: string): Promise<{ isToxic: boolean, score: number, flags: string[] }>;
}

export class AIProviderNotConfiguredError extends Error {
  constructor() {
    super("AI provider is not configured for this deployment");
    this.name = "AIProviderNotConfiguredError";
  }
}

export class MockAIProvider implements AIProvider {
  async generateText(prompt: string, context?: any): Promise<string> {
    const p = prompt.toLowerCase();
    
    // Simulate smart Creator Copilot responses
    if (p.includes("idea") || p.includes("draft")) {
      const topicStr = context?.topics?.join(", ") || "General";
      return `Here are 3 unique content angles tailored to your DNA (${topicStr}):
1. "The Future of ${topicStr.split(',')[0] || 'Tech'}: A Deep Dive" - A highly analytical post.
2. "How I approach ${topicStr.split(',')[0] || 'Life'} differently" - A personal, vulnerable essay.
3. "The tools I use for ${topicStr.split(',')[0] || 'Work'}" - A practical, actionable guide.
Let me know which one you want to flesh out!`;
    }
    
    if (p.includes("trend")) {
      return "Based on the Yor Talks knowledge graph, 'Spatial AI', 'Rust Microservices', and 'Founder Wellness' are experiencing a 400% engagement spike this week.";
    }

    return "I've analyzed your request through the Yor Talks AI engine. Based on your content graph, I recommend focusing on authentic, high-signal conversations. How can I help you refine this further?";
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    // Generate a mock 1536-dimensional vector for pgvector simulated usage
    return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
  }

  async analyzeToxicity(text: string): Promise<{ isToxic: boolean, score: number, flags: string[] }> {
    const t = text.toLowerCase();
    if (t.includes("hate") || t.includes("kill") || t.includes("idiot")) {
      return { isToxic: true, score: 0.89, flags: ["harassment", "toxicity"] };
    }
    return { isToxic: false, score: 0.05, flags: [] };
  }
}

export class OpenAIProvider implements AIProvider {
  private async request<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`https://api.openai.com/v1/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`OpenAI request failed (${response.status})`);
    }
    return response.json() as Promise<T>;
  }

  async generateText(prompt: string, context?: any): Promise<string> {
    const result = await this.request<{ choices?: Array<{ message?: { content?: string } }> }>("chat/completions", {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are Yor Talks Creator Copilot. Be concise, constructive, safe, and do not invent private user data." },
        { role: "user", content: `${prompt}\n\nCreator context: ${JSON.stringify(context ?? {})}` },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });
    const content = result.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("OpenAI returned an empty response");
    return content;
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    const result = await this.request<{ data?: Array<{ embedding?: number[] }> }>("embeddings", {
      model: "text-embedding-3-small",
      input: text,
    });
    const embedding = result.data?.[0]?.embedding;
    if (!embedding) throw new Error("OpenAI returned no embedding");
    return embedding;
  }

  async analyzeToxicity(text: string): Promise<{ isToxic: boolean, score: number, flags: string[] }> {
    const result = await this.request<unknown>("moderations", {
      model: "omni-moderation-latest",
      input: text,
    });
    return parseOpenAIModeration(result);
  }
}

export class AIGateway {
  private readonly provider: AIProvider | null;

  constructor() {
    // Keep a deterministic local provider for development, but never expose
    // fabricated AI output in a production deployment.
    if (env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'mock_key') {
      this.provider = new OpenAIProvider();
    } else if (env.NODE_ENV !== "production") {
      this.provider = new MockAIProvider();
    } else {
      this.provider = null;
    }
  }

  private getProvider(): AIProvider {
    if (!this.provider) throw new AIProviderNotConfiguredError();
    return this.provider;
  }

  async chat(message: string, userContext?: any): Promise<string> {
    return this.getProvider().generateText(message, userContext);
  }

  async createEmbedding(text: string): Promise<number[]> {
    return this.getProvider().generateEmbeddings(text);
  }

  async moderateContent(text: string): Promise<{ isToxic: boolean, score: number, flags: string[] }> {
    return this.getProvider().analyzeToxicity(text);
  }
}

export const ai = new AIGateway();
