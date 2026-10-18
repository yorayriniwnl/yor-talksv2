# Frontend Test Report

Execution: 18 October 2026. Node 24.19.0 on Windows; installed pnpm 9.15.9 (repository declares 11.28.5), existing dependencies reused without lockfile changes. Browser checks use installed Playwright Chromium against local **production builds**, synthetic account/operator/provider data, and explicit API fixtures. External hosts are blocked by the existing browser launch configuration. No live transaction or production account was used.

**Final new browser cases: 47 passed, 0 failed, 0 skipped. Selected unit tests: 96 passed, 0 failed, 0 skipped.** Preserved legacy-suite failures are separately enumerated below and are not included in that new-suite pass claim.

## Results and scope

| Check | Before / first attempt | Verified result |
| --- | --- | --- |
| TypeScript | Baseline passed | Final `tsc -p social/tsconfig.json --noEmit` passed |
| Production build and output mirror | Baseline passed with existing chunk-size warning | Final production build and `sync-dist.mjs` passed; no production deployment |
| Frontend unit selection | 93 passed, 1 failed out of 94; font stylesheet byte hash changed under Windows line-ending conversion | 96 passed, 0 failed/skipped: original 94 plus two new real configuration tests |
| Lint | Attempted `npm run lint`; no configured script or ESLint configuration | UNAVAILABLE; not reported as a pass |
| Consent/privacy new suite | First combined consent/recovery run: 9 passed, 2 failed; one test clicked a mode tab, one exposed real acceptance navigation defect | 11 consent tests passed, 0 failed/skipped, including mismatch-without-social-hydration and ineligible-account withdrawal |
| Accessibility/responsive suites | Initial independent scans reproduced contrast/listbox defects. Later attempts exposed duplicate test locators, animation timing and concurrent browser teardown failures | 26 passed, 0 failed/skipped: 16 shared-flow cases plus 10 legal/account matrices |
| Final functional selection | First final selection: 9 passed, 1 failed, exposing nested Studio Escape closing the camera | All six new commerce/eligibility/recovery cases passed; three other legacy cases passed. Studio lifecycle passed after repair |
| Enabled-payment synthetic profile | Default disabled build intentionally blocks the two legacy purchase tests | Both tests passed with a separate, locally enabled frontend fixture; no server/provider/payment activation |
| Push synthetic profile | Initial attempt had ambiguous Settings heading selector and browser teardown errors | 2 passed, 0 failed/skipped after scoping the heading and testing the actual five-second delay |
| Companion/audio geometry | Screenshot review found companion covering volume/preset controls | 2 passed, 0 failed/skipped; both themes, all five widths, collapsed/expanded audio controls and route navigation; existing ambient playback and camera lifecycle also passed again |
| Live HTTP routes | Read-only GET only | `/`, `/privacy`, `/terms`, `/cookies`, `/community-guidelines`, `/grievance`: 200 HTML; no live authenticated/browser compliance claim |

Final test outcomes, titles, durations and historical failures are indexed in [test-results-summary.json](evidence/test-results-summary.json). Build/typecheck/unit command exit codes are in [verification.json](evidence/verification.json); complete selected-unit output is [unit-results.txt](evidence/unit-results.txt). Generated raw Playwright JSON, logs and transient per-scan output remain in this local directory but are excluded from Git to avoid duplicating bulky traces. Committed summaries preserve actual outcomes, errors and manual-review items; the test sources reproduce the checks.

## Preserved legacy suite

The complete existing `e2e/core-social.spec.ts` was actually attempted after the initial repairs: **89 passed, 15 failed, 0 skipped**. It was not called a passing baseline.

Six of those failing cases subsequently passed in appropriate reruns: two Premium cases in an enabled synthetic build; profile-follow navigation after preserving the username in the new accessible link name; group attachment retry; Creator Studio; and Studio camera lifecycle after the nested-Escape repair. Existing ambient-player behavior also passed again after the final overlay changes.

