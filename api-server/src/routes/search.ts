import { Router } from "express";
import { SearchController } from "../controllers/search-controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validateQuery } from "../middlewares/validation.js";
import { CacheService } from "../services/cache-service.js";
import { PostRepository } from "../repositories/post-repository.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { SearchService } from "../services/search-service.js";
import { searchQuerySchema } from "../validators/search.js";

const router = Router();
const searchService = new SearchService(new UserRepository(), new PostRepository());
const cacheService = new CacheService(new RedisRepository());
const searchController = new SearchController(searchService, cacheService);

router.get("/search", authenticate, validateQuery(searchQuerySchema), searchController.search);

export default router;
