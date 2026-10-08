# Yor Talks production launch runbook

This repository now has a production Compose profile, but a public launch still needs the provider accounts, domain and legal approval listed below. Do not use the development `docker-compose.yml` for public traffic.

**Current release decision: public launch remains blocked.** Use the [8 October production hardening report](PRODUCTION_HARDENING_2026-10-08.md) for current repairs, exact verification and remaining gates. The [7 October readiness review](PRODUCTION_READINESS_REVIEW_2026-10-07.md) retains historical defect observations. The [jurisdiction intake](GLOBAL_REGULATORY_INTAKE_2026-10-07.md) is dated research; operator, territory, age and feature scope still need owner approval. No global or minors launch is approved by this runbook.

The [media implementation report](MEDIA_LIFECYCLE_IMPLEMENTATION.md) records
current media controls, source-specific repository checks and the remaining
provider/runtime acceptance gates. CI requires `pnpm audit --prod`, actual decoder
tests, production image builds and the complete container smoke test. Do not
interpret synthetic provider fixtures, a pushed commit or liveness as live release approval.

The [6 October verification report](MEDIA_LIFECYCLE_VERIFICATION_2026-10-06.md)
lists all changed files, commands and limitations. Production image builds and
container startup/smoke have passed in CI for the recorded revisions; this
Windows host has no Docker Engine. Require a passing run for the revision being
deployed. Legacy URL-only objects are not automatically approved or deleted:
their retained account-deletion holds require provider ownership review.

## 1. Prepare the host and secrets

Use a supported Linux host with Docker Engine and Compose v2. Copy `ops/.env.production.example` to `/etc/yor-talks/.env.production`, replace every `CHANGE_ME` value, and keep it outside Git with mode `0640`, owned by `root:docker` (the scheduler account is in the Docker group). Generate independent URL-safe secrets, for example with `openssl rand -hex 32`; never reuse JWT, contact-shield, TOTP, or metrics secrets. The example and `ops/ci-production.env` are fixtures, not deployment values.

Use Node.js 24 LTS for local and CI builds (the container also uses Node 24).
Rebuild with `--pull` for current patched Node 24 / Nginx 1.30 base images.
Node 20 is end-of-life; do not deploy an old cached Node 20 image.
All `.env*` files and private-key files are excluded from Docker build contexts:
provide production secrets at runtime, never through `COPY` or frontend build arguments.

`DATABASE_URL` must use the same database/user/password values as the Postgres service. Keep the database and Redis ports unpublished; the production Compose file only publishes the web edge. The included Postgres container is not TLS-enabled, so keep `DB_SSL=false`; set it to `true` only when using a TLS-enabled managed database.

### Required runtime values

`docker-compose.production.yml config --quiet` requires database/Redis passwords, `DATABASE_URL`, independent JWT/contact/TOTP secrets, explicit `CLIENT_ORIGIN` and `CORS_ORIGINS`, legal/support/grievance values, `TERMS_VERSION`, `METRICS_BEARER_TOKEN_FILE`, `RCLONE_CONFIG_FILE`, `BACKUP_AGE_RECIPIENT`, `BACKUP_REMOTE`, `ALERTMANAGER_WEBHOOK_URL`, `ALERTMANAGER_WEBHOOK_USER`, and `ALERTMANAGER_WEBHOOK_PASSWORD_FILE`. Production API startup also requires deployed Cloudinary and Resend values and at least one text moderation provider key. `GOOGLE_CLIENT_ID` is required when `PUBLIC_BETA=true`. `METRICS_BEARER_TOKEN_FILE` must point to a single-line, 32+ character random token; Compose mounts it read-only into API and Prometheus.

### File-backed secret permissions

