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

The initial published commit `55e1242` failed both GitHub checks at API
typechecking: the clean runner had not built the referenced `api-zod` declaration
output. CI and both root build entrypoints now explicitly build that package
before validation. A forced declaration rebuild, API/frontend typechecks and
scoped whitespace check passed locally. The updated root unit suite passed
63/63 with zero skips. A targeted integration attempt against the previously
stopped private PostgreSQL fixture returned `ECONNREFUSED`; it is not recorded as
a passing integration result. Remote CI is required for the publication delta
and actual container acceptance.

Both GitHub runs for `9ef28b5` subsequently passed 323 API tests and 69 browser
tests with zero failures/skips, monitoring acceptance, Compose validation and
production container builds. Backup image acceptance failed when a root-owned
private bind-mount directory was unreadable by the host runner; stack smoke was
therefore skipped. The drill now runs its Linux utility containers with the host
numeric UID/GID while preserving private permissions and every encryption,
restore and failure assertion. Syntax and scoped whitespace checks passed;
remote CI must validate this final drill correction.

Both `8fdd14d` runs again passed the API/browser suites, monitoring, Compose and
image builds. Backup progressed to restore and failed with exit 141: metadata
parsing stopped reading `pg_restore --list` early under `pipefail`, causing a
broken pipe on a large listing. The parser now consumes the full listing and
prints the first database name once. A 50,000-line shell reproduction changed
from exit 141 to exit 0; an injected upstream failure still returned exit 23.
Bash syntax and scoped whitespace checks passed. Restore safeguards and strict
pipeline failure handling are retained; final full-container validation is
recorded by the subsequent exact-commit GitHub checks.

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

The [protected frontend preview](https://yor-talks-e7ykqt6cs-yorayriniwnl-1218s-projects.vercel.app)
is deployed (`dpl_Djw6ZvnT8qsuFpi4LJe45Y3wcNoK`, Vercel READY). Its artifact was
built from the frontend in `55e1242`; subsequent publication corrections change
build ordering and drill infrastructure only. Fourteen verification checks
passed: anonymous access requires Vercel authentication, authorized SPA routes
load, a served JavaScript asset matches the local artifact, missing assets return
404, unexpected POST routes return 405, API/Socket.IO requests return 503 for the
tested methods, security/cache headers apply, and production Chromium renders
the mobile sign-in page without JavaScript errors or external API/realtime
requests. Backend sign-in and other data journeys remain unavailable in this
frontend review deployment.
