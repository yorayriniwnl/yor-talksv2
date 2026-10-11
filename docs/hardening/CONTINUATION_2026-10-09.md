# Production hardening continuation — 9 October 2026

## Verified unified release

Published unified release [3887cc4](https://github.com/yorayriniwnl/yor-talksv2/commit/3887cc47aa8d0abb718f44952fbfb33d6233e109) passed both [push CI](https://github.com/yorayriniwnl/yor-talksv2/actions/runs/37868624235) and [PR CI](https://github.com/yorayriniwnl/yor-talksv2/actions/runs/37869588581): **392 API / 73 browser / 71 unit tests per run, zero failures/skips**. Audit, contracts, typechecks, builds, monitoring, production images, encrypted backup/restore, native Nginx (3 valid accepted / 8 invalid rejected) and the isolated synthetic stack passed.

The [protected frontend preview](https://yor-talks-jpub2ler5-yorayriniwnl-1218s-projects.vercel.app/) is READY and passed **14 deployment checks**, including mobile Chromium, security headers and a served JavaScript hash match. It contains static frontend assets; API and Socket.IO routes return 503, so sign-in and backend journeys remain unavailable. The production domain was not promoted.

The [current mobile measurements](mobile-performance-unified-2026-10-09.json) retain all three observations of the deployed artifact: payload budgets pass, FCP and blocking fail 3/3, and LCP fails 2/3. No timing pass or field-percentile claim is made. Full production launch still requires the persistent backend/worker target and runtime bindings, real providers/public ingress, actual alert receiver, approved off-host recovery and owner/legal/retention acceptance. Minimum age 18 and disabled payments/live/push/RTC remain in force. See the [continuation record](CONTINUATION_2026-10-09.md) for exact source, artifact and historical evidence.

The tested implementation is 3887cc47aa8d0abb718f44952fbfb33d6233e109, already pushed on release/unified-release-20261009. The final evidence update changes documentation only; runtime acceptance is anchored to that implementation commit and its exact CI runs.

| Acceptance in each run | Result |
| --- | --- |
| API with actual decoder and isolated PostgreSQL/Redis | 392 passed; 0 failed/skipped/cancelled |
| Production Chromium browser suite | 73 passed; 0 failed/skipped/did-not-run |
| Root units | 71 passed; 0 failed/skipped/cancelled |
| Frozen installation, production audit, contracts, design, migration, typechecks/builds/configuration | Passed |
| Monitoring | Authenticated local scrape, firing/resolved delivery and bad receiver-auth rejection passed |
| Production images and isolated synthetic stack | Passed |
| Native Nginx | 3 valid configurations accepted; 8 invalid configurations rejected |
| Backup | Encryption, isolated local rclone retrieval, application restore, rejection guards and transactional failed-restore rollback passed |

Backup fixture restores took **1,160 ms** in push CI and **1,182 ms** in PR CI. These tiny local-transport fixtures do not prove production off-host recovery or an RTO. The conditional failure-artifact step was skipped because tests passed; no tests were skipped. Private complete logs are under yor-hardening-20261007/ci-head-3887cc4.

## Deployed frontend artifact

Deployment **dpl_8XdZqPNgddMDinvfHGbzvm9oiKvV**, Vercel READY, uses source **3887cc47aa8d0abb718f44952fbfb33d6233e109**. A tracked-only export was installed with pinned pnpm 9.15.4, offline/frozen lockfile and explicit development build dependencies, then built with Node 24.19.0 in production mode. It uses public-beta false, minimum age 18, relative /api, realtime false, and payments/live/push/RTC false. No synthetic operator identity was used for this review build.

The curated artifact has **108 files** and aggregate SHA256 **9a57f74f99e2b2ef476021266c34cbf612a76489a50e1d9dc08f7a046e092b4d**. It contains configuration, project metadata and static assets, with no API functions, environment files, private key files, diagnostic maps or test output. Vercel CLI **63.1.0** deployed it to preview; no production alias was changed.

All **14 checks passed**: anonymous access requires Vercel authentication; authorized root, Studio and HEAD routes load; tested API and Socket.IO methods return 503; missing assets return 404; unexpected POST returns 405; security/cache headers apply; the served entry JavaScript matches the local artifact; and mobile Chromium renders the sign-in page with zero JavaScript errors or external API/realtime connections. The mobile screenshot was inspected. Backend sign-in remains unavailable in this static review deployment.

A first clean-export build failed because production-mode installation omitted the development build dependency Vite. The retry explicitly installed build dependencies before the production build. Both logs were retained; the failed attempt was never deployed. An intermediate e45b10d artifact built successfully but was superseded by the unified-release artifact above.

## Current mobile performance

The [unified-release measurements](mobile-performance-unified-2026-10-09.json) use the exact deployed artifact: three fixed cold synthetic authenticated-feed samples, 390×844, cache disabled, 150 ms latency, 1.6 Mbps down, 4× CPU and local gzip level 5. Background host load was not controlled. Every sample must meet every unchanged proposed budget; all observations are retained.

| Metric | Proposed maximum | Sample 1 | Sample 2 | Sample 3 |
| --- | --- | --- | --- | --- |
| FCP | 2,500 ms | 6,272 ms | 3,160 ms | 3,140 ms |
| LCP | 4,000 ms | 6,272 ms | 4,312 ms | 3,140 ms |
| Long-task blocking | 300 ms | 1,367 ms | 1,174 ms | 1,177 ms |

All three measurement commands exited **1**. FCP/blocking fail 3/3; LCP fails 2/3. Each sample loaded **873,090 decoded JavaScript bytes**, **273,563 delivered JavaScript body bytes**, **273,075 estimated gzip JavaScript bytes**, and **62,171 gzip CSS bytes**. Payload budgets pass. These synthetic local observations are not field percentiles or live edge/provider acceptance. Owner agreement to budgets and controlled device/edge measurement remain open.

## Continuation and preservation history

The [original local manifest](candidate-files.json) retains its 489-file aggregate **44dba238f481d2d2364830c64ec33112a9eef6a32b58a8bb11efd6ead7ddf8a2**. The [publication manifest](publication-candidate.json) retains aggregate **7b9c9819faa8b792c0b90bd2b3c765a5f1494355e0b3854ecef9f82c2c7e7a02** for the accepted 990fc06 baseline. That baseline passed 323 API / 69 browser / 63 unit tests and its full isolated container checks. Its earlier protected preview and 14 checks remain historical evidence in the [publication record](PUBLICATION_2026-10-08.md).

The [four-path continuation manifest](continuation-candidate.json) retains aggregate **e6982111ac3a48f5e631dfddcc0d24923e2af9f39cdd16b3e09025d41c8f7edc**: billing/checkout validators load only when required, validation stays mandatory, session replacement during loading rejects old data with 409, and failed module download rejects data with readable 503/reload guidance. Three actual-client browser tests verify those boundaries. Packaging exclusions and optional performance diagnostics complete that delta.

Its local commit ae66b25 initially could not push because the branch had advanced to 23bfdc7 with Google sign-in security changes. A conflict-free merge preserved both sets and was pushed as e45b10d without force. A separate session subsequently created the unified release containing e45b10d, main’s eligibility foundation, further Google-authentication/dependency work and message-preview fixes. The original checkout was moved to another task and our documentation was saved in a named stash. This continuation resumed in its own isolated checkout; the stash was applied there and retained. The redundant isolated main-merge attempt was aborted after discovering the already-integrated release.

The [earlier billing performance report](mobile-performance-continuation-2026-10-09.md) and [15-observation archive](mobile-performance-continuation-2026-10-09.json) remain phase-specific. Their frontend hash 57b3658e67cf65b0c156c32a369cfd5a1e63a96b5598595640d919a310cee420 precedes unified dependency and grievance changes. That phase reduced decoded JavaScript by about 5.9% and estimated gzip by 4.4%; timing budgets failed. The original FCP 2,716 ms / LCP 3,264 ms / blocking 418 ms observation is unchanged in [the original report](mobile-performance-final.json).

An editor-splitting experiment was discarded because it added route dependencies and a cached lazy-import failure prevented a useful local retry. Its full 71-test browser pass and failed timing samples are retained as experimental evidence. Neither editor split remains. The final billing-only local focused suite passed 3/3 with a fresh production build; complete unified acceptance is the 392/73/71 CI result above.

## Packaging boundary

The earlier Vercel CLI 62.1.0 source dry runs excluded 27 synthetic environment/key/private-ops/test/cache files plus 3 CI credential fixtures, while retaining 26 required build files and 2 traced runtime bundles. Ten required prebuilt config/static/function/dependency artifacts remained available. All three final dry calls exited 0; the old-ignore positive control included 8 synthetic files.

An initial expectation that source ignore rules would filter private files already inside prebuilt output failed: three synthetic private sentinels remained included. Prebuilt output is authoritative, so the deployed artifact was separately curated and inspected. No actual private environment files were used for that dry test and no dry-run upload or project settings mutation occurred.

## Remaining backend and release gates

Read-only discovery across branches, worktrees, provider templates and Vercel metadata found no persistent backend/worker target. Vercel project yor-talks remains on Node 24 with protected previews. Its configured environment names still omit CONTACT_SHIELD_SECRET, TOTP_ENCRYPTION_KEY and CLIENT_ORIGIN, and provider/runtime acceptance is incomplete. Secret values were not printed or validated by metadata inspection.

The existing production homepage returned 200 while /api/livez and /api/readyz returned 500 on 9 October. The protected review preview above is separate. Full rollout requires the hosting provider and exact app/server ID or hostname, staging/production choice, backend HTTPS/realtime domain, approved deployment access and matching database/Redis bindings; then reviewed non-destructive migrations and matched API/workers, actual media/provider readiness, public ingress, real alert delivery and approved off-host recovery must be accepted. The target question remains unanswered.

Operator, territory, legal, age and retention decisions remain release gates. Age 18 and disabled optional features remain; integrating eligibility code does not approve a minors or global launch. No public database was seeded, production migration executed or production domain promoted in this continuation.
