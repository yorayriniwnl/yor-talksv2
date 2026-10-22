# Frontend Test Report

Execution: 18-19 October 2026 (Asia/Calcutta), Node 24.19.0 on Windows. Installed dependencies were reused without root lockfile changes. Browser checks use Chromium against local production builds, synthetic accounts/operator data, intercepted API/provider responses and blocked external networking. No production transaction, account or deployment was used.

**Verified distinct cases after corrections: 96 unit tests, 65 new compliance browser tests and 104 existing browser tests across their declared profiles. Total 265 distinct passing cases.** Repeated attempts are not added to this total. Historical failures, including attempts with incompatible test profiles, remain in the indexed evidence. This does not claim that the untouched default root CI command is green.

## Checks

| Check | Executed outcome | Limit |
| --- | --- | --- |
| Frontend TypeScript | Passed | Final source checked with tsc --noEmit |
| Production build and mirror | Passed | Existing deferred LiveKit chunk 532.18 KB/139.12 KB gzip still emits the Vite size warning |
| Selected frontend unit tests | 96 passed, 0 failed/skipped | Includes real font integrity and production legal-configuration checks |
| Isolated audit lint | 250 files, 0 errors, 5 informational warnings; exit 0 | 17 named correctness rules, not a full React/typed recommended ruleset or maintained root CI integration |
| Design-token contract | Passed | Existing repository checker, unchanged token contract |
| New compliance browser cases | 65 distinct cases passed, 0 outstanding failed/skipped cases in the verified selections | Raw earlier failed attempts retained |
| Existing browser cases | 104 distinct cases passed in their correct profiles: 101 disabled-payment and 3 enabled synthetic free-plan/checkout cases | Four explicit assertion migrations run on a temporary copy; original test/config unchanged |
| Accessibility automation | 165 current axe scans, 0 reported violations | 141 principal/legal scans plus 24 advanced/Story scans; incomplete rules retained for human review |
| Browser accessibility tree | 20 Chromium AX snapshots | AX semantics do not establish native screen-reader speech acceptance |
| Native browser zoom | Actual Chromium zoom 2.0 in both themes | Temporary localhost-only extension uses tabs.setZoom/getZoom; no CSS/pinch approximation |
| Exact asset evidence | 41 font/license byte comparisons matched; 34 native resources verified against official Capacitor templates | Nine remaining web/repository source-owner records still need genuine permission evidence |

Machine-readable outcomes and titles are in [test-results-summary.json](evidence/test-results-summary.json). Command exit codes are in [verification.json](evidence/verification.json), current unit output in [completion-unit.txt](evidence/completion-unit.txt), and lint rule scope/notices in [frontend-lint-summary.json](evidence/frontend-lint-summary.json). Raw JSON/logs/traces remain reproducible locally and are excluded from Git; compact summaries retain failures and review limits.

## New browser coverage

The 65 unique cases comprise 51 standard-profile cases, 12 advanced-accessibility/Story cases and 2 explicit push-profile cases. Standard coverage includes consent 11, inactive analytics 4, shared accessibility 16, legal/account matrices 10, commerce 4, eligibility 1, recovery 1, overlay 2 and asset delivery 2. The two overlay cases also ran in the push selection and are counted once.

- Legal notices and grievance intake are public. Google requests occur only after provider choice; failure/retry/resizing and other sign-in methods remain usable.
- Registration/reacceptance starts unchecked, errors focus fields, failed values persist, concurrent submissions are bounded, and mismatched server terms cannot hydrate social data.
- Inactive analytics offers no new opt-in. Previous device choices can be cleared for eligible/ineligible accounts, across tabs and on reload. Blocked removal is reported honestly. The actual dormant batcher is exercised separately for storage denial, owner changes, aborted delivery and unload withdrawal; no collector was mounted.
- Payment-disabled behavior, recovery/cancellation, explicit sample claims, genuine no-photo states and server-delivered imagery remain functional. Twelve demo routes request no fixed external media; local preview art decodes.
- Both themes and 320, 390, 768, 1024, 1440 px are covered. Keyboard checks include skip navigation, Tab/reverse Tab, focus trapping/restoration, Escape, native seeking/volume, menus and hover information. Companion controls are nonmodal and bounded; reduced motion, forced colors and all three saved accents are exercised.
- Story descriptions use the real existing image/textContent contract. The test uploads once, preserves the author description through a publication failure/retry, reloads the returned Story and verifies its image alt text. No unsupported altText API field or invented description is used.
- True 200% zoom checks reflow and reachable composer/companion controls. Representative screenshots were reviewed separately; native-zoom geometry and duplicate Story close controls were repaired after failed checks.

## Existing-suite migration and failures

The untouched core-social suite was actually attempted in the initial phase:89 passed, 15 failed. Six failing cases subsequently passed after a real Studio Escape fix, profile naming correction, appropriate synthetic payment flags, or an isolated rerun. Nine remaining old assertions assumed automatic Google loading or used ambiguous shell/page heading selectors. That initial result was never called green.

