# Yor Talks

Yor Talks is a global social platform for creators, communities, conversations,
events, stories and commerce. The repository contains an Express + Socket.IO
API, a React + Vite frontend, and shared Postgres/Drizzle packages.

## Public-beta status — 31 August 2026

**B. CODE-READY, DEPLOYMENT BLOCKED.** The audited core beta has passing local
regression/build checks, but this is not a verified public deployment. GitHub
Actions is billing-locked, the local Docker engine is unavailable, and live
provider, TLS, monitoring and restore checks remain required. See the
[readiness report](docs/PUBLIC_BETA_READINESS_2026-08-31.md) and
[production runbook](docs/PRODUCTION_LAUNCH.md) for evidence and release gates.

## Launch scope

The launch path supports a global deployment or a closed beta:

- Registration and login accept any verified email when
  `ALLOWED_EMAIL_DOMAINS` is empty. Set that variable to a comma-separated
  domain allow-list for a closed beta.
- Core profiles, posts, personalized feeds, ephemeral Notes, feed interactions,
  communities, one-to-one and group messages, Stories, events, products,
  projects and reports use the backend API.
- Postgres and Redis are included in Docker Compose.
- Resend email delivery supports password reset, verification, and email-code
  login. Resend and Cloudinary credentials are required in production because
  account verification and media uploads are core launch paths.
- GitHub-style number matching protects accounts with an authenticated Yor
  device approval flow, with TOTP as an explicit fallback.
- Notes expire after 24 hours with follower/Close Friends/public audience
  controls, the three-layer content filter, and server-side moderation.
  Stories and Highlights enforce the same audience rules, with a private
  Close Friends list managed from Settings. Group conversations
  support member selection, read receipts, reactions, pins, and persisted
  read-triggered Vanish Mode with a 24-hour safety expiry.
- Creator Broadcast Channels provide one-way, moderated announcements with
  persisted subscriptions, archive access, subscriber counts, and the same
  child-safe/regular/mature content filter. Owners are the only publishers, so
  channel updates never pollute direct-message threads.
- Browser Web Push delivers notification events when VAPID keys are configured.
- Cloudinary handles avatar, image, audio, and stored video uploads through
  signed direct browser uploads, keeping large files out of serverless API
  request bodies.
- Razorpay Checkout supports UPI/card tip orders with server-side capture
  verification and wallet ledger settlement when configured.
- LiveKit provides real-time browser live rooms when configured.
- Optional provider-backed features fail closed with an explicit unavailable
  response when their credentials are missing. Production also requires an
  `OPENAI_API_KEY` or `GEMINI_API_KEY` so safety checks cannot silently be
  bypassed.

## Quick start with Docker (local development only)

Use Node.js 24 LTS, pnpm 9.15.4, and a working Docker Engine. From the repository root:

```bash
cp .env.example .env
pnpm install
docker compose up --build -d
docker compose exec api pnpm --filter @workspace/db push
docker compose exec api pnpm --filter @workspace/api-server seed
```

