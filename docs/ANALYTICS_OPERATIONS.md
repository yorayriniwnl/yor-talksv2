# Product Analytics Operations

## Event contract

The current browser taxonomy is schema version `1` and is validated in `api-server/src/services/product-analytics-service.ts`:

| Event | Accepted properties |
| --- | --- |
| `navigation` | Empty object. Route paths and query strings are not accepted. |
| `react:profiler` | `id: "App"`, phase (`mount`, `update`, `nested-update`), and bounded render durations. |

Events are sent only after explicit optional-analytics consent. Each event has a client UUID, ISO timestamp, and version. Signed-in attribution uses the same-origin bearer token; tokens are never sent to a cross-origin telemetry URL. Server validation rejects unknown fields/names, batches over 20, timestamps older than 90 days or more than five minutes in the future, and rate excess. Event UUID conflicts are ignored. The server stores no IP address, route, message, or arbitrary payload. Account deletion sets `actor_id` to null.

## Storage and retention

`product_analytics_events` is the durable, deduplicated raw event store. `product_analytics_daily` contains UTC date/event counts and unique-user counts. Before a run is marked successful, the service compares each daily event count and unique-user count against raw source rows; discrepancies persist a failed job with `analytics_rollup_mismatch`. `product_analytics_job_runs` records running/succeeded/failed state, completion time, processed-through date/count, and a safe error code. Raw events are pruned in bounded batches after 90 days; daily aggregates and job status are retained until an operator-defined database retention policy removes them. No historical events or backfilled aggregates are fabricated.

## KPIs and formulas

- DAU: distinct authenticated users with one or more accepted, consented events during the current UTC calendar day.
- WAU: distinct authenticated users with one or more accepted events in the trailing 7 × 24 hours.
- MAU: distinct authenticated users with one or more accepted events in the trailing 30 × 24 hours.
- New accounts (30 days): users whose server-side `created_at` falls in the trailing 30 × 24 hours, excluding future timestamps.
- Seven-day activation: accounts registered 7–37 days ago with at least one first-week post, comment, follow, community membership, sent message, story view, or post like. This measures an action within the first week, not the account's first-ever action.
- Cohort retention: D1/D7/D30 are the share of signups with at least one authenticated, consented product event on the corresponding UTC day after signup. Cohorts cover the previous 90 days, exclude suspended/deactivated accounts and cohorts too recent for a full D30 window. This is opt-in observable retention, not population-wide retention.
- Content/community engagement (30 days): counts comments, post likes, story views, story reactions, community membership rows, and reel-view rows recorded in the trailing 30 days and no later than query time. Counts are actions, not unique-user rates or creator-specific story totals.
- Creator profile views: one record per creator/viewer/UTC day; self-views are excluded.
- Creator new followers: follow records created during the current UTC day.
- Creator post/reel views and engagement: current server counters (cumulative totals), not daily deltas; the existing schema has no historical per-view event source.
- Creator earnings: completed INR ledger credits to the creator during the current UTC day, expressed in paise. This is ledger-backed, not an independent processor-to-ledger reconciliation.

The authorized `GET /api/telemetry/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD` endpoint is admin/moderator-only and bounds daily queries to 90 days. It returns event rollups, current DAU/WAU/MAU, 30-day account acquisition, latest rollup freshness, and latest pipeline status. Creator analytics remain served by the authenticated `/api/economy/analytics` endpoint from existing server tables.

Not currently measured: acquisition source attribution, non-consenting cohort retention, interaction-quality denominators, or creator-specific story analytics. Payment reconciliation compares internal Razorpay order rows to ledger rows, including amount/currency/account mismatches, missing provider payment IDs, missing ledger rows, and orphan ledger entries. The repository has no provider settlement reports, so this is not external financial reconciliation or proof of cash received.

## Scheduling and operations

Apply the additive beta migration before deploying code that reads the analytics tables:

```bash
pnpm --filter @workspace/db build
pnpm --filter @workspace/db migrate:beta
```

The production Compose file does not schedule recurring jobs. The repository now includes a concrete systemd deployment timer at `ops/systemd/yor-talks-analytics.timer`; its service invokes `pnpm --filter @workspace/api-server analytics:rollup` in an ephemeral API container daily at 02:15 UTC with up to five minutes of jitter. Install it on each deployment host after setting the repository path and creating a `yor-talks` service account with read access to the deployment and production env file plus Docker socket access:

```bash
sudo install -D -o root -g root -m 0644 ops/systemd/yor-talks-analytics.service /etc/systemd/system/yor-talks-analytics.service
sudo install -D -o root -g root -m 0644 ops/systemd/yor-talks-analytics.timer /etc/systemd/system/yor-talks-analytics.timer
sudo systemctl daemon-reload
sudo systemctl enable --now yor-talks-analytics.timer
systemctl list-timers yor-talks-analytics.timer
sudo systemctl start yor-talks-analytics.service
journalctl -u yor-talks-analytics.service --since today
```

Docker socket membership is root-equivalent; grant it only to the dedicated scheduler account and protect the env file. The service recomputes the previous seven complete UTC days under transaction-scoped advisory locks, then prunes raw events older than 90 days in batches. Re-running is idempotent and uses only stored events. It exits nonzero on failure and persists a status/error code for authorized analytics operators. Alert externally when the latest successful `processedThrough` is over 26 hours behind or the latest run failed; alert delivery remains a deployment responsibility.

The protected `/api/metrics` endpoint exports shared `yor_worker_failed_jobs_total` counters from Redis and `yor_http_metrics_shared_store_up`. Since every replica returns the same Redis snapshot, scrape aggregation must use one value per label set (such as Prometheus `max`), not sum replicas. The local `process_fallback` series covers failures observed during Redis outages; collect external scrape/alert evidence before claiming monitoring acceptance.

Keep `PAYMENTS_ENABLED=false` until provider acceptance and financial reconciliation have been reviewed. Product-event aggregates are not revenue data; only completed ledger entries feed creator earnings.