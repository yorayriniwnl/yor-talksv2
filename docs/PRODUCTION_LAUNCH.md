# Yor Talks production launch runbook

This repository now has a production Compose profile, but a public launch still needs the provider accounts, domain and legal approval listed below. Do not use the development `docker-compose.yml` for public traffic.

## 1. Prepare the host and secrets

Use a supported Linux host with Docker Engine and Compose v2. Copy `ops/.env.production.example` to `.env.production`, replace every `CHANGE_ME` value, and keep the file outside Git. Generate independent URL-safe secrets, for example with `openssl rand -hex 32`.

Use Node.js 24 LTS for local and CI builds (the container also uses Node 24).
Rebuild with `--pull` for current patched Node 24 / Nginx 1.30 base images.
Node 20 is end-of-life; do not deploy an old cached Node 20 image.
All `.env*` files and private-key files are excluded from Docker build contexts:
provide production secrets at runtime, never through `COPY` or frontend build arguments.

`DATABASE_URL` must use the same database/user/password values as the Postgres service. Keep the database and Redis ports unpublished; the production Compose file only publishes the web edge. The included Postgres container is not TLS-enabled, so keep `DB_SSL=false`; set it to `true` only when using a TLS-enabled managed database.

Keep `AUTH_COOKIE_SAME_SITE=lax` when the frontend and API are same-site (including sibling subdomains on the same HTTPS domain). Set it to `none` only when the frontend is genuinely cross-site; the API still enforces `Origin` against `CORS_ORIGINS` and `CLIENT_ORIGIN` on refresh.

## 2. Configure the external launch dependencies

- Point the public domain and TLS certificate at the host’s `${WEB_PORT}`. The included Nginx container terminates the application edge; use a managed load balancer, Caddy, or a host reverse proxy for HTTPS and certificate renewal.
- Verify the Resend sender domain and set `EMAIL_FROM`. Registration is fail-closed when production email delivery is unavailable.
- Configure Cloudinary for image/video uploads and test file-size, moderation and deletion behavior.
- Configure LiveKit and test a room from the intended campus network. Keep Razorpay disabled until a legal entity, settlement account, webhook verification and refund process exist.
- Decide whether this deployment is open globally or a closed beta. For a closed beta, set `ALLOWED_EMAIL_DOMAINS` and document the approved domains.
- Publish reviewed Privacy, Terms, Community Guidelines, copyright/takedown process, retention schedule, support address and the appointed grievance officer’s name/contact. The in-app pages intentionally identify the legal fields that are still unconfigured.

## 3. Deploy

```bash
docker compose --env-file .env.production -f docker-compose.production.yml config
docker compose --env-file .env.production -f docker-compose.production.yml build
docker compose --env-file .env.production -f docker-compose.production.yml up -d
docker compose --env-file .env.production -f docker-compose.production.yml ps
curl -fsS https://your-domain.example/api/healthz
BASE_URL=https://your-domain.example pnpm smoke
```

The one-shot `migrate` service applies the idempotent beta schema/index migration before the API starts. Review its logs on every deployment:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml logs --no-log-prefix migrate
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=200 api
```

## 4. Backups and recovery

Take an encrypted, off-host Postgres backup before schema changes and at least daily thereafter. Test a restore into a separate database before launch day.

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom > yor-talks-$(date +%Y%m%d-%H%M).dump
```

Backups must be encrypted, access-controlled and have a documented retention period. Redis is operational state and should be recoverable from a clean restart; do not treat it as the source of truth for accounts or reports.

## 5. Launch checks

- Register a real test account from an allowed domain, confirm the email link, sign in, refresh the browser, log out, and verify the refresh cookie is `HttpOnly`, `Secure` and `SameSite=Lax`.
- Configure the Google Web OAuth client ID in both `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`, then test an allowed Google account and a disallowed account when a domain allow-list is enabled.
- Upload media, create/report/block content, export data, delete a disposable test account, and verify the deleted account cannot be found.
- Submit and track a grievance from a fresh browser and confirm it survives an API restart.
- Verify backups, alerting, error logs, rate limits, CORS, TLS renewal, domain ownership and the incident escalation roster.
- Run a campus Wi-Fi test on mobile and desktop, including WebSocket reconnects and slow-network behavior.

## 6. Rollback

Keep the previous image tags and the most recent database backup. Roll back application images only after checking migration compatibility; never run an unreviewed destructive schema rollback against the production database.
