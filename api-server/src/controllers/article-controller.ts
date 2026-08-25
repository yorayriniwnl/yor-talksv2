import { type Request, type Response } from "express";
import { ArticleService } from "../services/article-service.js";
import { createResponse } from "../utils/response.js";

function paramId(req: Request): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  create = async (req: Request, res: Response) => {
    const authorId = req.user?.id;
    if (!authorId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const article = await this.articleService.createArticle({ ...req.body, authorId });
    return res.status(201).json(createResponse("Article published", article));
  };

  list = async (req: Request, res: Response) => {
    const articles = await this.articleService.listArticles(req.user?.id);
    return res.status(200).json(createResponse("Articles retrieved", articles));
  };

  get = async (req: Request, res: Response) => {
    const article = await this.articleService.getArticle(paramId(req), req.user?.id);
    if (!article) {
      return res.status(404).json(createResponse("Article not found", null, {}, ["Not found"]));
    }
    return res.status(200).json(createResponse("Article retrieved", article));
  };

  clap = async (req: Request, res: Response) => {
    const article = await this.articleService.clap(paramId(req), req.body.count ?? 1, req.user?.id);
    if (!article) {
      return res.status(404).json(createResponse("Article not found", null, {}, ["Not found"]));
    }
    return res.status(200).json(createResponse("Clapped", article));
  };

  remove = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const deleted = await this.articleService.deleteArticle(paramId(req), userId);
    if (!deleted) {
      return res.status(404).json(createResponse("Article not found or not yours to delete", null, {}, ["Not found"]));
    }
    return res.status(200).json(createResponse("Article removed", null));
  };
}
