export async function migratePremium(client) {
  await client.query(`CREATE TABLE IF NOT EXISTS premium_plans (
    key text PRIMARY KEY, name text NOT NULL, price_minor integer NOT NULL CHECK(price_minor>=100),
    currency text NOT NULL CHECK(currency='INR'), duration_days integer NOT NULL CHECK(duration_days BETWEEN 1 AND 366),
    features jsonb NOT NULL, terms_version text NOT NULL, refund_policy text NOT NULL,
    enabled boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await client.query(`CREATE TABLE IF NOT EXISTS premium_orders (
    id uuid PRIMARY KEY, user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    plan_key text NOT NULL REFERENCES premium_plans(key), plan_snapshot jsonb NOT NULL,
    idempotency_key uuid NOT NULL, receipt text NOT NULL UNIQUE, provider_order_id text UNIQUE, provider_payment_id text UNIQUE,
    amount_minor integer NOT NULL CHECK(amount_minor>=100), currency text NOT NULL CHECK(currency='INR'),
    status text NOT NULL DEFAULT 'provider_pending', created_at timestamptz NOT NULL DEFAULT now(), paid_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,idempotency_key)
  )`);
  await client.query(`CREATE INDEX IF NOT EXISTS premium_order_user_idx ON premium_orders(user_id,created_at)`);
  await client.query(`ALTER TABLE premium_orders ADD COLUMN IF NOT EXISTS last_payment_status text`);
  await client.query(`CREATE TABLE IF NOT EXISTS premium_access (
    order_id uuid PRIMARY KEY REFERENCES premium_orders(id), user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, status text NOT NULL DEFAULT 'active',
    cancel_at_period_end boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_at>starts_at)
  )`);
  await client.query(`CREATE INDEX IF NOT EXISTS premium_access_user_idx ON premium_access(user_id,status,ends_at)`);
  await client.query(`CREATE TABLE IF NOT EXISTS payment_events (
    event_id text PRIMARY KEY, payload_hash text NOT NULL, encrypted_payload text NOT NULL, event_type text NOT NULL,
    provider_account_id text NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz,
    status text NOT NULL DEFAULT 'accepted', last_error text
  )`);
  await client.query(`CREATE TABLE IF NOT EXISTS payment_disputes (
    id text PRIMARY KEY, payment_id text NOT NULL, status text NOT NULL, amount_minor integer NOT NULL,
    currency text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
  )`);
}
