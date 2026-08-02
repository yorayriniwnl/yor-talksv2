import { type Request, type Response } from "express";
import { CacheService } from "../services/cache-service.js";
import { SearchService } from "../services/search-service.js";
import { createResponse } from "../utils/response.js";

const SEARCH_CACHE_TTL_SECONDS = 30;

export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly cacheService: CacheService,
  ) {}

  search = async (req: Request, res: Response) => {
    try {
      const query = typeof req.query.q === "string" ? req.query.q : "";
      const cacheKey = `search:${query.toLowerCase()}`;
      const cached = await this.cacheService.get<Awaited<ReturnType<SearchService["search"]>>>(cacheKey);
      if (cached) {
        return res.status(200).json(createResponse("Search results", cached, { cached: true }));
      }
      const results = await this.searchService.search(query);
      await this.cacheService.set(cacheKey, results, SEARCH_CACHE_TTL_SECONDS);
      return res.status(200).json(createResponse("Search results", results, { cached: false }));
    } catch (error) {
      return res.status(500).json(createResponse("Search failed", null, {}, [error instanceof Error ? error.message : "Unknown error"]));
    }
  };
}
