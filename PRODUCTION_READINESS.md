# Production Readiness Report

Status as of 10–11 October 2026: repository and isolated candidate checks pass; verified candidate revision is **`aca6ccb`** (`feat(release): integrate staging hosting target preparation and release-scope verification into unified release candidate`). Full production launch remains blocked by the persistent backend/worker target deployment and owner policy decisions detailed below.

### Unified Release Candidate Acceptance (Revision `aca6ccb`)

1. **Repository & Local Release Verification:**
   - **Root unit tests (`pnpm test:unit`):** **104 passed**, 0 failed, 0 skipped.
   - **Browser E2E acceptance (`pnpm test:e2e`):** **73 passed**, 0 failed, 0 skipped (production Vite preview mode, 0 retries).
   - **Contract drift checks (`pnpm contract:check`):** Verified 237 operations across 200 paths, zero drift.
   - **Design token check (`pnpm design:check`):** YOR design tokens valid.
   - **Production config wiring (`pnpm production-config:check`):** Covers 70 schema keys.
   - **Production dependency audit (`pnpm audit --prod`):** No known vulnerabilities found.
   - **Workspace builds & typechecks:** `@workspace/db` (clean), `lib/api-zod` (clean), `@workspace/api-server` (clean typecheck and build), `@workspace/social` (clean typecheck and Vite production client build).
   - **Deployment configuration validation (`pnpm deployment-config:validate`):** Fail-closed verification with secret entropy, placeholder detection, and permission checks.

2. **Mobile Performance Acceptance:**
   - **10 October repair (`9ceaf52`):** Embedded accessible shell, resolved long-task blocking from Framer Motion over-instantiation under reduced motion, gated background canvas RAF, and removed duplicate keyframe tags.
   - **Throttled mobile emulation acceptance (3/3 passed):**
     - **FCP:** 1,884 / 1,880 / 1,848 ms ($\le 2,500$ ms budget) — **Passed 3/3**
     - **LCP:** 3,068 / 3,088 / 3,088 ms ($\le 4,000$ ms budget) — **Passed 3/3**
     - **Long-task blocking:** 178 / 228 / 206 ms ($\le 300$ ms budget) — **Passed 3/3**
     - **JS Gzip:** 273,007 bytes ($\le 358,400$ bytes budget) — **Passed 3/3**
     - **CSS Gzip:** 62,177 bytes ($\le 102,400$ bytes budget) — **Passed 3/3**
     - **Exit code:** 0 / 0 / 0 (All passed). Evidence in `docs/hardening/mobile-performance-unified-2026-10-10.md`.

3. **Off-Host Backup & Disaster Recovery Acceptance:**
   - **10 October operational drill (`c885e29`):** Full 101-table catalog, 270 indexes, 302 constraints, release migration ledgers, asymmetric `age` encryption, remote WebDAV retrieval over TCP HTTP, and transactional restore with rollback. Evidence in `docs/operations/OFFHOST_BACKUP_RECOVERY_ACCEPTANCE_2026-10-10.md`.

4. **Release-Scope & Policy Guard Alignment:**
   - **Scope determination (`9450914`):** Strictly bounded as **Adult (18+) Closed Testing Beta**. Age 18 strictly enforced, closed-audience allowlists active, and unaccepted capabilities (payments, live rooms, web push, RTC direct calls, creator memberships) fail closed before database queries. Evidence in `docs/RELEASE_SCOPE_AND_POLICY_DECISIONS_2026-10-10.md`.

5. **Live Origin Smoke Test Result:**
   - Live smoke test executed against `https://yor-talks.vercel.app` with `SMOKE_SYNTHETIC_PROVIDERS=false` exits **1**. Vercel serves static frontend assets (200), but lacks CSP headers and returns HTTP 500 (`FUNCTION_INVOCATION_FAILED`) on `/api/readyz` because Vercel serverless execution cannot host persistent PostgreSQL, Redis, Socket.IO, BullMQ, or the in-container ffmpeg decoder. Promoting this static preview to production without a persistent backend target remains explicitly blocked.

Historical release evidence for earlier revision `3887cc4` and phase-specific checks follows; it does not replace the current result above.

