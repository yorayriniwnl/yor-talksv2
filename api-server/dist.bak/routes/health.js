import { Router } from "express";
import { HealthController } from "../controllers/health-controller.js";
const router = Router();
const healthController = new HealthController();
router.get("/healthz", healthController.health);
export default router;
//# sourceMappingURL=health.js.map