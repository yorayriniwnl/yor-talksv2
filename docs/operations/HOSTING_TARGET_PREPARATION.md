# Hosting Target Preparation & Topology Specification

**Repository:** `yor-talks-v3`  
**Baseline Anchor:** Unified Release Candidate (`3887cc4` / `c8ad448`)  
**Status:** Provider-Independent Preparation Complete; Target Selection Specification Established  

---

## 1. Discovered Authorized Infrastructure & Nonsecret Inventory

A comprehensive inspection of the workspace, environment variables, local system state, repository metadata, and CI pipelines was conducted to discover any pre-authorized infrastructure or hosting assets.

### 1.1 Discovery Findings

1. **Vercel Hosting**:
   - **Account / Team:** `yorayriniwnl-1218s-projects`
   - **Project Name:** `yor-talks`
   - **Deployments:**
     - Production alias deployment: `dpl_8uLzjCLpBsv4rSo64ojUKxbAv4VL` (`https://yor-talks.vercel.app/`)
     - Latest protected preview deployment: `dpl_8XdZqPNgddMDinvfHGbzvm9oiKvV` (`https://yor-talks-jpub2ler5-yorayriniwnl-1218s-projects.vercel.app/`)
   - **Observed Capability & Limitation:** Vercel successfully hosts the static frontend build and Edge routing. However, Vercel Serverless Functions (`api/index.ts`) enforce execution timeouts (60 seconds) and **cannot host durable Socket.IO listeners, persistent WebSocket connections, the BullMQ worker supervisor, background lifecycle cleanup sweeps, or in-memory state**. Consequently, `/api/livez` and `/api/readyz` return 500/503 on Vercel without an external persistent backend target.

2. **GitHub & CI**:
   - **Repository:** `https://github.com/yorayriniwnl/yor-talksv2.git`
   - **CI Workflow:** `.github/workflows/ci.yml` validates builds, audits dependencies, and executes isolated container smoke tests with synthetic providers.
   - **Deployment Secrets:** No cloud deployment credentials, SSH keys, or auto-deploy action workflows to external providers (AWS, GCP, Azure, Fly, Railway, Hetzner, etc.) are configured.

3. **Local Machine & Tooling**:
   - **Operating System:** Windows 11 x64
   - **Cloud CLIs:** `gcloud`, `aws`, `az`, `docker`, `flyctl`, `railway`, `vercel`, `terraform`, and `kubectl` are NOT installed in the host path. OpenSSH client (`ssh.exe`) is present.
   - **SSH Known Hosts:** Only `github.com` is recorded; no server host keys exist.
   - **Plugin Accounts:** No external plugin accounts are connected.

4. **Persistent Datastores & Ingress**:
   - No cloud-managed PostgreSQL, Redis, or dedicated server instances have been provisioned or authorized.

### 1.2 Nonsecret Infrastructure Inventory

| Attribute | Staging / Preview | Production Target (Required) |
| :--- | :--- | :--- |
| **Provider & Account** | Vercel (`yorayriniwnl-1218s-projects`) | Provider selection pending owner decision (see Section 6) |
| **Application Identifier** | `dpl_8XdZqPNgddMDinvfHGbzvm9oiKvV` | Containerized Stack (`yor-talks-production`) |
| **Region** | Vercel Edge (`iad1` / auto) | Target region (e.g. `eu-central-1` / `fsn1` / `us-east-1`) |
| **OS & CPU Architecture** | Vercel Serverless Sandbox (Amazon Linux 2) | Linux x86_64 or arm64 (e.g. Ubuntu 24.04 LTS) |
| **Available CPU / Memory / Disk** | Ephemeral serverless execution limits | 2 vCPU, 4–8 GB RAM, 40–50 GB NVMe/SSD |
| **Persistent Storage** | None (ephemeral) | 20+ GB PostgreSQL data volume, 10+ GB Redis AOF volume |
| **Deployment Access Method** | Vercel CLI / Git Integration | SSH Deploy Key / Docker Engine API over mutual TLS |
| **Public Hostname & Ingress Owner** | `yor-talks-jpub2ler5-yorayriniwnl-1218s-projects.vercel.app` | Custom Domain DNS (e.g. `app.your-domain.example` & `api.your-domain.example`) |
| **Current Resource Cost** | $0 (Hobby / Free tier) | Expected: \$10–\$45/month depending on selected compute tier |

---

## 2. Process Model & Runtime Inspection

The application codebase was analyzed across `api-server/src/index.ts`, `api-server/src/worker.ts`, package scripts, Dockerfiles, `docker-compose.production.yml`, and systemd units to confirm the exact process and concurrency model.

### 2.1 Unified API & In-Process Workers (`api-server/src/index.ts`)

