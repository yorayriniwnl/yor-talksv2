# Yor Talks production launch runbook

This repository now has a production Compose profile, but a public launch still needs the provider accounts, domain and legal approval listed below. The stated intended launch region is the EU; its member state and legal operating entity have not been selected, and the production domain and hosting provider are not yet chosen. Do not use the development `docker-compose.yml` for public traffic.

**Current release decision: not ready for an EU launch.** The [7 October readiness review](PRODUCTION_READINESS_REVIEW_2026-10-07.md) now includes the 14 October age/privacy implementation and verification evidence, the EU launch intent, and the latest synthetic backup CI coverage. The member state, operator, provider, legal, moderation, data-rights, real backup and monitoring gates remain open. The [jurisdiction intake](GLOBAL_REGULATORY_INTAKE_2026-10-07.md) is dated research, not approval to activate any country. Complete the applicable repairs and operating acceptance before using this runbook to launch publicly.

The [16 October completion audit](PROGRAMME_COMPLETION_AUDIT_2026-10-16.md) records confirmed implementation gaps: report closure does not enforce a restriction, decision-linked notices/review are absent, and broader rights/retention workflows remain incomplete. The local [asset register](ASSET_PROVENANCE_REGISTER.md) records source evidence and pending permissions. Deployment steps below do not close those requirements.

The [media implementation report](MEDIA_LIFECYCLE_IMPLEMENTATION.md) records
current media controls, source-specific repository checks and the remaining
provider/runtime acceptance gates. CI requires `pnpm audit` across runtime and build dependencies, actual decoder
tests, production image builds and the complete container smoke test. Do not
interpret synthetic provider fixtures, a pushed commit or liveness as live release approval.

The [6 October verification report](MEDIA_LIFECYCLE_VERIFICATION_2026-10-06.md)
lists all changed files, commands and limitations for its recorded revisions.
The earlier note that this Windows host had no Docker Engine is historical: on
14 October the production images built locally and the isolated API/web
container smoke passed. Require a passing hosted run for the revision being
deployed. Legacy URL-only objects are not automatically approved or deleted:
their retained account-deletion holds require provider ownership review.

## 1. Prepare the host and secrets

Use a supported Linux host with Docker Engine and Compose v2. Create the protected directory before installing the environment template. These commands preserve an existing configuration:

```bash
sudo install -d -o root -g docker -m 0750 /etc/yor-talks
if ! sudo test -e /etc/yor-talks/.env.production; then
  sudo install -o root -g docker -m 0640 ops/.env.production.example /etc/yor-talks/.env.production
fi
sudoedit /etc/yor-talks/.env.production
```

Replace every `CHANGE_ME` value, and keep the file outside Git with mode `0640`, owned by `root:docker` (the scheduler account is in the Docker group). Generate independent URL-safe secrets, for example with `openssl rand -hex 32`; never reuse JWT, contact-shield, TOTP, or metrics secrets. The example and `ops/ci-production.env` are fixtures, not deployment values.

Use Node.js 24 LTS for local and CI builds (the container also uses Node 24).
Rebuild with `--pull` for current patched Node 24 / Nginx 1.30 base images.
Node 20 is end-of-life; do not deploy an old cached Node 20 image.
All `.env*` files and private-key files are excluded from Docker build contexts:
provide production secrets at runtime, never through `COPY` or frontend build arguments.

The account-export release migration adds ordered subject/key and legacy-actor JSON indexes inside its transaction. On a populated database, rehearse it against an isolated restored copy, measure index space and migration duration, and schedule a maintenance window before starting the new API. See [account export](ACCOUNT_EXPORT.md) for its inventory and verification boundary.

