# Payment and Wallet Settlement Hardening

## Goal

Close the confirmed payment-flow defects while keeping payment-provider and production data untouched during development.

## Design

- Keep checkout amounts server-authoritative: tips use validated integer minor units, memberships use server tier prices, and marketplace orders use the stored product price. Reject marketplace prices that exceed the PostgreSQL integer ledger/order ceiling.
- Validate Razorpay create-order responses against the requested amount and INR currency before returning an order to a client or linking it to a local order.
- Check the marketplace payment feature gate before reservation cleanup or any database work.
- Preserve raw-body webhook HMAC verification. Dispatch captured payments to the matching tip, membership, or marketplace order handler; each handler fetches the provider payment, checks order, amount, currency, and captured/refunded state, then settles in a transaction with a compare-and-set order transition and a unique ledger reference.
- Process only `refund.processed` notifications. Resolve the refund by its recorded payment id, lock the matching order, enforce cumulative refunds do not exceed the original amount, and insert a unique reversing ledger transaction. A full refund revokes a membership entitlement or marks a marketplace order refunded; a partial refund reverses only the amount. Refund ledger entries use a null external counterparty so direct card/UPI payments do not appear as negative customer wallet balances.
- If a marketplace payment arrives after its order was cancelled or its inventory reservation expired, record it as `refund_required` without crediting the seller. A later processed refund records the external reversal and moves the order to `refunded`; this preserves the existing case-by-case refund policy without creating an automatic provider refund.
- Derive creator wallet and daily earnings from completed INR settlements net of refund reversals. Keep marketplace fulfillment and product availability unchanged on refunds because return/relisting policy is not defined in the current policy.
- Use deterministic unit tests with mocked `fetch` and mocked service/database boundaries. No credentials, live provider requests, database writes, or migrations are part of the test run.

## Implementation steps

1. Add failing tests for marketplace preflight gating, the amount ceiling, Razorpay order-response validation, webhook event routing, and refund bounds/replay handling.
2. Add the provider response guards and move the marketplace config assertion to the start of order creation.
3. Add capture/refund webhook dispatch and domain reconciliation for tips, memberships, and marketplace purchases.
4. Make refunds transactional and idempotent, and calculate creator balances/analytics net of reversals.
5. Run the focused API tests and API server typecheck; inspect the final diff and repository status.

## Acceptance checks

- Every event handler relies on a verified raw-body webhook signature; browser verification continues to require the Razorpay checkout signature and authenticated owner.
- A duplicate capture or refund cannot create a second ledger entry; an out-of-order refund resolves and reconciles its capture before its ledger reversal.
- No client-supplied product or membership amount is trusted, and out-of-range marketplace prices fail validation before persistence.
- All test provider fetches are mocked; no test command applies a migration or writes to a database.
- Existing unrelated working-tree changes are excluded from this work's commit.
