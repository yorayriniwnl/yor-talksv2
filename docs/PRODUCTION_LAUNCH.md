# Yor Talks production launch runbook

This repository now has a production Compose profile, but a public launch still needs the provider accounts, domain and legal approval listed below. Do not use the development `docker-compose.yml` for public traffic.

The [latest 31 August readiness report](PUBLIC_BETA_CONTINUATION_2026-08-31.md) records
passing local checks and the unresolved infrastructure/live-verification gates.
Do not interpret a pushed commit or a liveness response as release approval.

## 1. Prepare the host and secrets

Use a supported Linux host with Docker Engine and Compose v2. Copy `ops/.env.production.example` to `/etc/yor-talks/.env.production`, replace every `CHANGE_ME` value, and keep it outside Git with mode `0640`, owned by `root:docker` (the scheduler account is in the Docker group). Generate independent URL-safe secrets, for example with `openssl rand -hex 32`; never reuse JWT, contact-shield, TOTP, or metrics secrets. The example and `ops/ci-production.env` are fixtures, not deployment values.

Use Node.js 24 LTS for local and CI builds (the container also uses Node 24).
Rebuild with `--pull` for current patched Node 24 / Nginx 1.30 base images.
Node 20 is end-of-life; do not deploy an old cached Node 20 image.
All `.env*` files and private-key files are excluded from Docker build contexts:
provide production secrets at runtime, never through `COPY` or frontend build arguments.

`DATABASE_URL` must use the same database/user/password values as the Postgres service. Keep the database and Redis ports unpublished; the production Compose file only publishes the web edge. The included Postgres container is not TLS-enabled, so keep `DB_SSL=false`; set it to `true` only when using a TLS-enabled managed database.

### Required runtime values

`docker-compose.production.yml config --quiet` requires database/Redis passwords, `DATABASE_URL`, independent JWT/contact/TOTP secrets, explicit `CLIENT_ORIGIN` and `CORS_ORIGINS`, legal/support/grievance values, `TERMS_VERSION`, `METRICS_BEARER_TOKEN_FILE`, `RCLONE_CONFIG_FILE`, `BACKUP_AGE_RECIPIENT`, `BACKUP_REMOTE`, `ALERTMANAGER_WEBHOOK_URL`, `ALERTMANAGER_WEBHOOK_USER`, and `ALERTMANAGER_WEBHOOK_PASSWORD_FILE`. Production API startup also requires deployed Cloudinary and Resend values and at least one text moderation provider key. `GOOGLE_CLIENT_ID` is required when `PUBLIC_BETA=true`. `METRICS_BEARER_TOKEN_FILE` must point to a single-line, 32+ character random token; Compose mounts it read-only into API and Prometheus. Create it outside the repository:

```bash
sudo install -d -o root -g docker -m 0750 /etc/yor-talks
openssl rand -hex 32 | sudo tee /etc/yor-talks/metrics.token >/dev/null
sudo chown root:docker /etc/yor-talks/metrics.token
sudo chmod 0640 /etc/yor-talks/metrics.token
openssl rand -hex 32 | sudo tee /etc/yor-talks/alertmanager-webhook-password >/dev/null
sudo chown root:docker /etc/yor-talks/alertmanager-webhook-password
sudo chmod 0640 /etc/yor-talks/alertmanager-webhook-password
```

The frontend provider switches are build-time `VITE_*` values wired from the corresponding backend flags; `pnpm production-config:check` guards this mapping. Keep payments, live rooms, RTC and Web Push disabled until provider acceptance is complete. Web Push additionally needs VAPID keys and obtains the public key from the authenticated API; the frontend does not embed the private key. RTC calls require an authenticated TURN service and short-lived TURN credentials; do not enable them with only the public STUN example.

Keep `AUTH_COOKIE_SAME_SITE=lax` when the frontend and API are same-site (including sibling subdomains on the same HTTPS domain). Set it to `none` only when the frontend is genuinely cross-site; production then requires HTTPS. The API trusts one reverse-proxy hop and enforces `Origin` against `CORS_ORIGINS` and `CLIENT_ORIGIN` on refresh. Use exact HTTPS origins with no wildcard or path. Production Compose publishes the API only at `127.0.0.1:${API_HOST_PORT}` so a host TLS proxy can reach it without exposing the port publicly. The app's production Nginx serves the frontend; it does not terminate public TLS or proxy the API.

