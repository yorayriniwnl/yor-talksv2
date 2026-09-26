# Yor Premium release contract

Yor Premium is a platform entitlement. Creator memberships, tips, marketplace
orders and payouts use separate records and do not grant platform perks.

No final commercial price is embedded. `YOR_PREMIUM_PRICE_MINOR=0` and
`YOR_PREMIUM_ENABLED=false` are the checked-in defaults. An owner must provide
the price, terms version, refund policy and support address, approve those terms,
and complete Razorpay test-mode acceptance before enabling purchases. Tests use
19900 INR minor units as a clearly synthetic fixture, not a published price.

## Free and paid behavior

| Capability | Free account | Active paid term or authorized temporary override |
| --- | --- | --- |
| Core posting, messages, standard Stories | Available | Available |
| Basic privacy, account visibility, blocks, reports, safety | Available | Available |
| Export and account deletion | Available | Available |
| Private Story viewing | Identified new views | Optional private views; aggregate views still counted |
| Story rewatch analytics / viewer timestamps | Standard analytics | Additional aggregate/identified-view detail |
| Story priority | Standard ranking | Capped boost within the eligible audience |
| Extended Story duration | 24 hours | Up to 72 hours |
| Custom Story audience | Standard public/follower/Close Friends audiences | Selected people and exclusions |
| Super Heart | Ordinary reactions | Super Heart reaction |
| Direct Highlight publication | Standard Story publication | Direct-to-Highlight publication |
| Unread message preview | Ordinary conversation access/read receipts | Preview without advancing read receipt |
| Message/Story typography | Standard style for new items | Curated style controls |
| Profile pins | Retain or remove existing pins | Add/reorder up to six pins |
| Profile-only posts | Standard distribution | New profile-only publication |
| Bio styles | Standard new selection | Curated new selection |
| App icons | Default | Yor web/PWA icon selection; native shell icon unchanged |

`YOR_ADVANCED_DEFAULT_ENABLED` and `YOR_FEATURE_<CATALOG_KEY>` control operational
availability only. They never grant access. One SQL snapshot joins paid terms,
immutable purchased-plan features and active overrides. An operational disable
wins. A negative override wins over a purchase. Positive overrides require a
future expiry; indefinite legacy positive rows no longer grant access. Only
authorized staff/database operators can create overrides; clients have no grant
endpoint. UTC expiry is explicit even for legacy timestamp-without-zone columns.

Existing content, styling, Highlights, audiences and pins remain intact after
expiry or refund. Existing private Story view events keep their exposure; new
views use the current entitlement and are identified without private-view access.
The Settings and Premium pages disclose this. New messages/Stories with a saved
paid font fall back to the standard style without losing text. Advanced audience
requests fail rather than widening the audience. Users can restore one profile
field to its free default while retaining other historical selections.

## Billing lifecycle

The supported model is **one prepaid fixed term, without automatic renewal**.
Duration is configurable from 1 to 366 days. The UI displays the current price,
duration, terms and refund policy; order creation requires those exact accepted
price/terms values. A purchased plan snapshot is immutable even if configuration
later changes. Another term can be bought after the current term expires.

Order creation locks the account, checks active/pending terms, persists a unique
client key and receipt, and enqueues reconciliation in the same transaction.
Only then is the provider order created. A timeout becomes `creation_unknown`;
the provider POST is never blindly retried. Receipt/notes recovery binds the
existing provider order. Amount, currency and order/receipt association are
validated against server-owned records. A successful capture adds one ledger
reference and one paid access record under an order lock. Duplicate events do
not extend the term. Failed attempts stay visible and may be retried on that
same provider order. Unpaid known orders expire after 24 hours.

Cancelling a paid term records cancellation and preserves access until its paid
end date. Cancelling a pending checkout prevents later capture from granting
access. A late capture is recorded as `refund_required` for support/operator
review; this application never silently initiates a real refund. Any processed
refund, including a partial refund, revokes that term's perks. Refund totals
cannot exceed the captured amount, and repeated refunds have one financial
effect. These semantics must be reflected in the owner's approved commercial
policy; configurable text does not alter settlement rules. Dispute handling for
all payment products remains a separate F06 gate until implemented and verified.

## Webhooks and workers

Configure `/api/economy/webhooks/razorpay` (or the `/api/v1` alias), the webhook
secret, expected `RAZORPAY_ACCOUNT_ID`, and a separate 32+ character
`PAYMENT_EVENT_ENCRYPTION_KEY`. The route verifies the exact raw bytes and event
identifier, then commits an encrypted event plus durable job before returning
`accepted: true, processing: queued`. This acknowledges acceptance, not completed
settlement. An event ID reused with different content is rejected. Events are
processed independently of a browser callback. Provider-authenticated recovery
handles capture or refund arriving before local provider binding.

The persistent API entry point runs the SQL lifecycle worker; `start:worker`
can run an additional worker using the same database/Redis/configuration. SQL
leases, heartbeats and fencing coordinate them. Premium polling defers ordinary
unpaid orders for five minutes without treating waiting as an operational
failure. Unexpected failures back off and reach the visible dead-letter state
after eight attempts. Pending orders can also be recovered by their authenticated
owner. Uncertain creations with exhausted retries require operator review; a
customer may cancel the unresolved order without causing another provider POST.

Keep the payment encryption key available across deployment/rollback; deleting
it makes accepted inbox payloads unreadable. Account deletion revokes paid access,
cancels pending orders and anonymizes only the purchaser association. Provider
IDs, plan snapshots and ledger references remain for reconciliation. Financial
retention duration is an owner decision, not an asserted legal requirement.

## Migration, rollback and evidence boundaries

Run `pnpm --filter @workspace/db migrate:production` using the same contact-shield
secret as the API. Release migration `20260926-premium-3` adds plan/order/access,
encrypted inbox and dispute tables after the auth/retained-financial/job changes.
The migration is additive and repeatable. Do not use schema synchronization on
populated databases. Back up and test restoration before deployment.

For rollback, first stop new purchases, drain or retain accepted event/jobs and
preserve all added tables and keys. Roll back only to code that still enforces
server-owned paid entitlements; the older flag-grants-access implementation is
not a safe payment rollback. Never remove financial evidence to roll back code.

The focused integration suite uses real isolated PostgreSQL 16 and Redis 7 with
synthetic accounts and a simulated Razorpay boundary. The Chromium suite uses
strict API fixtures and a simulated checkout SDK. Neither proves actual merchant
configuration, bank/provider settlement, staging delivery or production readiness.
Required provider acceptance includes closing checkout after capture, webhook
duplicates/reordering, refunds, reconciliation after interruption, and observing
exactly one financial effect with the configured merchant account.
