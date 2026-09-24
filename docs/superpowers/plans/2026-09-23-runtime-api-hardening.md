# Runtime and API Boundary Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bound public API resource use, prevent push-endpoint SSRF when Web Push is enabled, and make runtime health and worker requirements safe to expose.

**Architecture:** Keep liveness cheap and public. Apply a dedicated bounded rate limit to readiness, return only minimal readiness state, and use a shared expiring worker heartbeat for separately deployed workers. Bound multipart parsing and BullMQ retention in the application. Require configured, validated push-provider hosts before sending Web Push.

**Tech Stack:** TypeScript, Express 5, express-rate-limit, BullMQ, Redis, Multer/Busboy, web-push, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-23-database-hardening-design.md` plus the runtime and provider-boundary design approved in this task.

## Global Constraints

- Preserve public liveness for container/load-balancer probes; readiness must remain bounded and disclose no dependency versions or raw exceptions.
- Keep Web Push disabled unless VAPID credentials and a non-empty allowed endpoint-host configuration are present.
- Multipart limits must work even when the API is exposed without the included Nginx proxy.
- Retain completed jobs long enough for the existing 24-hour notification recovery window, while bounding both age and count.
- Do not contact public push endpoints, production Redis, or production databases during implementation or verification.

## Review Focus

- Multipart requests with many fields, oversized field values, extra files, or too many parts.
- A push endpoint using HTTP, credentials, localhost/private IP, an unapproved hostname, or a redirect to an unapproved host.
- A direct public readiness request burst during database or Redis degradation.
- Worker restart during heartbeat expiry and API instances in a different process/container.
- Recovered notification jobs with an ID already present in completed or failed state.

---

### Task 1: Bound multipart request parsing

**Files:**
- Modify: `api-server/src/middlewares/upload.ts`
- Test: `api-server/src/__tests__/upload-validation.test.ts`

- [ ] Add failing tests for too many parts/fields/files, a field exceeding the configured byte limit, and a file exceeding the existing 10 MiB limit.
- [ ] Run `pnpm --filter @workspace/api-server exec tsx --test src/__tests__/upload-validation.test.ts` and confirm the new limit cases fail.
- [ ] Configure explicit `files`, `fields`, `parts`, `fieldSize`, `headerPairs`, and `fileSize` limits on both upload middleware instances.
- [ ] Map Multer limit errors to 413/400 API responses without returning internal parser details.
- [ ] Rerun the focused upload-validation tests.

### Task 2: Bound BullMQ notification job retention

**Files:**
- Modify: `api-server/src/services/queue-service.ts`
- Modify: `api-server/src/workers/notification-worker.ts`
- Test: `api-server/src/__tests__/queue-service.test.ts`

- [ ] Add a failing test asserting notification enqueue and startup-recovery jobs use bounded completed and failed retention.
- [ ] Run the focused queue-service test and confirm it fails because jobs currently set `removeOnComplete: false`.
- [ ] Apply shared BullMQ retention options with an age of at least 48 hours and a finite count; keep the 24-hour recovery window and stable job IDs.
- [ ] Ensure recovery uses the same options and does not enqueue duplicate completed work during the active retention window.
- [ ] Rerun focused queue tests.

### Task 3: Constrain push subscription destinations

**Files:**
- Modify: `api-server/src/config/env.ts`
- Modify: `api-server/src/routes/notifications.ts`
- Modify: `api-server/src/services/notification-delivery-service.ts`
- Modify: `.env.example` or the existing API example configuration
- Test: `api-server/src/__tests__/notification-push-security.test.ts`

- [ ] Add failing validation tests for HTTP, embedded credentials, IP literals, localhost/private addresses, unapproved hosts, and approved provider hosts.
- [ ] Run the focused push-security test and confirm the URL-only schema accepts unsafe endpoints.
- [ ] Add a required `WEB_PUSH_ALLOWED_HOSTS` configuration when `WEB_PUSH_ENABLED=true`; normalize hostnames and reject unsafe schemes, credentials, IP literals, and hosts outside the configured exact/suffix allowlist.
- [ ] Revalidate the stored endpoint immediately before delivery and disable redirects or reject any redirect target that leaves the configured provider host policy.
- [ ] Route malformed subscribe/unsubscribe bodies through the shared validation middleware so they return 400 rather than generic 500.
- [ ] Rerun the focused push-security test without sending network requests.

### Task 4: Bound and sanitize readiness checks

**Files:**
- Modify: `api-server/src/middlewares/rate-limit.ts`
- Modify: `api-server/src/routes/health.ts`
- Modify: `api-server/src/lib/worker-health.ts`
- Modify: `api-server/src/workers/notification-worker.ts`
- Modify: `api-server/api/index.ts` if route mounting changes
- Test: `api-server/src/__tests__/worker-health.test.ts`

- [ ] Add failing tests that readiness is rate limited, returns no runtime versions/raw dependency error, and reads an expiring worker heartbeat across process boundaries.
- [ ] Run the focused worker-health test and confirm readiness currently skips every limiter and relies on process-local health.
- [ ] Keep liveness dependency-free; add a dedicated low-rate readiness limiter and return only healthy/unhealthy service categories with no exception string or version detail.
- [ ] Store a short-lived notification-worker heartbeat in Redis and have readiness check it with a bounded timeout; the worker refreshes the heartbeat and clears it on graceful stop.
- [ ] Update deployment documentation to require a long-lived worker alongside serverless HTTP deployments and to distinguish liveness from readiness.
- [ ] Rerun worker-health tests without connecting to production Redis.

### Task 5: Run scoped checks and review deployment boundaries

- [ ] Run focused upload, queue, push-security, and worker-health tests.
- [ ] Run `pnpm --filter @workspace/api-server typecheck`.
- [ ] Review `social/nginx.conf` and `docker-compose.production.yml` to confirm edge limits remain defense in depth rather than the only request bound.
- [ ] Confirm the included production configuration keeps Web Push disabled until an explicit provider host allowlist is supplied.
- [ ] Confirm no live provider, production Redis, production database, or production deployment was contacted.
