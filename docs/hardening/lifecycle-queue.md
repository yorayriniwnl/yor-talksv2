# Lifecycle and notification recovery evidence

Working-copy evidence on `codex/media-lifecycle-20261006`, based on commit
`ba31c9fd443659bcacc9d2c8760086adf63ee082`, verified 8 October 2026. These
checks used synthetic local infrastructure; they do not establish deployed
provider, retention-owner, or public readiness acceptance.

## Findings and changes

Lifecycle handlers previously renewed a lease indefinitely even when a hung
handler made readiness false. Shutdown waited indefinitely for that handler.
A stale failure could change an expired job, and the abandoned eighth lease
became a dead record with lease fields that prevented operator replay.
`lifecycle-worker.ts` now stops renewal after five minutes, publishes unhealthy
state, and supplies an abort signal to cooperative handlers. A noncooperative
handler can remain unresolved, but its lease expires naturally and another
worker can reclaim it. Completion, deferral, renewal and failure all require
the current unexpired token. Late handlers cannot alter the reclaimed record.
Heartbeat writes and lease pulses are serialized, and close waits at most five
seconds. Account cleanup checks cancellation between keys; media sweeps use a
batch of ten. Provider/entity handlers must remain idempotent across a crash.

The permanent media sweep formerly reset dead attempts and errors without an
audit. `ensureMediaCleanupLoop()` now locks the record and writes its previous
attempt count and machine error into `background_job_replays` with reason
`scheduled_cleanup_recovery` before rearming a dead sweep. Concurrent recovery
writes one replay; a live lease is preserved. Finite jobs still require
explicit operator replay. Payment-enabled readiness requires all five payment
handlers, including dispute scan and reconcile, plus account and media cleanup.

Legacy terminal records can retain an expired token from the old crash path.
Permanent sweep recovery and explicit finite-job replay now use the database
clock under the row lock to recognize and atomically clear those expired lease
fields. A future lease remains untouched, including on a terminal record. A
token with no expiry is ambiguous and remains for operator inspection. Replay
audit retains the old attempt/error; any old worker is fenced before and after
a new worker claims the reset record.

Notification recovery formerly removed failed BullMQ jobs and restarted their
attempt budgets every 30 seconds. Redis loss or pruning also lost retry state.
The private PostgreSQL `notification_delivery_state` now owns a five-attempt
budget, retry eligibility and dead/delivered status. Delivery and its marker
commit under a locked notification row. Retry eligibility uses PostgreSQL's
clock; an initial focused failure exposed a few milliseconds of local clock
skew that otherwise skipped the first send without recording an attempt.
Recovery imports retained legacy attempt counts, respects durable dead/retry
state and rebuilds pending transport jobs after actual Redis queue loss.
An audited replay resets only an undelivered dead record. The committed
`push_delivered_at` marker remains authoritative after job removal.

Redis carries only notification IDs. Periodic maintenance and the actual
account cleanup handler scrub pre-upgrade recipient, address and content
payloads. Finished legacy return values and stack traces are erased; failed
reasons retain machine codes. The atomic Redis scrub cannot recreate a hash
that was removed concurrently. Diagnostics and replay inspect omit payloads
and provider response bodies. New jobs retain no stack trace. Periodic
maintenance enforces age/count bounds even when the queue is otherwise idle.

The compatibility gate now requires Redis 7 or newer and rejects malformed
versions. Redis 5 was previously accepted despite the authentication Lua
commands requiring newer expiration features; production remains pinned to
Redis 7. Unsupported runtimes cannot report compatible readiness.

Optional Web Push now passes the installed `web-push@3.6.7` API's supported
15-second socket inactivity timeout. Its provider failure logs contain only
the machine code, a validated HTTP status and lookup IDs; exceptions propagate
a generic machine code. Provider response bodies, endpoints and subscription
keys are excluded. The installed library destroys a request on socket timeout,
but successive response packets can extend total time: this repair is not a
full-response deadline or enabled-provider acceptance.

## Configured bounds and remaining decisions

| Item | Implemented default |
| --- | --- |
| Lifecycle lease | 2 minutes; renewed every 10 seconds while making bounded progress |
| Lifecycle handler budget / close wait | 5 minutes / 5 seconds |
| Lifecycle attempts | 8; exponential retry capped at 1 hour; then dead |
| Lifecycle heartbeat freshness | 45 seconds; active handlers older than 5 minutes fail readiness |
| Recurring media sweep / recovery check | 60 seconds / 60 seconds |
| Notification durable attempts | 5; retry delay starts at 30 seconds and doubles |
| Notification recovery / maintenance | startup and every 30 seconds; pages of 250 |
| Completed transport jobs | at most 1,000; at most 1 hour after periodic pruning |
| Failed transport jobs | at most 1,000; at most 7 days after periodic pruning |
| Operator inspect output | at most 100 records; IDs, state and machine diagnostics |
| Optional Web Push idle socket timeout | 15 seconds; not a total response deadline |

