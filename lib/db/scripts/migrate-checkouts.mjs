export async function migrateCheckouts(client) {
  await client.query(`CREATE TABLE IF NOT EXISTS checkout_intents (
    id uuid PRIMARY KEY, product text NOT NULL CHECK(product IN ('tip','membership','marketplace')),
    owner_id uuid REFERENCES users(id) ON DELETE SET NULL, idempotency_key uuid NOT NULL,
    input_hash text NOT NULL, receipt text UNIQUE, provider_order_id text UNIQUE,
    amount_minor integer NOT NULL CHECK(amount_minor>=100), currency text NOT NULL CHECK(currency='INR'),
    legacy boolean NOT NULL DEFAULT false, status text NOT NULL DEFAULT 'provider_pending',
    refund_cursor integer NOT NULL DEFAULT 0, last_payment_status text,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(product,owner_id,idempotency_key)
  )`);
  await client.query('CREATE INDEX IF NOT EXISTS checkout_intent_owner_idx ON checkout_intents(owner_id,created_at)');
  await client.query('ALTER TABLE premium_orders ADD COLUMN IF NOT EXISTS refund_cursor integer NOT NULL DEFAULT 0');
  await client.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false`);
  for (const [product, table, owner] of [['tip','payment_orders','payer_id'], ['membership','subscription_orders','subscriber_id'], ['marketplace','marketplace_orders','buyer_id']]) {
    // Existing provider IDs remain authoritative. Unknown legacy receipts are
    // retrieved read-only; legacy pending placeholders require provider notes.
    await client.query(`INSERT INTO checkout_intents(id,product,owner_id,idempotency_key,input_hash,provider_order_id,amount_minor,currency,legacy,status,created_at)
      SELECT id,$1,${owner},id,'legacy',CASE WHEN provider_order_id LIKE 'pending\\_%' ESCAPE '\\' THEN NULL ELSE provider_order_id END,
        amount_minor,currency,true,status,created_at AT TIME ZONE 'UTC' FROM ${table} WHERE amount_minor>=100 AND currency='INR'
      ON CONFLICT(id) DO NOTHING`, [product]);
  }
  await client.query(`INSERT INTO background_jobs(id,kind,dedup_key,payload)
    SELECT id,'checkout_reconcile','checkout:'||id,jsonb_build_object('checkoutId',id) FROM checkout_intents
    ON CONFLICT(dedup_key) DO NOTHING`);
}
