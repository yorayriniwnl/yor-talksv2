import { type Request, type Response } from "express";
import { ProductService } from "../services/product-service.js";
import { createResponse } from "../utils/response.js";

function paramId(req: Request): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

export class ProductController {
  constructor(private readonly productService: ProductService) {}

  create = async (req: Request, res: Response) => {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const product = await this.productService.createProduct({ ...req.body, sellerId });
    return res.status(201).json(createResponse("Product listed", product));
  };

  list = async (_req: Request, res: Response) => {
    const products = await this.productService.listProducts();
    return res.status(200).json(createResponse("Products retrieved", products));
  };

  get = async (req: Request, res: Response) => {
    const product = await this.productService.getProduct(paramId(req));
    if (!product) {
      return res.status(404).json(createResponse("Product not found", null, {}, ["Not found"]));
    }
    return res.status(200).json(createResponse("Product retrieved", product));
  };

  remove = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const deleted = await this.productService.deleteProduct(paramId(req), userId);
    if (!deleted) {
      return res.status(404).json(createResponse("Product not found or not yours to delete", null, {}, ["Not found"]));
    }
    return res.status(200).json(createResponse("Product removed", null));
  };

  toggleSave = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const product = await this.productService.toggleSave(paramId(req), userId);
    if (!product) {
      return res.status(404).json(createResponse("Product not found", null, {}, ["Not found"]));
    }
    return res.status(200).json(createResponse("Saved state updated", product));
  };
}
