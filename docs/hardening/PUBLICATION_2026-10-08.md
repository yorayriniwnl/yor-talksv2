# Publication candidate — 8 October 2026

The owner requested push and deployment after local hardening verification. The
verification report and `candidate-files.json` describe the working-copy bytes
tested before publication; their earlier uncommitted status is historical.

Publication preflight found that GitHub's PostgreSQL service uses a container
interface behind a loopback published port. Test and backup-drill guards now
validate the explicit loopback caller, isolated database allowlist and actual
database identity, instead of requiring PostgreSQL's server interface to be
loopback. Regression checks retain rejection of remote/default targets and
connection-routing overrides. These changes affect fixture guards, not runtime
authentication, messaging or worker behavior. `publication-candidate.json`
records the ensuing indexed implementation bytes separately from the original
verification manifest.

The existing deployment project is Vercel `yor-talks` under
`yorayriniwnl-1218s-projects`, with Node 24 and deployment protection enabled for
preview URLs. Its preview and production scopes share the configured database
and Redis variables. No isolated backend/worker host is recorded, and required
runtime configuration is incomplete. Public API liveness/readiness returned HTTP
500 during preflight, while the existing homepage returned HTTP 200.

The independent deployment scope is a protected frontend review preview built
from tracked source without private `.env` files. It contains no API functions
and responds to API requests with HTTP 503; it does not access the shared
production database. Publishing this preview does not establish application
readiness or change the production domain.

Full application rollout still requires the intended persistent backend/worker
host, verified non-destructive migrations and matching API/worker versions,
complete secret/provider configuration, decoder/media readiness and the
remaining release-scope/provider acceptance recorded in
`../PRODUCTION_HARDENING_2026-10-08.md`. Existing age restrictions and disabled
payments/live/push/RTC remain in force. Commit, push, CI and preview URLs are
reported separately as publication results.
