# Yor Talks — public-beta continuation audit

Assessment: 31 August 2026. Baseline: `5294652` on
`codex/public-beta-readiness`. Tested application revision:
`509ab0db2b20fd77d934e6b37b70fcfbd0e1c0e3`.
The following documentation-only handoff does not change the tested application.
See the [earlier full audit](PUBLIC_BETA_READINESS_2026-08-31.md) for the
architecture-wide review and previously repaired defects.

## 1. Final verdict

**B. CODE-READY, DEPLOYMENT BLOCKED**

The reviewed core beta has no currently identified, reproducible repository
blocker left from this repair/retest loop. This does not mean the entire product
roadmap is complete, every route is exhaustively tested, or no undiscovered bugs
remain. Public-launch approval is withheld until the deployment and live
acceptance gates below pass. Payments, live rooms, web push and RTC remain OFF.

| Readiness dimension | Score / 100 |
| --- | ---: |
| Overall | 74 |
| Code | 92 |
| Security | 87 |
| CI/CD | 60 |
| Deployment | 35 |
| Operations | 50 |

These scores are engineering judgments, not measured coverage or certification.
The local restore rehearsal improves recovery evidence, not production readiness.

## 2. What was re-audited

- Remote branch and Actions execution, local PostgreSQL/Redis/Docker availability,
  production configuration, migration and release verification paths.
- Settings and privacy writes, legacy private-account defaults, overlapping
  saves, failure recovery, canonical client state and disabled-feature UX.
- Activity loading/error/empty states, notifications, follow requests, polling,
  live snapshot reconciliation, read acknowledgments and account/session changes.
- Block/mute/unblock/unmute concurrency, confirmed UI actions, safety-list
  persistence, feed/Story/Note invalidation and late response suppression.
- Settings/Activity mobile layout and accessibility; Google script loading,
  failure/retry and accessible labeling without removing password/email-code login.
- Full available regression suites, production builds, clean/repeated production
  migration and an isolated synthetic backup/restore rehearsal.

## 3. Additional defects found and fixed

| Severity | Area | Problem | Root cause | Resolution | Verified |
| --- | --- | --- | --- | --- | --- |
| P1 | Privacy/settings | Concurrent saves could undo private-account or messaging choices and drop other preferences | Read/merge/write of entire JSON objects | Atomic JSONB patches; preserve legacy privacy defaults and unrelated metadata | Four real-DB regressions; lost-update failures reproduced before repair |
| P1 | Settings | Failed privacy saves appeared applied; disabled push still looked available; notification state reset on remount | Optimistic local state, incomplete response typing and missing feature gating | Confirmed serialized saves, retry/errors, canonical state and truthful push status | Store tests and mobile browser failure/reload tests |
| P1 | Activity | Failed loads looked empty; stale snapshots could undo reads or restore resolved requests | No explicit load/error state or reconciliation with in-flight actions | Retry states, snapshot reconciliation, read coalescing and session guards | Unit/store and browser regressions |
| P1 | Blocking/muting | Concurrent list edits lost other targets; failed blocks could hide content and claim success | Whole-array replacement and optimistic UI side effects | Atomic membership changes, acknowledged target updates, duplicate-action coalescing and session guards | Four real-DB tests failed before fix; store/browser failure and ordering tests pass |
| P1 | Safety caches | Late feed, Story or Note results could restore hidden creators | Incoming snapshots bypassed current safety lists | Filter incoming snapshots and clear confirmed blocked/muted creators from caches | Delayed-response store regression |
| P2 | Activity layout | Empty-state label collapsed into an icon-sized box | CSS applied icon rules to every direct span | Scope icon styling to the first span | Actual mobile browser before/after inspection |
| P2 | Google sign-in | Invalid ARIA caused the complete browser suite to fail; a stalled SDK had no recovery | Label on a generic div and no bounded script-loading lifecycle | Labeled group, timeout, loading/error states, cleanup and Retry | Targeted axe scan, deterministic SDK failure/retry fixture, final full E2E pass |

## 4. Significant changes implemented

Six scoped technical commits were pushed:

1. `25735a7` — atomic privacy/preference patches and concurrency regressions.
2. `a153343` — truthful beta Settings, safe saves and accessible mobile controls.
3. `4363f1f` — recoverable Activity loading and stable notification/read state.
4. `a8c68c9` — visual correction for the Activity empty-state label.
5. `a18ac31` — atomic, confirmation-driven block/mute behavior and cache safety.
6. `509ab0d` — accessible, recoverable Google sign-in loading.

Visual browser checks informed the Activity CSS correction. The UX work also
adds meaningful pending/error/retry states instead of false success, protects
privacy choices, and retains the existing sign-in methods. It does not certify
subjective design quality across every page or physical device.

## 5. Verification results

