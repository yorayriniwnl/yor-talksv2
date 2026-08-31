# Yor Talks production launch runbook

This repository now has a production Compose profile, but a public launch still needs the provider accounts, domain and legal approval listed below. Do not use the development `docker-compose.yml` for public traffic.

The [latest 31 August readiness report](PUBLIC_BETA_CONTINUATION_2026-08-31.md) records
passing local checks and the unresolved infrastructure/live-verification gates.
Do not interpret a pushed commit or a liveness response as release approval.

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
- Keep payments, live rooms, web push and RTC calls disabled in both API and frontend flags for this beta. Enable them only in a separately reviewed rollout after provider, safety and operational acceptance tests; credentials alone do not enable a feature.
- Decide whether this deployment is open globally or a closed beta. For a closed beta, set `ALLOWED_EMAIL_DOMAINS` and document the approved domains.
- Publish reviewed Privacy, Terms, Community Guidelines, copyright/takedown process, retention schedule, support address and the appointed grievance officer’s name/contact. The in-app pages intentionally identify the legal fields that are still unconfigured.

## 3. Deploy

```bash
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet
docker compose --env-file .env.production -f docker-compose.production.yml build --pull
docker compose --env-file .env.production -f docker-compose.production.yml up -d
docker compose --env-file .env.production -f docker-compose.production.yml ps
curl -fsS https://your-domain.example/api/healthz
curl -fsS https://your-domain.example/api/readyz
BASE_URL=https://your-domain.example pnpm smoke
```

The one-shot `migrate` service bootstraps a genuinely empty public schema, then
applies the idempotent beta schema/index migration before the API starts. It
refuses nonempty incomplete schemas, including unrelated tables, views and
sequences. It requires the same unique `CONTACT_SHIELD_SECRET` as the API;
changing that key requires a reviewed contact-digest migration, not just a
configuration edit. Never run an unreviewed schema push against existing data.
Review migration logs on every deployment:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml logs --no-log-prefix migrate
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=200 api
```

## 4. Backups and recovery

Take an encrypted, off-host Postgres backup before schema changes and at least daily thereafter. Test a restore into a separate database before launch day.

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > yor-talks-$(date +%Y%m%d-%H%M).dump
```

Backups must be encrypted, access-controlled and have a documented retention period. Redis is operational state and should be recoverable from a clean restart; do not treat it as the source of truth for accounts or reports.

### Restore rehearsal and verification

Use a separate, access-controlled non-production Postgres host with compatible
client/server versions. Restrict a production-data rehearsal to approved
operators; never connect it to public traffic, email, payment or moderation
providers. Restore testing does not authorize sending private data to a new service.

Configure a libpq service named `yor-restore-rehearsal` for that host using
protected local configuration. Supply its credentials through the normal
secret mechanism, not command-line arguments or Git. Decrypt the backup only
inside the approved environment and verify its recorded checksum first.

The following Bash example creates a new database and deliberately fails if
that name already exists. Inspect the connection identity before proceeding;
do not run this against a production host or use `--clean` on an existing DB.

```bash
export PGSERVICE=yor-restore-rehearsal
psql --dbname=postgres -X -v ON_ERROR_STOP=1 \
  -c 'SELECT inet_server_addr(), inet_server_port(), current_database(), current_user;'
# Stop here and confirm this is the intended isolated host.
createdb --maintenance-db=postgres yor_restore_rehearsal_20260831 && \
  pg_restore --dbname=yor_restore_rehearsal_20260831 --exit-on-error \
    --single-transaction --no-owner --no-privileges /approved/path/yor-talks.dump
```

After a successful restore:

1. Compare table, index and constraint inventories with the source manifest.
   Check for invalid/unvalidated constraints and compare representative row
   counts plus content digests; do not publish production data in the manifest.
2. Check account/content relationships and critical queries using approved
   fixtures. Run migrations and application checks only against the rehearsal DB.
3. Verify deployment roles and grants separately: `--no-owner --no-privileges`
   intentionally does not reproduce production ownership or access control.
4. Record backup age, restore duration, checksum, results and operator sign-off
   against the agreed RPO/RTO. Exercise the off-host retrieval and decryption
   steps too; a local volume or local dump alone is not disaster recovery.
5. Retain or securely dispose of rehearsal data according to the approved
   retention policy. Never automatically drop a database based on an unverified URL.

The 31 August continuation verified a synthetic local logical restore: 64
tables, 179 indexes, 180 constraints, zero invalid constraints, and matching
user/post fixtures. Scheduled encrypted off-host production backups, retention,
permissions and recovery-time objectives still require deployment acceptance.

## 5. Launch checks

- Register a real test account from an allowed domain, confirm the email link, sign in, refresh the browser, log out, and verify the refresh cookie is `HttpOnly`, `Secure` and `SameSite=Lax`.
- Configure the Google Web OAuth client ID in both `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`, then test an allowed Google account and a disallowed account when a domain allow-list is enabled.
- Upload media, create/report/block content, export data, delete a disposable test account, and verify the deleted account cannot be found.
- Submit and track a grievance from a fresh browser and confirm it survives an API restart.
- Verify backups, alerting, error logs, rate limits, CORS, TLS renewal, domain ownership and the incident escalation roster.
- Run a campus Wi-Fi test on mobile and desktop, including WebSocket reconnects and slow-network behavior.
- Confirm Redis 7 and the notification worker are healthy. Redis 3 can answer session commands but cannot run the required BullMQ worker; do not bypass readiness checks to accommodate it.
- Confirm the exact pushed commit has a completed green GitHub Actions run, including production image builds. Resolve account/billing or runner issues first; a job that never starts provides no CI verification.

## 6. Rollback

Keep the previous image tags and the most recent database backup. Roll back application images only after checking migration compatibility; never run an unreviewed destructive schema rollback against the production database.
