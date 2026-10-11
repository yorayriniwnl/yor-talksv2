# Frontend and public grievance hardening — 8 October 2026

This evidence applies to the uncommitted working copy on
`codex/media-lifecycle-20261006`, committed baseline
`ba31c9fd443659bcacc9d2c8760086adf63ee082`. It does not establish acceptance of
the committed baseline or of a deployed service. Existing working-copy design
edits were inspected and preserved, including the redesigned Story item,
camera photo filters, message typography sizing and Studio title.

Release scope remains unanswered. Existing adult restrictions and disabled
payments/live/push/RTC gates remain in place. No minors or territory policy,
legal operator, public review deadline or production launch was approved.

## Repaired findings

| Finding and previous impact | Resulting behavior and source | Regression evidence | Rollout / remaining boundary |
| --- | --- | --- | --- |
| Studio manual Stop was absent and Record was disabled while recording. Pending camera permission could install a stream after close, flip or unmount. Recorders and captured URLs could survive cancellation. | `social/src/components/studio/StudioCameraModal.tsx` restores keyboard-accessible Stop, guards recorder ownership synchronously, fences permission and capture results by camera generation, stops recorders/tracks on cancellation, bounds timer stop to 30 seconds, handles unexpected recorder stop/error, and revokes replaced/unmounted URLs through an immediate ref. Close remains available during recording. | Browser cases exercise manual Stop, timer Stop, prevented second start/mode change, close while recording, delayed permission after close/flip/unmount, stream cleanup, URL revocation, permission denial, bounded actual JPEG camera pixels, photo/video carryover and Reel/Story approval-before-publication. | Frontend-only rollout. Real device/browser permission behavior and real storage/moderation acceptance remain provider/device gates. Browser upload responses are explicit synthetic provider fixtures. |
| Direct/group retry errors appeared both inline and in stacked bottom-right notifications, obstructing Retry and repeating error announcements. | `social/src/pages/messages.tsx` makes the inline alert the sole owner of send-failure recovery, including the New Message dialog; `social/src/components/ui/sonner.tsx` places unrelated notices top-right. Drafts, media caching, idempotency and duplicate-send guards remain intact. | Direct and group cases at 390/1280px exercise moderation failure followed by two consecutive publication failures, actual pointer retries and a keyboard retry. They assert text/file retention, a single inline error, no send-error toast, approved-media reuse and identical retry payloads. Existing conversation draft/duplicate-send cases still pass. | No database change. Existing independently authorized operations can still emit their own notices. No forced clicks, arbitrary sleeps or disabled notifications were added. |
| Public grievance submission returned the database row; tracking omitted only two fields and leaked reporter names, URLs and officer notes. | `lib/api-zod/src/grievance.ts` defines one strict public DTO/projector with exactly `ticketId`, `status`, `createdAt`. `moderation-service.ts` projects both service paths; `routes/reports.ts` returns those projections. Private rows remain behind staff authorization. Legacy SQL UTC timestamps normalize without applying the application host timezone. | Actual Express HTTP routes and real PostgreSQL/Redis assert exact public keys with reporter name/email, description, reported URL, internal ID, category, officer note and internal deadline populated; both anonymous and ordinary authenticated tracking are checked. Staff queue/status mutation reject anonymous 401 and ordinary-user 403. Persistence survives service recreation. | No schema migration. Deploy API plus matching frontend/contracts; an old frontend expecting `slaDeadline`/`officerNote` is incompatible with the restricted receipt. Rollback must retain the privacy projection. |
| Grievance UI presented an unapproved universal statutory deadline and internal notes; the public route lacked a main landmark. | `social/src/pages/grievance.tsx` consumes the shared public type, shows received time/status, removes public internal notes/deadline claims, describes territory/operator-dependent review, adds the main landmark and aligns the reported-URL input with the existing 500-character server limit. | 390/1280px keyboard submission/tracking, validation focus, draft retention, reflow, reduced-motion and axe WCAG 2 A/AA + 2.1 AA checks pass. | No public deadline is exposed pending operator/territory acceptance. The legacy private 15-day field is explicitly an internal target, not an approved statutory commitment. |
| Studio placeholders implied implemented music/stickers/video shaders. | Studio labels music, stickers and video filters as preview only; photos retain the implemented canvas filter. The unavailable-camera view describes real camera capture requirements. | Capture/publication cases exercise actual camera-derived JPEG and recorded videos; the UI accurately distinguishes preview effects from recorded output. | Persisted/composed music/stickers/video effects and rights-cleared media remain outside current implementation. |
| Playwright could build development React from an ignored developer `.env`. | `playwright.config.ts` explicitly sets `NODE_ENV=production` after inherited environment values; build/preview use repository-pinned `corepack pnpm`. Zero retries and failure traces/screenshots/videos remain. | Complete suite is run with parent `NODE_ENV=development`, exercising the override. | Synthetic operator/provider values in the browser harness are test fixtures, never production facts. |
| The feed eagerly downloaded the chart library because object-form manual chunks placed shared ReactDOM dependencies in its chart chunk. Story editor/viewer code also loaded before use. | `social/vite.config.ts` uses explicit package-module chunk assignment and a React chunk. `StoriesRow.tsx` loads editor/viewer on intent; the editor remains mounted after its first use to preserve drafts. The ingress workstream adds supported Nginx gzip. | Full browser suite retains Story publication/retry and keyboard behavior. The reproducible cold mobile measurement records payload/timing and budget failures below. | Compression measurement uses a local server matching reviewed gzip settings. Actual Nginx/container compression acceptance and deployed field performance remain separate gates. |

## Commands and observed results

