export interface CapturedPaymentInput {
  orderId: string;
  paymentId: string;
}

export interface ProcessedRefundInput {
  id: string;
  paymentId: string;
  amountMinor: number;
  currency?: string;
}

export interface PaymentWebhookHandler {
  reconcileFailedPayment?(input: CapturedPaymentInput): Promise<void>;
  recoverProviderOrder?(order: { id: string; amount: number; currency: string; receipt?: string; notes?: Record<string, string> }): Promise<boolean>;
  hasProviderOrder(orderId: string): Promise<boolean>;
  hasProviderPayment(paymentId: string): Promise<boolean>;
  reconcileCapturedPayment(input: CapturedPaymentInput): Promise<unknown>;
  reconcileRefund(input: ProcessedRefundInput): Promise<boolean>;
}
