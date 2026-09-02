# Yor Talks — public-beta continuation audit

Assessment: 2 September 2026. Branch: `codex/public-beta-readiness`.
Final tested application revision before this documentation-only handoff:
`949dc290578fe9e593c6d424f4fc2de10184c591`.

## Verdict

**B. CODE-READY, DEPLOYMENT BLOCKED**

The reviewed public-beta code, migrations and production container stack are
locally release-ready. This pass closes the previous local Docker and Redis
runtime blockers. It does not establish that a public deployment, live provider,
domain, monitoring path or production recovery process works. Payments, live
rooms, web push and RTC calls remain intentionally disabled.

## Defects found and fixed

| Severity | Area | Reproduced problem | Fix and regression evidence |
| --- | --- | --- | --- |
| P0 | Production API/migration images | The image switched to `node`, but Corepack kept pnpm in root's cache. Both runtime commands attempted a network download and migration exited 1. | Install pinned pnpm 9.15.4 in a shared Corepack home, make it readable, and execute `pnpm --version` after `USER node` during every image build. Fresh migration now exits 0 and API runs as UID 1000. |
| P1 | Production rate limiting | Eight Redis stores loaded Lua scripts before their sockets were writable, emitting asynchronous initialization errors at every API start. | Share one explicitly connected lazy Redis client, serialize its first connection, close it during graceful shutdown, and keep the offline queue disabled. Startup logs are clean and a real `yor:rate:api:*` counter is created. |
| P2 | Navigation accessibility | Legal and recovery routes rendered links containing buttons, creating invalid nested interactive controls. | Use the button component's `asChild` contract across 10 routes. A direct DOM assertion failed before the repair; the legal-page axe and nested-control checks now pass. |
| P2 | Loading accessibility | Feed and route skeletons had visual loading state without a consistently announced status. | Preserve `role="status"` and accessible labels, and delay the first feed response in Chromium to prove that “Loading feed” is announced. |
| P2 | Browser test isolation | The preview server was hard-coded to port 4173 and failed when another verified local service already owned the port. | Add a validated `PLAYWRIGHT_PORT` override while preserving 4173 as the default. The complete suite passes on an isolated port. |
| Release safety | CI depth | CI built images but never proved that migrations or the assembled production stack could start. | CI now builds migration/API/web images and rehearses fresh migration, health/readiness, non-root execution, Redis-backed limiting and clean startup logs, with automatic volume cleanup. |

Scoped commits for this continuation are `a721378`, `1cc63f9`, `31d8642`,
`76e0d9b`, `d556427` and `949dc29`. All were pushed without force-pushing.

## Final verification matrix

| Check | Result and evidence boundary |
| --- | --- |
| API tests | **69/69 PASS**, serial, isolated PostgreSQL and Redis 7 |
| Unit/integration tests | **30/30 PASS** |
| Chromium E2E | **24/24 PASS**, six workers, zero retries in the final run |
| Typechecks | **2/2 PASS**, API and social |
| API contract | **PASS**, 200 operations across 167 paths |
| Production configuration | **PASS**, all 44 API schema keys wired |
| Workflow and Compose parsing | **PASS** |
| Production image build | **PASS**, fresh Node 24 API/migration and Nginx web images |
| Production migration | **PASS**, fresh PostgreSQL 16 database, exit 0 |
| Production services | **PASS LOCALLY**, PostgreSQL, Redis 7, API and web healthy |
| Edge health | **PASS LOCALLY**, `/`, `/sign-in`, `/terms`, `/api/healthz`, `/api/livez` and `/api/readyz` returned 200 through Nginx |
| Runtime privilege | **PASS**, image config is `node`; API processes run as UID 1000 |
| Rate-limit store | **PASS**, clean startup logs and a persisted Redis counter after a real request |
| Graceful shutdown | **PASS**, SIGTERM logs completion and exits 0 |
| Production browser inspection | **PASS LOCALLY**, settled 390×844 and 1440×900 sign-in/legal views, no horizontal overflow, nested interactive elements or console errors |
| Git push | **PASS**, local and remote application SHA matched `949dc290578fe9e593c6d424f4fc2de10184c591` before this docs handoff |
| GitHub Actions | **BLOCKED BEFORE EXECUTION**, run [#173](https://github.com/yorayriniwnl/yor-talksv2/actions/runs/33601711396) failed in six seconds because the account is billing-locked |

The browser inspection used the actual production Nginx container rather than a
source screenshot. Mobile sign-in preserved password, email-code, Google and
account-creation paths. Desktop displayed the complete two-panel experience.
The legal page exposed dated policy content and a single semantic Back link.

The build still reports optimization warnings for the main JavaScript, route-
loaded LiveKit and shared CSS chunks. Warning thresholds were not raised. An
optional `better-sqlite3` native install is skipped in the Alpine build because
Python is absent; that optional development dependency is not used by the API or
web runtime, and the frozen install, build and production rehearsal complete.

## Remaining launch blockers

1. Resolve the GitHub account billing lock and require a complete green run on
   the final pushed commit. The new production-stack CI step has not executed on
   GitHub yet; local equivalence is not a substitute.
2. Supply approved production values and credentials for Google OAuth, Resend,
   Cloudinary and one moderation provider. Run real-account registration,
   email-code, reset, linking, upload, rejection and provider-outage acceptance.
3. Approve the real operator identity, address, grievance contacts, governing
   terms, dated legal copy, retention/deletion policy and incident ownership.
   The checked-in CI values are fixtures, not launch data or legal approval.
4. Deploy to the intended domain and verify DNS, HTTPS renewal, security headers,
   cookies, CORS, WebSocket upgrades, restarts and mobile network behavior through
   the public edge.
5. Configure alert delivery and encrypted off-host backups, then prove production
   retrieval, isolated recovery, access roles, retention and rollback objectives.
6. Keep payments, live rooms, web push and RTC disabled until each has separate
   provider, security, operational and user-acceptance evidence.

## Release order

After the external blockers are resolved: run the complete CI workflow, deploy
this exact reviewed branch, run `BASE_URL=https://actual-beta-domain pnpm smoke`,
exercise the core user/safety/grievance flows with real providers, verify alerts
and recovery, and then invite a limited cohort while monitoring readiness and
error rates. Do not label the service publicly launched from local evidence alone.
