import { type Request, type Response } from "express";
import { CacheService } from "../services/cache-service.js";
import { SearchService } from "../services/search-service.js";
import { createResponse } from "../utils/response.js";
import type { UserRecord } from "../types/index.js";
import { toPublicUsers } from "../utils/user-view.js";

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
      // Always re-query current records: a result cache cannot authorize a later request.
      const results = await this.searchService.search(query, req.user?.id);
      const safeResults = this.safeResults(results);
      await this.cacheService.set(cacheKey, { postIds: safeResults.posts.map(post => post.id) }, SEARCH_CACHE_TTL_SECONDS);
      res.setHeader("Cache-Control", "private, no-store");
      return res.status(200).json(createResponse("Search results", safeResults, { cached: Boolean(cached) }));
    } catch {
      return res.status(500).json(createResponse("Search failed", null, {}, ["Internal server error"]));
    }
  };
}
