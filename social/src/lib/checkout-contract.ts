import { z } from 'zod';
import type { CheckoutState } from './api-client';

const checkout = z.object({
  checkoutId: z.string().uuid(), product: z.enum(['tip','membership','marketplace']),
  providerOrderId: z.string().regex(/^order_[A-Za-z0-9]+$/).nullable(),
  status: z.string().min(1).max(40), providerState: z.string().min(1).max(40),
  lastPaymentStatus: z.string().nullable(), amountMinor: z.number().int().min(100), currency: z.literal('INR'),
  createdAt: z.string().datetime(), subscriptionId: z.string().uuid().nullable().optional(), keyId: z.string(),
});
export function parseCheckoutHistory(value: unknown): CheckoutState[] {
  return z.array(checkout).max(50).parse(value) as CheckoutState[];
}
