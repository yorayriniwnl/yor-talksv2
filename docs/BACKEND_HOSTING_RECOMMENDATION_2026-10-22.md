# Backend hosting recommendation - 22 October 2026

Use AWS ECS Fargate behind an Application Load Balancer, RDS PostgreSQL with a
Multi-AZ standby, and ElastiCache Redis OSS with Multi-AZ failover. Keep all three
in the same region. If the initial audience is primarily in India, Mumbai is the
starting region to evaluate; confirm audience latency and data-location obligations
before provisioning. This is an architecture recommendation from the repository
audit, not an existing deployment or a quoted capacity guarantee.

## Why this matches the code

The API is a persistent Node 24 process with Express, Socket.IO and a Redis
adapter. It runs notification consumers and leased database lifecycle jobs;
media verification uses FFmpeg and temporary local scratch. PostgreSQL is the
source of truth for notifications, privacy authority, moderation and commerce.
AWS supports ALB-backed Fargate services, allowing these containers to retain
long-lived connections while tasks are independently replaced. [ECS load balancing](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-load-balancing.html)

| Component | Initial configuration to benchmark | Repository integration |
| --- | --- | --- |
| API + embedded workers | Two API tasks across two availability zones, each initially 2 vCPU / 4 GiB | Build api-server/Dockerfile; run node api-server/dist/index.cjs; port 4000; /api/readyz health check |
| PostgreSQL | PostgreSQL 16, Multi-AZ; initially a general-purpose 2 vCPU / 8 GiB primary, provisioned storage with autoscaling | TLS with certificate verification; separate migration owner and restricted runtime role |
| Redis | Redis OSS 7, cluster mode disabled, primary plus replica in another zone, TLS/auth, noeviction | One shared REDIS_URL for sessions, queue transport, rate limits and Socket.IO |
| Media and transactional email | Existing Cloudinary and Resend integrations with verified production accounts | Complete clean/reject/outage/erasure and delivery acceptance before enabling public use |
| Backups and privacy journal | RDS automated backups plus separately encrypted off-host exports/journal, distinct access and key custody | Run the repository restore/reconciliation procedure before traffic cutover |
| Monitoring | Authenticated metrics scraping and routed alerts; task/DB/Redis/resource alarms | Existing Prometheus metrics and alert rules; prove receipt at the real receiver |

These sizes are test starting points. Measure query latency, pool use, queue age,
Redis memory, media CPU/memory and p95/p99 latency before selecting limits or
advertising capacity. The current API already starts its required workers; a
separate worker task is optional and must not be mistaken for disabling the
embedded workers. Leases and queue consumers coordinate concurrent instances.

RDS Multi-AZ supplies a synchronous standby for failover; the standby does not
serve read traffic. Automated backups provide point-in-time recovery within the
configured retention window. These address availability and recovery, while
privacy replay remains an application responsibility. [RDS Multi-AZ](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html), [RDS backups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html)

Use the ElastiCache primary endpoint with cluster mode disabled. Multi-AZ
promotes a replica and updates the endpoint after a primary failure. Queue/session
recovery and reconnect behavior still need a deployment drill. [ElastiCache failover](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/AutoFailover.html)

## Deployment details that matter here

- Put only ALB on the public edge. Keep tasks, database and Redis private; security
  groups admit only their required peers. Mount secrets into the task, including
  the metrics secret under /run/secrets; keep owner credentials out of API tasks.
- Preserve the application's single trusted proxy hop. Use ALB directly for API
  and realtime traffic. Additional proxy/CDN hops require an explicit proxy and
  client-address validation change, not a blanket trust-all setting.
- Configure target stickiness for Socket.IO HTTP polling fallback and verify that
  the actual client sends the affinity cookie. The Redis adapter alone does not
  distribute polling session state. Test connections and reconnects across two
  tasks before scaling out. [Socket.IO multiple nodes](https://socket.io/docs/v4/using-multiple-nodes/), [ALB target attributes](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html)
- Run one migration task before rolling out a compatible application revision.
  Rehearse populated migrations, lock duration and rollback on an isolated restore.
  Keep application scratch temporary; persistent media belongs with the provider.
- Keep recovery services isolated with RECOVERY_REPLAY_GATE=true and the independent
  manifest digest/checkpoint until reconciliation and provider cleanup complete.
  See [recovery procedures](../ops/backup/README.md).
- Set a budget alarm and obtain a regional quote for tasks, ALB, database/standby,
  Redis/replica, NAT, logs, storage, media processing and outbound bytes. No monthly
  price or simultaneous-user number is established by this audit.

## Smaller pilot alternative

For a limited pilot, Render paid persistent web services, managed PostgreSQL and
paid Key Value reduce infrastructure administration. Render supports WebSockets,
continuous workers, a configurable noeviction policy and a Singapore region.
Qualify PostgreSQL HA plan requirements, database-role permissions, backup access
and polling affinity before choosing it. Start with one API instance until the
multi-instance connection path is proven. [Render WebSockets](https://render.com/docs/websocket), [workers](https://render.com/docs/background-workers), [Key Value](https://render.com/docs/key-value), [Postgres HA](https://render.com/docs/postgresql-high-availability), [regions](https://render.com/docs/regions)

## Acceptance still required

The checked-in executable deployment is the hardened Docker Compose runbook;
AWS infrastructure has not been provisioned by this work. Current Linux/Redis 7
CI, real TLS/cookies/CORS, provider credentials and assurance policy, alert receipt,
backup/key custody, failover drills and load measurements remain required. Optional
paid/live/push/RTC/AI release flags remain disabled until their provider-specific
acceptance is recorded. The frontend was excluded from this implementation task.