Node: `v24.19.0`; pinned pnpm: `9.15.4`; Playwright: `1.62.1`.
The system's bare `pnpm` is `9.15.9`; intermediate commands used that version.
Final release verification uses `corepack pnpm`, including nested browser build
and preview commands.

| Command / checkpoint | Observed result |
| --- | --- |
| Original 7 October production-mode full browser review | **Historical: 57 passed, 3 failed.** Its isolated successful message retry rerun does not replace this full-suite failure. |
| Intermediate focused Studio JPEG/manual Stop and four direct/group retry cases | Exit 0: 5 passed, 0 skipped. |
| Focused permission/cancellation/timer/URL/denial cases | Exit 0: 3 passed, 0 skipped. |
| First new grievance UI cases | Exit 1: 2 failures exposed the missing public main landmark. Repaired source and focused rerun exit 0: 2 passed. Failure artifacts retained under `test-results/frontend-grievance-ui/`. |
| First new video boundary cases | Exit 1: two incomplete approval fixtures lacked required poster grants; corrected to the actual media contract. The next run exposed one omitted created-Reel comments fixture; the explicit fixture was added. Assertions and route-boundary enforcement were retained. |
| Intermediate full production browser suite | Exit 0: 67 passed, 0 failed, 0 skipped, 2.2 minutes; precedes subsequent recorder/URL/chunk changes. `test-results/production-full.log`. |
| Updated full production browser suite, bare pnpm 9.15.9 | Exit 0: 69 passed, 0 failed, 0 skipped, 1.9 minutes. `test-results/production-final.log`. |
| Final `corepack pnpm test:e2e --workers=2 --output=test-results/production-pinned-final`, parent `NODE_ENV=development`, `PLAYWRIGHT_PORT=4177` | **Exit 0: 69 passed, 0 failed, 0 skipped, 1.5 minutes.** Log `test-results/production-pinned-final.log`. No retries. |
| `corepack pnpm contract:check` | Exit 0: 231 operations / 195 paths synchronized. |
| `corepack pnpm exec tsc -b lib/api-client-react lib/api-zod` | Exit 0. |
| `corepack pnpm --filter @workspace/api-server typecheck` / `corepack pnpm --filter @workspace/social typecheck` | Both exit 0 after all final source changes. |
| `pnpm design:check` | Exit 0. |
| `pnpm contract:generate` then `pnpm --filter @workspace/api-spec exec orval --config ./orval.config.ts` | Exit 0. Regeneration also repaired stale pre-existing media generated definitions. The first generated build exposed workspace auto-detection selecting Zod 4; `override.zod.version=3` now matches the actual Zod 3 target, and regeneration/shared-package builds pass. |
| Actual-service/HTTP grievance tests, serial | Exit 0: 4 passed, 0 failed, 0 skipped, after all DTO/time-normalization changes. |

The HTTP command is
`corepack pnpm --filter @workspace/api-server exec tsx --test --test-concurrency=1 src/__tests__/moderation-service.test.ts src/__tests__/report-authorization.integration.test.ts`.
Its target was checked using `current_database()`, `host(inet_server_addr())`
and `inet_server_port()`: dedicated synthetic database
`yor_hardening_grievance_20261007`, loopback `127.0.0.1:55447`.
`NODE_ENV=test`, `DB_SSL=false`, and the isolated database connection were set
explicitly. Redis 7.2.8 runs on loopback `6398`, logical database `3`.
Only test-owned rows/session keys are removed. No public or production data was
seeded or migrated by this workstream.

## Measured mobile payload and performance

Reproduce after the production Playwright build:

```powershell
node scripts/measure-mobile-performance.mjs social/dist/e2e docs/hardening/mobile-performance-final.json --gzip
```

This cold authenticated-feed observation uses a 390×844 viewport, 150 ms
network latency, 1.6 Mbps downstream and 4× CPU slowdown. APIs are synthetic and
explicitly bounded; provider/font delivery and real device variation are not
accepted by it. Gzip level 5 delivery is modeled by the local measurement server,
not claimed as execution of the production Nginx image.

| Metric | Initial plain delivery | Final compressed/chunked delivery | Proposed budget | Final result |
| --- | --- | --- | --- | --- |
| Loaded JS before initial feed | 1,349,517 bytes | 928,461 decoded; 286,323 delivered bytes | 350 KiB compressed JS | Pass; gzip estimate 285,832 bytes |
| Loaded CSS | 417,083 bytes | 62,171 delivered bytes | 100 KiB compressed CSS | Pass |
| First contentful paint | 10.480 s | 2.716 s | 2.500 s | **Fail** |
| Largest contentful paint | 10.480 s | 3.264 s | 4.000 s | Pass |
| Observed long-task blocking above 50 ms | 1,515 ms | 418 ms | 300 ms | **Fail** |
| Feed fixture ready | 12.007 s | 3.449 s | Recorded diagnostic | — |

The measurement command exits **1** because two timing budgets remain unmet.
No budget or chunk warning threshold was raised. Initial, intermediate and final
JSON observations are retained as `mobile-performance.json`,
`mobile-performance-after.json` and `mobile-performance-final.json` in this
directory. These budgets are proposed repository gates, awaiting owner
agreement. One laboratory observation is not deployed percentile performance.
Further rendering/long-task profiling and real edge/device measurement remain
required; a Vite chunk warning alone is not the failure evidence.

## Acceptance boundary

The repaired frontend/privacy behavior has repository regression evidence.
Real Cloudinary presets/ceilings, decoder/provider classification, deployed
media readiness, identity/email delivery, Google origin configuration, physical
device permission/accessibility behavior, Nginx runtime compression, mobile
field performance and legal/operator acceptance remain separate gates. Passing
mocked browser journeys or these four real-datastore HTTP tests does not make
the exact candidate production-ready for any unapproved release scope.
