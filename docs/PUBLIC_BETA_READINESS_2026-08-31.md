# Yor Talks — final public-beta re-audit

Assessment: 31 August 2026. Audited code: `fc65981` through
`a04ddc0c57447b7013753b383ea9bf5d73541b8e` on `codex/public-beta-readiness`.
The subsequent documentation commit does not change the tested application.

## 1. Final verdict

**B. CODE-READY, DEPLOYMENT BLOCKED**

No known repository-level blocker remains in the reviewed core beta with
payments, live rooms, web push and RTC disabled. This is not a claim that every
planned product feature is complete, that no bugs remain, or that a public
deployment has been verified. Infrastructure and live acceptance gates below
prevent public-launch approval.

| Readiness dimension | Score / 100 |
| --- | ---: |
| Overall | 72 |
| Code | 91 |
| Security | 85 |
| CI/CD | 60 |
| Deployment | 35 |
| Operations | 40 |

Scores are engineering judgments, not measured coverage or a security certification.

## 2. What was re-audited

- Account registration, password/email-code/Google entry points, consent,
  refresh/logout/session races, TOTP/device-approval wiring, rate limits and
  origin checks. Live Google and email delivery remain unverified.
- Public/owner user serialization, follow requests, favorites, blocked users,
  contact privacy, posts, comments, deep links, discovery, timestamps and cache recovery.
- Direct/group message persistence, concurrent conversation creation, ordering,
  read receipts, privacy opt-outs, socket authorization, payload limits and abuse budgets.
- Core responsive shell, authentication, home, discovery, profiles, comments,
  inbox, keyboard navigation, loading/error/empty states and targeted accessibility.
- Service regressions for communities, Stories, Notes, events, marketplace
  saves, search, export/deletion, grievances and operational metrics.
- Moderation provider boundaries, media signature validation, disabled feature
  gates, environment wiring, dependencies, Docker build contexts/base images,
  migrations, production Compose, smoke checks, CI and deployment documentation.

## 3. Confirmed defects and resolution

| Severity | Area | Problem | Root cause | Resolution | Verified |
| --- | --- | --- | --- | --- | --- |
| P0 | Moderation | Malformed provider output could appear safe | Coerced/partial responses | Strict category/score validation; fail closed | API adversarial tests |
| P0 | Realtime | Revoked/stale-consent sessions could keep acting | Insufficient event-time authorization | Recheck session/consent; strict payloads, budgets and expiry | Socket regressions |
| P0 | Privacy | Public profiles could leak private/future fields | Denylist serialization | Explicit public-field allowlist | User-view tests |
| P0 | Migration | Unrelated tables could be treated as an empty database | Only known base tables counted | Refuse nonempty incomplete schemas; require contact secret | Unit + real isolated DB refusal |
| P1 | Sessions | Old responses could restore a signed-out account or cross accounts | No client session epoch | Invalidate stale reads/refreshes; safe logout | Nine client-session tests |
| P1 | Authentication | Normal feed traffic exhausted login allowance | Auth limiter mounted on all API traffic | Scope limiter; bound approval polling | HTTP limiter regression |
| P1 | Messaging | Concurrent first messages created multiple DMs | Lookup/insert race; reproduced five threads | Transactional pair lock and canonical direct conversation | Real DB concurrency test |
| P1 | Messaging | New messages did not reorder old conversations | Conversation timestamp not updated | Transactionally advance activity time | Real DB ordering test |
| P1 | Messaging | Group read state leaked across recipients | Shared single-recipient receipt field | Viewer-specific persisted read receipts | Real DB reload tests |
| P1 | Privacy | Message-request opt-out ignored; groups bypassed restrictions | Inconsistent contact checks | Enforce both settings for creation and existing threads | Two direct/group opt-out tests |
| P1 | Relationships | Follows disappeared; pending requests/favorites reset | Incomplete owner snapshots and destructive mapping | Private relationship hydration and preserved partial updates | API + browser reload/cancel tests |
| P1 | Posts | Shared uncached links could load forever | Detail page read only the feed cache | Independent fetch and retry; reply recovery | Production-browser regression |
| P1 | Drafts | Failed comments/wall posts could lose text; duplicate sends possible | Clear-before-success and weak pending guards | Preserve drafts; synchronous send guards; disabled pending inputs | Failure/double-send browser tests |
| P1 | Inbox | Errors looked empty; navigation lost drafts; search hid active thread | Swallowed failures and page-local state | Retry state; session-only per-thread drafts; independent active selection | Browser regressions + inbox axe scan |
| P1 | Payments | Old pending checkout could bypass the disable switch | Early cached-order return | Gate creation/reuse/verification before data access | Service tests + HTTP gates |
| P1 | Containers | Production env files could enter build context; old runtime bases | Narrow ignore patterns and EOL bases | Exclude env/key files; Node 24 / Nginx 1.30 | Static/config checks; image build blocked |
| P1 | CI | Beta branch and new checks were not covered | Trigger/step gaps | Beta branch triggers, unit/browser/image checks, failure artifacts | YAML/config review; runner blocked |
| P2 | UI accuracy | Fake XP, mutual followers, presence and repost success | Hardcoded or wrong action/data source | Earned progress, authorized relationships, truthful status/actions | API/browser checks + visual review |
| P2 | Time | Database times could shift with browser timezone | Naive UTC timestamps parsed as local | Normalize date fields only | Timestamp unit regression |
| P2 | UX/accessibility | Dense feed, weak contrast, oversized overlays and unclear failures | Competing styles and missing state design | Calmer mobile-first hierarchy, contrast, compact trays, retry and keyboard states | Real browser + targeted axe scans |

