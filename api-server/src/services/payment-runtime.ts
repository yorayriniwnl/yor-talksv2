import { RazorpayService } from './razorpay-service.js';
import { PaymentService } from './payment-service.js';
import { SubscriptionService } from './subscription-service.js';
import { MarketplaceService } from './marketplace-service.js';
import { PlatformPremiumService } from './platform-premium-service.js';
import { PaymentWebhookService } from './payment-webhook-service.js';
import { PaymentInboxService } from './payment-inbox-service.js';
import type { LifecycleHandler } from '../workers/lifecycle-worker.js';

export function createPaymentRuntime() {
  const provider = new RazorpayService();
  const premium = new PlatformPremiumService(provider);
  const processor = new PaymentWebhookService(provider, [new PaymentService(provider), new SubscriptionService(provider), new MarketplaceService(provider), premium]);
  const inbox = new PaymentInboxService(provider, processor);
  const handlers: Record<string, LifecycleHandler> = {
    payment_event: async job => {
      if (typeof job.payload.eventId !== 'string') throw new Error('invalid_payment_job');
      await inbox.process(job.payload.eventId);
    },
    premium_reconcile: async job => {
      if (typeof job.payload.orderId !== 'string') throw new Error('invalid_premium_job');
      if (!await premium.reconcileOrder(job.payload.orderId)) return { retryAfterSeconds: 300 };
    },
  };
  return { inbox, premium, handlers };
}
