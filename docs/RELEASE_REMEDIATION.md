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
- Integration commit: `fe356ef5ae007381f1bc38fefca9a87270348e79`, pushed with exact
  remote SHA match. API/frontend typechecks and 43/43 state tests passed;
  API integration tests and final candidate verification remain in progress.

## Live state, freshly observed

- Vercel project `yor-talks`, team `yorayriniwnl-1218s-projects`;
  production deployment `dpl_8uLzjCLpBsv4rSo64ojUKxbAv4VL`, source `f93a061`.
- `https://yor-talks.vercel.app/`: 200; `/api/livez`, `/api/readyz`,
  `/api/healthz`: 500. Platform build status is Ready; API runtime is not healthy.
  Runtime logs show `SyntaxError: Cannot use import statement outside a module`
  at `/var/task/api/index.js:2`: the generated ESM entry had no ESM package
  marker. The root package now declares `type: module`; API bundles remain
  explicitly `.cjs`. Persistent backend/staging host not
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
| F07 deletion/ledger | Confirmed both ledger parties were erased, orders cascaded away, and operations lacked a transaction | Transactional party-specific anonymization; financial references SET NULL, product snapshot and shipping erasure; durable session cleanup | 5/5 database-backed account/job tests; retained refunds after both deletion orders; transaction rollback and retry fencing | Provider-owned media cleanup is tracked under F03; owner must approve financial retention duration |
| F08 dependencies | Current baseline: production 0; all dependencies 31 advisories (11 critical, 15 high, 4 moderate, 1 low) | Orval 8.22, patched parsers/transitives/esbuild; deterministic regeneration and package exports | Both refreshed audits 0; frozen install, generated-package TypeScript and production build pass; `docs/remediation/2026-09-26/dependencies.json` | Registry snapshot is not a guarantee against unknown vulnerabilities |
| F09 staff | Status changes alone do not enforce takedown | Authorized auditable actions, appeals/reversal and read/delivery enforcement | Pending | Staff operator acceptance |
| F10 sessions | Same-second JWT repeats; old approved challenges survive revocation; reset read/update/delete races | Random jti + Redis CAS; database auth epoch on HTTP/socket/refresh/challenges; transactional reset redemption; cross-tab Web Lock | 21/21 focused tests with real PostgreSQL/Redis; 44/44 state tests; API/frontend typechecks | Hosted authenticated journeys; cross-tab browser case runs in full suite |
| F11 export | Export omits supported persisted surfaces | Bounded ownership-bound jobs, matrix, protected expiry/download | Pending | Rich/large/deletion-race acceptance |
| F12 queries | Per-item author/viewer reads and per-flag overrides | Batch users/relationships/entitlements; measured SQL counts | Pending | Representative query and latency evidence |
| F13 budgets | 300/IP/15m conflicts with fallback polling | Separate verified-user/IP budgets, backoff/jitter/visibility | Pending | NAT, tabs and outage regression |
| F14 reliability | Main checks dependencies; candidate adds heartbeat but schema/lag needed | Bounded providers/cache, readiness, worker supervision, restore/rollback | Fresh Docker engine and isolated services | Failure injection, fresh restore and host monitoring |
| F15 release | Main now contains Premium/pins; hardening has one unique commit | Intentional integration in isolated worktree | Conflict resolution and typecheck underway | One verified pushed SHA/PR and working CI |
| F16 coverage | Catalog assumptions crash Settings; permissive mocks concealed missing contracts | Validate optional catalog, retry independently; explicit route fixtures fail unexpected requests; correct intentional public field fixture | 32/32 Chromium desktop/mobile tests; 44/44 state tests; two-tab rotation and malformed catalog regressions pass | Expanded new-feature coverage, full API/container/migration matrix and real staging remain open |

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

- F14 provider deadlines now include response bodies and a 2 MiB response cap.
  The previous helper aborted a successful fetch before callers read JSON and
  left its timeout active. Two focused tests pass, including a real local HTTP
  server with a stalled body, oversized body, completed JSON and caller abort;
  API TypeScript passes. Provider credentials are not involved in this check.

- Full API checkpoint after `2407974`: 125/125 tests passed against isolated
  PostgreSQL 16 / Redis 7, Node 24.14.0. Updated the disabled-provider fixture to
  mock the strict session read and retained the refund currency in its assertion.
  The run uses `node --import tsx --test --test-concurrency=1 --test-timeout=45000
  src/__tests__/*.test.ts` from api-server. Later feature changes require a fresh
  complete run; this checkpoint does not cover unimplemented Premium/media/export.