## 4. Significant implementation changes

Twenty scoped technical commits were pushed during this re-audit. Security
and correctness fixes were kept separate from the core UX pass and CI changes.
Home/auth/discovery now share a calmer visual system; profiles show earned
progress; comments and messages preserve failed drafts; disabled commercial
actions are hidden. Browser inspection drove mobile/contrast refinements.
The official [OpenAI moderation schema](https://developers.openai.com/api/reference/resources/moderations)
informed fail-closed provider validation. Runtime updates were checked against
the [Node release schedule](https://nodejs.org/en/about/previous-releases) and
[Nginx downloads](https://nginx.org/en/download.html).

## 5. Verification results

| Check | Exact result / scope |
| --- | --- |
| API tests | **61/61 PASS**, serial; isolated PostgreSQL 16.15 and local Redis |
| Root unit/integration checks | **17/17 PASS**, including session, UI-state and migration guards |
| Production-browser E2E | **17/17 PASS**, Chromium, two workers, **zero retries** |
| API + social typechecks | **2/2 PASS** |
| Production build | **PASS** — DB package, API bundle and web production build |
| Database migration | **PASS** — final script bootstraps fresh DB and repeats successfully; nonempty unrelated fixture refused without modifying its table |
| Docker runtime / image build | **BLOCKED** — Docker Linux engine pipe unavailable; images not built or run here |
| Production Compose validation | **PASS**, `config --quiet` with checked-in CI fixture |
| Contract | **PASS**, 200 operations across 167 paths |
| Production config | **PASS**, 44 API schema keys wired |
| Frozen lockfile | **PASS**, offline frozen install; no lock drift |
| Production dependency audit | **PASS**, no known advisories reported |
| Security regressions | **PASS** in the suites above; includes 26 HTTP gate checks across `/api` and `/api/v1` plus socket gates |
| Secret-pattern scan / diff hygiene | **PASS**, no high-confidence tracked-key matches; `git diff --check` clean |
| Local API liveness | `/api/livez` **200** |
| Local dependency readiness | `/api/healthz` and `/api/readyz` **503**, expected for unsupported Redis 3.0.504 |
| Production smoke | **BLOCKED/failed to connect**, no production edge on port 8080 |
| Remote CI | **BLOCKED before execution**, account billing lock; zero job steps ran |

Commands: `pnpm test:unit`; `pnpm test:e2e --workers=2`;
`node --import tsx --test --test-concurrency=1 src/__tests__/*.test.ts`
from `api-server` with isolated test DB/Redis URLs and provider keys unset;
both workspace `typecheck` commands; `pnpm build:pnpm`;
`pnpm contract:check`; `pnpm production-config:check`;
`pnpm audit --prod --audit-level=moderate`;
`pnpm --filter @workspace/db migrate:production` with explicit isolated DB and secret.

Evidence boundaries:

- Browser E2E uses deterministic API fixtures. Separately, the in-app browser
  exercised the real local API/Postgres for login, publishing, replies,
  likes/bookmarks and refresh persistence. Desktop and 390-pixel mobile home
  renders were inspected; the latter had no horizontal overflow.
- Targeted axe scans cover home in light/dark modes, sign-in and inbox. This
  is not a whole-application accessibility certification or physical-device test.
- A live incoming-conversation UI action was not run because it would mark a
  message read. No alternate path was used. Read-state regressions used newly
  created test fixtures instead.
- The queue test passed its degraded path on Redis 3; **BullMQ worker delivery
  has not been verified**. Production requires the configured Redis 7 service.
- The secret scan is a tracked-file pattern check, not a full-history scanner
  or penetration test. External credentials were not printed or committed.
- Build warnings remain: main JS about 571 kB / 173 kB gzip, route-loaded
  LiveKit about 532 kB / 139 kB gzip, shared CSS about 408 kB / 60 kB gzip.
  Warning thresholds were not raised to hide these.

## 6. External integrations

| Integration | Status | Remaining action |
| --- | --- | --- |
| Google OAuth | Wiring reviewed; live flow **UNVERIFIED** | Configure matching client IDs/origins and test linking, expiry and allowed/disallowed accounts |
| Resend | Simulated dispatch tested; live delivery **UNVERIFIED** | Verify sender/domain; deliver registration, email-code and reset messages |
| Cloudinary | Validation/config reviewed; live upload **UNVERIFIED** | Test signed uploads, rejection/size limits and account-media deletion |
| Moderation | Adversarial response/failure tests pass; live provider **UNVERIFIED** | Run a reviewed safe/blocked corpus and outage test with real deployment credentials |
| TLS/domain | **UNVERIFIED** | Configure DNS/HTTPS/renewal; validate cookies, headers, CORS and WebSocket upgrades |
| Monitoring | Metrics regression-tested; live alert routing **UNVERIFIED** | Configure readiness/queue/error alerts and exercise incident escalation |
| Backups | Runbook provided; restore **UNVERIFIED** | Encrypted off-host backup and successful restore to a separate environment |

## 7. Disabled features

| Feature | Beta state | Server-side gate evidence |
| --- | --- | --- |
| Payments | OFF, including existing checkout reuse | Creation/verification service guards and HTTP route checks |
| Live rooms | OFF | HTTP create/token/status/read boundaries and socket gate |
| Web push | OFF | Public-key, subscribe and unsubscribe HTTP guards |
| RTC calls | OFF | Socket call-offer rejection; frontend controls gated |

Keep corresponding API and `VITE_*` flags false. No live payment, room,
push-delivery or RTC reliability claim is made. Code paths being present are
not approval to enable them.

## 8. Remaining blockers

### Code blockers

None currently identified within the reviewed, disabled-feature core-beta
scope after the repair/retest loop. This is bounded evidence, not a guarantee
that every route and future feature is defect-free.

### Infrastructure/deployment blockers

1. GitHub Actions account lock. The [audited code run](https://github.com/yorayriniwnl/yor-talksv2/actions/runs/33351350493)
   ended without executing a step. GitHub's annotation states: “The job was not
   started because your account is locked due to a billing issue.” Pushes succeeded.
2. Docker Desktop's Linux engine is unavailable on this Windows host. Production
   images, Nginx headers/asset serving and container health remain unverified.
3. Existing Redis 3.0.504 is below the queue compatibility requirement. Local
   readiness correctly rejects it. The user's service was not replaced or flushed.
4. No verified public deployment or live provider acceptance run is available.

### Legal/manual verification

Owner-approved operator identity/address, dated policies, grievance contact,
age/consent requirements, moderation process, retention/deletion policy and
incident/support ownership must be confirmed for the actual deployment. Test
fixture legal values are not legal approval. Do not place real secrets in chat.

### Post-beta improvements

Reduce shared bundle/CSS weight; extend Firefox/Safari/physical-device and
long-session/concurrency/load coverage; improve discovery pagination; complete
separately scoped creator/commerce/studio experiments. Real-device/provider
acceptance is a launch gate, while broader product expansion is not part of
this core-beta verdict.

## 9. Git result

- Branch: `codex/public-beta-readiness`.
- Audited code SHA: `a04ddc0c57447b7013753b383ea9bf5d73541b8e`.
- Twenty technical commits pushed; remote branch SHA matched the local code
  SHA before this documentation-only handoff. No force push or unrelated edit bundling.
- The final documentation commit and remote SHA are reported in the handoff
  message; its CI status must not be represented as green while billing is locked.
- Worktree was clean before documentation; verify clean again after committing it.

## 10. Ordered launch checklist

1. Resolve the GitHub billing/account lock; rerun CI on the final pushed commit
   and require every verification/image-build step to complete successfully.
2. Provision a supported Docker/Linux host or repair Docker explicitly. Use
   PostgreSQL 16 and Redis 7; keep dependency ports private and retain feature flags OFF.
3. Configure production-only secrets, matching API/frontend/legal values,
   Resend, Cloudinary, moderation and Google origins. Obtain operator/legal approval.
4. Take and restore-test an encrypted backup. Run the production migration
   with the same contact secret as the API; inspect logs and verify schema/index health.
5. Build with `--pull`, start production Compose, configure TLS and verify
   healthy API/database/Redis/worker services. Require both health and readiness 200.
6. Run `BASE_URL=https://actual-beta-domain pnpm smoke` through the real edge;
   verify headers, asset caching, cookies, CORS and Socket.IO reconnect behavior.
7. Exercise real email/password/Google sign-in, consent, upload/rejection,
   publishing/replies, private follows, multi-user DMs/groups, blocking/reporting,
   export/deletion and grievance persistence. Test adverse networks on real devices.
8. Exercise alerting, backup recovery, support escalation and rollback. Only
   then invite a limited cohort; monitor errors/readiness before expanding.