Age pruning runs when maintenance executes; a stopped worker cannot enforce
an elapsed-age bound until recovery. Waiting/delayed jobs retain only lookup
IDs. Notification rows and replay audit are PostgreSQL records and are not
subject to the Redis job limits; account deletion cascades their delivery
state/audit. An owner must approve these transport, notification-row and audit
retention policies before production acceptance. No retention value was
represented as an owner-approved policy.

`yor_lifecycle_recovery_failures_total` sums counters in retained worker
heartbeat rows. It can decrease when those rows are pruned; it is a bounded,
label-free operational diagnostic, not an immutable lifetime total. Observe
readiness, overdue work, expired leases, dead letters and last real cleanup
progress together. A healthy replica can satisfy readiness while another
replica's stalled job remains visible in the diagnostics.

## Observed checks

Node `24.19.0`, pnpm `9.15.4`, real PostgreSQL on
`127.0.0.1:55447/yor_hardening_auth_20261007`, and real Redis `7.2.8` on
`127.0.0.1:6398/5`. Test fixtures checked the actual database name and loopback
address before writes. Explicit `NODE_ENV=test`, `DB_SSL=false`,
`DATABASE_URL`, `REDIS_URL`, and synthetic contact-secret variables were set;
no default development database or external provider was used.

From `api-server`:

```powershell
node --import tsx --test --test-concurrency=1 --test-timeout=90000 src/__tests__/lifecycle-health.integration.test.ts src/__tests__/notification-retention.integration.test.ts src/__tests__/notification-delivery-migration.integration.test.ts src/__tests__/redis-compat.test.ts src/__tests__/queue-service.test.ts
```

**16 passed, 0 failed, 0 skipped, exit 0; 12.80 seconds.** This runs the actual
repositories, lifecycle workers, BullMQ worker, account erasure service and
Redis queue. It verifies a noncooperative hang, bounded close, aborted renewal,
stale-token failure/completion rejection, reclaim by another worker, exhausted
leases and audited replay, concurrent permanent sweep recovery, both count
bounds using 1,005 real jobs, legacy payload/return-value erasure, sanitized
failure diagnostics, five durable failures, actual queue obliteration followed
by pending outbox recovery, dead-state preservation and audited notification
replay. External delivery is replaced with a deterministic synthetic success
or failure; actual providers are not contacted. Accelerated test intervals and
durable retry timestamps exercise transitions without claiming production
elapsed-time soak coverage.

The migration regression runs the actual additive migration in its own private
schema. It verifies pre-existing delivered markers, repeat application without
resetting exhausted state/audit, the attempt constraint, one version marker,
and deletion cascades. The isolated application database was also upgraded
successfully using `corepack pnpm@9.15.4 --filter @workspace/db migrate:beta`.

The first expanded retention run failed waiting for the first durable attempt
and then stayed alive because failure metrics opened an unclosed test Redis
connection; it was terminated after verifying the exact test-process command
lines. A second isolated run confirmed the attempt timeout (exit 1). The retry
clock comparison and explicit test metric cleanup were corrected. The focused
five-failure rerun passed (1/1, exit 0), followed by the 16-test run above. An
intermediate typecheck reported two generic BullMQ Redis-client typing errors;
those were fixed and final
`corepack pnpm@9.15.4 --filter @workspace/api-server typecheck` passed, exit 0.
No failed run was treated as green or hidden by skipping assertions.

The additional `notification-delivery-service.test.ts` focused run passed
**1/1, exit 0** (1.22 seconds), checking actual service handling of synthetic
410/503 provider errors, expired-subscription removal, the socket timeout
option and absence of private provider details from failure logs. The sender
is stubbed; it does not contact a provider. The subsequent API typecheck also
passed, exit 0. The timeout API and its limits were verified against the
installed package's README and `src/web-push-lib.js` implementation.

Both inspect CLIs were also run against the verified isolated database and
exited 0. A synthetic five-attempt dead notification was replayed through the
actual notification CLI, exit 0; subsequent SQL showed pending/zero attempts
and an audit retaining five attempts, `notification_delivery_failed` and
`provider_recovered`. The synthetic user/notification and temporary harness
were then removed. The lifecycle replay repository path is exercised by the
focused lease/dead-letter tests above; no production record was replayed.

The first complete API run subsequently exposed a real regression in the
existing `media-cleanup-loop.integration.test.ts`: the audit repair required
NULL lease fields and skipped terminal legacy records with expired leases.
That failure is retained in the main run record. The recovery condition was
fixed, with the original expired-state assertions preserved and new audit,
future terminal lease and ambiguous-token assertions added. Finite legacy
operator replay received the same database-clock handling and explicit old
completion/failure fencing coverage. The focused seven-file rerun below is
the corrected source check; the complete API rerun is a separate main-report
gate.

```powershell
node --import tsx --test --test-concurrency=1 --test-timeout=90000 src/__tests__/media-cleanup-loop.integration.test.ts src/__tests__/lifecycle-health.integration.test.ts src/__tests__/notification-retention.integration.test.ts src/__tests__/notification-delivery-migration.integration.test.ts src/__tests__/notification-delivery-service.test.ts src/__tests__/redis-compat.test.ts src/__tests__/queue-service.test.ts
```