`DATABASE_MIGRATION_URL` uses the owner credentials configured for the Postgres service and is supplied only to migration and backup containers. `DATABASE_URL` must target the same database with the distinct `APP_DB_USER` and independently generated 64–128 character hexadecimal `APP_DB_PASSWORD`. The migration provisions that dedicated login after applying the schema: it grants application table CRUD and sequence access, denies database/schema/temporary-table creation, and rejects existing roles with unexpected privileges, memberships or ownership. The API never receives the owner connection or role-provisioning password variables. Rehearse this permission change on an isolated restored copy before upgrading an existing deployment; a managed database must allow the migration identity to provision this restricted role. Do not reuse an existing owner or provider-admin identity as `APP_DB_USER`.

Keep the database and Redis ports unpublished; production Compose binds the API and web host ports to loopback so only the host TLS proxy can reach them. Postgres and Redis use `restart: unless-stopped` so they return with the application after a host or Docker restart. The API and migration containers run as the unprivileged `node` user with read-only roots and bounded scratch space. Nginx also has a read-only root and only disposable cache/runtime tmpfs mounts; its capability set is limited to startup, worker privilege drop and port binding. Keep persistent data in Postgres, Redis, or the configured encrypted backup remote. The included Postgres container is not TLS-enabled, so keep `DB_SSL=false`; set it to `true` only when using a TLS-enabled managed database.

### Required runtime values

`docker-compose.production.yml config --quiet` requires database/Redis passwords, `DATABASE_MIGRATION_URL`, `DATABASE_URL`, `APP_DB_USER`, `APP_DB_PASSWORD`, independent JWT/contact/TOTP secrets, explicit `CLIENT_ORIGIN` and `CORS_ORIGINS`, legal/support/grievance values, `TERMS_VERSION`, `LEGAL_CONTENT_REVIEWED`, `SECRET_READER_GID`, `METRICS_BEARER_TOKEN_FILE`, `RCLONE_CONFIG_FILE`, `BACKUP_AGE_RECIPIENT`, `BACKUP_REMOTE`, `ALERTMANAGER_WEBHOOK_URL`, `ALERTMANAGER_WEBHOOK_USER`, and `ALERTMANAGER_WEBHOOK_PASSWORD_FILE`. Production API startup also requires deployed Cloudinary and Resend values and at least one text moderation provider key. `GOOGLE_CLIENT_ID` is required when `PUBLIC_BETA=true`. Public-beta API startup and web image builds fail while `LEGAL_CONTENT_REVIEWED=false`; set it to `true` only after the operator approves the exact terms, privacy and grievance content, territory/eligibility policy, provider disclosures, retention and rights procedures. The production example intentionally keeps this gate false and policy version/effective date as placeholders. The CI fixture sets the gate true only to exercise synthetic browser and container paths; that value is not legal approval. `METRICS_BEARER_TOKEN_FILE` must point to a single-line, 32+ character random token; Compose mounts it read-only into API and Prometheus. Create the dedicated host group and initial secrets outside the repository after preparing `/etc/yor-talks/.env.production`:

```bash
sudo install -d -o root -g docker -m 0750 /etc/yor-talks
getent group yor-talks-secrets >/dev/null || sudo groupadd --system yor-talks-secrets
secret_reader_gid=$(getent group yor-talks-secrets | cut -d: -f3)
sudo sed -i "s/^SECRET_READER_GID=.*/SECRET_READER_GID=${secret_reader_gid}/" /etc/yor-talks/.env.production
sudo install -o root -g yor-talks-secrets -m 0640 /dev/null /etc/yor-talks/metrics.token
openssl rand -hex 32 | sudo tee /etc/yor-talks/metrics.token >/dev/null
sudo install -o root -g yor-talks-secrets -m 0640 /dev/null /etc/yor-talks/alertmanager-webhook-password
openssl rand -hex 32 | sudo tee /etc/yor-talks/alertmanager-webhook-password >/dev/null
```