The production entrypoint starts all required application services within a single Node.js process:
```ts
const httpServer = createServer(app);
const io = await attachSocketServer(httpServer);
const lifecycleWorker = await startLifecycleWorker(createPaymentRuntime().handlers);
const feedWorker = await startFeedWorker(); // Intentionally disabled; rankings update atomically with engagement
const notificationWorker = await startNotificationWorker();
```

- **HTTP API (`app`):** Express 5 application serving REST routes, authentication, media presigning/delivery, and health checks.
- **Realtime Server (`io`):** Socket.IO server mounted on the HTTP server with `@socket.io/redis-adapter` for scaling.
- **Lifecycle Worker (`lifecycleWorker`):** Polling loop against the `background_jobs` PostgreSQL table using leasing, heartbeats, and transactional completion. Handlers execute account session cleanup, recurring media sweeps (every 60s), and payment reconciliations.
- **Notification Worker (`notificationWorker`):** BullMQ supervisor consuming `defaultQueue` backed by Redis 7, with outbox recovery sweeping unpushed notifications every 30s.

### 2.2 Critical Invariant: Do Not Run Separate Worker Services

- `api-server/src/worker.ts` exists as an experimental/alternative standalone worker, but it only starts `startLifecycleWorker` and `startNotificationWorker` (omitting feed compatibility).
- **Because `api-server/src/index.ts` starts all required workers in-process, deploying a separate standalone worker container in the same stack would cause:**
  1. Redundant background workers competing for database leases.
  2. Duplicate heartbeat pulses and potential split-brain status reporting.
  3. Redundant BullMQ consumers on `defaultQueue`.
- **Decision:** The container topology preserves the single unified `api` service where HTTP, WebSocket, and workers execute together under supervised lifecycle management.

### 2.3 Schedulers & Systemd Timers

Schedulers are not run as internal Node.js `setInterval` crons that risk drifting or duplicating across process replicas. Instead, scheduled maintenance is externalized to systemd timers:
1. **Analytics Rollup (`yor-talks-analytics.timer`):** Executes daily at 02:15 UTC via `docker compose run --rm --no-deps api pnpm --filter @workspace/api-server analytics:rollup`. Recomputes seven complete days idempotently.
2. **Encrypted Database Backup (`yor-talks-backup.timer`):** Executes daily at 01:00 UTC via `docker compose run --rm --no-deps backup backup`.
3. **Operational Invariant:** Timers must only be enabled on **one designated scheduler host**. Never enable duplicate timers on multiple worker nodes.

---

## 3. Required Hosting Target Topology

The hosting topology must support all 9 core capabilities required by the application:

```
                          [ Public Internet / Clients ]
                                       │
                               HTTPS 443 / HTTP 80
                                       ▼
                       ┌───────────────────────────────┐
                       │   Ingress TLS Reverse Proxy   │
                       │        (Caddy / Nginx)        │
                       └───────────────┬───────────────┘
                                       │
                      ┌────────────────┴────────────────┐
                      │ Forwarded Headers Normalized     │
                      ▼                                 ▼
         ┌─────────────────────────┐       ┌─────────────────────────┐
         │       Web Service       │       │       API Service       │
         │   (social / Nginx)      │       │     (api-server)        │
         │      Port :8080         │       │       Port :4000        │
         └─────────────────────────┘       └────────────┬────────────┘
                                                        │
                      ┌─────────────────────────────────┼───────────────────────────────┐
                      ▼                                 ▼                               ▼
         ┌─────────────────────────┐       ┌─────────────────────────┐     ┌─────────────────────────┐
         │       PostgreSQL 16     │       │         Redis 7         │     │     FFmpeg / FFprobe    │
         │   ACID Persistence      │       │      AOF Durability     │     │     (In-Container)      │
         │ (postgres_data_production)      │  (redis_data_production)│     │  Audio/Video Validation │
         └────────────┬────────────┘       └─────────────────────────┘     └─────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │     Backup Service      │
         │  (age + rclone export)  │───► [ Encrypted Off-Host Cloud Storage ]
         └─────────────────────────┘
```