| Check | Result and evidence boundary |
| --- | --- |
| API tests | **69/69 PASS**, serial, isolated PostgreSQL 16.15 and local Redis |
| Unit/integration checks | **30/30 PASS**, including session, settings, Activity, safety-list and migration guards |
| Production-browser E2E | **23/23 PASS**, Chromium, two workers, zero retries in the final complete run |
| Typechecks | **2/2 PASS**, API and social |
| Production build | **PASS**, DB/API/web; final social production build repeated after the last code change |
| Production migration | **PASS**, fresh isolated DB bootstrap and repeated idempotent run |
| Logical backup/restore | **VERIFIED LOCALLY**, synthetic isolated restore; details below |
| Frozen lockfile | **PASS**, offline frozen install; no lock drift |
| API contract | **PASS**, 200 operations across 167 paths |
| Production config | **PASS**, 44 API schema keys wired |
| Production Compose | **PASS**, `config --quiet` using the checked-in non-secret CI fixture |
| Production dependency audit | **PASS**, no known vulnerabilities reported |
| Diff hygiene / tracked-file secret scan | **PASS**, clean whitespace checks and no high-confidence key-pattern matches |
| Security regressions | **PASS** within the suites above, including existing consent, feature-gate, HTTP and socket checks |
| Docker images/runtime | **BLOCKED**, Docker Linux engine pipe unavailable; no image/runtime pass claimed |
| Local API | `/api/livez` **200** after restarting the final code |
| Dependency readiness | `/api/healthz` and `/api/readyz` **503**; unsupported Redis 3.0.504, worker unavailable |
| Production smoke | **BLOCKED**, `ECONNREFUSED 127.0.0.1:8080`; no production edge running |
| GitHub Actions | **BLOCKED before execution**, account billing lock; zero job steps ran |

The first complete E2E run during this continuation finished 21 passed / 1
failed and exposed the Google ARIA defect. It was repaired, a retry regression
was added, and the full final run passed all 23 without retries. The failure was
not suppressed or the accessibility threshold weakened.

Commands include `pnpm test:unit`, `pnpm test:e2e --workers=2`,
`node --import tsx --test --test-concurrency=1 src/__tests__/*.test.ts` from
`api-server`, both workspace typechecks, `pnpm build:pnpm`,
`pnpm --filter @workspace/social build`, `pnpm contract:check`,
`pnpm production-config:check`, `pnpm install --offline --frozen-lockfile`,
`pnpm audit --prod --audit-level=moderate`, and
`pnpm --filter @workspace/db migrate:production` against the isolated DB.
API tests use explicit test database/Redis URLs with external provider keys unset.

### Synthetic restore rehearsal

The freshly migrated `yor_continuation_release_20260831` database contained
one synthetic user and one related post. A custom-format `pg_dump` was restored
with `pg_restore --exit-on-error --no-owner --no-privileges` into the newly created
`yor_continuation_restore_20260831` database, without `--clean` or overwriting
existing data. Source/restored manifests matched:

- 64 tables, 179 indexes and 180 constraints; zero invalid constraints.
- One user, one post, matching row-content digests and the correct author join.
- Dump SHA-256: `4ED0125EB9E952C03AEC4CA196414F3A3C357556BB0226A09A81D3913FDC0DDB`.

