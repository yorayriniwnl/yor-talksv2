import { randomUUID } from "node:crypto";
import { ProductRepository } from "../repositories/product-repository.js";
import type { ProductRecord } from "../types/index.js";
import { AIService } from "./ai-service.js";
import { enforceTextContentPolicy } from "./content-policy-service.js";
import { ContentSafetyService } from "./content-safety-service.js";
import { DEFAULT_CONTENT_RATING } from "../utils/content-safety.js";

export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly aiService: AIService = new AIService(),
    private readonly contentSafetyService: ContentSafetyService = new ContentSafetyService(),
  ) {}

  async createProduct(input: {
    sellerId: string;
    title: string;
    description: string;
    price: number;
    images: string[];
    category: string;
    condition: string;
    contentRating?: ProductRecord["contentRating"];
  }): Promise<ProductRecord> {
    await enforceTextContentPolicy(`${input.title}\n${input.description}`, this.aiService, "marketplace listing");
    const product: ProductRecord = {
      id: randomUUID(),
      ...input,
      savedBy: [],
      availability: "active",
      createdAt: new Date().toISOString(),
      contentRating: input.contentRating ?? DEFAULT_CONTENT_RATING,
    };
    return this.productRepository.create(product);
  }

  async toggleSave(productId: string, userId: string): Promise<ProductRecord | undefined> {
    const product = await this.productRepository.findById(productId);
    if (!product || !(await this.contentSafetyService.isVisible(product, userId, product.sellerId))) return undefined;
    return this.productRepository.toggleSaved(productId, userId);
  }

  async listProducts(viewerId?: string): Promise<ProductRecord[]> {
    return this.contentSafetyService.filterVisibleByAuthor(await this.productRepository.list(), viewerId, (product) => product.sellerId);
  }

  async getProduct(id: string, viewerId?: string): Promise<ProductRecord | undefined> {
    const product = await this.productRepository.findById(id);
    return await this.contentSafetyService.isVisible(product, viewerId, product?.sellerId) ? product : undefined;
  }

  async deleteProduct(id: string, userId: string): Promise<boolean> {
    const product = await this.productRepository.findById(id);
    if (!product || product.sellerId !== userId || product.availability !== "active") {
      return false;
    }
    return this.productRepository.delete(id);
  }
}
