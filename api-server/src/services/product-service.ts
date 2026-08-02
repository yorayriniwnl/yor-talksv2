import { randomUUID } from "node:crypto";
import { ProductRepository } from "../repositories/product-repository.js";
import type { ProductRecord } from "../types/index.js";

export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  async createProduct(input: {
    sellerId: string;
    title: string;
    description: string;
    price: number;
    images: string[];
    category: string;
    condition: string;
  }): Promise<ProductRecord> {
    const product: ProductRecord = {
      id: randomUUID(),
      ...input,
      savedBy: [],
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
    if (!product || product.sellerId !== userId) {
      return false;
    }
    return this.productRepository.delete(id);
  }
}
