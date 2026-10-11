# Publication candidate — 8 October 2026

The owner requested push and deployment after local hardening verification. The
verification report and `candidate-files.json` describe the working-copy bytes
tested before publication; their earlier uncommitted status is historical.

## Current unified publication — 9 October

Published unified release [3887cc4](https://github.com/yorayriniwnl/yor-talksv2/commit/3887cc47aa8d0abb718f44952fbfb33d6233e109) passed both [push CI](https://github.com/yorayriniwnl/yor-talksv2/actions/runs/37868624235) and [PR CI](https://github.com/yorayriniwnl/yor-talksv2/actions/runs/37869588581): **392 API / 73 browser / 71 unit tests per run, zero failures/skips**. Audit, contracts, typechecks, builds, monitoring, production images, encrypted backup/restore, native Nginx (3 valid accepted / 8 invalid rejected) and the isolated synthetic stack passed.

The [protected frontend preview](https://yor-talks-jpub2ler5-yorayriniwnl-1218s-projects.vercel.app/) is READY and passed **14 deployment checks**, including mobile Chromium, security headers and a served JavaScript hash match. It contains static frontend assets; API and Socket.IO routes return 503, so sign-in and backend journeys remain unavailable. The production domain was not promoted.

The [current mobile measurements](mobile-performance-unified-2026-10-09.json) retain all three observations of the deployed artifact: payload budgets pass, FCP and blocking fail 3/3, and LCP fails 2/3. No timing pass or field-percentile claim is made. Full production launch still requires the persistent backend/worker target and runtime bindings, real providers/public ingress, actual alert receiver, approved off-host recovery and owner/legal/retention acceptance. Minimum age 18 and disabled payments/live/push/RTC remain in force. See the [continuation record](CONTINUATION_2026-10-09.md) for exact source, artifact and historical evidence.

## Historical accepted published baseline — checked 9 October

The earlier published implementation commit was
[`990fc062a7661eb8dafc4a33e8f3f252a6fb0715`](https://github.com/yorayriniwnl/yor-talksv2/commit/990fc062a7661eb8dafc4a33e8f3f252a6fb0715).
Both [push CI](https://github.com/yorayriniwnl/yor-talksv2/actions/runs/37800072226)
and [PR CI](https://github.com/yorayriniwnl/yor-talksv2/actions/runs/37800086580)
completed successfully against that exact commit.

| Check in each run | Result |
| --- | --- |
| Serial API suite with decoder tests | **323 passed / 0 failed / 0 skipped / 0 cancelled** |
| Production Chromium browser suite | **69 passed / 0 failed / 0 skipped / 0 did not run** |
| Root unit suite | **63 passed / 0 failed / 0 skipped** |
| Audit, contracts, design, migration, typechecks, builds and configuration | Passed |
| Pinned native monitoring and production images | Passed; local firing/resolved delivery and invalid receiver authentication rejection |
| Backup image encryption, retrieval, application restore and failure guards | Passed using isolated local rclone transport; restore **1,034 ms** (push), **1,160 ms** (PR) |
| Native Nginx image configuration | **3 valid configurations accepted / 8 invalid rejected** |
| Production container stack | Passed with explicit isolated synthetic providers |

All required validation steps completed. The conditional browser-failure artifact
step was skipped because there was no failure; no tests were skipped. Full job
logs remain private under `yor-hardening-20261007/ci-head-990fc06`. The original
local manifest/hash and failed runs below remain phase-specific evidence.

The protected frontend review preview passed 14 checks, as detailed below. Full
live backend/worker deployment, the actual public ingress and providers, production
alert receiver, approved off-host recovery and owner/legal/retention acceptance
remain open. The original two performance failures remain historical evidence.
The separate [9 October continuation](CONTINUATION_2026-10-09.md) records the billing-validator deferral, packaging and regression changes, the discarded editor experiment, concurrent branch integration and final unified-release evidence. These later results do not rewrite the earlier baseline or failed runs.

## Publication sequence

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
a passing integration result. At this phase, remote CI was still required for
the publication delta and actual container acceptance; the current result above
records its subsequent completion.

Both GitHub runs for `9ef28b5` subsequently passed 323 API tests and 69 browser
tests with zero failures/skips, monitoring acceptance, Compose validation and
production container builds. Backup image acceptance failed when a root-owned
private bind-mount directory was unreadable by the host runner; stack smoke was
therefore skipped. The drill now runs its Linux utility containers with the host
numeric UID/GID while preserving private permissions and every encryption,
restore and failure assertion. Syntax and scoped whitespace checks passed;
remote CI then exposed the separate restore-pipeline failure described below.

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

## Existing protected preview for the baseline

The earlier [protected frontend preview](https://yor-talks-e7ykqt6cs-yorayriniwnl-1218s-projects.vercel.app)
is deployed (`dpl_Djw6ZvnT8qsuFpi4LJe45Y3wcNoK`, Vercel READY). Its artifact was
built from frontend source `55e12429baecde8b3ea07e76b0b7e1f6e824a463`, which
matches the frontend in the green `990fc06` implementation; subsequent publication
corrections change build ordering and backup/drill infrastructure only. Fourteen verification checks
passed: anonymous access requires Vercel authentication, authorized SPA routes
load, a served JavaScript asset matches the local artifact, missing assets return
404, unexpected POST routes return 405, API/Socket.IO requests return 503 for the
tested methods, security/cache headers apply, and production Chromium renders
the mobile sign-in page without JavaScript errors or external API/realtime
requests. Backend sign-in and other data journeys remain unavailable in this
frontend review deployment.
