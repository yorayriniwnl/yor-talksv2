# Production Readiness

Status: repository hardening is partial; public production launch is blocked pending provider acceptance and operational verification. No numeric readiness score is claimed.

The October 4 media change implements server-owned reservations, complete byte decoding, strict Gemini decisions, transactional approved-ID publication, retry-safe cleanup and approval/hash-checked API delivery. Its current validation evidence and configuration requirements are in [the media implementation report](MEDIA_LIFECYCLE_IMPLEMENTATION.md). Unconfigured media remains unavailable; production no longer rejects it solely because `NODE_ENV=production`. Historical checks below do not validate the October change or real provider acceptance.

This file and the root [Production Readiness Report](../PRODUCTION_READINESS.md) use the same evidence boundary. Checks below are historical reports, not checks performed by the current implementation session unless its final results say otherwise.

Previously documented repository controls (historical; not re-verified in this session):
- Enhanced production smoke test with detailed service verification
- Added `/api/diagnostics` endpoint for queue and worker health
- Improved `/api/readyz` with environment and version reporting
- Added PostgreSQL backup/restore script with verification
- Improved error reporting and logging in deployment verification

## Verification boundary

### Previously reported as verified locally (not rerun here)

- Postgres 16 and Redis 7 ran through the project Docker Compose stack.
- Beta and production migrations completed successfully.
- Production API and web Docker images built successfully.
- Production Compose configuration validated with `config --quiet`.
- Frontend and backend production builds completed.
- Frontend and backend typechecks completed.
- API contract and production configuration checks completed.
- Production smoke test validates web shell, security headers, asset bundle, API routing, and service readiness

### Previously reported automated test results (not rerun here)

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
- Live backup/restore drills to verify recovery procedures

The API exposes bounded Prometheus counters in `GET /api/metrics`, protected by admin/moderator authentication. Redis-backed `yor_cluster_http_requests_total`, `yor_cluster_http_request_duration_seconds_sum`, and `yor_worker_failed_jobs_total` are shared across replicas; configure the scraper to treat each replica's shared snapshot as one value (for example, `max` by label set), not to sum duplicate snapshots. Per-process `yor_http_*` request series are local. `yor_http_metrics_shared_store_up` reports Redis counter availability. Notification job failures are persisted in Redis counters; feed ranking is intentionally disabled. Configure external alerts for `shared_store_up == 0`, sustained worker failure increases, API readiness failures, and stale/failed analytics runs. No alert receiver or scrape service is provisioned by Compose.

### Requires manual acceptance testing

- Google OAuth, Resend, Cloudinary, moderation, and other provider flows.
- Any later enablement of Razorpay, LiveKit, Web Push, or RTC.
- Real-device browser coverage and operational support/abuse drills.

## Changes in this hardening pass

### Deployment Verification
- Enhanced `ops/smoke-test.mjs` with structured logging, detailed error reporting, and comprehensive service checks
  - Verifies web shell HTML structure and asset bundle integrity
  - Validates security headers on all responses
  - Tests critical API endpoints for routing and authentication
  - Reports uptime and service dependencies clearly

### API Diagnostics
- Added `/api/diagnostics` endpoint to verify queue connectivity and Redis version compatibility
- Improved `/api/readyz` endpoint to include environment, Node version, and Redis version in response
- Health check responses now include detailed service status and environment context

### Database Backup & Restore

Use the current encrypted age/rclone workflow in the [production launch runbook](docs/PRODUCTION_LAUNCH.md#4-backups-and-recovery). The legacy plaintext examples below are historical only and must not be run.

Use the current encrypted age/rclone workflow in the [production launch runbook](PRODUCTION_LAUNCH.md#4-backups-and-recovery). The legacy plaintext examples below are historical only and must not be run.
### Documentation
- Updated PRODUCTION_READINESS.md with deployment verification procedures
- Documented smoke test usage and interpretation

## Files changed in this pass

**New files:**
- `api-server/src/routes/diagnostics.ts` - Queue/Redis diagnostics endpoint
- `lib/db/scripts/backup-database.sh` - Database backup/restore script

**Modified files:**
- `api-server/src/routes/index.ts` - Registered diagnostics router
- `api-server/src/routes/health.ts` - Enhanced health endpoint with version details
- `ops/smoke-test.mjs` - Comprehensive smoke test with detailed logging
- `docs/PRODUCTION_READINESS.md` - Updated with new findings and procedures

## Verification procedures

### Production Smoke Test

After Docker Compose deployment:

```bash
cd /workspaces/yor-talksv2
BASE_URL=http://localhost:8080 pnpm smoke
```

Expected output:
```
[WEB] Web shell structure is valid
[SECURITY] All required security headers present
[ASSETS] Verified N asset(s) are accessible
[SW] Service worker cache policy is correct
[API-HEALTH] ✓ API healthy
[DATABASE] ✓ PostgreSQL connected and responding
[CACHE] ✓ Redis connected and responding
[API-ROUTES] ✓ Auth endpoints are accessible
[API-ROUTES] ✓ Reports endpoints are accessible
[API-ROUTES] ✓ Grievance endpoints are accessible
[UPTIME] API has been running for Xs
[SMOKE] ✅ All production readiness checks passed
```

### Diagnostics Endpoint

```bash
curl http://localhost:4000/api/diagnostics
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-09-03T...",
  "queue": {
    "redis": "up",
    "version": "7.x.x"
  },
  "uptime": 123.45
}
```

### Health/Readiness Endpoint

```bash
curl http://localhost:4000/api/readyz
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-09-03T...",
  "services": {
    "database": "up",
    "redis": "up",
    "api": "up"
  },
  "details": {
    "environment": "production",
    "nodeVersion": "v24.x.x",
    "redisVersion": "7.x.x"
  },
  "uptime": 123.45
}
```

### Database Backup & Restore

Create an encrypted off-host backup (install/configure `age` and `rclone` first):
```bash
BACKUP_AGE_RECIPIENT="age1..." BACKUP_REMOTE="backups:yor-talks" DATABASE_URL="postgresql://..." \\
  lib/db/scripts/backup-database.sh backup
```

Verify an encrypted backup:
```bash
BACKUP_AGE_IDENTITY="/secure/restore-identity" lib/db/scripts/backup-database.sh verify .backup/backup_*.dump.age
```

Restore to a separate empty database (requires explicit confirmation):
```bash
BACKUP_AGE_IDENTITY="/secure/restore-identity" DATABASE_URL="postgresql://.../restore_db" \\
  lib/db/scripts/backup-database.sh restore .backup/backup_*.dump.age
```

Analytics event taxonomy, formulas, retention, scheduling and current KPI gaps are documented in [Analytics Operations](ANALYTICS_OPERATIONS.md).

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

## Remaining blockers

1. Live external-provider acceptance is not verified.
2. TLS, DNS, production reverse-proxy behavior, and public smoke checks need a real deployed environment.
3. Monitoring, alert routing, Redis failover, load behavior, and restore drills require operational exercises.
4. Safari, Firefox, physical-device, and long-session tests remain unverified.
5. Live backup/restore drill with recovery time objective (RTO) validation

## Release judgment

Do not treat the repository as launch-approved based on this document. The listed historical checks do not establish current-commit readiness. Complete the current CI gates and all live provider, security, monitoring, and recovery acceptance steps before enabling public traffic.

The new deployment verification tooling (smoke tests, diagnostics endpoint, backup/restore scripts) improves operational confidence and reduces manual deployment validation burden.
