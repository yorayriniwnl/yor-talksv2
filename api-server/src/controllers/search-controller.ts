import { type Request, type Response } from "express";
import { CacheService } from "../services/cache-service.js";
import { SearchService } from "../services/search-service.js";
import { createResponse } from "../utils/response.js";
import type { UserRecord } from "../types/index.js";
import { toPublicUsers } from "../utils/user-view.js";

const SEARCH_CACHE_TTL_SECONDS = 30;

export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly cacheService: CacheService,
  ) {}

  private safeResults(results: Awaited<ReturnType<SearchService["search"]>>) {
    return {
      ...results,
      // SearchService works with full records internally. Never let a cached
      // or freshly-computed result expose credentials, contact digests, or
      // account controls to the browser.
      users: toPublicUsers(results.users as UserRecord[]),
    };
  }

  search = async (req: Request, res: Response) => {
    try {
      const query = typeof req.query.q === "string" ? req.query.q : "";
      const viewerId = req.user?.id ?? "anonymous";
      const cacheKey = `search:${viewerId}:${query.toLowerCase()}`;
      const cached = await this.cacheService.get<Awaited<ReturnType<SearchService["search"]>>>(cacheKey);
      if (cached) {
        return res.status(200).json(createResponse("Search results", this.safeResults(cached), { cached: true }));
      }
      const results = await this.searchService.search(query, req.user?.id);
      const safeResults = this.safeResults(results);
      await this.cacheService.set(cacheKey, safeResults, SEARCH_CACHE_TTL_SECONDS);
      return res.status(200).json(createResponse("Search results", safeResults, { cached: false }));
    } catch {
      return res.status(500).json(createResponse("Search failed", null, {}, ["Internal server error"]));
    }
  };
}
