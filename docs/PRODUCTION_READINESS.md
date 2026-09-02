# Production Readiness

## Evidence-based score

**90/100 for the bounded beta scope.**

This score reflects verified repository behavior and local container-backed validation. It is not public-launch approval: live providers, TLS, monitoring, restore drills, and sustained production traffic still require external acceptance.

## Verification boundary

### Verified locally

- Postgres 16 and Redis 7 ran through the project Docker Compose stack.
- Beta and production migrations completed successfully.
- Production API and web Docker images built successfully.
- Production Compose configuration validated with `config --quiet`.
- Frontend and backend production builds completed.
- Frontend and backend typechecks completed.
- API contract and production configuration checks completed.

### Verified by automated tests

- Root unit suite: **25 passed, 0 failed**.
- Full API suite: **68 passed, 0 failed**.
- Full Playwright E2E suite: **21 passed, 0 failed**.
- Queue regression: **6 passed across 3 runs, 0 failed**.
- Production dependency failure behavior fails closed.
- Upload signature, Socket.IO authorization, account deletion/export, concurrency, privacy, migration, and session regressions are covered.
- `pnpm audit --prod --audit-level=moderate`: **no known vulnerabilities** after pinning `qs` to patched `6.16.0`.

### Requires real infrastructure

- TLS, DNS, reverse proxy, secure cookies, CORS, and WebSocket upgrades.
- Production alerting, dashboards, queue monitoring, and incident escalation.
- Encrypted off-host backups and restore into a separate target.
- Redis failover, multi-instance behavior, rolling restart, and sustained load.

### Requires manual acceptance testing

- Google OAuth, Resend, Cloudinary, moderation, and other provider flows.
- Any later enablement of Razorpay, LiveKit, Web Push, or RTC.
- Real-device browser coverage and operational support/abuse drills.

## Changes in this final pass

- Restored the corrupted queue implementation and regression test.
- Added explicit Redis URL injection to `QueueService`, removing module-load environment ordering from outage tests.
- Preserved pending notification jobs while Redis is unavailable.
- Added bounded timeouts for outbound provider requests.
- Reduced noisy expected Redis readiness errors.
- Fixed dark-mode and operator red action contrast failures found by Axe.
- Pinned transitive `qs` to `6.16.0` and refreshed the lockfile.

## Files changed

- `api-server/src/services/queue-service.ts`
- `api-server/src/__tests__/queue-service.test.ts`
- `api-server/src/lib/fetch-with-timeout.ts`
- `api-server/src/__tests__/fetch-timeout.test.ts`
- `api-server/src/lib/redis-compat.ts`
- `api-server/src/services/email-service.ts`
- `api-server/src/services/razorpay-service.ts`
- `social/src/index.css`
- `social/src/styles/operator-communications.css`
- `package.json`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `docs/PRODUCTION_READINESS.md`

## Exact verification commands

```bash
pnpm test:unit
pnpm --filter @workspace/social typecheck
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/social build
pnpm --filter @workspace/api-server build
pnpm production-config:check
pnpm contract:check
pnpm --filter @workspace/db build
pnpm test:e2e
pnpm audit --prod --audit-level=moderate
docker compose --env-file ops/ci-production.env -f docker-compose.production.yml config --quiet
docker compose --env-file ops/ci-production.env -f docker-compose.production.yml build api web
```

Full API integration command, run against migrated Postgres 16 and Redis 7:

```bash
cd /workspaces/yor-talksv2/api-server
NODE_ENV=test DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/yor_talks REDIS_URL=redis://127.0.0.1:6379 JWT_SECRET=ci-access-secret-012345678901234567890123456789 JWT_REFRESH_SECRET=ci-refresh-secret-012345678901234567890123456789 CONTACT_SHIELD_SECRET=ci-contact-shield-secret-012345678901234567890123 node --import tsx --test --test-concurrency=1 src/__tests__/*.test.ts
```

Migration validation completed with `pnpm --filter @workspace/db migrate:beta` and `pnpm --filter @workspace/db migrate:production` against the running Postgres database.

## Original queue failure and root cause

The original isolated run failed before assertions with esbuild `Unexpected ")"` at `queue-service.test.ts:28`. The test contained truncated syntax, while the implementation had a malformed class body and missing `queue` field.

After syntax repair, the test also mutated `process.env.REDIS_URL` after importing `env.ts`. `QueueService` consumed the already-parsed environment, so the test did not control the endpoint under test. The constructor now accepts an explicit Redis URL defaulting to `env.REDIS_URL`, and the test passes the unreachable endpoint directly.

Final queue command, run three times:

```bash
cd /workspaces/yor-talksv2/api-server
node --import tsx --test --test-concurrency=1 src/__tests__/queue-service.test.ts
```

Final result: **2 tests per run, 6 passed, 0 failed**. The complete API suite then passed **68/68**.

## Remaining blockers

1. Live external-provider acceptance is not verified.
2. TLS, DNS, production reverse-proxy behavior, and public smoke checks need a real deployed environment.
3. Monitoring, alert routing, Redis failover, load behavior, and backup/restore require operational exercises.
4. Safari, Firefox, physical-device, and long-session tests remain unverified.

## Release judgment

The repository is code-ready for a controlled beta deployment with optional commercial/realtime features disabled, subject to the real-infrastructure and manual acceptance gates above. It should not be described as fully production verified until those gates have evidence.
