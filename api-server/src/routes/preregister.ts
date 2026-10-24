import { Router } from "express";
import { preregisterController } from "../controllers/preregister-controller.js";
import { preregistrationRateLimiter } from "../middlewares/rate-limit.js";

const router = Router();

// Public pre-registration routes (no auth required)
router.post("/preregister", preregistrationRateLimiter, preregisterController.preregister);
router.get("/preregister/stats", preregisterController.getStats);

export default router;