## 2. Configure the external launch dependencies

- Point frontend and API DNS names at a host Caddy/reverse proxy. Start with [ops/Caddyfile.example](../ops/Caddyfile.example): frontend hostname to `127.0.0.1:${WEB_PORT:-8080}`, API hostname to `127.0.0.1:${API_HOST_PORT:-4000}`. Caddy manages HTTPS and forwards WebSocket upgrades automatically. Set `CLIENT_ORIGIN`/`CORS_ORIGINS` to the exact frontend `https://` origin, `VITE_API_BASE_URL=https://<api-host>/api`, and `VITE_REALTIME_URL=https://<api-host>`; allow inbound 80/443 only at the proxy and do not expose API/Postgres/Redis host ports.
- Verify the Resend sender domain and set `EMAIL_FROM`. Registration is fail-closed when production email delivery is unavailable.
- In Google Cloud, configure a Web OAuth client with the deployed frontend's exact HTTPS JavaScript origin and copy the same client ID to `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`. Yor Talks uses the Google Identity credential flow; it does not need an invented callback URL. Exercise allowed/disallowed accounts after configuring the email-domain policy.
- Publish and verify the Resend sender domain's SPF/DKIM records, enforce DMARC according to organizational policy, and use a sender on that verified domain.
- Generate separate Web Push VAPID keys only when launching push: `pnpm --filter @workspace/api-server exec web-push generate-vapid-keys`. Set the public/private values and valid `mailto:` subject; never place the private key in a `VITE_*` variable.
- Configure LiveKit with a `wss://` endpoint, scoped API credentials, firewall reachability and TURN where required. Keep live rooms/calls disabled until reconnect, safety and capacity acceptance is complete.
- In Razorpay, register `https://<api-host>/api/economy/webhooks/razorpay` and set a unique webhook secret separate from the API key secret. Keep payments off until signed success/failure, duplicate/retried webhook delivery and provider-to-ledger settlement are verified.
- Production upload and presign remain disabled because there is no configured server-side media moderation/review path; Cloudinary credentials alone do not enable them. Production HLS returns `501` because no transcoder/packager is configured. To enable either feature, integrate and acceptance-test server-side moderation, signed upload completion/ownership checks, deletion propagation, and a managed HLS transcoder/CDN before changing the feature gate. Do not accept unmoderated client-direct uploads.
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

## 4. Scheduled operations and monitoring

Production Compose includes internal-only Prometheus, Alertmanager, and a textfile exporter for backup status. Prometheus scrapes `/api/metrics` using the mounted `metrics_bearer_token` secret. Its alert rules cover API scrape failures, shared Redis metric availability, worker failures, failed/stale analytics rollups, and missing/stale/failed backups. Configure `ALERTMANAGER_WEBHOOK_URL` to a reachable HTTPS receiver restricted to the deployment's egress; `ALERTMANAGER_WEBHOOK_USER` and a mounted password file authenticate the receiver, so do not put credentials in the URL. The monitoring UIs are not published to the internet. Inspect service state/logs with:

```bash
docker compose --env-file /etc/yor-talks/.env.production -f /opt/yor-talks/docker-compose.production.yml ps prometheus alertmanager backup-metrics-exporter
docker compose --env-file /etc/yor-talks/.env.production -f /opt/yor-talks/docker-compose.production.yml logs --tail=200 prometheus alertmanager backup-metrics-exporter
```

Install the systemd units on one designated scheduler host. The dedicated `yor-talks` service account needs Docker-socket access (equivalent to root), read access to `/opt/yor-talks`, the mode-0640 production env file, and the mode-0640 rclone config. Do not enable duplicate backup timers on multiple hosts; analytics runs are idempotent across hosts, but designate one scheduler host to simplify operations.

