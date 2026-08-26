import { Router } from "express";
import { ProductController } from "../controllers/product-controller.js";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validation.js";
import { ProductRepository } from "../repositories/product-repository.js";
import { ProductService } from "../services/product-service.js";
import { createProductSchema } from "../validators/product.js";

const router = Router();
const productController = new ProductController(new ProductService(new ProductRepository()));

router.post("/products", authenticate, validateBody(createProductSchema), productController.create);
router.get("/products", optionalAuthenticate, productController.list);
router.get("/products/:id", optionalAuthenticate, productController.get);
router.post("/products/:id/save", authenticate, productController.toggleSave);
router.delete("/products/:id", authenticate, productController.remove);

export default router;
