import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { requireTrustedOrigin } from '../middlewares/trusted-origin.js';
import { authRateLimiter } from '../middlewares/rate-limit.js';
import { validateBody, validateParams } from '../middlewares/validation.js';
import { createResponse } from '../utils/response.js';
import { createPaymentRuntime } from '../services/payment-runtime.js';
import { PaymentOperationsService } from '../services/payment-operations-service.js';
import { CheckoutRequestError } from '../services/checkout-intent-service.js';

const router=Router(), operations=new PaymentOperationsService(), runtime=createPaymentRuntime();
const reason=z.object({reason:z.string().trim().min(10).max(500)}).strict();
const run=(fn:(req:any)=>Promise<unknown>):RequestHandler=>async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store');
  try{res.json(createResponse('Payment operations loaded',await fn(req)));}
  catch(error){res.status(error instanceof CheckoutRequestError?409:503).json(createResponse(error instanceof CheckoutRequestError?error.message:'Payment operations are temporarily unavailable',null));}
};
router.get('/operations/payments',authenticate,requireRole('admin'),run(()=>operations.snapshot()));
router.post('/operations/payments/jobs/:id/retry',authenticate,requireRole('admin'),requireTrustedOrigin,authRateLimiter,
  validateParams(z.object({id:z.string().uuid()})),validateBody(reason),run(async req=>{await operations.retry(req.user.id,req.params.id,req.body.reason);return operations.snapshot();}));
router.post('/operations/payments/disputes/:id/reconcile',authenticate,requireRole('admin'),requireTrustedOrigin,authRateLimiter,
  validateParams(z.object({id:z.string().regex(/^disp_[A-Za-z0-9]+$/)})),validateBody(reason),run(async req=>{
    await operations.recordReconcile(req.user.id,req.params.id,req.body.reason);
    await runtime.disputes.reconcile(req.params.id);return operations.snapshot();
  }));
export default router;
