# Public launch remediation - 26 September 2026

Working standard: **FOUND -> FIXED -> VERIFIED**. This document adds evidence;
the historical `docs/audits/2026-09-26` audit and defect-observation probes remain
unchanged. Those probes are not release tests. No public/paid launch is approved.

## Release candidate and preservation

- Remote refreshed before integration. Base: `origin/main` at
  `f93a061bc29a18c6dfb8983b55280a600a5968a4`.
- Main already contains Premium and the owner's pin-reordering commit
  `674879d`. The three previously unfinished files are committed there; both
  original worktrees were clean. Neither original worktree is being modified.
- Isolated worktree: `C:\Users\ayush\codex-worktrees\yor-talks-release`.
- Release branch: `codex/launch-remediation-20260926`.
- Integrating the one remaining hardening commit `21ebd703ceada736e4c399f1fb0d6826920143c6`.
  Messaging conflicts combine Premium typography/read-preview with idempotent
  sending, pagination and reconnect recovery. Google auth retains failure/retry
  handling plus responsive rendering. Both sets of regression tests are retained.
- Candidate SHA and PR: pending verification and publication.

## Live state, freshly observed

- Vercel project `yor-talks`, team `yorayriniwnl-1218s-projects`;
  production deployment `dpl_8uLzjCLpBsv4rSo64ojUKxbAv4VL`, source `f93a061`.
- `https://yor-talks.vercel.app/`: 200; `/api/livez`, `/api/readyz`,
  `/api/healthz`: 500. Platform build status is Ready; API runtime is not healthy.
  Runtime log investigation is in progress. Persistent backend/staging host not
  yet identified. No production configuration has been changed.
- GitHub credential manager permits API access. Latest main CI run
  `36212481391` was in progress; historical billing failure is not assumed current.
- Docker Desktop started successfully; Engine 29.8.0. Separate synthetic test
  services use Compose project `yor-talks-remediation`, loopback ports 55432
  (PostgreSQL 16) and 56379 (Redis 7), via `ops/compose.verify.yml`.
- No real charges, customer messages, production-data migration or provider
  account changes are authorized by this test work.

## Finding tracker

Every row remains open until implementation and the listed acceptance evidence
exist. Local fixtures, real local dependencies, provider test mode, staging and
production evidence are separate categories.

| Finding | Revalidated behavior / root cause | Implementation and regression work | Evidence / commit | Remaining dependency or gate |
| --- | --- | --- | --- | --- |
| F01 runtime | Current production API still 500; exact exception under investigation | Integrate persistent API/worker runtime; verify packaging/configuration | Vercel source and four HTTP probes above | Intended backend host, complete deployment config, staging journeys |
| F02 audience/cache | Search still uses author-only filtering; cached records bypass fresh policy | Shared batched post policy; current-record cache reauthorization; SQL-backed audience regression | Pending | Warm-cache and both search paths must pass |
| F03 media lifecycle | URL-only assets; production containment is not a lifecycle | Owned assets, moderation, protected delivery, cleanup and retries | Pending | Configured provider/moderation acceptance |
| F04 upload controls | Signed grant metadata cannot enforce type/size | Controlled upload and durable reservations/quotas | Pending | Provider-backed limits and adversarial upload evidence |
| F05 Premium | Rollout flags still stand in for subscription entitlement | Separate platform plan, billing/entitlements and customer journey | Pending | Final price/policy; provider test lifecycle |
| F06 payments | Candidate webhook/refund fixes exist but are not a complete durable lifecycle | Integrate/revalidate; durable inbox, settlement/reconciliation, reversals | Pending | Provider test mode and financial fault tests |
| F07 deletion/ledger | Historical counterparty attribution defect requires fresh regression | Transactional identity anonymization and retryable cleanup | Pending | Retention policy owner decision |
| F08 dependencies | Main updated Multer/qs intent; complete current audit still needed | Refresh prod/all audits, patch reachable/tooling advisories, frozen install | Initial frozen install in isolated checkout | Exact remaining advisories and compatibility checks |
| F09 staff | Status changes alone do not enforce takedown | Authorized auditable actions, appeals/reversal and read/delivery enforcement | Pending | Staff operator acceptance |
| F10 sessions | Refresh JWT lacks random jti; logout-all omits challenges; reset non-atomic | Atomic rotation/reset/revocation and concurrent-client regression | Pending | Redis/DB failure and real session journeys |
| F11 export | Export omits supported persisted surfaces | Bounded ownership-bound jobs, matrix, protected expiry/download | Pending | Rich/large/deletion-race acceptance |
| F12 queries | Per-item author/viewer reads and per-flag overrides | Batch users/relationships/entitlements; measured SQL counts | Pending | Representative query and latency evidence |
| F13 budgets | 300/IP/15m conflicts with fallback polling | Separate verified-user/IP budgets, backoff/jitter/visibility | Pending | NAT, tabs and outage regression |
| F14 reliability | Main checks dependencies; candidate adds heartbeat but schema/lag needed | Bounded providers/cache, readiness, worker supervision, restore/rollback | Fresh Docker engine and isolated services | Failure injection, fresh restore and host monitoring |
| F15 release | Main now contains Premium/pins; hardening has one unique commit | Intentional integration in isolated worktree | Conflict resolution and typecheck underway | One verified pushed SHA/PR and working CI |
| F16 coverage | Historical tests stale; optional catalog can crash Settings | Correct fixtures, fail unhandled mocks, contain catalog failures | Pending | Full local matrix, production container and staging |

## Migration and rollback protocol

Use `pnpm --filter @workspace/db migrate:production` with an explicitly isolated
URL for tests; never use `push` against existing data. The production runner
bootstraps only an empty schema and runs additive migrations. New changes must
remain additive and restartable. Record the exact migration order and expected
version here before deployment. Back up before migration and restore into a
separate database for verification. Roll back application images only after
compatibility review; retain new tables/columns and never destructively revert
financial/media evidence. Payment/media write compatibility must be reviewed
before restoring an older application image.

## Evidence log

- Baseline frozen-lockfile installation completed in the isolated checkout.
- Initial typecheck before building the DB references failed (TS6305). After DB
  build, three API and one frontend errors in the candidate hardening code were
  identified and repaired; verification is ongoing. No green claim yet.