```bash
sudo useradd --system --create-home --home-dir /opt/yor-talks --shell /usr/sbin/nologin --groups docker yor-talks
sudo install -d -o root -g docker -m 0750 /etc/yor-talks
sudo install -m 0640 -o root -g docker .env.production /etc/yor-talks/.env.production
sudo install -m 0640 -o root -g docker /secure/rclone.conf /etc/yor-talks/rclone.conf
sudo install -m 0644 ops/systemd/yor-talks-analytics.service /etc/systemd/system/
sudo install -m 0644 ops/systemd/yor-talks-analytics.timer /etc/systemd/system/
sudo install -m 0644 ops/systemd/yor-talks-backup.service /etc/systemd/system/
sudo install -m 0644 ops/systemd/yor-talks-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now yor-talks-analytics.timer yor-talks-backup.timer
systemctl list-timers yor-talks-analytics.timer yor-talks-backup.timer
sudo systemctl start yor-talks-analytics.service
sudo systemctl start yor-talks-backup.service
journalctl -u yor-talks-analytics.service -u yor-talks-backup.service --since today
```

Analytics runs daily at 02:15 UTC and recomputes seven complete days. Backups run daily at 01:00 UTC; the encrypted staging volume retains local artifacts for 14 days. Set `BACKUP_AGE_RECIPIENT` to the generated public recipient, `BACKUP_REMOTE` to the configured rclone remote:path, and `RCLONE_CONFIG_FILE` to the protected config. A backup alert fires when no successful off-host upload is visible for 25 hours; a rollup alert fires at 26 hours stale.

### Incident response

- **API or database unavailable:** preserve logs, inspect `readyz`, Postgres and Redis health, and pause rollout. Do not bypass readiness or expose database/cache ports.
- **Worker failures:** inspect the notification worker logs, Redis health and Prometheus `yor_worker_failed_jobs_total`; preserve queued/failed jobs while diagnosing provider errors.
- **Stale analytics:** inspect the systemd timer and `journalctl -u yor-talks-analytics.service`, then query authorized pipeline status. Re-run only after dependencies recover; the last seven days recompute idempotently.
- **Backup failure or suspected data loss:** stop schema changes, preserve the encrypted local staging file, inspect rclone and remote object/version, verify with the protected age identity, and restore only into a separate empty database. Promote a restore only after operator approval and application validation; never overwrite production during an incident drill.
- **Credential compromise:** disable the affected provider/feature flag, rotate only the affected secret through the approved secret manager, and review session revocation and provider audit logs. A contact-shield secret rotation requires a reviewed digest migration.

## 5. Backups and recovery

The repository backup helper requires `age` and `rclone`. Configure an rclone remote for independent off-host storage and set provider-side versioning/object lock plus a retention lifecycle (for example 35 days); the helper deliberately never deletes remote objects. Configure the remote interactively as the scheduler identity, then install its protected config:

```bash
sudo -u yor-talks rclone config --config /opt/yor-talks/.config/rclone/rclone.conf
sudo install -D -o yor-talks -g docker -m 0600 /opt/yor-talks/.config/rclone/rclone.conf /etc/yor-talks/rclone.conf
age-keygen -o /secure/yor-talks-backup.agekey
chmod 0600 /secure/yor-talks-backup.agekey
age-keygen -y /secure/yor-talks-backup.agekey
```

Use the printed `age1...` public recipient as `BACKUP_AGE_RECIPIENT`. Store the private age identity offline in a separately controlled recovery vault, never on the scheduler or in Compose secrets. Restore uses a single transaction and refuses non-empty targets.

```bash
BACKUP_AGE_RECIPIENT="age1..." BACKUP_REMOTE="backups:yor-talks" \
  DATABASE_URL="postgresql://..." lib/db/scripts/backup-database.sh backup

BACKUP_AGE_IDENTITY="/secure/restore-identity" \
  lib/db/scripts/backup-database.sh verify .backup/backup_YYYYMMDD_HHMMSS.dump.age

# Restore only to a separate empty database; populated targets are refused.
BACKUP_AGE_IDENTITY="/secure/restore-identity" DATABASE_URL="postgresql://.../restore_db" \
  lib/db/scripts/backup-database.sh restore .backup/backup_YYYYMMDD_HHMMSS.dump.age
```

Schedule backups at least daily and before schema changes. Record remote object/version, encrypted archive verification, restore results, and recovery-time objectives as operational evidence. Merely running this script does not verify remote durability or a successful restore. Redis is operational state and should be recoverable from a clean restart; do not treat it as the source of truth for accounts or reports.

## 6. Launch checks
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

## 7. Rollback

Keep the previous image tags and the most recent database backup. Roll back application images only after checking migration compatibility; never run an unreviewed destructive schema rollback against the production database.
