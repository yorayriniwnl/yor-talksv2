import { Router } from "express";
import { privacyController, type PrivacyController } from "../controllers/privacy-controller.js";
import { preregistrationRateLimiter } from "../middlewares/rate-limit.js";

export function createPrivacyRouter(controller: PrivacyController = privacyController) {
const router = Router();
router.use(['/privacy', '/launch/unsubscribe'], (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// Public verified rights request routes (rate limited, no auth required)
router.post("/privacy/challenge", preregistrationRateLimiter, controller.requestChallenge);
router.post("/privacy/verify", preregistrationRateLimiter, controller.verifyChallenge);
router.post("/privacy/request", preregistrationRateLimiter, controller.submitRequest);

// Secure launch-email unsubscribe routes (one-click header & form POST)
router.get("/launch/unsubscribe", controller.unsubscribe);
router.post("/launch/unsubscribe", controller.unsubscribe);
return router;
}

export default createPrivacyRouter();
