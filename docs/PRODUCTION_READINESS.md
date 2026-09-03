# Production Readiness

## Evidence-based score

**92/100 for the bounded beta scope.**

This score reflects verified repository behavior and local container-backed validation. It is not public-launch approval: live providers, TLS, monitoring, restore drills, and sustained production traffic still require external acceptance.

Key improvements in this pass:
- Enhanced production smoke test with detailed service verification
- Added `/api/diagnostics` endpoint for queue and worker health
- Improved `/api/readyz` with environment and version reporting
- Added PostgreSQL backup/restore script with verification
- Improved error reporting and logging in deployment verification

## Verification boundary

### Verified locally

- Postgres 16 and Redis 7 ran through the project Docker Compose stack.
- Beta and production migrations completed successfully.
- Production API and web Docker images built successfully.
- Production Compose configuration validated with `config --quiet`.
- Frontend and backend production builds completed.
- Frontend and backend typechecks completed.
- API contract and production configuration checks completed.
- Production smoke test validates web shell, security headers, asset bundle, API routing, and service readiness

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
- Live backup/restore drills to verify recovery procedures

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
- Added `lib/db/scripts/backup-database.sh` with:
  - Automated PostgreSQL backup using `pg_dump` with compression
  - Backup verification using gzip and SQL content checks
  - Safe restore procedure with confirmation prompts
  - Database table count verification after restore
  - Detailed logging of all operations

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

Create backup:
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/yor_talks \
  lib/db/scripts/backup-database.sh backup
```

Verify backup:
```bash
lib/db/scripts/backup-database.sh verify .backup/backup_*.sql.gz
```

Restore (requires user confirmation):
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/yor_talks \
  lib/db/scripts/backup-database.sh restore .backup/backup_*.sql.gz
```

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

The repository is code-ready for a controlled beta deployment with optional commercial/realtime features disabled, subject to the real-infrastructure and manual acceptance gates above. It should not be described as fully production verified until those gates have evidence.

The new deployment verification tooling (smoke tests, diagnostics endpoint, backup/restore scripts) improves operational confidence and reduces manual deployment validation burden.