Open [http://localhost:8080](http://localhost:8080). The API health endpoint is
[http://localhost:8080/api/healthz](http://localhost:8080/api/healthz), and the
direct API is available on port 4000. The generated OpenAPI document is exposed
at `/api/docs`; it is built from the mounted Express routes and checked for
drift in CI.

The seeded demo accounts use the following credentials:

| Email | Password |
| --- | --- |
| `2329001@kiit.ac.in` | `yorayriniwnl` |
| `2329002@kiit.ac.in` | `password123` |
| `2329003@kiit.ac.in` | `password123` |

Demo seeds are for isolated local databases only. Do not seed a public deployment.

For public traffic, use `.env.production` and `docker-compose.production.yml`
as described in the production runbook. The development Compose profile is
not a production deployment. Never commit environment files or private keys.

## Provider setup for a global deployment

Provider accounts, secrets and live acceptance tests must be completed outside
this repository. Add production values securely to `.env.production`; keep
the four optional feature flags disabled until separately approved and tested.

- Resend: create an API key and verify the sender/domain used by `EMAIL_FROM`.
- Cloudinary: copy the cloud name, API key, and API secret. Uploads use signed
  server-side requests; no Cloudinary secret reaches the browser.
- Moderation: set `OPENAI_API_KEY` or `GEMINI_API_KEY`. The production API will
  refuse to start without at least one moderation provider.
- Razorpay (disabled for this beta): before any later enablement, configure
  `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`, and
  test Checkout in an isolated provider test environment.
  The API fetches and verifies the captured payment before crediting the
  creator wallet. Bank withdrawals/payouts are intentionally not enabled for
  this deployment because they require a separately verified RazorpayX/KYC
  settlement setup.
- LiveKit Cloud: create a project and set `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and
  `LIVEKIT_API_SECRET`. The server issues short-lived room tokens; the secret
  is never sent to the frontend.
- Web Push: generate VAPID keys and set `WEB_PUSH_VAPID_PUBLIC_KEY`,
  `WEB_PUSH_VAPID_PRIVATE_KEY`, and a verified `WEB_PUSH_VAPID_SUBJECT`.
- WebRTC calls: set `VITE_RTC_ICE_SERVERS` to a JSON array containing a
  production TURN server (STUN alone is not reliable across carrier NATs).
  If the frontend is on Vercel and the API is elsewhere, set `NODE_ENV=production`
  on the API and set `VITE_API_BASE_URL` and `VITE_REALTIME_URL`; the latter
  must point to a long-lived Socket.IO process.
- Google Identity Services: create a Web OAuth client ID in Google Cloud,
  add the local/deployed frontend origins as authorized JavaScript origins,
  then set the same client ID in both `GOOGLE_CLIENT_ID` and
  `VITE_GOOGLE_CLIENT_ID`. The API verifies Google ID tokens, applies the same
  optional `ALLOWED_EMAIL_DOMAINS` policy, and links them to an existing Yor
  account by Google’s stable subject ID. Users must create a Yor account with
  the existing registration flow before using Google sign-in.

After changing provider variables:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up --build -d api web
# For an existing populated database, take a backup first and run the
# additive/idempotent beta migration. Never run `push --force` against it.
docker compose --env-file .env.production -f docker-compose.production.yml run --rm migrate
```

`migrate:beta` backfills the normalized community-member, event-RSVP,
marketplace-save, story-view, and story-reaction tables before removing their
legacy JSON relationship columns. Take a database backup before applying it to
an existing deployment. The migration is idempotent so it can also run after a
fresh schema push. For a brand-new empty database, use
`docker compose --env-file .env.production -f docker-compose.production.yml run --rm migrate`
(which runs `migrate:production`) before starting the API. Bootstrap refuses
nonempty incomplete schemas, including unrelated tables, views and sequences.
The migration must use the same unique `CONTACT_SHIELD_SECRET` as the API.
Use `pnpm --filter
@workspace/db push` only for additive changes on an empty/local database, and
review its SQL prompt before accepting it.

Inspect API and migration logs. A listening API or a passing `/api/livez` is
not readiness: `/api/healthz`, `/api/readyz`, workers, and the production smoke
checks must also pass. An unsupported Redis version is a launch blocker.

## Local development

1. Start dependencies: `docker compose up -d postgres redis`.
2. Copy `api-server/.env.example` to `api-server/.env` and set local secrets.
3. Install packages from the root: `pnpm install`.
4. On an existing local database, take a backup and run
   `pnpm --filter @workspace/db migrate:beta`; use `push` only when creating an
   empty database or after reviewing an additive change.
5. Start the API: `pnpm --filter @workspace/api-server dev`.
6. Start the frontend in another terminal: `pnpm --filter @workspace/social dev`.

The Vite server runs on port 5173 and proxies `/api` and `/socket.io` to the
API on port 4000.

## Verification

```bash
pnpm contract:check
pnpm production-config:check
pnpm test:unit
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/social typecheck
pnpm build:pnpm
pnpm audit --prod
pnpm test:e2e
```

Playwright builds and serves production chunks with deterministic API fixtures
and no automatic retries. It covers core flows, failure recovery, consent,
mobile keyboard navigation and targeted accessibility checks. It does not
replace real API/provider/browser acceptance tests. The API test suite uses
the configured isolated Postgres and Redis instances:

```bash
pnpm --filter @workspace/api-server test
```

Authenticated administrators and moderators can scrape bounded-cardinality
Prometheus request metrics from `/api/metrics`. Keep this route behind the
application's normal authentication boundary; do not expose a privileged token
through a public scraper configuration.

## Repository structure

- `api-server/` — Express 5 API, Socket.IO, authentication, services and
  repositories.
- `lib/db/` — Drizzle schema and database commands.
- `lib/api-zod/` and `lib/api-spec/` — shared API contracts.
- `social/` — the React frontend. `social/Dockerfile` and `social/nginx.conf`
  provide the production-style static frontend and API/WebSocket proxy.
- `mockup-sandbox/` — isolated component previews; not part of the product
  container.

## Launch checklist

- Use a separate beta database and take a Postgres backup before launch.
- Replace all local JWT secrets and restrict `CORS_ORIGINS` to the deployed
  frontend.
- Keep `AUTH_COOKIE_SAME_SITE=lax` for a same-site deployment. Use `none` only
  for an HTTPS cross-site frontend/API pair and retain the trusted-origin
  refresh protection.
- Set `NODE_ENV=production` on every deployed API, including an API hosted
  outside the included Docker stack. Vercel is detected as production by
  default, but explicitly setting it prevents platform-specific surprises.
- Configure and test Resend, Cloudinary, and one moderation provider before
  launch. Razorpay test mode and LiveKit Cloud are required before enabling
  their respective payment and live-room surfaces.
- Set `PUBLIC_BETA=true` only after replacing every legal/operator placeholder,
  publishing the effective date and grievance contact, and using the same
  `TERMS_VERSION` in the API and frontend build. The frontend build fails closed
  when these values are missing.
- Keep `PAYMENTS_ENABLED`, `LIVE_ROOMS_ENABLED`, `WEB_PUSH_ENABLED`, and
  `RTC_CALLS_ENABLED` false until their provider, moderation, support and
  incident-response runbooks are exercised in the deployed environment.
- Verify the Razorpay flow with a successful test order, a failed payment, and
  a duplicate callback before switching to live keys.
- Confirm the browser can reach the LiveKit WebSocket URL from the deployed
  frontend origin and test camera/microphone permissions on campus Wi-Fi.
- Confirm `VITE_API_BASE_URL` supports credentialed CORS and that
  `VITE_REALTIME_URL` accepts Socket.IO WebSocket upgrades. Vercel can host the
  static frontend and HTTP serverless API, but the Socket.IO process, workers,
  and durable realtime calls should run on a long-lived service.
- Keep the Docker API and frontend on the same origin so cookies and Socket.IO
  behave consistently.
- If `ALLOWED_EMAIL_DOMAINS` is configured, invite only approved addresses;
  otherwise monitor abuse controls and the health endpoint/logs.

## Known limitations

Creator bank withdrawals/payouts are not part of this launch; the
wallet ledger records verified Razorpay tips so a verified RazorpayX settlement
workflow can be added later. Stored video uploads use Cloudinary, while
adaptive HLS transcoding is not enabled. Live rooms use LiveKit and are
separate from stored-media playback.
