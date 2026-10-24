# Retention and worker recovery audit - 24 October 2026

Scope: every implemented expiry or retention control, and the background work
that enforces it, checked against the code, a migrated PostgreSQL 16 database
and Redis 7. The baseline is the [retention worksheet](RETENTION_HOLDS_APPROVAL_WORKSHEET.md)
and [data-flow inventory](PRIVACY_DATA_FLOW_INVENTORY.md) of 22 October. This
audit verifies behavior. It does not approve retention periods or legal bases.

## Result

- Every implemented control in the worksheet behaves as described (see
  [verified controls](#verified-controls)).
- **One defect fixed:** a permanent cleanup sweep that failed on every run
  never raised an alert. A failing message purge, for example, would have left
  deleted message bodies in the database with only a log line.
- **Deleted-message retries fixed:** a client retrying the send of a message
  that had since been deleted, expired or moderated was treated as a new send,
  because the idempotency lookup could not see hidden rows. It re-ran
  moderation and, if the deletion had released the attachment, failed with
  `409 media_not_approved` instead of returning the tombstone. Content was
  never restored. The lookup now reads only the stored row's identity and
  timing whatever its visibility. This also removes an intermittent failure in
  `media-publication.integration`, which depended on which concurrent request
  won and failed about half the time on unchanged `main`.
- **One smaller defect fixed:** analytics event times sent with a UTC offset
  (for example `+05:30`) were stored hours off, because PostgreSQL drops the
  offset for a time-zone-less column. That skewed daily rollups and when the
  90-day prune applied. The official web client sends UTC, so only other
  clients were affected. Events are now normalised to UTC on ingest.
- Lifecycle job lease loss is now logged, and an outdated vanish-mode code
  comment that described stored bytes as retained was corrected.
- Stores with no retention rule are listed under
  [operator decisions](#operator-decisions), with suggested defaults.
- Deployment boundary: Vercel runs no worker, so none of the sweeps run in a
  Vercel-only deployment (see [deployment boundary](#deployment-boundary)).

## Defect fixed: failing sweeps were invisible

The lifecycle worker owns three permanent sweeps (`media_cleanup`,
`privacy_cleanup`, `message_cleanup`), each one durable `background_jobs` row.
On failure a job backs off exponentially (10 s doubling to 640 s) and
dead-letters after its eighth attempt, about 21 minutes after the first
failure. Every 60 seconds the worker revives dead sweeps to `pending` and, until
this change, also cleared `last_error`.

Reproduced on PostgreSQL by failing the message sweep eight times through
`BackgroundJobRepository` and then running the worker's revival step:

| State | Row | `deadCleanupJobs` |
| --- | --- | --- |
| After 8 failures | `dead`, attempts 8, last error set | 1 |
| After the 60 s revival | `pending`, attempts 0, **last error cleared** | 0 |
| After the next failure | `pending` in backoff | 0 |

The sweep was dead for at most 60 seconds of each 21-minute cycle, so
`YorLifecycleCleanupJobsDead` (`for: 1m`) could not fire; a job in backoff is
not counted as overdue; and lifecycle failures were not part of
`yor_worker_failed_jobs_total`, which covers only the notification and feed
workers.

Fix:

- Revival keeps `last_error`. A successful run (`defer`) still clears it.
- `inspectLifecycleHealth()` reports `failingCleanupJobs`: permanent sweeps
  whose most recent run failed.
- New gauge `yor_lifecycle_cleanup_jobs_failing` and critical alert
  `YorLifecycleCleanupSweepFailing` (`> 0` for 15 minutes). A single transient
  failure clears on the next attempt about 10 seconds later.
- Readiness details and admin diagnostics include `failingJobs`; diagnostics
  report `degraded` while it is non-zero. Readiness is unchanged, so a failing
  purge does not take the API out of service.
- Tests: `lifecycle-sweep-failure.integration.test.ts` walks the full cycle;
  `media-cleanup-loop.integration.test.ts` now expects revival to keep the
  error; the monitoring rehearsal requires the new metric and alert.

## Verified controls

| Control | Verified behavior | Evidence |
| --- | --- | --- |
| Deleted, expired and vanished messages | Reads deny deleted, expired and moderation-restricted messages with a session-time-zone-safe comparison. The sweep clears body, media, reply/forward links, reactions and edit/seen state in batches of at most 500 (`SKIP LOCKED`, 2 s lock and 10 s statement timeouts), deletes read and preview receipts, and keeps the tombstone row. Reading a vanish-mode message marks it deleted; unread ones carry a 24-hour expiry set at send. | `message-retention.integration` (including non-UTC sessions), `disappearing-message` |
| No copies of purged content | Notifications store template text only (for example "X commented on your post"); conversations hold no last-message preview. | Code review of every notification writer |
| Stories | Viewing, reacting and poll voting use the expiry-filtered lookup; only owner analytics and viewer lists use the unfiltered one. Media grants require an unexpired or highlighted Story. The media sweep releases references of expired, unhighlighted Stories. | Code review, `media-cleanup-expiry-timezone` |
| Notes | The active list and media grants filter expiry. Notes are text-only, and publishing a Note replaces the author's previous one. | `note-service`, code review |
| Temporary moderation restrictions | All seven enforcement checks (posts, videos, messages, media, sockets, eligibility, content safety) require `expires_at` to be null or in the future against a `timestamptz` column, which is correct in any session time zone. | Code review |
| Entitlements, subscriptions, overrides, marketplace holds | Expiry on time-zone-less columns is compared in UTC. | `feature-entitlement-timezone`, `premium-foundation` |
| Eligibility | Enrollments and challenges compare `expires_at` to `clock_timestamp()`; assessments and guardian authorizations are evaluated against their validity window by the policy. | `eligibility-policy`, `eligibility-enrollment`, `eligibility-repository` |
| Password reset | Hashed token, 1-hour expiry, single use, invalidated by any credential change, refused for inactive accounts. | `auth-lifecycle`, `auth-service` |
| Privacy challenges | 15-minute expiry. The sweep marks expired requests and clears their token hash in batches of 1,000; request history is kept. | `privacy-rights.integration` |
| Redis sessions and codes | Sessions are stored hashed with a 7-day TTL renewed on rotation. Account cleanup deletes sessions, login approvals, TOTP setup and the email login code. | `auth-lifecycle`, `account-integrity` |
| Managed media | The last-reference trigger schedules provider cleanup; the sweep leases each asset, deletes it at the provider and retries with backoff capped at one hour. | `media-lifecycle`, `media-cleanup-loop` |
| Optional analytics | The daily rollup deletes raw events older than 90 days. Its systemd timer is `Persistent=true`, so a missed run catches up; failed and stale rollups alert. | `product-analytics-retention.integration` (new), `ops/systemd` |

## Worker recovery

| Scenario | Behavior | Evidence |
| --- | --- | --- |
| Worker crashes mid-job | The 2-minute lease (renewed every 10 s) expires and any worker reclaims the job. Handlers are idempotent; `finish`, `defer` and `fail` are fenced by the lease token. | `account-integrity` (durable jobs) |
| Lease lost while a handler still runs | At-least-once: the stale worker's writes are rejected. Now logged as a warning. | Code review |
| A finite job keeps failing | Backoff, then dead-letter after 8 attempts; finite jobs are not revived, so `YorLifecycleCleanupJobsDead` fires. | `account-integrity` |
| A permanent sweep keeps failing | Revived every 60 s; now flagged by `YorLifecycleCleanupSweepFailing`. | `lifecycle-sweep-failure` |
| No lifecycle worker | Missing heartbeat: readiness returns 503 and `YorLifecycleWorkerUnavailable` fires. | `readiness`, `worker-health` |
| A handler hangs | An active job older than 5 minutes marks the worker unhealthy, even beside another healthy worker. | `worker-health` |
| Recovery after downtime | Due rows are claimed at once; backlogs drain at up to 500 messages or 1,000 privacy challenges per 5 s. | Code review |
| Graceful shutdown | SIGTERM stops claiming, waits up to 10 s for the current job and removes the heartbeat. A longer job exits and is reclaimed after its lease expires. | Code review |
| Notification delivery after Redis loss | The database outbox re-queues undelivered rows, checks delivery state before sending, and counts failures in `yor_worker_failed_jobs_total`. | Code review |
| Several workers | Claims use `FOR UPDATE SKIP LOCKED`, and each sweep is a single row, so one sweep never runs twice at once. | Code review |

## Operator decisions

Nothing below is implemented; each needs an approved policy. Defaults are
suggestions only.

| Store | Today | Suggested default |
| --- | --- | --- |
| Expired Note text | Kept until the author posts or deletes a Note | Delete a set period after expiry unless under open report review |
| Expired, unhighlighted Stories | Rows, captions and view records kept | Delete a set period after expiry, excluding Highlights and open reports |
| View history (`story_view_events`, `story_views`, `creator_profile_view_events`, `reel_views`) | Who-viewed-what kept indefinitely | Keep aggregates; delete raw rows after a fixed window |
| `notifications` | Kept indefinitely | Delete read notifications after a fixed window |
| `password_reset_tokens` | Expired and used rows kept | Delete a fixed period after expiry |
| Eligibility challenges and enrollments | Kept; may be compliance evidence | Decide with legal review |
| Completed jobs, dead letters, crashed workers' heartbeats | Kept indefinitely (payloads of completed jobs are scrubbed) | Delete completed finite jobs and stale heartbeats after a fixed window; keep dead letters until resolved |
| Privacy request history, consent, suppression, erasure journal | Kept as evidence | Approve a duration |
| Undelivered notifications after a long outage | Pushed when delivery recovers, however old | Mark as delivered without a push past a cut-off |

## Deployment boundary

Vercel loads only the HTTP application (`app.ts`). No lifecycle or notification
worker runs there, and `/api/readyz` reports not ready by design. Message
purging, media cleanup, privacy-challenge expiry, account session cleanup and
notification delivery need the long-running API (`index.ts`, which starts the
workers) or the standalone `worker.ts`, sharing the same PostgreSQL and Redis.

## Changes

- `api-server/src/workers/lifecycle-worker.ts`: one revival routine for the
  three sweeps that keeps `last_error`; lease-loss warning.
- `api-server/src/lib/lifecycle-jobs.ts` (new): the single list of sweep and
  cleanup job kinds.
- `api-server/src/lib/lifecycle-health.ts`: `failingCleanupJobs`.
- `api-server/src/services/operational-metrics-service.ts`: new gauge.
- `api-server/src/routes/health.ts`, `api-server/src/routes/diagnostics.ts`:
  `failingJobs`; diagnostics degrade while it is non-zero.
- `ops/prometheus/alerts.yml`: `YorLifecycleCleanupSweepFailing`.
- `api-server/src/services/message-service.ts`: corrected comment.
- `api-server/src/services/product-analytics-service.ts`: UTC normalisation on ingest.
- `api-server/src/services/message-service.ts`, `api-server/src/repositories/message-repository.ts`,
  `api-server/src/utils/message-visibility.ts`: metadata-only idempotency lookup.
- Tests: `lifecycle-sweep-failure.integration` and `product-analytics-retention.integration`
  (new); `media-publication.integration` now replays with the released
  winning asset deterministically; plus the updated media loop, readiness,
  private-chat release and monitoring rehearsal fixtures.
