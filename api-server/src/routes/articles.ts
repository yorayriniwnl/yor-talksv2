import { Router } from "express";
import { ArticleController } from "../controllers/article-controller.js";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.js";
import { validateBody, validateParams } from "../middlewares/validation.js";
import { ArticleRepository } from "../repositories/article-repository.js";
import { ArticleService } from "../services/article-service.js";
import { clapSchema, createArticleSchema } from "../validators/article.js";
import { uuidParamSchema } from "../validators/params.js";

const router = Router();
const articleController = new ArticleController(new ArticleService(new ArticleRepository()));

router.post("/articles", authenticate, validateBody(createArticleSchema), articleController.create);
router.get("/articles", optionalAuthenticate, articleController.list);
router.get("/articles/:id", optionalAuthenticate, validateParams(uuidParamSchema), articleController.get);
router.post("/articles/:id/clap", authenticate, validateParams(uuidParamSchema), validateBody(clapSchema), articleController.clap);
router.delete("/articles/:id", authenticate, validateParams(uuidParamSchema), articleController.remove);

export default router;