- F07/F14: `20260926-lifecycle-2` retains payment/membership/marketplace order
  references independently of deleted identities. Only the deleted ledger party
  is anonymized; counterparties and ledger event IDs remain intact. Identity,
  social-content removal, accounting changes and cleanup enqueue commit together.
  The lifecycle worker leases durable jobs, retries with backoff, fences abandoned
  leases and records exhausted jobs for operator review. Legacy URL references
  enter a private ownership-review hold; an arbitrary URL is never treated as
  authority to delete a provider asset. Tests use synthetic accounts and real local
  PostgreSQL/Redis. Retention duration requires an owner decision; no legal retention
  requirement is implied. Provider media cleanup is not yet verified.

- F16: the current mocked Chromium suite passes 32/32, including mobile light/dark,
  keyboard/accessibility, save failure/retry, block failure/retry, messaging,
  legal pages, optional Premium catalog recovery and two real tabs serializing
  cookie rotation. Unexpected mocked API requests now fail. This result is browser
  fixture evidence, not a provider-backed purchase or staging journey.

- F10: release migration `20260926-auth-1` adds `users.auth_version`, durable
  hashed reset credentials and a schema-version ledger. Token consumption,
  password replacement and epoch increment commit together. Logout-all increments
  the epoch before Redis cleanup. HTTP and socket requests reject a stale epoch;
  dependency outages return unavailable without converting them into an expired
  browser session. Approved challenges retain the epoch at credential verification.
  Tests include 20 concurrent refresh attempts (one winner), same-second jti,
  replay, cleanup outage, HTTP epoch checks with stale Redis sessions, active socket
  revocation, concurrent reset, expired reset and rollback after database failure.
  A Redis call-release argument defect and first-message adapter race were also
  repaired while exercising session/realtime compatibility.
  Migration ran successfully on the existing isolated database. Application
  rollback to a version that ignores auth_version requires draining/revoking all
  old Redis sessions/challenges first; retain the additive schema and reset ledger.

- F01: preview `yor-talks-g3xwex9et-yorayriniwnl-1218s-projects.vercel.app`
  (source `ae51d4b`) reaches application configuration after the ESM repair.
  Authenticated platform probe still returns 500. Fresh runtime logs identify
  `[Config Error] Production requires unique JWT secrets of at least 32 characters:
  JWT_SECRET, JWT_REFRESH_SECRET`. This is a confirmed environment blocker;
  validation remains enforced. No production settings or secrets were changed.

- F08: production dependency audit was already clean on current main; the complete
  workspace audit was not. Narrow dependency overrides and Orval 8.22 remove the
  recorded advisories. Code generation now uses explicit output paths and a
  namespaced TypeScript model export, avoiding duplicate exports on regeneration.
  Node 24.14.0 / pnpm 9.15.4 frozen install, code generation, generated package
  TypeScript and API/frontend production builds passed. Full snapshot evidence
  includes advisory URLs and before/after counts; no blanket advisory suppression.

- F02/F12: shared current-record policy now enforces post audience, public/private
  account, mutual blocks, account suspension/deactivation and content rating.
  Mutes apply to discovery; profile-only posts remain available through authorized
  profile/detail/bookmark access and excluded from ordinary search/feed.
  Search hits re-query SQL; trending caches store only candidate IDs/rank and
  re-fetch records. Invalidated rank/deletion pages are re-queried. Bounded feed
  scans retain a continuation cursor even when a full scan produces no visible rows.
  SQL-backed auto/index and fallback search, warm-cache edits/restrictions/deletion,
  eligible viewers and keyset pagination: 9/9 focused tests passed. Measured 50
  candidates: two SQL queries, 2.7 ms on local PostgreSQL; this is a single local
  observation, not a capacity or p95/p99 claim. Remaining broad load/staging gates
  stay open. Test `api-server/src/__tests__/audience-regression.test.ts`.

- Baseline frozen-lockfile installation completed in the isolated checkout.
- Initial typecheck before building the DB references failed (TS6305). After DB
  build, three API and one frontend errors in the candidate hardening code were
  identified and repaired; verification is ongoing. No green claim yet.
