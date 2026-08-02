import { randomUUID } from "node:crypto";
import { ArticleRepository } from "../repositories/article-repository.js";
import type { ArticleRecord } from "../types/index.js";

// Claps are an increment-only counter on the row (matching the schema, and
// the same pattern Medium itself uses) — there's no per-user "have I already
// clapped" tracking, so a cap per request is the only abuse guard available.
const MAX_CLAPS_PER_REQUEST = 50;

export class ArticleService {
  constructor(private readonly articleRepository: ArticleRepository) {}

  async createArticle(input: {
    authorId: string;
    title: string;
    excerpt: string;
    content: string;
    coverUrl: string;
    readTime: number;
    collection?: string;
  }): Promise<ArticleRecord> {
    const article: ArticleRecord = {
      id: randomUUID(),
      ...input,
      claps: 0,
      createdAt: new Date().toISOString(),
    };
    return this.articleRepository.create(article);
  }

  async listArticles(): Promise<ArticleRecord[]> {
    return this.articleRepository.list();
  }

  async getArticle(id: string): Promise<ArticleRecord | undefined> {
    return this.articleRepository.findById(id);
  }

  async clap(id: string, count: number): Promise<ArticleRecord | undefined> {
    const safeCount = Math.min(Math.max(1, count), MAX_CLAPS_PER_REQUEST);
    return this.articleRepository.incrementClaps(id, safeCount);
  }

  async deleteArticle(id: string, userId: string): Promise<boolean> {
    const article = await this.articleRepository.findById(id);
    if (!article || article.authorId !== userId) {
      return false;
    }
    return this.articleRepository.delete(id);
  }
}
