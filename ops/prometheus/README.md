Alertmanager 0.28.1 loads the complete `ALERTMANAGER_CONFIG_FILE` as a Docker
secret at `/run/secrets/alertmanager_config`. Copy `alertmanager.yml` to that
operator-owned file, replace its receiver URL and username, and restrict host
access. Store the webhook password separately in
`ALERTMANAGER_WEBHOOK_PASSWORD_FILE`. Keep credentials out of URLs, Compose
environment variables, repository files and command output. No environment
expansion is performed. The supported configuration loader is documented in
the [pinned source](https://github.com/prometheus/alertmanager/blob/v0.28.1/config/config.go).

The stack waits for Alertmanager readiness before starting Prometheus. CI uses
a synthetic loopback receiver and demonstrates configuration/startup plus a
separate isolated alert delivery/resolution rehearsal. Deployment acceptance
still requires a firing/resolved alert reaching the authorised real receiver.

Lifecycle readiness requires a fresh database heartbeat and bounded active-job
progress. Configure heartbeat and job-stall thresholds against measured handler
latency. Metrics separately expose stopped/stalled workers, expired leases,
oldest due jobs, dead letters and revoked media cleanup retries. Repair the
underlying cause before an idempotent replay; deleting durable jobs or media
tombstones to silence alerts loses recovery evidence.

Completed notification jobs retain only their ID and are removed after the
configured age/count bounds. A periodic sweep also removes historical idle
completions. Pending, delayed and failed work is preserved; database delivery
acknowledgements remain the deduplication authority after Redis pruning. A job
whose notification/recipient was deleted is consumed without sending.
