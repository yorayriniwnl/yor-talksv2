import { env } from "../../config/env.js";

// Core interface for all AI models
export interface AIProvider {
  generateText(prompt: string, context?: any): Promise<string>;
  generateEmbeddings(text: string): Promise<number[]>;
  analyzeToxicity(text: string): Promise<{ isToxic: boolean, score: number, flags: string[] }>;
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
  async generateText(prompt: string, context?: any): Promise<string> {
    throw new Error("OpenAIProvider not implemented without API Key");
  }
  async generateEmbeddings(text: string): Promise<number[]> {
    throw new Error("OpenAIProvider not implemented without API Key");
  }
  async analyzeToxicity(text: string): Promise<{ isToxic: boolean, score: number, flags: string[] }> {
    throw new Error("OpenAIProvider not implemented without API Key");
  }
}

export class AIGateway {
  private provider: AIProvider;

  constructor() {
    // Dynamically route to OpenAI if key exists, otherwise use Mock/Local development provider
    if (env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'mock_key') {
      this.provider = new OpenAIProvider();
    } else {
      this.provider = new MockAIProvider();
    }
  }

  async chat(message: string, userContext?: any): Promise<string> {
    return this.provider.generateText(message, userContext);
  }

  async createEmbedding(text: string): Promise<number[]> {
    return this.provider.generateEmbeddings(text);
  }

  async moderateContent(text: string): Promise<{ isToxic: boolean, score: number, flags: string[] }> {
    return this.provider.analyzeToxicity(text);
  }
}

export const ai = new AIGateway();