1. **Express HTTP API**: Node 24 runtime, port 4000, unprivileged `node` user.
2. **Socket.IO Realtime Server**: Persistent HTTP connection upgrade to WebSocket, connection state tracked in Redis adapter, ping/pong heartbeats.
3. **Background Processing**: BullMQ queues and PostgreSQL leased `background_jobs`.
4. **Media Validation**: Native `ffmpeg` and `ffprobe` installed inside `api-server/Dockerfile` via Alpine packages, executing byte decoding with strict timeouts.
5. **PostgreSQL Durability**: PostgreSQL 16 Alpine, ACID transaction safety, automated schema migrations (`migrate` service), persistent named volume.
6. **Redis Availability**: Redis 7 Alpine with `--appendonly yes`, password authentication, private internal container network.
7. **HTTPS Ingress**: Caddy / Edge Nginx terminating TLS, passing canonical client IP via trusted CIDRs, stripping untrusted `Forwarded` headers.
8. **Internal Monitoring**: Prometheus 3.5.0 scraping `/api/metrics` via mounted bearer token secret, Alertmanager 0.28.1 with validated webhook, Node textfile exporter for backup metrics.
9. **Encrypted Off-Host Backups**: One-shot backup container running `backup-database.sh`, encrypting database dumps with `age`, uploading via `rclone` to remote off-host bucket, local retention 14 days, no remote deletion.

---

## 4. Staging vs Production Boundaries

Staging and production environments must be demonstrably isolated across all layers.

| Isolation Domain | Staging Environment (`docker-compose.staging.yml`) | Production Environment (`docker-compose.production.yml`) |
| :--- | :--- | :--- |
| **Datastore (Postgres)** | `yor_talks_staging` database on `postgres_data_staging` volume | `yor_talks` database on `postgres_data_production` volume |
| **Cache & Queues (Redis)**| Dedicated staging Redis on `redis_data_staging` volume | Dedicated production Redis on `redis_data_production` volume |
| **Host Ports (if co-located)** | Web: `8081`, API: `4001` | Web: `8080`, API: `4000` |
| **Docker Networks** | `staging_edge`, `staging_backend` (internal) | `edge`, `backend` (internal) |
| **Audience Control** | `ALLOWED_EMAIL_DOMAINS` enforced (closed testing group), `PUBLIC_BETA=false` | Public beta or open domain policy, `PUBLIC_BETA=true` |
| **Resource Quotas** | API: 1.5 CPU, 1.5 GB RAM; Postgres: 1 CPU, 1 GB RAM | API: 2+ CPU, 2+ GB RAM; Postgres: 2+ CPU, 2+ GB RAM |
| **Ingress Hostnames** | `staging.your-domain.example` & `staging-api.your-domain.example` | `app.your-domain.example` & `api.your-domain.example` |
| **Third-Party Providers** | Staging Cloudinary presets, Resend test domain, Razorpay test mode (`rzp_test_*`), LiveKit sandbox | Production Cloudinary signed presets, verified domain Resend, Razorpay live mode |
| **Secret Material** | Distinct 64-hex tokens in `.env.staging` | Distinct 64-hex tokens in `/etc/yor-talks/.env.production` |

---

## 5. Provider-Independent Deployment Files

All necessary deployment artifacts are implemented and verified in the repository:

1. **`docker-compose.production.yml`**: Production Compose stack including PostgreSQL 16, Redis 7, migration runner, API + Realtime + Workers, Prometheus, Alertmanager, Backup textfile exporter, and Nginx Web edge.
2. **`docker-compose.staging.yml`**: Staging Compose stack with isolated volumes, network separation, offset ports (8081/4001), and explicit CPU/RAM limits.
3. **`ops/.env.production.example`**: Complete template covering 70 schema keys for production.
4. **`ops/.env.staging.example`**: Staging template with closed test audience controls and offset port configuration.
5. **`ops/Caddyfile.example`**: Host-level reverse proxy configuration for production hostnames, HTTPS automation, and header sanitization.
6. **`ops/Caddyfile.staging.example`**: Staging reverse proxy with optional IP allowlist or tester access restrictions.
7. **`ops/systemd/`**: Systemd unit definitions for daily analytics rollup (`02:15 UTC`) and encrypted off-host backup (`01:00 UTC`).
8. **`ops/validate-deployment-config.mjs`**: Nonsecret-leaking deployment verification script (`pnpm deployment-config:validate`).

### 5.1 Validating Deployment Configuration Without Exposing Secrets

Run the configuration validator prior to booting the stack:
```bash
# Validate production deployment configuration
node ops/validate-deployment-config.mjs --env-file=/etc/yor-talks/.env.production

# Validate staging deployment configuration
node ops/validate-deployment-config.mjs --env-file=/etc/yor-talks/.env.staging --target=staging
```
The validator inspects 28 mandatory variables, checks 32+ character entropy for all encryption keys, ensures mutual key uniqueness, verifies file-backed secret permissions, and checks URL/origin formats. **It outputs only PASS/FAIL status and variable names; secrets are never printed to terminal or logs.**

---

## 6. Target Provider Capability Assessment & Option Comparison

Because no persistent hosting server is currently provisioned, three concrete hosting options were evaluated against the application's complete technical requirements:

### 6.1 Provider Option Analysis