Nine legacy assertions remain incompatible with the intended/current UI: two assume Google loads automatically before provider choice, and seven use an ambiguous global `Settings` heading selector (the unchanged baseline has both shell and page headings). Three other matrix cases happened to pass that selector due to loading timing; the replacement test waits for actual page content and scans every case. The new Google regression and ten legal/form matrices cover the intended behavior. These nine old assertions are recorded as failures, not quietly removed or relabelled as passes. The disabled default fixture also needs the two purchase cases separated into an enabled synthetic profile, as demonstrated here.

The ownership instruction allows newly named compliance test files, and prohibits changing root configuration or other workstreams. Accordingly, the original test file, root Playwright config and CI workflows remain untouched. The existing-test/CI owner must migrate these assumptions before treating its default command as a green release gate. This is explicitly documented as `TEST-MIGRATION-01`; the PR is not a release approval.

## What the browser checks establish

- Public access to notices and grievance intake without authentication; no Google SDK request before choice; accessible provider failure/retry and resize.
- Unchecked registration/reacceptance, retained failed choices, focused invalid fields, persistent and withdrawn analytics preferences, cross-tab/storage-failure behavior, and actual dormant-batcher network checks. No collector was mounted to make a consent banner necessary.
- Existing server eligibility decisions, guardian history read failures/retry, password recovery feedback/concurrency, and existing privacy/export/deletion protections through relevant legacy cases.
- Payment-disabled behavior despite an available catalog, genuine photo-empty states, named save controls, recovery/cancellation availability, and explicit local/sample claims.
- All requested widths (320, 390, 768, 1024, 1440) in both themes. The 26-case accessibility suite performs **141 axe scans**: 60 principal-route, 70 legal/account, six dialog, four populated conversation/dashboard, and one installation scan. Keyboard checks exercise skip navigation, forward/reverse Tab, focus traps/restoration, Escape, Story pause/navigation and native audio seeking.
- Console/page-error collection and explicit network boundaries for the rendered fixtures. Representative screenshots were separately inspected; this review found the additional companion collision and produced its repair.

## Reproduction

Use the isolated worktree and installed dependencies. Each runner label produces JSON and log files under this report's `evidence/`. Use separate ports for independent runs; builds/output directories are isolated by port.

```powershell
node --test tests/ui-state.test.mjs tests/service-worker.test.mjs tests/media-client.test.mjs tests/frontend-build.test.mjs tests/font-assets.test.mjs tests/client-session.test.mjs tests/arcade-password-game.test.mjs tests/app-store.test.mjs social/tests/frontend-compliance-config.test.mjs
npm run --prefix social typecheck
npm run --prefix social build
node e2e/frontend-compliance-run.mjs consent-final e2e/frontend-compliance-consent.spec.ts --workers 1
node e2e/frontend-compliance-run.mjs accessibility-verified e2e/frontend-compliance-accessibility.spec.ts e2e/frontend-compliance-legal-accessibility.spec.ts --workers 1
node e2e/frontend-compliance-run.mjs functional-new e2e/frontend-compliance-commerce.spec.ts e2e/frontend-compliance-eligibility.spec.ts e2e/frontend-compliance-recovery.spec.ts --workers 1
node e2e/frontend-compliance-run.mjs overlay-verified e2e/frontend-compliance-overlay.spec.ts --workers 1
```

For the enabled synthetic payment cases, set `FRONTEND_COMPLIANCE_PAYMENTS=true` only in that test process and select the two Premium cases shown in the summary. For permission tests, set `FRONTEND_COMPLIANCE_PUSH=true` and select `frontend-compliance-permissions.spec.ts`. These flags do not alter tracked application configuration or enable a backend service. Without its explicit profile, the permission spec is deliberately skipped; the reported final permission run used its profile and skipped nothing.

## Verification limits

Automated axe results retain `incomplete` findings for human review, including image/gradient contrast. Passing sampled fixtures does not establish universal WCAG conformance. No native screen-reader, physical-device, real provider, live email, real payment, production cookie/security-header, authored media-caption or arbitrary-UGC acceptance is claimed. Legal/operator approval and incomplete license evidence remain launch blockers in their separate reports. A failed early shared-output startup was corrected by isolating build directories; it executed no tests and is not counted as a product failure.