Published unified release [3887cc4](https://github.com/yorayriniwnl/yor-talksv2/commit/3887cc47aa8d0abb718f44952fbfb33d6233e109) passed both [push CI](https://github.com/yorayriniwnl/yor-talksv2/actions/runs/37868624235) and [PR CI](https://github.com/yorayriniwnl/yor-talksv2/actions/runs/37869588581): **392 API / 73 browser / 71 unit tests per run, zero failures/skips**. Audit, contracts, typechecks, builds, monitoring, production images, encrypted backup/restore, native Nginx (3 valid accepted / 8 invalid rejected) and the isolated synthetic stack passed.

The [protected frontend preview](https://yor-talks-jpub2ler5-yorayriniwnl-1218s-projects.vercel.app/) is READY and passed **14 deployment checks**, including mobile Chromium, security headers and a served JavaScript hash match. It contains static frontend assets; API and Socket.IO routes return 503, so sign-in and backend journeys remain unavailable. The production domain was not promoted.

The historical mobile measurements from 9 October (`docs/hardening/mobile-performance-unified-2026-10-09.json`) recorded earlier FCP/blocking failures prior to the 10 October repair (`9ceaf52`). Full production launch still requires the persistent backend/worker target and runtime bindings, real providers/public ingress, actual alert receiver, approved off-host recovery and owner/legal/retention acceptance. Minimum age 18 and disabled payments/live/push/RTC remain in force. See the [continuation record](docs/hardening/CONTINUATION_2026-10-09.md) for exact source, artifact and historical evidence.

Earlier phase-specific evidence follows; it does not replace the current result above.

## Executive summary

The publication result above is current; the earlier checks below retain their
historical scope. The completed CI restore uses an isolated local rclone remote.
Live providers, the selected production backend/worker host and public ingress,
delivery to the actual alert receiver, approved off-host recovery and agreed
retention/legal scope remain launch gates.

## Scope and boundary

This report covers:

- backend startup and dependency safety
- database and Redis readiness
- production configuration validation
- Docker Compose configuration validity
- typecheck and build integrity
- deployment gating for required production secrets and flags

This report does not claim:

- live provider acceptance
- production TLS or DNS validation
- remote monitoring/alert verification
- production off-host backup/restore acceptance
- real end-user traffic validation
- public deployment safety beyond repo-level checks

## Verified checks

The following checks were reported as passing during an earlier readiness review; they have not been rerun as part of this report update:

```bash
pnpm install --frozen-lockfile
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/social build
pnpm production-config:check
docker compose --env-file ops/ci-production.env -f docker-compose.production.yml config --quiet
```

Additional evidence already present in the repo and CI configuration includes:

```bash
pnpm test:unit
pnpm --filter @workspace/db build
pnpm --filter @workspace/db migrate:beta
pnpm test:e2e
pnpm contract:check
pnpm --filter @workspace/social typecheck
```

These checks are valid evidence for the repository in a local/CI environment, but they do not replace live-deployment validation. If the environment is not bootstrapped with the required Postgres schema, the full backend test suite may fail with missing table errors; that is a setup issue, not a justification to weaken runtime gates.

## What was hardened

The backend now fails closed in production when critical dependencies are absent or unhealthy.

Key changes include:

- startup dependency checks before the API fully boots
- readiness reporting for database and Redis states
- explicit 503 behavior when a dependency is unhealthy
- safer worker shutdown and production gating to avoid a false-positive “ready” service
- stricter production config validation with missing/placeholder secret failures

These changes are the minimum high-impact production safety improvements that improve reliability without expanding scope into frontend work.

## Verified status by area

### Backend safety

Status: good

- strict env validation exists for required runtime values
- empty or placeholder production secrets are rejected
- startup exits early when required infra is missing in production
- health/readiness endpoints report dependency states explicitly

### Database and Redis

Status: acceptable in repo, not live-verified

- Postgres and Redis are expected infrastructure dependencies
- Compose files define them for local and production deployment
- health checks and readiness logic exist
- actual live Redis/Postgres availability still needs deployment validation

### Docker and deployment wiring

Status: published production images and isolated stack passed in CI; intended
production target acceptance remains open.

- production Compose file is structurally valid
- env example and CI fixture values are present and non-secret
- Dockerfiles are production-oriented and use Node 24 and non-root runtime sets
- exact-commit CI built and ran the images, backup drill and native Nginx checks
- the local Windows host lacked Docker; deployment on the intended host remains unverified

### Security posture

Status: improved but not fully deployment-verified

- secrets are not committed in repo fixtures
- production config fails closed on missing values
- security headers and safe defaults are expected in the app and smoke checks
- live TLS, origin acceptance, and external provider security are still outside repository verification

### Tests and build health

Status: repo-level checks are green, not a substitute for live acceptance

- typecheck/build checks pass in repository validation
- production config checks pass
- Docker config validation passes
- API/browser tests are present and repo-backed, but they are not equivalent to live deployment verification

## Unverified checks and blockers

The following remain intentionally unverified and must be treated as launch gates:

### P0 remaining risks

1. Live provider acceptance
   - Google OAuth, Resend, Cloudinary, moderation, LiveKit, and other provider boundaries are not live-verified.
   - Missing production credentials correctly block startup or feature use, but a real provider flow is still required.

2. Intended backend and worker deployment
   - Docker image and isolated container-stack checks passed for `990fc06` in CI.
   - The persistent production host, matching API/workers and real configuration still require deployment acceptance.

3. TLS and domain verification
   - HTTPS, cookie policy, CORS, WebSocket upgrades, and browser trust need real deployment validation.

4. Monitoring and incident handling
   - Alerting and operational dashboards are not proven in a real deployment environment.

### P1 remaining risks

1. Approved off-host backup and recovery
   - CI encryption, retrieval, application restore and failure guards passed with an isolated local transport.
   - Actual off-host retrieval/restore, recovery owners and RPO/RTO still require approval and testing.

2. Production smoke deployment
   - isolated production container smoke passed; actual public backend/edge acceptance remains open

3. Operational readiness
   - queue health, worker recoverability, and long-running service behavior need production evidence

## Deployment checklist

Before enabling a real deployment, complete all of the following:

1. Deploy and validate the reviewed images on the intended persistent host.
2. Set production secrets in a secure environment file.
3. Confirm Postgres and Redis are healthy and compatible with the expected versions.
4. Validate the production Compose stack with `.env.production` and the project’s configuration checks.
5. Verify the API startup path and health endpoints on the real deployment target.
6. Validate login, refresh, and auth flows with real credentials and allowed-domain rules.
7. Test all required external providers with real accounts.
8. Confirm TLS, browser-origin behavior and owner-approved proxy peers in `TRUSTED_PROXY_CIDRS` and, when used, `TRUSTED_EDGE_CIDRS`; verify distinct client limits and reject spoofed forwarding.
9. Run normal smoke against the deployed site and API with `details.media.ready=true`, decoder readiness and healthy notification/lifecycle workers. Synthetic provider smoke is CI-loopback-only.
10. Verify monitoring, alerting, and rollback steps are tested.

## Rollback checklist

If production deployment issues appear:

1. Pause the rollout or affected traffic, preserve evidence, and check migration compatibility before selecting an older image or Compose revision.
2. Retain the database and additive schema. An application rollback must preserve authentication revocation, shared-message history, media and financial invariants; do not automatically restore a production database.
3. Revert compatible configuration values through the approved deployment process.
4. Confirm Redis and Postgres are healthy without erasing durable state or flushing queues. Database recovery is a separate operator-approved procedure: verify the backup into an isolated empty target with an explicit matching `RESTORE_TARGET_DATABASE`, validate it, then separately approve promotion.
5. Re-run health and readiness checks before enabling traffic.
6. Reassess provider credentials and deployment environment variables before retry.
7. Do not re-enable optional features until they have been live-tested.

## Honest release note

Published repository and isolated container checks pass, and a protected frontend
review preview is available. Full production launch remains blocked by the
intended backend/worker deployment, live provider and operational acceptance,
owner/legal/retention decisions and the recorded performance failures. The
discarded editor-splitting experiment failed FCP/blocking in all three samples
and LCP in two; the original two failed metrics remain historical evidence. The retained
continuation also fails FCP/blocking in all three final samples and LCP in two.

## Earlier documentation phase

The earlier report update was documentation-only and made no commit or push.
Subsequent publication and exact-commit CI are recorded above and in the linked
8 October reports; those later results do not rewrite the historical checks.