Local Compose binds the source files into containers and ignores secret
`uid`, `gid` and `mode` overrides for file sources. Host permissions must permit
the actual container readers. Plain `root:docker` mode `0640` does not grant
the API or custom Alertmanager's `node` user access, nor Prometheus's `nobody`
user. [Docker's secret permission reference](https://docs.docker.com/reference/compose-file/services/#secrets)
documents this limitation.

Keep the external `/etc/yor-talks` directory `root:docker` mode `0750` and
the environment file `0640`. Create root-owned secret files with no other-user
access, then grant only their readers through named POSIX ACLs. The following
example assumes rootful Docker without user-namespace remapping and an
ACL-capable host filesystem with `setfacl`/`getfacl` available. For rootless or
[user-namespace remapped Docker](https://docs.docker.com/engine/security/userns-remap/),
approve the host-mapped reader identities and apply ACLs to those identities;
container UID numbers alone are insufficient. Do not make files world-readable
or run the services as root to bypass a failed permission check.

During first provisioning, create the files below once with restrictive
permissions; use the approved rotation procedure for existing files. Build the
reviewed images and configure all secret source paths in the protected env
file. Prepare the rclone source config as described in the backups section too.
The files must exist before Compose can mount them for the identity probes.

```bash
sudo install -d -o root -g docker -m 0750 /etc/yor-talks
sudo install -o root -g docker -m 0600 /dev/null /etc/yor-talks/metrics.token
openssl rand -hex 32 | sudo tee /etc/yor-talks/metrics.token >/dev/null
sudo install -o root -g docker -m 0600 /dev/null /etc/yor-talks/alertmanager-webhook-password
openssl rand -hex 32 | sudo tee /etc/yor-talks/alertmanager-webhook-password >/dev/null
```

| File / Compose secret | Container reader in the reviewed source | Required access |
| --- | --- | --- |
| `metrics.token` / `metrics_bearer_token` | API `node` (expected UID 1000); Prometheus v3.5.0 `nobody` (verify its UID, expected 65534) | Both read only |
| `alertmanager-webhook-password` / `alertmanager_webhook_password` | Custom Alertmanager `node` (expected UID 1000), including its renderer and Alertmanager | Read only |
| `rclone.conf` / `rclone_config` | Backup image runs as root (expected UID 0); host scheduler reads the approved source configuration | Read only |

`USER node` is set by `api-server/Dockerfile` and
`ops/prometheus/Dockerfile.alertmanager`; the
[official Node image](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md#non-root-user)
defines that user with UID 1000. The
[pinned Prometheus Dockerfile](https://github.com/prometheus/prometheus/blob/v3.5.0/Dockerfile)
uses `nobody`. Verify these identities on the exact images before granting
access or starting the stack:

```bash
docker compose --env-file /etc/yor-talks/.env.production -f /opt/yor-talks/docker-compose.production.yml run --rm --no-deps --entrypoint /bin/sh api -ec 'id; test "$(id -u)" = 1000'
docker compose --env-file /etc/yor-talks/.env.production -f /opt/yor-talks/docker-compose.production.yml run --rm --no-deps --entrypoint /bin/sh prometheus -ec 'id; test "$(id -u)" = 65534'
docker compose --env-file /etc/yor-talks/.env.production -f /opt/yor-talks/docker-compose.production.yml run --rm --no-deps --entrypoint /bin/sh alertmanager -ec 'id; test "$(id -u)" = 1000'
```

These probes bypass startup and print identities only; they do not expose
secret values or prove provider readiness. After confirming the image users
and host UID mapping, grant these exact readers. Remove any inherited named
ACLs from the newly provisioned files before setting the intended grants:

```bash
sudo setfacl -b /etc/yor-talks/metrics.token /etc/yor-talks/alertmanager-webhook-password
sudo setfacl -m u:1000:r--,u:65534:r--,m::r-- /etc/yor-talks/metrics.token
sudo setfacl -m u:1000:r--,m::r-- /etc/yor-talks/alertmanager-webhook-password
sudo getfacl -n /etc/yor-talks /etc/yor-talks/metrics.token /etc/yor-talks/alertmanager-webhook-password
```

The ACL mask may make `ls` show group-read mode, but the owning group still has
no read grant; inspect the complete ACL and keep `other::---`. The directory
must have no additional/default ACL granting unapproved host access. The protected
host directory is not mounted into the containers: each secret is bound at its
own container path. After provisioning, require successful reads as the default
service users, without printing their contents:

```bash
docker compose --env-file /etc/yor-talks/.env.production -f /opt/yor-talks/docker-compose.production.yml run --rm --no-deps --entrypoint /bin/sh api -ec 'test "$(id -u)" = 1000; test -s /run/secrets/metrics_bearer_token; cat /run/secrets/metrics_bearer_token >/dev/null'
docker compose --env-file /etc/yor-talks/.env.production -f /opt/yor-talks/docker-compose.production.yml run --rm --no-deps --entrypoint /bin/sh prometheus -ec 'test "$(id -u)" = 65534; test -s /run/secrets/metrics_bearer_token; cat /run/secrets/metrics_bearer_token >/dev/null'
docker compose --env-file /etc/yor-talks/.env.production -f /opt/yor-talks/docker-compose.production.yml run --rm --no-deps --entrypoint /bin/sh alertmanager -ec 'test "$(id -u)" = 1000; test -s /run/secrets/alertmanager_webhook_password; cat /run/secrets/alertmanager_webhook_password >/dev/null; test -w /alertmanager'
```

Record image identities, nonsecret ACL metadata and probe exit codes. If an
existing Alertmanager volume belonged to an earlier image user, review an
ownership migration that preserves its state; do not discard the volume or
weaken secret permissions. Repeat the checks after image, host mapping or
secret changes, then verify API readiness, authenticated Prometheus scraping
and a delivered/resolved test alert. These deployment checks remain unverified
by the source-only Windows audit.

The frontend provider switches are build-time `VITE_*` values wired from the corresponding backend flags; `pnpm production-config:check` guards this mapping. Keep payments, live rooms, RTC and Web Push disabled until provider acceptance is complete. Web Push additionally needs VAPID keys and obtains the public key from the authenticated API; the frontend does not embed the private key. RTC calls require an authenticated TURN service and short-lived TURN credentials; do not enable them with only the public STUN example.

Keep `AUTH_COOKIE_SAME_SITE=lax` when the frontend and API are same-site (including sibling subdomains on the same HTTPS domain). Set it to `none` only when the frontend is genuinely cross-site; production then requires HTTPS. Refresh enforces `Origin` against `CORS_ORIGINS` and `CLIENT_ORIGIN`; use exact HTTPS origins with no wildcard or path. Production Compose publishes the API only at `127.0.0.1:${API_HOST_PORT}` so a host TLS proxy can reach it without exposing the port publicly. Production Nginx serves the frontend and provides same-origin API/WebSocket proxy routes; public TLS is terminated at the external proxy.

Approve every reachable request path before configuring proxy trust. At the API,
`TRUSTED_PROXY_CIDRS` must contain only approved immediate proxy peers as the API
actually sees them: the external TLS proxy for a separate API hostname, Nginx
for a same-origin proxy route, or both only when both routes are intended. At
Nginx, `TRUSTED_EDGE_CIDRS` identifies only approved external-edge peers as
Nginx sees them. Both default to empty trust; do not substitute a hop count,
all private networks, or inferred example addresses. Nginx emits canonical
client-IP and protocol headers after applying this explicit edge trust.
Restrict access to internal/loopback proxy paths and have the topology owner
verify distinct clients retain distinct limits, spoofed forwarding is ignored,
and HTTPS/secure cookies, credentialed CORS and WebSocket upgrades work through
each enabled route. The deployed peers and this acceptance evidence are a
release gate; source configuration alone does not establish their identity.

## 2. Configure the external launch dependencies

New uploaded media uses the implemented [server-owned lifecycle](MEDIA_LIFECYCLE_IMPLEMENTATION.md). Before enabling this core launch path, apply its additive migration, configure three signed/authenticated Cloudinary presets and Gemini media moderation, and verify FFmpeg/FFprobe in the API container. Presign uses a bounded server upload unless authenticated provider account ceilings prove direct-upload limits for every resource endpoint. Playback and posters use expiring API delivery grants with approval/hash checks; set `MEDIA_DELIVERY_ORIGIN=https://<api-host>` for the separate API domain. An OpenAI-only text provider and green core `/readyz` are insufficient: normal smoke requires `details.media.ready=true`, `details.media.decoder=true`, healthy database/Redis/notification services and `details.lifecycle.ready=true`, followed by real-provider acceptance. The synthetic exception requires both `CI=true` and `SMOKE_SYNTHETIC_PROVIDERS=true` with a loopback `BASE_URL` and explicitly expects `details.media.ready=false`; never use it for deployment acceptance. No production upload or provider configuration was performed by the implementation session. Keep the optional payment/live/push/RTC flags disabled.

- Point frontend and API DNS names at a host Caddy/reverse proxy. Start with [ops/Caddyfile.example](../ops/Caddyfile.example): frontend hostname to `127.0.0.1:${WEB_PORT:-8080}`, API hostname to `127.0.0.1:${API_HOST_PORT:-4000}`. Caddy manages HTTPS and forwards WebSocket upgrades automatically. Set `CLIENT_ORIGIN`/`CORS_ORIGINS` to the exact frontend `https://` origin, `VITE_API_BASE_URL=https://<api-host>/api`, and `VITE_REALTIME_URL=https://<api-host>`; allow inbound 80/443 only at the proxy and do not expose API/Postgres/Redis host ports.
- Verify the Resend sender domain and set `EMAIL_FROM`. Registration is fail-closed when production email delivery is unavailable.
- In Google Cloud, configure a Web OAuth client with the deployed frontend's exact HTTPS JavaScript origin and copy the same client ID to `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`. Yor Talks uses the Google Identity credential flow; it does not need an invented callback URL. Exercise allowed/disallowed accounts after configuring the email-domain policy.
- Publish and verify the Resend sender domain's SPF/DKIM records, enforce DMARC according to organizational policy, and use a sender on that verified domain.
- Generate separate Web Push VAPID keys only when launching push: `pnpm --filter @workspace/api-server exec web-push generate-vapid-keys`. Set the public/private values and valid `mailto:` subject; never place the private key in a `VITE_*` variable.
- Configure LiveKit with a `wss://` endpoint, scoped API credentials, firewall reachability and TURN where required. Keep live rooms/calls disabled until reconnect, safety and capacity acceptance is complete.
- In Razorpay, register `https://<api-host>/api/economy/webhooks/razorpay` and set a unique webhook secret separate from the API key secret. Keep payments off until signed success/failure, duplicate/retried webhook delivery and provider-to-ledger settlement are verified.
- Production upload and presign use the server-owned lifecycle and fail closed when storage, decoder, signed presets or Gemini media moderation are unavailable. Configure and acceptance-test the implemented path; Cloudinary credentials alone do not enable media. HLS remains 501 until a transcoder/packager is implemented.
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

The one-shot `migrate` service bootstraps a genuinely empty public schema from
reviewed, checked-in `lib/db/scripts/production-base.sql` through
`bootstrap-schema.mjs`, under a transaction and advisory lock. It then applies
the reviewed additive/idempotent migrations before the API starts. It
refuses nonempty incomplete schemas, including unrelated tables, views and
sequences. It requires the same unique `CONTACT_SHIELD_SECRET` as the API;
changing that key requires a reviewed contact-digest migration, not just a
configuration edit. Do not run schema push in production, including for an
empty database. Back up existing data and review migration compatibility first.
Review migration logs on every deployment:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml logs --no-log-prefix migrate
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=200 api
```

## 4. Scheduled operations and monitoring

Production Compose includes internal-only Prometheus, Alertmanager, and a textfile exporter for backup status. Prometheus scrapes `/api/metrics` using the mounted `metrics_bearer_token` secret. Its alert rules cover API scrape failures, shared Redis metric availability, notification and lifecycle failures/backlogs, failed/stale analytics rollups, and missing/stale/failed backups. Configure `ALERTMANAGER_WEBHOOK_URL` to a reachable HTTPS receiver restricted to the deployment's egress; `ALERTMANAGER_WEBHOOK_USER` and a mounted password file authenticate the receiver, so do not put credentials in the URL. The monitoring UIs are not published to the internet. Require pinned-container startup and actual test-alert delivery/resolution for the deployed revision. Inspect service state/logs with:

```bash
docker compose --env-file /etc/yor-talks/.env.production -f /opt/yor-talks/docker-compose.production.yml ps prometheus alertmanager backup-metrics-exporter
docker compose --env-file /etc/yor-talks/.env.production -f /opt/yor-talks/docker-compose.production.yml logs --tail=200 prometheus alertmanager backup-metrics-exporter
```

Install the systemd units on one designated scheduler host. The dedicated `yor-talks` service account needs Docker-socket access (equivalent to root), read access to `/opt/yor-talks`, the mode-0640 production env file, and the approved rclone config. The backup container's reader is root independently of this host scheduler identity; follow the rclone permissions and reader check below. Do not enable duplicate backup timers on multiple hosts; analytics runs are idempotent across hosts, but designate one scheduler host to simplify operations.

```bash
sudo useradd --system --create-home --home-dir /opt/yor-talks --shell /usr/sbin/nologin --groups docker yor-talks
sudo install -d -o root -g docker -m 0750 /etc/yor-talks
sudo install -m 0640 -o root -g docker .env.production /etc/yor-talks/.env.production
sudo install -m 0600 -o yor-talks -g docker /secure/rclone.conf /etc/yor-talks/rclone.conf
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
- **Worker failures:** inspect notification/lifecycle logs, Redis health, `details.lifecycle` and `yor_worker_failed_jobs_total`. Check lifecycle heartbeat, overdue/running age, expired leases, dead letters and last cleanup/progress metrics; preserve durable jobs and follow the recovery procedure below.
- **Stale analytics:** inspect the systemd timer and `journalctl -u yor-talks-analytics.service`, then query authorized pipeline status. Re-run only after dependencies recover; the last seven days recompute idempotently.
- **Backup failure or suspected data loss:** stop schema changes, preserve the encrypted local staging file, inspect rclone and remote object/version, verify with the protected age identity, and restore only into a separate empty database. Promote a restore only after operator approval and application validation; never overwrite production during an incident drill.
- **Credential compromise:** disable the affected provider/feature flag, rotate only the affected secret through the approved secret manager, and review session revocation and provider audit logs. A contact-shield secret rotation requires a reviewed digest migration.

### Lifecycle inspection and recovery

Readiness requires a fresh, healthy, non-stopping lifecycle heartbeat with all
required handlers and bounded active work. `/api/readyz` exposes
`details.lifecycle`; `/api/metrics` includes the bounded `yor_lifecycle_*`
series for heartbeat age, oldest overdue/running work, expired leases, dead
letters, last progress/cleanup and recovery failures. A process that merely
continues to emit heartbeats while its handler stalls is insufficient.

Use approved database credentials and a reviewed source checkout with frozen
dependencies in a protected operator environment. The source CLI reports at
most 100 noncomplete jobs and omits job payloads:

```bash
# Load the explicitly approved DATABASE_URL through the normal secret mechanism.
corepack pnpm --filter @workspace/api-server exec node --import tsx src/scripts/lifecycle-jobs.ts inspect
```

Diagnose the failed dependency or handler, confirm publication revocation and
lease ownership, then recover the dependency or restart the worker as required.
Only dead jobs without a live or ambiguous lease may be replayed. A legacy
terminal lease proven expired by the database clock is cleared atomically under
the row lock, fencing the old worker and preserving replay audit. A future
lease or a token with no expiry remains blocked for inspection. Record the
incident and use a machine reason containing 3–80 letters, digits or underscores:

```bash
# Set LIFECYCLE_JOB_ID to the reviewed dead-job UUID from inspect output.
corepack pnpm --filter @workspace/api-server exec node --import tsx src/scripts/lifecycle-jobs.ts replay "$LIFECYCLE_JOB_ID" provider_recovered
```

Replay records the previous attempt count, error and operator reason in
`background_job_replays` before scheduling a new attempt; preserve that history.
Do not manually delete/reset jobs or steal active leases. Confirm the expected
side effect, renewed cleanup/progress and readiness, then close the alert.
The 8 October work also bounds lifecycle handlers and durable notification
attempts; use the current hardening report for final source/test evidence before
accepting their rollout. Redis transport retention does not replace the durable
delivery-attempt authority or justify automatically retrying exhausted work.

## 5. Backups and recovery

The repository backup helper requires `age` and `rclone`. Configure an rclone remote for independent off-host storage and set provider-side versioning/object lock plus a retention lifecycle (for example 35 days); the helper deliberately never deletes remote objects. Configure the remote interactively as the scheduler identity, then install its protected config:

```bash
sudo -u yor-talks rclone config --config /opt/yor-talks/.config/rclone/rclone.conf
sudo install -d -o root -g docker -m 0750 /etc/yor-talks
sudo install -D -o yor-talks -g docker -m 0600 /opt/yor-talks/.config/rclone/rclone.conf /etc/yor-talks/rclone.conf
age-keygen -o /secure/yor-talks-backup.agekey
chmod 0600 /secure/yor-talks-backup.agekey
age-keygen -y /secure/yor-talks-backup.agekey
```

The host rclone config stays `yor-talks:docker` mode `0600` in the protected
external directory. With the reviewed rootful/no-remap topology, the backup
container runs as root and reads its bind-mounted secret under `/root`; it does
not need the Node/Prometheus ACLs. Verify the actual reader separately:

```bash
docker compose --env-file /etc/yor-talks/.env.production -f /opt/yor-talks/docker-compose.production.yml --profile ops run --rm --no-deps --entrypoint /bin/sh backup -ec 'test "$(id -u)" = 0; test -s /root/.config/rclone/rclone.conf; cat /root/.config/rclone/rclone.conf >/dev/null'
```

A rootless/remapped backup reader may need an approved host-mapped ACL too.
Do not print rclone credentials or run a backup/off-host transfer merely to
test file readability; verify provider access separately in the approved drill.

Use the printed `age1...` public recipient as `BACKUP_AGE_RECIPIENT`. Store the private age identity offline in a separately controlled recovery vault, never on the scheduler or in Compose secrets. Restore uses a single transaction and requires an isolated empty database whose actual name matches explicit `RESTORE_TARGET_DATABASE`, differs from the archive source, and is not an administrative/template database. The helper refuses populated targets; it cannot establish that an operator selected the correct isolated host, so verify host/port/database identity first.

```bash
BACKUP_AGE_RECIPIENT="age1..." BACKUP_REMOTE="backups:yor-talks" \
  DATABASE_URL="postgresql://..." lib/db/scripts/backup-database.sh backup

BACKUP_AGE_IDENTITY="/secure/restore-identity" \
  lib/db/scripts/backup-database.sh verify .backup/backup_YYYYMMDD_HHMMSS.dump.age

# Restore only to the approved isolated empty target; populate DATABASE_URL securely.
BACKUP_AGE_IDENTITY="/secure/restore-identity" RESTORE_TARGET_DATABASE=restore_db \
  lib/db/scripts/backup-database.sh restore .backup/backup_YYYYMMDD_HHMMSS.dump.age
```

Schedule backups at least daily and before schema changes. Record remote object/version, encrypted archive verification, restore results, and recovery-time objectives as operational evidence. Merely running this script does not verify remote durability or a successful restore. PostgreSQL is the durable authority for accounts/reports and delivery recovery, but Redis also holds live sessions, queues and rate limits: do not flush it as an application rollback or bypass its readiness checks.

### Restore rehearsal and verification

Use a separate, access-controlled non-production Postgres host with compatible
client/server versions. Restrict a production-data rehearsal to approved
operators; never connect it to public traffic, email, payment or moderation
providers. Restore testing does not authorize sending private data to a new service.

Configure a libpq service named `yor-restore-rehearsal` for that host using
protected local configuration. Supply its credentials through the normal
secret mechanism, not command-line arguments or Git. Retrieve the encrypted
backup and verify its recorded checksum and archive before restoring. The helper
decrypts only inside the approved environment.

The following Bash example creates a new database and deliberately fails if
that name already exists. Inspect the connection identity before proceeding;
do not run this against a production host or use `--clean` on an existing DB.

```bash
set -e
export PGSERVICE=yor-restore-rehearsal
psql --dbname=postgres -X -v ON_ERROR_STOP=1 \
  -c 'SELECT inet_server_addr(), inet_server_port(), current_database(), current_user;'
# Stop here and confirm this is the intended isolated host.
createdb --maintenance-db=postgres yor_restore_rehearsal_20261008
# Load DATABASE_URL securely for that newly created isolated target.
psql --dbname="$DATABASE_URL" -X -v ON_ERROR_STOP=1 \
  -c 'SELECT inet_server_addr(), inet_server_port(), current_database(), current_user;'
BACKUP_AGE_IDENTITY=/secure/restore-identity \
  RESTORE_TARGET_DATABASE=yor_restore_rehearsal_20261008 \
  lib/db/scripts/backup-database.sh restore /approved/path/yor-talks.dump.age
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

- Register a real test account from an allowed domain, confirm the email link, sign in, refresh the browser, log out, and verify the refresh cookie is `HttpOnly`, `Secure` and `SameSite=Lax`.
- Configure the Google Web OAuth client ID in both `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`, then test an allowed Google account and a disallowed account when a domain allow-list is enabled.
- Upload media, create/report/block content, export data, delete a disposable test account, and verify the deleted account cannot be found.
- Submit and track a grievance from a fresh browser and confirm it survives an API restart.
- Verify backups, alerting, error logs, rate limits, CORS, TLS renewal, domain ownership and the incident escalation roster.
- Run a campus Wi-Fi test on mobile and desktop, including WebSocket reconnects and slow-network behavior.
- Confirm Redis 7, the notification worker and required lifecycle handlers are healthy. Verify stopped/stalled lifecycle work blocks readiness and exercise recovery without losing durable jobs. Older incompatible Redis versions must not be accommodated by bypassing readiness.
- Confirm the exact pushed commit has a completed green GitHub Actions run, including production image builds. Resolve account/billing or runner issues first; a job that never starts provides no CI verification.

## 7. Rollback

Keep previous image tags, compatible configuration and verified encrypted
backups. Pause the rollout and preserve evidence, then roll back application
images/configuration only after checking migration compatibility and preserving
authentication revocation, shared-message history, media and financial
invariants. Retain additive schema and audit evidence. Never automatically
restore the production database or flush Redis as an application rollback.
Database recovery is a separate incident decision: restore a verified archive
into an approved isolated empty target with explicit `RESTORE_TARGET_DATABASE`,
validate relationships, grants and application behavior, and obtain operator
approval before any promotion or traffic switch.
