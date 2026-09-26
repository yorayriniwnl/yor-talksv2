export async function migrateDisputes(client) {
  await client.query(`ALTER TABLE payment_disputes ADD COLUMN IF NOT EXISTS amount_deducted integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS product text, ADD COLUMN IF NOT EXISTS order_id uuid,
    ADD COLUMN IF NOT EXISTS respond_by timestamptz, ADD COLUMN IF NOT EXISTS checked_at timestamptz`);
  await client.query('CREATE INDEX IF NOT EXISTS payment_dispute_payment_idx ON payment_disputes(payment_id)');
  await client.query(`CREATE TABLE IF NOT EXISTS payment_dispute_reserves (
    product text NOT NULL, order_id uuid NOT NULL, amount_minor integer NOT NULL DEFAULT 0,
    revision integer NOT NULL DEFAULT 0, prior_order_status text NOT NULL, excess_minor bigint NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(product,order_id)
  )`);
  await client.query(`CREATE TABLE IF NOT EXISTS payment_dispute_history (
    id bigserial PRIMARY KEY, dispute_id text NOT NULL REFERENCES payment_disputes(id), snapshot_hash text NOT NULL,
    status text NOT NULL, amount_deducted integer NOT NULL, observed_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(dispute_id,snapshot_hash)
  )`);
  await client.query(`CREATE TABLE IF NOT EXISTS payment_operation_audit (
    id uuid PRIMARY KEY, actor_id uuid REFERENCES users(id) ON DELETE SET NULL, action text NOT NULL,
    target_id text NOT NULL, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await client.query(`CREATE TABLE IF NOT EXISTS provider_reconciliation_cursors (
    name text PRIMARY KEY, cursor integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await client.query(`INSERT INTO provider_reconciliation_cursors(name) VALUES('razorpay_disputes') ON CONFLICT DO NOTHING`);
  await client.query(`INSERT INTO background_jobs(id,kind,dedup_key,payload)
    VALUES('a5d26379-c92f-444e-983b-a6bd963848f1','dispute_scan','razorpay:dispute_scan','{}') ON CONFLICT(dedup_key) DO NOTHING`);

  // All callers already hold the product order lock. Keeping this calculation in
  // SQL lets both Drizzle refund transactions and pg dispute transactions apply
  // cash reversals and reserve changes in the same commit.
  await client.query(`CREATE OR REPLACE FUNCTION yor_sync_dispute_reserve(p_product text, p_order_id uuid) RETURNS void LANGUAGE plpgsql AS $$
  DECLARE
    v_table text; v_prefix text; v_order jsonb; v_payment text; v_credit uuid;
    v_amount bigint; v_refunds bigint; v_reserved bigint; v_desired bigint; v_delta bigint;
    v_deducted bigint; v_open boolean; v_loss boolean; v_count bigint; v_revision integer; v_prior text;
  BEGIN
    v_table := CASE p_product WHEN 'tip' THEN 'payment_orders' WHEN 'membership' THEN 'subscription_orders'
      WHEN 'marketplace' THEN 'marketplace_orders' WHEN 'premium' THEN 'premium_orders' ELSE NULL END;
    v_prefix := CASE p_product WHEN 'tip' THEN 'razorpay' WHEN 'membership' THEN 'subscription' ELSE p_product END;
    IF v_table IS NULL THEN RAISE EXCEPTION 'invalid payment product'; END IF;
    EXECUTE format('SELECT to_jsonb(o) FROM %I o WHERE id=$1 FOR UPDATE',v_table) INTO v_order USING p_order_id;
    IF v_order IS NULL THEN RAISE EXCEPTION 'payment order missing'; END IF;
    v_payment := v_order->>'provider_payment_id'; v_amount := (v_order->>'amount_minor')::bigint;
    SELECT count(*),coalesce(bool_or(status IN ('open','under_review')),false),
      coalesce(bool_or(status='lost' OR amount_deducted>0),false),
      coalesce(sum(CASE WHEN status IN ('open','under_review') OR (status='lost' AND amount_deducted=0)
        THEN amount_minor ELSE amount_deducted END),0),coalesce(sum(amount_deducted),0)
      INTO v_count,v_open,v_loss,v_desired,v_deducted FROM payment_disputes WHERE payment_id=v_payment;
    IF v_count=0 THEN RETURN; END IF;
    INSERT INTO payment_dispute_reserves(product,order_id,prior_order_status) VALUES(p_product,p_order_id,v_order->>'status') ON CONFLICT DO NOTHING;
    SELECT amount_minor,revision,prior_order_status INTO v_reserved,v_revision,v_prior
      FROM payment_dispute_reserves WHERE product=p_product AND order_id=p_order_id FOR UPDATE;
    SELECT coalesce(sum(amount_minor),0) INTO v_refunds FROM ledger_transactions
      WHERE status='completed' AND starts_with(reference_id,v_prefix||':refund:'||v_payment||':');
    SELECT credit_account_id INTO v_credit FROM ledger_transactions WHERE status='completed' AND
      (reference_id=v_prefix||':'||(CASE WHEN p_product='premium' THEN p_order_id::text ELSE v_order->>'provider_order_id' END)
        OR (p_product='tip' AND reference_id='razorpay:'||p_order_id::text)) LIMIT 1;
    v_desired := least(greatest(0,v_amount-v_refunds),v_desired); v_delta := v_desired-v_reserved;
    IF v_delta<>0 THEN
      v_revision := v_revision+1;
      INSERT INTO ledger_transactions(id,credit_account_id,debit_account_id,amount_minor,currency,reference_id,status)
        VALUES(gen_random_uuid(),CASE WHEN v_delta<0 THEN v_credit ELSE NULL END,
          CASE WHEN v_delta>0 THEN v_credit ELSE NULL END,abs(v_delta),'INR',
          'dispute:reserve:'||p_product||':'||p_order_id::text||':'||v_revision::text,'completed');
    END IF;
    UPDATE payment_dispute_reserves SET amount_minor=v_desired,revision=v_revision,
      excess_minor=greatest(0,v_refunds+v_deducted-v_amount),updated_at=now() WHERE product=p_product AND order_id=p_order_id;

    IF v_open OR v_loss THEN
      EXECUTE format('UPDATE %I SET status=$2 WHERE id=$1 AND status IN (''paid'',''fulfilled'',''disputed'',''chargeback'')',v_table)
        USING p_order_id,CASE WHEN v_open THEN 'disputed' ELSE 'chargeback' END;
      IF p_product='premium' THEN
        UPDATE premium_access SET status=CASE WHEN v_open THEN 'disputed' ELSE 'chargeback' END,updated_at=now()
          WHERE order_id=p_order_id AND status IN ('active','cancelled','disputed','chargeback');
      ELSIF p_product='membership' THEN
        UPDATE subscriptions SET status=CASE WHEN v_open THEN 'disputed' ELSE 'chargeback' END
          WHERE id=(v_order->>'subscription_id')::uuid AND status IN ('active','disputed','chargeback');
        UPDATE entitlements SET status='disputed' WHERE entity_type='subscription'
          AND entity_id=(v_order->>'subscription_id') AND status='active';
      END IF;
    ELSE
      -- Only restore an originally paid order. Refund/deletion/expiry state wins.
      IF v_prior IN ('paid','fulfilled') THEN
        EXECUTE format('UPDATE %I SET status=$2 WHERE id=$1 AND status IN (''disputed'',''chargeback'')',v_table) USING p_order_id,v_prior;
      END IF;
      IF p_product='premium' AND v_refunds=0 THEN
        UPDATE premium_access SET status=CASE WHEN ends_at<=now() THEN 'expired'
          WHEN cancel_at_period_end THEN 'cancelled' ELSE 'active' END,updated_at=now()
          WHERE order_id=p_order_id AND user_id IS NOT NULL AND status IN ('disputed','chargeback')
          AND EXISTS(SELECT 1 FROM premium_orders WHERE id=p_order_id AND status='paid');
      ELSIF p_product='membership' AND v_refunds=0 THEN
        UPDATE subscriptions SET status=CASE WHEN expires_at<=timezone('UTC',now()) THEN 'expired' ELSE 'active' END
          WHERE id=(v_order->>'subscription_id')::uuid AND subscriber_id IS NOT NULL AND creator_id IS NOT NULL
          AND status IN ('disputed','chargeback');
        UPDATE entitlements SET status=CASE WHEN expires_at<=timezone('UTC',now()) THEN 'expired' ELSE 'active' END
          WHERE entity_type='subscription' AND entity_id=(v_order->>'subscription_id') AND status='disputed'
          AND EXISTS(SELECT 1 FROM subscriptions WHERE id=(v_order->>'subscription_id')::uuid AND status='active');
      END IF;
    END IF;
  END $$`);
}