Use the generated webhook password when configuring the receiver's credentials. These creation commands replace existing secrets; for an existing deployment, use the permission repair below without regenerating the values. `SECRET_READER_GID` must be the numeric GID of `yor-talks-secrets`, never `0` or the host Docker group. Compose adds this supplementary group only to the API, Prometheus and Alertmanager; their primary unprivileged users stay unchanged. No Docker socket is mounted. File-backed Compose secrets retain host file ownership and permissions, so declaring `uid`, `gid` or `mode` in Compose does not repair an unreadable host file. See [Docker's secret mount rules](https://docs.docker.com/reference/compose-file/services/#secrets). The backup container alone consumes `rclone.conf` as UID 0; keep that file `root:root` with mode `0600`.

The one-shot Alertmanager renderer runs as UID 0 with only `DAC_OVERRIDE`, so it can initialize a fresh root-owned config volume and update an existing volume owned by UID 65534. It has no network or secret mounts, a read-only root and read-only script/template mounts; only its generated config volume and disposable `/tmp` are writable. It writes a mode `0644` config containing the receiver URL, username and password-file reference. The long-running Alertmanager remains UID 65534 and reads that volume without write access.

For a pre-existing deployment, update the two shared files with `sudo chown root:yor-talks-secrets /etc/yor-talks/metrics.token /etc/yor-talks/alertmanager-webhook-password` and `sudo chmod 0640 /etc/yor-talks/metrics.token /etc/yor-talks/alertmanager-webhook-password`, then recreate the consuming containers so their supplementary groups are refreshed. Before starting the stack, verify real mounts without printing their contents: `docker compose --env-file /etc/yor-talks/.env.production -f docker-compose.production.yml run --rm --no-deps --entrypoint node api -e 'require("node:fs").accessSync("/run/secrets/metrics_bearer_token", 4)'`, then run the equivalent `--entrypoint /bin/sh prometheus -c 'test -r /run/secrets/metrics_bearer_token'` and `--entrypoint /bin/sh alertmanager -c 'test -r /run/secrets/alertmanager_webhook_password'`. These one-shot checks use each service's configured identity and mounts. `node scripts/check-production-secret-permissions.mjs` exercises the Linux ownership model separately with disposable synthetic files, requiring denial without the reader group and successful reads with it. It also checks repeated config rendering on fresh root-owned and existing UID 65534-owned volumes. CI runs this fixture before its production container smoke test. Run this on the deployment Docker daemon too, especially when using rootless Docker or user namespace remapping.

The frontend provider switches are build-time `VITE_*` values wired from the corresponding backend flags; `pnpm production-config:check` guards this mapping. Keep payments, live rooms, RTC and Web Push disabled until provider acceptance is complete. Web Push additionally needs VAPID keys and obtains the public key from the authenticated API; the frontend does not embed the private key. RTC calls require an authenticated TURN service and short-lived TURN credentials; do not enable them with only the public STUN example.

Keep `AUTH_COOKIE_SAME_SITE=lax` when the frontend and API are same-site (including sibling subdomains on the same HTTPS domain). Set it to `none` only when the frontend is genuinely cross-site; production then requires HTTPS. The API trusts one reverse-proxy hop and enforces `Origin` against `CORS_ORIGINS` and `CLIENT_ORIGIN` on refresh. Use exact HTTPS origins with no wildcard or path. Production Compose publishes the API only at `127.0.0.1:${API_HOST_PORT}` so a host TLS proxy can reach it without exposing the port publicly. The [Caddy example](../ops/Caddyfile.example) sends `/api` and `/socket.io` directly to the API and sends frontend assets to Nginx, keeping both public routes at one trusted proxy hop. Do not forward public API traffic through both Caddy and Nginx with the current one-hop API setting: that would attribute rate limits to the proxy instead of each client.

## 2. Configure the external launch dependencies

New uploaded media uses the implemented [server-owned lifecycle](MEDIA_LIFECYCLE_IMPLEMENTATION.md). Before enabling this core launch path, apply its additive migration, configure three signed/authenticated Cloudinary presets and Gemini media moderation, and verify FFmpeg/FFprobe in the API container. Presign uses a bounded server upload unless authenticated provider account ceilings prove direct-upload limits for every resource endpoint. Playback and posters use expiring API delivery grants with approval/hash checks; set `MEDIA_DELIVERY_ORIGIN=https://<api-host>` for the separate API domain. An OpenAI-only text provider and green core `/readyz` are insufficient: check `details.media.ready` and complete real-provider acceptance. No production upload or provider configuration was performed by the implementation session. Keep the optional payment/live/push/RTC flags disabled.

### Eligibility activation gate

The production assurance adapter is unavailable and the approved territory and operator registries are empty. The app therefore keeps every account unverified and disables enrollment where no approved provider and policy apply. `pnpm smoke` checks that owner eligibility routes require authentication and that an unconfigured territory creates no enrollment. CI's synthetic policies and callbacks are injected directly by isolated tests; they are not production configuration or launch evidence.

Before enabling account activation in any territory, identify the operating entity and applicable territory, approve and load both the operator and recipient policy, select and contract with an assurance provider, and accept the provider's age and parental-responsibility protocols. Validate reassessment, withdrawal, rights, retention, contact and content behavior in the deployed environment. A green fixture-based suite does not close those operational gates.

The 14 October local production Compose smoke found that Alertmanager v0.28.1 exits on the configured `--config.expand-env` flag. The configuration now renders webhook values before startup because this pinned version does not support environment expansion. The one-shot renderer uses UID/GID 0 with only `DAC_OVERRIDE` to support both fresh root-owned volumes and older volumes owned by Alertmanager. It has no network, a read-only root filesystem and only the generated-config volume as writable persistent storage; Alertmanager itself runs as UID/GID 65534. Verify container health, `amtool check-config` and real alert delivery to the configured receiver before relying on the monitoring stack; hosted CI #387 did not cover the current renderer setup.

- Point frontend and API DNS names at a host Caddy/reverse proxy. Start with [ops/Caddyfile.example](../ops/Caddyfile.example): frontend assets go to Nginx at `127.0.0.1:8080`; API/WebSocket paths and the optional API hostname go directly to the API at `127.0.0.1:4000`. These are loopback-only Compose defaults; if you change either host port, update the Caddy upstream too. Caddy manages HTTPS and forwards WebSocket upgrades automatically. Set `CLIENT_ORIGIN`/`CORS_ORIGINS` to the exact frontend `https://` origin. For a separate API hostname, set `VITE_API_BASE_URL=https://<api-host>/api` and `VITE_REALTIME_URL=https://<api-host>`; for same-origin API access, retain `/api`. Allow inbound 80/443 only at the proxy and do not expose API/Postgres/Redis host ports.
- The Caddy example assumes Caddy receives public traffic directly. If a CDN or load balancer sits in front of it, configure Caddy with that provider's exact trusted proxy source ranges and verify client-IP spoofing is rejected; otherwise rate limits may group users under the upstream proxy address.
- Verify the Resend sender domain and set `EMAIL_FROM`. Registration is fail-closed when production email delivery is unavailable.
- In Google Cloud, configure a Web OAuth client with the deployed frontend's exact HTTPS JavaScript origin and copy the same client ID to `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`. Yor Talks uses the Google Identity credential flow; it does not need an invented callback URL. Exercise allowed/disallowed accounts after configuring the email-domain policy.
- Publish and verify the Resend sender domain's SPF/DKIM records, enforce DMARC according to organizational policy, and use a sender on that verified domain.
- Generate separate Web Push VAPID keys only when launching push: `pnpm --filter @workspace/api-server exec web-push generate-vapid-keys`. Set the public/private values and valid `mailto:` subject; never place the private key in a `VITE_*` variable.
- Configure LiveKit with a `wss://` endpoint, scoped API credentials, firewall reachability and TURN where required. Keep live rooms/calls disabled until reconnect, safety and capacity acceptance is complete.
- In Razorpay, register `https://<api-host>/api/economy/webhooks/razorpay` and set a unique webhook secret separate from the API key secret. Keep payments off until signed success/failure, duplicate/retried webhook delivery and provider-to-ledger settlement are verified.
- Production upload and presign use the server-owned lifecycle and fail closed when storage, decoder, signed presets or Gemini media moderation are unavailable. Configure and acceptance-test the implemented path; Cloudinary credentials alone do not enable media. HLS remains 501 until a transcoder/packager is implemented.
- Keep payments, seller/memberships, live rooms, web push, RTC calls, and AI features disabled in both API and frontend flags for this beta. Each feature maintains independent code readiness and synthetic acceptance suites; enable them only in a separately reviewed rollout after provider, safety and operational acceptance tests; credentials alone do not enable a feature.
- Decide whether this deployment is open globally or a closed beta. For a closed beta, set `ALLOWED_EMAIL_DOMAINS` and document the approved domains.
- Publish reviewed Privacy, Terms, Community Guidelines, copyright/takedown process, retention schedule, support address and the appointed grievance officer’s name/contact. The in-app pages intentionally identify the legal fields that are still unconfigured.
- Grievance receipts provide a ticket ID and recorded status only; email updates are not automatic, and no response deadline is published until the operating territory and applicable policy are approved. Assign and rehearse a staffed review and urgent-safety path before opening public intake.
- The Bounties route has no verified sponsor feed or application backend. It shows an empty state until each opportunity's sponsor, amount, deadline and terms have been confirmed; do not advertise grant submissions as available.

## 3. Deploy

```bash
docker compose --env-file /etc/yor-talks/.env.production -f docker-compose.production.yml config --quiet
docker compose --env-file /etc/yor-talks/.env.production -f docker-compose.production.yml build --pull migrate api web backup
docker compose --env-file /etc/yor-talks/.env.production -f docker-compose.production.yml up -d
docker compose --env-file /etc/yor-talks/.env.production -f docker-compose.production.yml ps
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
docker compose --env-file /etc/yor-talks/.env.production -f docker-compose.production.yml logs --no-log-prefix migrate
docker compose --env-file /etc/yor-talks/.env.production -f docker-compose.production.yml logs --tail=200 api
```

## 4. Scheduled operations and monitoring

Production Compose includes internal-only Prometheus, Alertmanager, and a textfile exporter for backup status. Prometheus scrapes `/api/metrics` using the mounted `metrics_bearer_token` secret. Its alert rules cover API scrape failures, shared Redis metric availability, notification/feed worker failures, lifecycle worker heartbeat and overdue/dead cleanup jobs, failed/stale analytics rollups, and missing/stale/failed backups. Configure `ALERTMANAGER_WEBHOOK_URL` to a reachable HTTPS receiver restricted to the deployment's egress; `ALERTMANAGER_WEBHOOK_USER` and a mounted password file authenticate the receiver, so do not put credentials in the URL. The monitoring UIs are not published to the internet. Inspect service state/logs with:

```bash
docker compose --env-file /etc/yor-talks/.env.production -f /opt/yor-talks/docker-compose.production.yml ps prometheus alertmanager backup-metrics-exporter
docker compose --env-file /etc/yor-talks/.env.production -f /opt/yor-talks/docker-compose.production.yml logs --tail=200 prometheus alertmanager backup-metrics-exporter
```

Install the systemd units on one designated scheduler host. Complete the remote/key configuration and controlled backup verification in section 5 before enabling the timers below. The dedicated `yor-talks` service account needs Docker-socket access (equivalent to root), read access to `/opt/yor-talks` and the mode-0640 production env file. The root backup container mounts the root-owned mode-0600 rclone config through Compose. Do not enable duplicate backup timers on multiple hosts; analytics runs are idempotent across hosts, but designate one scheduler host to simplify operations.

```bash
sudo useradd --system --create-home --home-dir /opt/yor-talks --shell /usr/sbin/nologin --groups docker yor-talks
sudo install -d -o root -g docker -m 0750 /etc/yor-talks
sudo chown root:docker /etc/yor-talks/.env.production
sudo chmod 0640 /etc/yor-talks/.env.production
sudo -u yor-talks test -r /etc/yor-talks/.env.production
sudo install -m 0600 -o root -g root /secure/rclone.conf /etc/yor-talks/rclone.conf
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
- **Worker failures:** inspect the notification worker logs, Redis health and Prometheus `yor_worker_failed_jobs_total`. For cleanup alerts, check the admin diagnostics `lifecycleCleanup` counts and the `background_jobs` rows for `account_cleanup` or `media_cleanup`; preserve queued/failed jobs while diagnosing provider errors.
- **Stale analytics:** inspect the systemd timer and `journalctl -u yor-talks-analytics.service`, then query authorized pipeline status. Re-run only after dependencies recover; the last seven days recompute idempotently.
- **Backup failure or suspected data loss:** stop schema changes, preserve the encrypted local staging file, inspect rclone and remote object/version, verify with the protected age identity, and restore only into a separate empty database. Promote a restore only after operator approval and application validation; never overwrite production during an incident drill.
- **Credential compromise:** disable the affected provider/feature flag, rotate only the affected secret through the approved secret manager, and review session revocation and provider audit logs. A contact-shield secret rotation requires a reviewed digest migration.

## 5. Backups and recovery

The repository backup helper requires `age` and `rclone`. Configure an rclone remote for independent off-host storage and set provider-side versioning/object lock plus a retention lifecycle (for example 35 days); the helper deliberately never deletes remote objects. Configure the remote interactively as the scheduler identity, then install its protected config:

```bash
sudo -u yor-talks rclone config --config /opt/yor-talks/.config/rclone/rclone.conf
sudo install -D -o root -g root -m 0600 /opt/yor-talks/.config/rclone/rclone.conf /etc/yor-talks/rclone.conf
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

## 6. Launch checks

Run these acceptance checks after the approved territory, assurance journey, operator and provider inputs are configured. The repository's empty territory registry and unavailable assurance adapter must continue to deny activation until then.

- Complete the approved prescreen/assurance and any required guardian journey, then register a disposable test account from an allowed domain, confirm its email link, sign in and refresh the browser. Verify the refresh cookie is `HttpOnly`, `Secure` and uses the configured `SameSite` policy (`Lax` by default). Log out and verify that the response expires the cookie, server refresh is denied, and a reload remains signed out even if logout delivery is interrupted.
- Configure the Google Web OAuth client ID in both `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`, then test an allowed Google account and a disallowed account when a domain allow-list is enabled.
- Upload media, create/report/block content, export data, delete a disposable test account, and verify the deleted account cannot be found.
- Delete a disposable group member and confirm that member's authored messages disappear while the other members' group history remains accessible.
- Submit and track a grievance from a fresh browser and confirm it survives an API restart.
- Verify backups, alerting, error logs, rate limits, CORS, TLS renewal, domain ownership and the incident escalation roster.
- Run a campus Wi-Fi test on mobile and desktop, including WebSocket reconnects and slow-network behavior.
- Confirm Redis 7 and the notification worker are healthy. Redis 3 can answer session commands but cannot run the required BullMQ worker; do not bypass readiness checks to accommodate it.
- Confirm the exact pushed commit has a completed green GitHub Actions run, including production image builds. Resolve account/billing or runner issues first; a job that never starts provides no CI verification.

## 7. Rollback

Keep the previous image tags and the most recent database backup. Roll back application images only after checking migration compatibility; never run an unreviewed destructive schema rollback against the production database.