The dump remains outside the repository. This verifies a local logical restore,
not production-data recovery, off-host retrieval, encryption, grants, retention,
scheduled backups or RPO/RTO. The [runbook](PRODUCTION_LAUNCH.md#4-backups-and-recovery)
now includes a safe isolated restore and verification procedure.

### Other limits

- E2E uses deterministic API/provider-boundary fixtures. The Google rendering
  fixture is not a real OAuth login or token-verification acceptance test.
- The secret scan checks tracked-file patterns, not complete Git history or all
  possible credential formats. No real credentials, dumps or QA logs were added.
- Separately, actual local API-backed Settings and Activity renders were inspected
  at desktop and 390-pixel mobile widths with no horizontal overflow. A local
  preview stall during the final restart recovered to the sign-in screen after
  reconnecting/reloading; no console errors were reported in that fresh view.
- Targeted axe checks include Settings, Activity, sign-in, inbox and home
  light/dark modes. This is not whole-app accessibility or real-device certification.
- The queue test exercises its degraded path on Redis 3. Actual BullMQ worker
  delivery still requires supported Redis 7 and production-like verification.
- Remaining build warnings are follow-up optimization: main JS about 573 kB /
  174 kB gzip, route-loaded LiveKit about 532 kB / 139 kB gzip, and shared CSS
  about 408 kB / 60 kB gzip. Warning thresholds were not raised.
- A prior incoming-conversation browser action was not retried because it would
  change read state. Newly created regression fixtures test that behavior instead.

## 6. External integrations

| Integration | Status | Remaining action |
| --- | --- | --- |
| Google OAuth | CONFIGURATION-READY / REQUIRES LIVE CREDENTIALS | Match API/web client IDs and allowed origins; test login, linking, rejection and expiry with real accounts |
| Resend | REQUIRES LIVE CREDENTIALS / REQUIRES DEPLOYMENT | Verify sender/domain and actual registration, email-code and reset delivery |
| Cloudinary | CONFIGURATION-READY / REQUIRES LIVE CREDENTIALS | Verify signed upload, rejection/size limits, ownership and media deletion |
| Moderation | VERIFIED LOCALLY at provider boundaries / REQUIRES LIVE CREDENTIALS | Run an approved acceptance corpus and outage test with real deployment configuration |
| TLS/domain | REQUIRES DEPLOYMENT | Verify DNS, HTTPS/renewal, headers, cookies, CORS and WebSocket upgrades |
| Monitoring | CONFIGURATION-READY / REQUIRES DEPLOYMENT | Route readiness/queue/error alerts and exercise incident escalation |
| Backups | VERIFIED LOCALLY for synthetic logical restore / REQUIRES DEPLOYMENT | Schedule encrypted off-host backups; verify production retrieval, roles, retention and recovery objectives |

## 7. Disabled features

Payments, live rooms, web push and RTC calling remain **INTENTIONALLY DISABLED**.
Existing server-side service/HTTP/socket gate regressions passed in the full API
suite. Settings no longer presents an active push toggle when the beta flag is
off. Keep corresponding API and `VITE_*` flags false; no live delivery, payment,
room or call reliability claim is made.

## 8. Remaining blockers

### Code blockers

None currently identified within the reviewed, disabled-feature core-beta scope
after the implemented repair/retest loop. Test counts are not exhaustive coverage.

### Infrastructure/deployment blockers

1. The [final code Actions run](https://github.com/yorayriniwnl/yor-talksv2/actions/runs/33372146351)
   failed before any step. GitHub's annotation states: "The job was not started
   because your account is locked due to a billing issue." The account owner must
   resolve it; pushes succeeded but do not establish CI verification.
2. Docker Desktop's Linux engine is unavailable. Production images, container
   startup/health and Nginx edge behavior have not been verified on this host.
3. Native Redis 3.0.504 cannot run the required worker. Readiness correctly fails;
   the user's service was not replaced, flushed or weakened to make checks pass.
4. No accepted public deployment, real-provider run, monitoring delivery or
   production backup/recovery exercise is available.

### Legal/manual verification

The owner must approve the actual operator identity/address, grievance contact,
dated legal policies, age/consent requirements, retention/deletion policy,
moderation/support process and incident ownership. Fixture values are not legal
approval. Configure secrets through the deployment secret mechanism, not chat.

### Post-beta improvements

Reduce shared bundle/CSS weight and extend browser/device, long-session,
concurrency/load and discovery-pagination coverage. Keep creator/commerce/studio
expansion separately scoped. Real deployment/provider/device acceptance remains
a launch gate rather than being postponed under this heading.

## 9. Git result

- Branch: `codex/public-beta-readiness`.
- Final tested application SHA: `509ab0db2b20fd77d934e6b37b70fcfbd0e1c0e3`.
- Six scoped technical commits pushed successfully; remote branch SHA matched
  the local application SHA. No force push or unrelated change bundling.
- Worktree was clean before this documentation-only handoff. The final docs
  commit, remote equality, clean-tree status and its CI result are checked after
  pushing and reported in the handoff message; CI must not be described as green.

## 10. Ordered launch checklist

1. Resolve the GitHub billing/account lock and require a successful complete CI
   run on the final pushed commit, including image builds and all critical jobs.
2. Provide a working supported Docker/Linux host with PostgreSQL 16 and Redis 7.
   Keep database/cache ports private and the four deferred feature families OFF.
3. Supply real production secrets/provider configuration, matching legal and
   frontend/API values, and approved Google origins; obtain operator/legal approval.
4. Take an encrypted off-host backup and complete an isolated production recovery
   rehearsal. Run the reviewed migration with the API's contact secret and verify it.
5. Build with `--pull`, start production Compose, configure TLS, and require healthy
   database, Redis, API and notification worker plus health/readiness HTTP 200.
6. Run `BASE_URL=https://actual-beta-domain pnpm smoke` through the real edge;
   check headers, assets, cookies, CORS, WebSockets and restart/reconnect behavior.
7. Accept real password/email-code/Google sign-in, consent, upload/rejection,
   posts/replies, privacy saves, private follows, DMs/groups, block/report,
   export/deletion and grievance persistence; use real mobile/desktop networks.
8. Exercise alerts, escalation, backup retrieval and rollback, then invite a limited
   cohort and monitor errors/readiness before expanding access.
