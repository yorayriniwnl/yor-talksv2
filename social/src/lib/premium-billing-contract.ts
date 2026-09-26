import { z } from 'zod';
import type { PremiumBillingState, PremiumOrder } from './api-client';

const plan = z.object({
  key: z.string(), name: z.string(), priceMinor: z.number().int().min(100).max(2147483647), currency: z.literal('INR'),
  durationDays: z.number().int().min(1).max(366), features: z.array(z.string()).max(64), termsVersion: z.string(), refundPolicy: z.string(),
});
export const premiumOrderSchema = z.object({
  id: z.string().uuid(), providerOrderId: z.string().nullable(), amountMinor: z.number().int().min(100), currency: z.literal('INR'),
  status: z.enum(['provider_pending','creation_unknown','created','paid','failed','cancelled','expired','refunded','disputed','refund_required']),
  lastPaymentStatus: z.string().nullable(), createdAt: z.string().datetime({ offset: true }), paidAt: z.string().datetime({ offset: true }).nullable(),
  plan, keyId: z.string(),
});
export const premiumBillingSchema = z.object({
  catalog: z.object({ available: z.boolean(), plan: plan.nullable(), operationalFeatures: z.record(z.boolean()),
    automaticRenewal: z.literal(false), billingModel: z.literal('prepaid_fixed_term'), testMode: z.boolean(), supportEmail: z.union([z.literal(''), z.string().email()]) }),
  subscription: z.object({ order_id: z.string().uuid(), starts_at: z.string().datetime({ offset: true }), ends_at: z.string().datetime({ offset: true }),
    cancel_at_period_end: z.boolean(), status: z.enum(['active','cancelled','expired','refunded','disputed','revoked']) }).nullable(),
  orders: z.array(premiumOrderSchema).max(50), enabledFeatures: z.record(z.boolean()),
});
export function parsePremiumBilling(value: unknown): PremiumBillingState {
  const result = premiumBillingSchema.safeParse(value);
  if (!result.success) throw new Error('Billing details could not be verified. Please retry. Your free account remains available.');
  // This frontend currently has strictNullChecks disabled, so Zod's inferred
  // object keys appear optional to TypeScript despite the required runtime schema.
  return result.data as PremiumBillingState;
}
export function parsePremiumOrder(value: unknown): PremiumOrder { return premiumOrderSchema.parse(value) as PremiumOrder; }
