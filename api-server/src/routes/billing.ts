import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.js';
import { requireTrustedOrigin } from '../middlewares/trusted-origin.js';
import { authRateLimiter } from '../middlewares/rate-limit.js';
import { validateParams } from '../middlewares/validation.js';
import { createResponse } from '../utils/response.js';
import { createPaymentRuntime } from '../services/payment-runtime.js';
import { CheckoutRequestError } from '../services/checkout-intent-service.js';
import { SubscriptionRequestError } from '../services/subscription-service.js';
import { MarketplaceRequestError } from '../services/marketplace-service.js';

const router = Router(), runtime = createPaymentRuntime();
const params = z.object({ checkoutId: z.string().uuid() });
const run = (fn: (userId: string, checkoutId: string) => Promise<unknown>): RequestHandler => async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  try { res.json(createResponse('Checkout history loaded', await fn(req.user!.id, String(req.params.checkoutId ?? '')))); }
  catch (error) {
    const requestError = error instanceof CheckoutRequestError || error instanceof SubscriptionRequestError || error instanceof MarketplaceRequestError;
    res.status(requestError ? 409 : 503).json(createResponse(requestError ? error.message : 'Payment status could not be checked. Your checkout is saved; try recovery again later.', null));
  }
};
router.get('/billing/checkouts', authenticate, run(userId => runtime.intents.list(userId)));
router.post('/billing/checkouts/:checkoutId/recover', authenticate, requireTrustedOrigin, authRateLimiter, validateParams(params), run(runtime.recover));
router.post('/billing/checkouts/:checkoutId/cancel', authenticate, requireTrustedOrigin, validateParams(params), run(runtime.cancel));
export default router;
