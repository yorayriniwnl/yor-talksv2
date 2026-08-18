import { Router, type IRouter } from "express";
import { HealthController } from "../controllers/health-controller.js";

const router: IRouter = Router();
const healthController = new HealthController();

router.get("/healthz", healthController.health);
router.get("/health", healthController.health);
router.get("/ping", healthController.health);

export default router;