| Criteria | Option A: Dedicated Linux Cloud VM (Hetzner / DO / AWS EC2 / GCP Compute) | Option B: Managed Container PaaS (Render / Railway / Fly.io) | Option C: Hybrid Edge + Dedicated VM (Vercel Frontend + Dedicated Backend VM) |
| :--- | :--- | :--- | :--- |
| **Socket.IO / WebSocket Durability** | **Excellent:** Long-lived TCP connections handled directly by Caddy / Node without timeouts. | **Moderate/Good:** Supported on specific tiers, but subject to container restarts and proxy connection limits. | **Excellent:** Vercel serves static web; Socket.IO connects directly to backend VM endpoint (`VITE_REALTIME_URL`). |
| **In-Container FFmpeg Execution** | **Excellent:** Full native binary execution within Alpine container; standard CPU bursting. | **Variable:** Dependent on container RAM/CPU limits; may encounter OOM during heavy video validation. | **Excellent:** Handled on backend VM container. |
| **Background Worker Co-location** | **Excellent:** Full process model matches `api-server/src/index.ts` without extra container charges. | **Good:** Supported, but requires scaling container instances or paying for multiple services. | **Excellent:** Runs inside API process on VM. |
| **PostgreSQL & Redis Durability** | **High:** Persistent NVMe/SSD block storage with local Docker volumes + daily off-host encrypted backups. | **High:** Managed PostgreSQL and Redis add-ons available (at higher monthly cost). | **High:** Persistent volumes on VM or managed cloud database. |
| **Monitoring & Alerting** | **Complete:** Prometheus, Alertmanager, and Node textfile exporter run natively in Compose stack. | **Partial:** PaaS metrics dashboards often replace internal Prometheus, requiring metric re-wiring. | **Complete:** Native Compose monitoring stack remains intact on backend host. |
| **Operational Simplicity** | **High (Standard DevOps):** Single Compose file manages the complete environment; portable across any cloud. | **High (PaaS UI):** Git-push deploy, but vendor lock-in to PaaS networking and volume semantics. | **Moderate:** Two deployment targets (Vercel Git for frontend, SSH/Compose for backend). |
| **Estimated Monthly Cost** | **Lowest (\$10–\$25/mo):**<br>• Hetzner CX32 (4 vCPU, 8 GB RAM): ~€11/mo<br>• DigitalOcean Droplet (2 vCPU, 4 GB RAM): \$24/mo | **Moderate (\$35–\$75/mo):**<br>• Web/API instances + Worker + Managed Postgres + Managed Redis | **Moderate (\$20–\$35/mo):**<br>• Vercel (Hobby \$0 / Pro \$20)<br>• Backend Linux VM: \$10–\$20/mo |

### 6.2 Recommendation

**Option A (Dedicated Linux Host with Docker Compose + Caddy)** or **Option C (Vercel Frontend + Dedicated Linux Host for API/Realtime/Datastores)** provides the highest fidelity to the existing architecture:
- Preserves the exact verified process model (`api-server/src/index.ts` starting HTTP, Socket.IO, lifecycle worker, and notification supervisor).
- Avoids modifying queue or adapter code to conform to proprietary PaaS limitations.
- Preserves the verified `docker-compose.production.yml` and `docker-compose.staging.yml` environments without vendor lock-in.

---

## 7. The Smallest Missing Hosting Decisions

To complete the public activation, the human project owner must provide the following specific operational decisions:

1. **Target Hosting Provider Selection**:
   - Approve the persistent Linux host provider (e.g. Hetzner Cloud, DigitalOcean, AWS EC2, or GCP Compute Engine).
   - Authorize provisioning a standard Linux instance (recommended baseline: Ubuntu 24.04 LTS x86_64, 2–4 vCPU, 4–8 GB RAM, 40+ GB SSD).
2. **Domain & DNS Allocation**:
   - Provide the public DNS domain (e.g. `your-domain.example`).
   - Create DNS `A` / `AAAA` records pointing the frontend and API hostnames to the host IP:
     - Production: `app.your-domain.example` and `api.your-domain.example`
     - Staging: `staging.your-domain.example` and `staging-api.your-domain.example`
3. **Provisioning Host Secrets**:
   - Generate production secrets and place them at `/etc/yor-talks/.env.production` (and `/etc/yor-talks/.env.staging`).
   - Create the secret token files (`/etc/yor-talks/metrics.token` and `/etc/yor-talks/alertmanager-webhook-password`).
   - Authorize an off-host backup destination (e.g., AWS S3, Cloudflare R2, Backblaze B2, or Google Cloud Storage) and supply the public `age` recipient key in `BACKUP_AGE_RECIPIENT`.
