import { randomUUID } from "node:crypto";
import { ProductRepository } from "../repositories/product-repository.js";
import type { ProductRecord } from "../types/index.js";
import { AIService } from "./ai-service.js";
import { enforceTextContentPolicy } from "./content-policy-service.js";

export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly aiService: AIService = new AIService(),
  ) {}

  async createProduct(input: {
    sellerId: string;
    title: string;
    description: string;
    price: number;
    images: string[];
    category: string;
    condition: string;
  }): Promise<ProductRecord> {
    await enforceTextContentPolicy(`${input.title}\n${input.description}`, this.aiService, "marketplace listing");
    const product: ProductRecord = {
      id: randomUUID(),
      ...input,
      savedBy: [],
      availability: "active",
      createdAt: new Date().toISOString(),
    };
    return this.productRepository.create(product);
  }

  async toggleSave(productId: string, userId: string): Promise<ProductRecord | undefined> {
    const product = await this.productRepository.findById(productId);
    if (!product) return undefined;
    const savedBy = product.savedBy.includes(userId)
      ? product.savedBy.filter((id) => id !== userId)
      : [...product.savedBy, userId];
    return this.productRepository.update(productId, { savedBy });
  }

  async listProducts(): Promise<ProductRecord[]> {
    return this.productRepository.list();
  }

  async getProduct(id: string): Promise<ProductRecord | undefined> {
    return this.productRepository.findById(id);
  }

  async deleteProduct(id: string, userId: string): Promise<boolean> {
    const product = await this.productRepository.findById(id);
    if (!product || product.sellerId !== userId || product.availability !== "active") {
      return false;
    }
    return this.productRepository.delete(id);
  }
}
