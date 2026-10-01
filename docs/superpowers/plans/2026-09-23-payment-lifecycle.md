# Payment Lifecycle and Subscription Idempotency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make captured payments settle exactly once across tips, marketplace orders, and memberships, and prevent cancellation or concurrent checkouts from losing or duplicating money.

**Architecture:** Keep Razorpay signature and captured-payment verification at the provider boundary. Route captured events to the local order type, then perform each order's database transition and related product, entitlement, and ledger changes transactionally. Keep the existing refresh-cookie logout fix unchanged.

**Tech Stack:** TypeScript, Express 5, Drizzle ORM, PostgreSQL, Razorpay service, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-23-database-hardening-design.md` plus the payment-state design approved in this task.

## Global Constraints

- Do not contact live Razorpay or production databases during implementation or verification.
- Preserve payment and accounting history; use additive schema changes and preflight duplicate checks.
- Verify provider order, payment ID, captured state, amount, and currency before settlement.
- Order transitions and their inventory, entitlement, and ledger effects must be atomic and idempotent.
- Keep the existing `POST /auth/logout` refresh-cookie and trusted-origin behavior unchanged.

## Review Focus

- A captured marketplace payment arrives after the reservation expires.
- The browser callback and provider webhook settle the same order concurrently.
- A duplicate webhook arrives after a successful settlement.
- Two membership checkouts race for the same subscriber and creator.
- A product cancellation races with payment capture and inventory release.

---

### Task 1: Dispatch captured webhooks to the correct order service

**Files:**
- Modify: `api-server/src/routes/economy-routes.ts`
- Modify: `api-server/src/services/payment-service.ts`
- Modify: `api-server/src/services/marketplace-service.ts`
- Modify: `api-server/src/services/subscription-service.ts`
- Test: `api-server/src/__tests__/payment-webhook.test.ts`

**Interfaces:**
- Consume the existing verified webhook payload `{ orderId, paymentId }`.
- Add one reconciler per order family; each returns an idempotent settled result or a typed unknown-order/provider error.

- [ ] Add a failing webhook test proving that a marketplace captured event reaches marketplace settlement rather than the tip-only reconciler.
- [ ] Add a failing test proving a subscription captured event activates its membership and entitlement once.
- [ ] Run `pnpm --filter @workspace/api-server exec tsx --test src/__tests__/payment-webhook.test.ts` and confirm the new cases fail for the current tip-only lookup.
- [ ] Add order-family lookup and dispatch after webhook HMAC validation. Reuse the existing provider verification in each service and keep non-captured events acknowledged without mutation.
- [ ] Make repeated and concurrent webhook/browser settlement return the already-settled state without adding a second ledger entry or entitlement.
- [ ] Rerun the focused webhook test file and confirm both cases pass.

### Task 2: Protect marketplace settlement from cancellation and expiry races

**Files:**
- Modify: `api-server/src/services/marketplace-service.ts`
- Modify: `api-server/src/services/razorpay-service.ts` only if a typed provider-status/refund operation is needed
- Test: `api-server/src/__tests__/product-service.test.ts`
- Test: `api-server/src/__tests__/payment-webhook.test.ts`

**Interfaces:**
- Add a single idempotent captured-payment settlement operation shared by browser verification and webhooks.
- Cancellation and expiry may release a product only after the payment is known not to be captured; captured payments transition to paid or an explicit refund-pending state.

- [ ] Add failing tests for a captured payment received after expiry and for cancellation racing with capture. Assert product availability, order status, and ledger state together.
- [ ] Run `pnpm --filter @workspace/api-server exec tsx --test src/__tests__/product-service.test.ts src/__tests__/payment-webhook.test.ts` and confirm the race cases fail.
- [ ] Make expiry select bounded candidate rows and conditionally transition each row inside a transaction; do not release inventory when provider state is captured or unknown.
- [ ] Make cancellation use the same state transition and record an idempotent refund obligation for a captured payment when fulfillment cannot proceed.
- [ ] Keep product release, order status, and ledger/refund-obligation writes in one transaction, guarded by the prior order status.
- [ ] Rerun both focused test files and confirm duplicate capture cannot double-settle or relist a paid product.

### Task 3: Make membership checkout creation concurrency-safe

**Files:**
- Modify: `api-server/src/services/subscription-service.ts`
- Modify: `lib/db/src/schema/index.ts`
- Modify: `lib/db/scripts/migrate-beta.mjs`
- Modify: `lib/db/scripts/migrate-production.mjs`
- Test: `api-server/src/__tests__/subscription-service.test.ts`

**Interfaces:**
- Preserve the existing subscribe and verify response shapes.
- Enforce one open pending/active membership per subscriber/creator pair; expired/cancelled/failed rows remain historical records.

- [ ] Add a failing concurrency test that runs two `createOrder` calls for the same subscriber and creator and asserts one payable provider order.
- [ ] Run `pnpm --filter @workspace/api-server exec tsx --test src/__tests__/subscription-service.test.ts` and confirm the duplicate-order case fails.
- [ ] Serialize the subscriber/creator decision in PostgreSQL, recheck active/pending memberships while holding the serialization boundary, and reuse the current pending provider order when possible.
- [ ] Add an additive database constraint or lock-backed invariant. Before any uniqueness constraint, add a preflight query that reports duplicate open pairs and aborts without deleting records.
- [ ] Ensure payment settlement creates at most one active membership, entitlement, and ledger reference per provider order.
- [ ] Rerun the focused subscription test and run the API typecheck.

### Task 4: Check the complete payment change set

**Files:**
- Review: all files listed in Tasks 1–3

- [ ] Run focused payment, product, and subscription tests.
- [ ] Run `pnpm --filter @workspace/api-server typecheck` and `pnpm --filter @workspace/db build`.
- [ ] Inspect the migration scripts and confirm they do not silently merge or delete duplicate membership records.
- [ ] Confirm no live provider or production database was contacted.
