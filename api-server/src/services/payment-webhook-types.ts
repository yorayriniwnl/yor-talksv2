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
  hasProviderOrder(orderId: string): Promise<boolean>;
  hasProviderPayment(paymentId: string): Promise<boolean>;
  reconcileCapturedPayment(input: CapturedPaymentInput): Promise<unknown>;
  reconcileRefund(input: ProcessedRefundInput): Promise<boolean>;
}
