import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.js';
import { requireTrustedOrigin } from '../middlewares/trusted-origin.js';
import { validateBody, validateParams } from '../middlewares/validation.js';
import { createResponse } from '../utils/response.js';
import { PlatformPremiumService, PremiumRequestError } from '../services/platform-premium-service.js';
import { PaymentsNotConfiguredError, PaymentProviderError } from '../services/razorpay-service.js';
import { authRateLimiter } from '../middlewares/rate-limit.js';
import type { RequestHandler } from 'express';

const router = Router(), service = new PlatformPremiumService();
const orderId = z.object({ orderId: z.string().uuid() });
const run = (fn: (req: any) => Promise<unknown>): RequestHandler => async (req, res) => {
  try { res.setHeader('Cache-Control', 'private, no-store'); res.json(createResponse('Premium account loaded', await fn(req))); }
  catch (error) {
    const status = error instanceof PremiumRequestError ? 409 : error instanceof PaymentsNotConfiguredError ? 503 : error instanceof PaymentProviderError ? 502 : 503;
    res.status(status).json(createResponse(error instanceof PremiumRequestError ? error.message : 'Premium billing is temporarily unavailable. Your free account remains available.', null));
  }
};
router.get('/premium/catalog', run(() => service.catalog()));
router.get('/premium/me', authenticate, run(req => service.state(req.user.id)));
router.post('/premium/orders', authenticate, requireTrustedOrigin, authRateLimiter, validateBody(z.object({
  idempotencyKey: z.string().uuid(), acceptedTermsVersion: z.string().min(1).max(100), acceptedPriceMinor: z.number().int().min(100),
}).strict()), run(req => service.createOrder(req.user.id, req.body)));
router.get('/premium/orders/:orderId', authenticate, validateParams(orderId), run(req => service.getOrder(req.user.id, req.params.orderId)));
router.post('/premium/orders/:orderId/verify', authenticate, requireTrustedOrigin, authRateLimiter, validateParams(orderId), validateBody(z.object({
  paymentId: z.string().regex(/^pay_[A-Za-z0-9]+$/), signature: z.string().regex(/^[a-f0-9]{64}$/),
}).strict()), run(req => service.verify(req.user.id, req.params.orderId, req.body)));
router.post('/premium/orders/:orderId/recover', authenticate, requireTrustedOrigin, authRateLimiter, validateParams(orderId), run(req => service.recover(req.user.id, req.params.orderId)));
router.post('/premium/orders/:orderId/cancel', authenticate, requireTrustedOrigin, validateParams(orderId), run(req => service.cancel(req.user.id, req.params.orderId)));
export default router;
