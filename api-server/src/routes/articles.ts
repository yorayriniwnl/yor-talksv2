import { Router } from "express";
import { ArticleController } from "../controllers/article-controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validation.js";
import { ArticleRepository } from "../repositories/article-repository.js";
import { ArticleService } from "../services/article-service.js";
import { clapSchema, createArticleSchema } from "../validators/article.js";

const router = Router();
const articleController = new ArticleController(new ArticleService(new ArticleRepository()));

router.post("/articles", authenticate, validateBody(createArticleSchema), articleController.create);
router.get("/articles", articleController.list);
router.get("/articles/:id", articleController.get);
router.post("/articles/:id/clap", authenticate, validateBody(clapSchema), articleController.clap);
router.delete("/articles/:id", authenticate, articleController.remove);

export default router;
