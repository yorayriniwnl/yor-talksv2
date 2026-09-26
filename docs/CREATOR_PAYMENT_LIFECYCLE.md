# Creator payment lifecycle

Creator tips, creator memberships and marketplace purchases use a common durable
checkout intent. They remain separate from platform Yor Premium. Existing creator
tier amounts are retained; membership copy describes creator support and billing
status only. Previously advertised exclusive posts, chats and creator sessions had
no implementation and are no longer promised. Commercial approval remains a gate.

Every HTTP creation request supplies a UUID `idempotencyKey`. Repeating the same
key and request returns the original checkout. Reusing a key for different input
fails. The owner and counterparty are locked in a stable order before creation.
Memberships permit one active term and reuse one pending term for a creator;
marketplace listings permit one reservation. Local order, intent and reconciliation
job commit before a single provider POST. Provider timeout leaves a recoverable
uncertain state. Workers and customers recover by receipt and validated provider
notes; they never automatically repeat the create-order POST.

`/billing` provides the latest 50 owned checkouts, failed-attempt state, recovery,
resuming an existing provider order and cancellation. All four creator checkout
screens use the bounded SDK loader and link to this history. Cancelled unpaid
orders cannot gain access or creator earnings from a late capture; the payment is
recorded and marked `refund_required`. This does not issue a real refund. Staff
must review and perform an authorized provider refund. A paid membership cancelled
by its subscriber remains valid through its original expiry; no automatic renewal
is offered. Any processed membership refund revokes that term without extending
it on later event replay. Marketplace expiry/cancellation releases only the current
reservation, and a late old payment cannot release a newer buyer's reservation.

Capture and refund transactions use immutable provider references. Historical tip
ledger references using local IDs remain recognized. Refund prefix matching is
literal (provider IDs contain underscores), duplicate refund IDs must agree on
amount, and total refunds cannot exceed the payment. Refund debits use the original
capture's credited party, so a cancelled order never debits an uncredited creator.
Deleting either account preserves the other party and provider reconciliation.

Reconciliation checks provider capture and paginated refunds, including paid
orders, independently of the browser or webhook. At most 100 refunds are processed
per page; a compare-and-set cursor prevents concurrent recovery from skipping
pages. Paid/old orders repeat daily; pending orders repeat every five minutes,
with failed jobs retained for retry or operator attention. Refunds missed by a
webhook are repaired by these reads. Dispute processing and operator controls are
documented in `PAYMENT_DISPUTES.md`, with separate provider acceptance gates.

Migration: run the production migration runner; `20260926-checkouts-4` follows the
Premium migration. It adds checkout intents, refund cursors and paid-through
cancellation. It backfills existing orders without replacing provider IDs or
financial references. Unassociated legacy pending orders require provider review;
only a legacy marketplace order with matching known provider notes can be recovered
automatically. Repeating the migration preserves rows and queued work. Never use
schema synchronization on an existing database. Keep the additive schema on
application rollback; do not deploy code that recreates provider orders after an
uncertain result or ignores cancelled/expired settlement states.

Tests use isolated PostgreSQL 16 and Redis 7 with a simulated Razorpay adapter.
Provider test-merchant webhook/reconciliation and actual refund/dispute delivery
must still be verified before any paid launch. No real charge or refund is part
of this verification.
