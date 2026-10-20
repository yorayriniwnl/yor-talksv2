import { Router } from "express";
import { privacyController } from "../controllers/privacy-controller.js";
import { preregistrationRateLimiter } from "../middlewares/rate-limit.js";

const router = Router();

// Public verified rights request routes (rate limited, no auth required)
router.post("/privacy/challenge", preregistrationRateLimiter, privacyController.requestChallenge);
router.post("/privacy/request", preregistrationRateLimiter, privacyController.submitRequest);

// Secure launch-email unsubscribe routes (one-click header & form POST)
router.get("/launch/unsubscribe", privacyController.unsubscribe);
router.post("/launch/unsubscribe", privacyController.unsubscribe);

export default router;
