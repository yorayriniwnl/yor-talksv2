# Yor Talks

Yor Talks is a college-only social platform beta for KIIT students. The
repository contains an Express + Socket.IO API, a React + Vite frontend, and
shared Postgres/Drizzle packages.

## Beta scope

The launch path is ready for a controlled KIIT beta:

- Registration and login require exactly seven digits followed by
  `@kiit.ac.in` (for example, `2329027@kiit.ac.in`).
- Core profiles, posts, feed interactions, communities, messages, events,
  stories, products, projects and reports use the backend API.
- Postgres and Redis are included in Docker Compose.
- Resend email delivery supports password reset, verification, and email-code
  login when configured.
- Cloudinary handles avatar, image, and stored video uploads when configured.
- Razorpay Checkout supports UPI/card tip orders with server-side capture
  verification and wallet ledger settlement when configured.
- LiveKit provides real-time browser live rooms when configured.
- Provider-backed features fail closed with an explicit unavailable response
  when their credentials are missing.

## Quick start with Docker

From the repository root:

```bash
cp .env.example .env
pnpm install
docker compose up --build -d
docker compose exec api pnpm --filter @workspace/db push
docker compose exec api pnpm --filter @workspace/api-server seed
```

Open [http://localhost:8080](http://localhost:8080). The API health endpoint is
[http://localhost:8080/api/healthz](http://localhost:8080/api/healthz), and the
direct API is available on port 4000.

The seeded demo accounts use the following credentials:

| Email | Password |
| --- | --- |
| `2329001@kiit.ac.in` | `yorayriniwnl` |
| `2329002@kiit.ac.in` | `password123` |
| `2329003@kiit.ac.in` | `password123` |

Change or remove seeded passwords before inviting beta participants.

For a production-like container run, set `NODE_ENV=production` in `.env`, use
unique random JWT secrets of at least 32 characters, and set
`CORS_ORIGINS`/`CLIENT_ORIGIN` to the real frontend origin. Do not commit `.env`.

## Provider setup for the college beta

The application code is ready, but provider accounts and secrets must be
created outside this repository. Add these values to the root `.env` used by
Docker, then rebuild the API:

- Resend: create an API key and verify the sender/domain used by `EMAIL_FROM`.
- Cloudinary: copy the cloud name, API key, and API secret. Uploads use signed
  server-side requests; no Cloudinary secret reaches the browser.
- Razorpay: use test-mode keys for beta, set `RAZORPAY_KEY_ID` and
  `RAZORPAY_KEY_SECRET`, and test Checkout with a Razorpay test UPI method.
  The API fetches and verifies the captured payment before crediting the
  creator wallet. Bank withdrawals/payouts are intentionally not enabled for
  this college beta because they require a separately verified RazorpayX/KYC
  settlement setup.
- LiveKit Cloud: create a project and set `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and
  `LIVEKIT_API_SECRET`. The server issues short-lived room tokens; the secret
  is never sent to the frontend.

After changing provider variables:

```bash
docker compose up --build -d api web
docker compose exec api pnpm --filter @workspace/db push
docker compose exec api pnpm --filter @workspace/db migrate:beta
```

Check `docker compose logs api` for provider warnings. A warning means that
feature remains unavailable; it does not prevent the rest of the beta from
starting.

## Local development

1. Start dependencies: `docker compose up -d postgres redis`.
2. Copy `api-server/.env.example` to `api-server/.env` and set local secrets.
3. Install packages from the root: `pnpm install`.
4. Push the schema: `pnpm --filter @workspace/db push`.
5. Install the idempotent beta indexes: `pnpm --filter @workspace/db migrate:beta`.
6. Start the API: `pnpm --filter @workspace/api-server dev`.
7. Start the frontend in another terminal: `pnpm --filter @workspace/social dev`.

The Vite server runs on port 5173 and proxies `/api` and `/socket.io` to the
API on port 4000.

## Verification

```bash
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/social typecheck
pnpm build
pnpm audit --prod
```

The API test suite uses the configured Postgres and Redis instances:

```bash
pnpm --filter @workspace/api-server test
```

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
- Configure and test Resend, Cloudinary, Razorpay test mode, and LiveKit Cloud
  before inviting students.
- Verify the Razorpay flow with a successful test order, a failed payment, and
  a duplicate callback before switching to live keys.
- Confirm the browser can reach the LiveKit WebSocket URL from the deployed
  frontend origin and test camera/microphone permissions on campus Wi-Fi.
- Keep the Docker API and frontend on the same origin so cookies and Socket.IO
  behave consistently.
- Invite only approved KIIT addresses and monitor the health endpoint/logs.

## Known limitations

Creator bank withdrawals/payouts are not part of this controlled beta; the
wallet ledger records verified Razorpay tips so a verified RazorpayX settlement
workflow can be added later. Stored video uploads use Cloudinary, while
adaptive HLS transcoding is not enabled. Live rooms use LiveKit and are
separate from stored-media playback.