**19 passed, 0 failed, 0 skipped, exit 0; 13.33 seconds**, using the same
verified isolated PostgreSQL and Redis targets. The original sweep regression
assertions remain, augmented with audit and future/malformed lease handling.
The prior sweep-only correction rerun was 18/18, exit 0; the 19-test result
additionally includes finite legacy replay coverage. Final API typecheck
passed, exit 0. Source is stable for the complete API rerun.

The next complete API attempt exposed an observable-state race in the hung
handler fixture. The fixture polled local cancellation and immediately
asserted database-backed readiness, while the unhealthy heartbeat was still
committing asynchronously. Its failed assertion also bypassed handle cleanup,
leaving an open Redis connection and preventing that full attempt from
finishing. Read-only full-database inspection showed the hung worker's later
unhealthy heartbeat without a stopped marker. The initial clone TAP diagnostic
passed 8/8, consistent with intermittent ordering. A controlled diagnostic
using the actual worker/repository and a promise-held unhealthy heartbeat
reproduced the initial assertion as **actual true / expected false**, exit 1.
That stdin diagnostic also produced a logger-worker warning from inherited
`--input-type`; this was confined to the diagnostic invocation.

The fixture now deliberately holds the unhealthy publication, verifies the
prior committed readiness, releases it, and polls the actual database-backed
unhealthy transition within the existing deadline. All subsequent bounded
close, reclaim, attempt-count, token and final-unready assertions remain.
Cleanup is registered before worker startup and always releases the heartbeat,
closes both handles and releases the hung handler if any assertion fails.
There is no arbitrary sleep or retry-until-green. Runtime API source did not
change. The corrected focused TAP command below passed **8/8, 0 failed,
0 skipped, exit 0; 9.87 seconds** under the concurrent host workload; API
typecheck and the scoped diff check also exited 0. Both full failed/stalled
attempts remain part of the main candidate evidence; a new complete run uses
the CLI test timeout and must pass independently. That test deadline does not
replace explicit handle cleanup or a whole-process/CI wall-clock watchdog.

```powershell
node --import tsx --test --test-reporter=tap --test-concurrency=1 --test-timeout=90000 src/__tests__/lifecycle-health.integration.test.ts
```

## Migration and operator procedure

The additive version is **`20261008-notification-delivery-1`** in
`lib/db/scripts/migrate-notification-delivery.mjs`, called by the normal
`migrate-release.mjs` transaction. Apply it to an explicitly selected approved
database through the existing migration runner before starting new API or
notification workers. Drain old notification workers first: they do not honor
durable dead-state budgets and can retain legacy payloads. Start the new
workers, verify readiness/progress, inspect dead records, and verify queue
maintenance before accepting traffic. The existing lifecycle lease/progress
migration must already be applied. Full fresh bootstrap and the full API suite
are separate candidate gates owned by the main hardening report.

Use an approved shell with the intended `DATABASE_URL` and required API
configuration already set. These operator commands print machine diagnostics
only; IDs still require controlled access. From the repository root:

```powershell
corepack pnpm@9.15.4 --filter @workspace/api-server exec tsx src/scripts/lifecycle-jobs.ts inspect
corepack pnpm@9.15.4 --filter @workspace/api-server exec tsx src/scripts/notification-delivery.ts inspect
```

After fixing and verifying the dependency, replay one reviewed record using
its returned UUID and a short machine reason. These commands mutate the
selected approved database and preserve the previous attempts/error in the
corresponding replay table:

```powershell
corepack pnpm@9.15.4 --filter @workspace/api-server exec tsx src/scripts/lifecycle-jobs.ts replay <job-uuid> dependency_restored
corepack pnpm@9.15.4 --filter @workspace/api-server exec tsx src/scripts/notification-delivery.ts replay <notification-uuid> provider_recovered
```

Lifecycle replay rejects live or ambiguous leases and accepts known-expired
legacy dead leases with audited atomic clearing. Notification replay rejects
delivered, missing or non-dead records. New pending notification transport is
recovered within the normal 30-second scan; inspect the durable marker and
worker health afterwards. Never put customer text, addresses, tokens or
provider bodies in the reason. A permanent media-sweep recovery is automatic
but still audited; its machine reason identifies the scheduler.

Rollback keeps the additive tables and original notification markers; do not
drop durable state/audit. A rollback to a worker that ignores the durable
budget can re-send dead deliveries and retain private queue data. Keep the
fixed workers, or pause notification transport until equivalent fencing and
payload minimization are retained. Database state cannot make an incompatible
old worker safe by itself.

External push acknowledgement cannot join a PostgreSQL transaction. A crash
after the external acknowledgement but before the marker commits can repeat
an external send. Multi-subscription partial success can also repeat the
already successful subscription on retry. Web Push remains disabled in the
accepted baseline and requires its own complete-response budget, provider
configuration and delivery acceptance before enablement. Notification heartbeat currently
measures process/Redis liveness; lifecycle heartbeat additionally detects
active-handler stall. Production outage/recovery, restart/soak and actual
provider acceptance remain operator gates.
