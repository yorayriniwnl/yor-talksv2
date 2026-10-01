import { RazorpayService } from './razorpay-service.js';
import { PaymentService } from './payment-service.js';
import { SubscriptionService } from './subscription-service.js';
import { MarketplaceService } from './marketplace-service.js';
import { PlatformPremiumService } from './platform-premium-service.js';
import { PaymentWebhookService } from './payment-webhook-service.js';
import { PaymentInboxService } from './payment-inbox-service.js';
import type { LifecycleHandler } from '../workers/lifecycle-worker.js';
import { CheckoutIntentService } from './checkout-intent-service.js';
import { pool } from '@workspace/db';
import { PaymentDisputeService } from './payment-dispute-service.js';

export function createPaymentRuntime() {
  const provider = new RazorpayService();
  const premium = new PlatformPremiumService(provider);
  const products = { tip: new PaymentService(provider), membership: new SubscriptionService(provider), marketplace: new MarketplaceService(provider) };
  const intents = new CheckoutIntentService(provider);
  const disputes = new PaymentDisputeService(provider, paymentId=>processor.ensureCaptureByPayment(paymentId));
  const processor: PaymentWebhookService = new PaymentWebhookService(provider, [...Object.values(products), premium], id=>disputes.reconcile(id));
  const inbox = new PaymentInboxService(provider, processor);
  const handlers: Record<string, LifecycleHandler> = {
    payment_event: async job => {
      if (typeof job.payload.eventId !== 'string') throw new Error('invalid_payment_job');
      await inbox.process(job.payload.eventId);
    },
    premium_reconcile: async job => {
      if (typeof job.payload.orderId !== 'string') throw new Error('invalid_premium_job');
      return { retryAfterSeconds: await premium.reconcileOrder(job.payload.orderId) };
    },
    checkout_reconcile: async job => {
      if (typeof job.payload.checkoutId !== 'string') throw new Error('invalid_checkout_job');
      const intent = await intents.get(job.payload.checkoutId);
      return { retryAfterSeconds: await intents.reconcile(intent.id, products[intent.product]) };
    },
    dispute_scan: async () => ({ retryAfterSeconds: await disputes.scan() }),
    dispute_reconcile: async job => {
      if (typeof job.payload.disputeId!=='string') throw new Error('invalid_dispute_job');
      return {retryAfterSeconds:await disputes.reconcile(job.payload.disputeId)};
    },
  };
  const recover = async (userId: string, id: string) => {
    const intent = await intents.owned(userId, id);
    await intents.reconcile(id, products[intent.product]);
    return intents.list(userId);
  };
  const cancel = async (userId: string, id: string) => {
    const intent = await intents.owned(userId, id);
    if (intent.product === 'marketplace') await products.marketplace.cancelOrder(id, userId);
    else if (intent.product === 'membership') {
      const order = (await pool.query('SELECT subscription_id FROM subscription_orders WHERE id=$1', [id])).rows[0];
      await products.membership.cancel(order.subscription_id, userId);
    } else await pool.query(`UPDATE payment_orders SET status='cancelled' WHERE id=$1 AND payer_id=$2 AND status IN ('created','provider_pending')`, [id,userId]);
    return intents.list(userId);
  };
  return { inbox, premium, handlers, intents, recover, cancel, disputes };
}