The completion runner preserves all 104 declarations and creates a temporary copy. Its four reviewable transformations add deliberate Google choice to two tests, replace obsolete analytics opt-in assertions with inactive-status/previous-choice clearing, and scope Settings/Projects page-content selectors. [The generated patch](legacy-test-migration.patch) passes git apply --check. No original e 2e file or root configuration is edited.

Payment profiles are explicit:101 cases use disabled payments; the free-plan terms-enabling assertion and two checkout/recovery assertions use an enabled synthetic frontend build. All APIs/providers remain intercepted. The first combined enabled attempt was 102 passed/2 failed (disabled-marketplace expectation and obsolete analytics switch). An intermediate 102-case disabled attempt was 100 passed/2 failed: the free-plan test belonged in the enabled profile, and rapid block retry exposed a post-menu close/reopen problem. Those failures remain recorded. Post menus now close without a lingering exit animation; the rapid failure/retry regression passed after repair. The final runner has the correct 101+3 partition.

The root/default legacy CI entry still requires its owner to apply the provided migration and adopt the explicit profiles. That ownership boundary remains TEST-MIGRATION-01; passing a temporary migrated copy is not a claim about the unchanged default command.

Other preserved attempts include the standard completion selection 49 passed/2 failed from incorrect illustration-count and CSP fixture assumptions; advanced runs 4/6, 6/6, 10/4 and 12/2 while real contrast, geometry, duplicate-close and keyboard activation defects were repaired. Corrected media, Story, native zoom and post-menu selections actually passed afterward. Full per-attempt evidence is indexed; no failure is silently relabelled as a pass. Two early temporary-runner startup errors executed no tests.

## Reproduction

Run from the isolated audit worktree with installed repository dependencies. Use different ports for independent builds and keep browser worker counts bounded.

    node --test tests/ui-state.test.mjs tests/service-worker.test.mjs tests/media-client.test.mjs tests/frontend-build.test.mjs tests/font-assets.test.mjs tests/client-session.test.mjs tests/arcade-password-game.test.mjs tests/app-store.test.mjs social/tests/frontend-compliance-config.test.mjs
    npm run --prefix social typecheck
    npm run --prefix social build
    node scripts/check-design-tokens.mjs
    node e 2e/frontend-compliance-run.mjs standard e 2e/frontend-compliance-consent.spec.ts e 2e/frontend-compliance-inactive-analytics.spec.ts e 2e/frontend-compliance-accessibility.spec.ts e 2e/frontend-compliance-legal-accessibility.spec.ts e 2e/frontend-compliance-commerce.spec.ts e 2e/frontend-compliance-eligibility.spec.ts e 2e/frontend-compliance-recovery.spec.ts e 2e/frontend-compliance-overlay.spec.ts e 2e/frontend-compliance-asset-delivery.spec.ts --workers 1
    node e 2e/frontend-compliance-run.mjs advanced e 2e/frontend-compliance-advanced-accessibility.spec.ts e 2e/frontend-compliance-story-description.spec.ts --workers 1
    node e 2e/frontend-compliance-legacy-run.mjs legacy --workers 1

For the two permission cases, set FRONTEND_COMPLIANCE_PUSH=true in that test process and select frontend-compliance-permissions.spec.ts. The verified run used its profile and skipped nothing. These flags affect local frontend fixtures, not tracked deployment configuration or backend services.

Lint tools were installed outside the repository with npm --prefix <temporary-directory> install --no-save --package-lock=false --ignore-scripts eslint@9.39.1 @typescript-eslint/parser@8.46.1 typescript@5.6.3. Set FRONTEND_LINT_TOOL_DIR to that directory and run its eslint/bin/eslint.js with --config docs/audits/frontend-compliance-2026-10-17/frontend-lint.config.mjs over social/src, social/scripts, social/public/sw.js and social/vite.config.ts. Inline suppression comments are deliberately disabled; the five warnings report that existing comments have no effect in this audit configuration. No rule violation was suppressed to obtain the result.

## Verification boundaries

Axe incomplete findings and screenshot review remain separate from passes. Narrator was present but not launched; NVDA was not installed/running. No native screen-reader speech, physical-device, real provider/email/payment, production-cookie/security-header or arbitrary-UGC acceptance is claimed. Per-image post descriptions, synchronized caption/transcript contracts, genuine operator facts/legal approval, nine remaining asset source-owner records and staging operations remain external requirements. HTTP 200 route delivery checks establish SPA delivery only. No universal WCAG, GDPR or DPDP compliance claim is made.

An additional fresh two-worker full legacy rerun was interrupted at 75/101 disabled cases and emitted no final JSON. Its partial progress is not counted as a pass or used to derive the totals. The 265 distinct passing cases above come from completed reports and the targeted successful correction checks, as enumerated in the result index.
