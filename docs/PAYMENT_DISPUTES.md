# Disputes, chargebacks and payment operations

Razorpay dispute events are accepted through the existing raw-body, signature and
merchant-account checked encrypted inbox. Events are signals to fetch the current
provider dispute, not commands to apply their potentially old status. The provider
read is repeated under the relevant local order lock. Provider payment, order,
currency and amount association must agree before any change commits. A scheduled
paginated scan discovers missed disputes; each known dispute also has an hourly
durable reconciliation job. Queued work is bounded, leased, retried and retained
for operator review on exhaustion. The merchant account should be dedicated to
Yor Talks; unknown payments are retained as unassociated failures for review.

Open disputes pause access to the affected paid term and prevent marketplace
fulfilment. Creator balances reserve disputed earnings. Resolution releases a
reserve only to the original surviving credited account. The original expiry,
paid-through cancellation and refund/deletion state are preserved; a won dispute
cannot extend a term or restore refunded access. A lost dispute or nonzero provider
deduction keeps that term revoked. New purchases cannot overlap a still-current
disputed membership/Premium term. Core free functionality stays available.

The immutable reserve ledger uses a per-order revision. Multiple disputes share
one bounded reserve, so resolving one cannot clear another open case. Refunds and
reserve adjustments happen in the same transaction: total creator clawback cannot
exceed the original credit. A provider deduction that overlaps a full refund is
recorded separately as platform exposure requiring provider-balance review. This
does not pretend that the provider returned the extra money. Paid-through
cancellation does not itself initiate a refund. This release has no automatic
refund, dispute acceptance/contest or payout operation.

The implementation uses Razorpay's current `amount_deducted` field, including a
nonzero deduction on a partially won case. Its documentation includes that example
despite a narrower prose description, so assuming every won case has zero deduction
would incorrectly restore earnings. References: [fetch a dispute](https://razorpay.com/docs/api/disputes/fetch/?preferred-country=IN),
[dispute events](https://razorpay.com/docs/webhooks/disputes/?preferred-country=IN),
and the provider's [paginated dispute SDK](https://github.com/razorpay/razorpay-node/blob/master/lib/resources/disputes.js).

## Operator procedure

An administrator opens `/payment-operations` (linked from Moderation). The server
denies ordinary accounts and moderators. The page shows up to 100 recent disputes,
unprocessed events, failed/retrying jobs, uncertain/refund-required checkouts and
overlapping deductions. It never exposes encrypted webhook bodies, payment
signatures or customer shipping details. Every manual job retry and requested
dispute reconciliation records the administrator, target, reason and timestamp.
No public settings payload grants administrator access.

1. Resolve the provider/dependency failure before retrying an exhausted job.
2. Inspect the provider dashboard for the same order/payment/dispute reference,
   merchant account, amount and currency. Supply evidence/respond before the
   displayed provider deadline through that dashboard under owner authorization.
3. For `refund_required`, verify the unfulfilled payment and obtain the required
   authorization before issuing a provider refund. Do not retry order creation.
4. Enter a meaningful reason to request reconciliation or retry the read-only,
   idempotent settlement job. Confirm the queue clears, financial references are
   unchanged and access agrees with the provider state.
5. Escalate unassociated payments, inconsistent provider fields, missed deadlines
   and overlapping deductions. A UI success is not proof of provider settlement.

## Migration and rollback

Run the additive production migration runner through `20260926-disputes-5` before
deploying this code. It adds dispute snapshots/history, reserve revisions, operator
audit, a scan cursor and `yor_sync_dispute_reserve`. The function is invoked with
the same transaction/order lock as refunds and dispute state changes. Existing
captures and refunds are neither renumbered nor rewritten. Migration is restartable.
Keep these records and the function on rollback. Disable new paid checkouts and
drain compatible reconciliation workers before any application rollback; an older
build without dispute handling must not resume financial writes. Never remove
financial history to make a rollback pass.

Local evidence: 13 new real PostgreSQL/Redis dispute tests plus the 24 creator and
Premium tests pass (37/37); four new Chromium cases pass, including mobile/admin
failure/retry and accessibility. Provider replies are simulated.
The full API checkpoint passes 164/164 (152.3 seconds); API/frontend TypeScript,
225-operation contract regeneration and repeat migration also pass. Actual Razorpay
test-merchant delivery, reconciliation, partial-refund/dispute capability and
operator dashboard access remain external acceptance gates. No real charges,
refunds or account configuration changes were performed.
