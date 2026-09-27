import { createHash, randomUUID } from 'node:crypto';
import { pool } from '@workspace/db';
import { env } from '../config/env.js';
import { decryptSecret, encryptSecret } from '../lib/secret-box.js';
import { RazorpayService, PaymentsNotConfiguredError } from './razorpay-service.js';
import { PaymentWebhookRequestError, PaymentWebhookService, PaymentWebhookSignatureError } from './payment-webhook-service.js';

export class PaymentInboxService {
  constructor(private readonly provider: RazorpayService, private readonly processor: PaymentWebhookService) {}

  async accept(rawBody: Buffer, signature: string, eventId: string): Promise<void> {
    if (!rawBody.length || rawBody.length > 1024 * 1024 || !this.provider.verifyWebhookSignature(rawBody, signature)) throw new PaymentWebhookSignatureError('Invalid webhook signature');
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(eventId)) throw new PaymentWebhookRequestError('Missing or invalid event identifier');
    if (!env.RAZORPAY_ACCOUNT_ID || env.PAYMENT_EVENT_ENCRYPTION_KEY.length < 32) throw new PaymentsNotConfiguredError();
    let event: Record<string, unknown>;
    try { event = JSON.parse(rawBody.toString('utf8')); }
    catch { throw new PaymentWebhookRequestError('Invalid webhook JSON'); }
    if (!event || typeof event.event !== 'string' || event.event.length > 100 || event.account_id !== env.RAZORPAY_ACCOUNT_ID) throw new PaymentWebhookRequestError('Invalid event or account association');
    const hash = createHash('sha256').update(rawBody).digest('hex');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`INSERT INTO payment_events(event_id,payload_hash,encrypted_payload,event_type,provider_account_id)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_id) DO NOTHING`,
      [eventId, hash, encryptSecret(rawBody.toString('utf8'), env.PAYMENT_EVENT_ENCRYPTION_KEY), event.event, env.RAZORPAY_ACCOUNT_ID]);
      const existing = (await client.query('SELECT payload_hash FROM payment_events WHERE event_id=$1 FOR UPDATE', [eventId])).rows[0];
      if (existing?.payload_hash !== hash) throw new PaymentWebhookRequestError('Event identifier reused with different content');
      await client.query(`INSERT INTO background_jobs(id,kind,dedup_key,payload) VALUES($1,'payment_event',$2,$3)
        ON CONFLICT(dedup_key) DO NOTHING`, [randomUUID(), `payment:event:${eventId}`, { eventId }]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async process(eventId: string): Promise<void> {
    const event = (await pool.query('SELECT * FROM payment_events WHERE event_id=$1', [eventId])).rows[0];
    if (!event) throw new PaymentWebhookRequestError('Payment event missing');
    if (event.status === 'processed' || event.status === 'ignored') return;
    if (!event.encrypted_payload.startsWith('v1:')) throw new PaymentWebhookRequestError('Invalid encrypted payment event');
    try {
      const raw = decryptSecret(event.encrypted_payload, env.PAYMENT_EVENT_ENCRYPTION_KEY).secret;
      if (createHash('sha256').update(raw).digest('hex') !== event.payload_hash) throw new PaymentWebhookRequestError('Payment event integrity failure');
      const status = await this.processor.process(JSON.parse(raw));
      await pool.query('UPDATE payment_events SET status=$2,processed_at=now(),last_error=NULL WHERE event_id=$1', [eventId, status]);
    } catch {
      await pool.query(`UPDATE payment_events SET last_error='processing_failed' WHERE event_id=$1`, [eventId]);
      throw new Error('PaymentEventProcessingFailed');
    }
  }
}
