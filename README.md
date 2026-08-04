# Yor Talks

A social platform monorepo (pnpm workspaces): an Express + Socket.io API backed
by Postgres/Drizzle, and a React + Vite frontend.

## Structure

- `api-server/` — Express 5 API, Socket.io, Postgres via Drizzle, Redis-backed
  sessions/queues. Routes → controllers → services → repositories.
- `lib/db/` — Drizzle schema, shared by `api-server` and any script that needs
  direct DB access.
- `lib/api-spec/`, `lib/api-zod/`, `lib/api-client-react/` — OpenAPI spec and
  generated types/client for a contract-first frontend integration. Currently
  not consumed by `social` (see Known limitations).
- `social/` — the main React frontend.
- `mockup-sandbox/` — a standalone Vite app that renders individual components
  in isolation for design/preview purposes; not part of the running product.
- `scripts/` — placeholder workspace package, not yet in active use.

## Running locally

1. **Postgres + Redis**: `docker-compose up -d` (or point at your own
   instances — see `api-server/.env.example`).
2. **Install deps**: `pnpm install` at the repo root.
3. **Configure**: `cp api-server/.env.example api-server/.env` and fill in
   `JWT_SECRET` / `JWT_REFRESH_SECRET` (any random string works locally).
4. **Push the schema** (no migration files yet, schema is pushed directly):
   ```
   pnpm --filter @workspace/db exec drizzle-kit push
   ```
5. **Run the API**: `pnpm --filter api-server dev` — listens on `PORT`
   (default 4000).
6. **Run the frontend**: `pnpm --filter social dev` — listens on 5173 and
   proxies `/api` to `http://localhost:4000` (see `social/vite.config.ts`).

## Testing

```
pnpm --filter api-server test
```

Runs `node --test` against `api-server/src/__tests__/`. Requires a real
Postgres + Redis reachable via the env vars above — several service tests
exercise real repositories, not mocks.

## Known limitations (as of this pass)

- **The frontend does not yet call the real backend.** `social` currently
  runs entirely on local mock data (see `social/src/lib/store.ts`); login
  doesn't check a password. Wiring this up — using the already-configured
  React Query + `@workspace/api-client-react` — is the next major piece of
  work.
- Several backend services (`CommunityService`, `SearchService`,
  `PaginationService`, `CacheService`, `QueueService`, `StorageService`,
  `NotificationDeliveryService`, `AIService`) are implemented and (mostly)
  unit-tested but not yet wired to any route.
- Avatar/image "upload" currently accepts a URL string rather than a real
  file upload — Cloudinary + multer are configured but not yet connected.
- Password reset and email verification are not yet functional end-to-end.

See the project history for the full audit this README summarizes.

## Deployment

Configured for Vercel Serverless Function API + Vite SPA Frontend.

