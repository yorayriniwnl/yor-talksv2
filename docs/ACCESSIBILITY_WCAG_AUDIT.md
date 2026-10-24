# Accessibility verification — 17 October 2026

**Overall status: PARTIAL.** This is a technical accessibility audit of the current frontend. It is not a WCAG conformance statement or legal approval. PR #25 remains **BLOCKED / NO-GO**.

This report continues the historical [September privacy/accessibility review](PRODUCTION_PRIVACY_ACCESSIBILITY_AUDIT.md). Historical results there do not establish the present browser behavior.

## Target and evidence boundaries

The target is [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/). Text contrast is evaluated against the applicable 4.5:1 or 3:1 minimum, with the exceptions and large-text definition in [W3C's contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Keyboard acceptance follows [W3C's keyboard criterion](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html). These primary references were checked on 17 October 2026.

The browser suite uses the production Vite build, Chromium, explicit synthetic API fixtures and a blocked external DNS boundary. The fixtures deliberately enable synthetic reviewed legal/operator information and eligible test users; they do not approve real operator information, age assurance, provider configuration or public release. Real Google rendering, payment providers, uploads, live calls and backend persistence require separate integration evidence.

## Implemented accessibility controls

| Area | Source evidence | Validation scope |
|---|---|---|
| Bypass navigation | `social/src/components/layout/AppShell.tsx`: skip link and focusable `#main-content` | First Tab and Enter assertions in both themes at all five requested widths. |
| Image alternatives | `social/src/components/ui/avatar.tsx`: decorative empty default, explicit caller alternatives preserved; native images use `alt` | TypeScript AST inventory of 201 TSX files found 26 native `img` elements, none without an `alt` attribute; 63 `AvatarImage` uses, 51 relying on the shared decorative default. This proves attribute presence, not semantic quality of every description. |
| Form errors | Auth, grievance, settings/account deletion and projects | Browser coverage samples field labels, first-invalid-field focus, error descriptions, retained drafts and retry behavior. |
| Dialogs | Shared Radix dialog, account deletion, Studio camera | Account deletion tests focus entry, Escape, focus restoration and failed confirmation. Studio now has a real `DialogTitle`, description, associated caption label, mode/filter pressed state and a named sticker close button. |
| Theme contrast | `social/src/index.css`, `premium.css`, `ThemeMorpher.tsx` | Theme-specific semantic token pairs avoid persisting fixed inline colors into the opposite mode; axe scans described below measure rendered sampled pages. |
| Motion preferences | Global CSS `prefers-reduced-motion`, app MotionConfig, account accessibility preferences | Reduced-motion browser emulation, computed sampled animation duration, and persisted preference failure/retry/logout tests. This does not establish all video/canvas motion behavior. |
| Browser fonts | `social/public/fonts`, local `fonts.css`, pinned font license notices | Font asset regression checks; browser compliance scans reject Google Fonts network requests. |
| Truthful creator controls | Studio camera and Bazaar | Studio discloses preview-only CSS filters/stickers, microphone-only recordings and device-dependent quality. Fake music-library/4K/WebGL claims are removed. Bazaar removes fixed ratings/review counts and verified-studio badges and labels illustrative games/studios/prices. |

## Browser acceptance matrix

`e2e/core-social.spec.ts` contains the executable assertions. The compliance matrix scans `/`, `/settings`, `/cookies`, `/grievance` and `/projects` at **320, 390, 768, 1024 and 1440 CSS pixels**, in **light and dark** themes. Each of the ten combinations checks document overflow, all reported axe violations tagged `wcag2a`, `wcag2aa`, `wcag21aa` and `wcag22aa`, browser errors, console errors and external Google Fonts requests. Each page attaches axe violations **and incomplete checks** as JSON; incomplete checks are not passes.

Two additional public-page cases scan `/auth`, `/privacy`, `/terms` and `/cookies` at 390 pixels in both themes. Their explicit unauthenticated refresh response is an expected HTTP 401 fixture and is excluded from unexpected console errors. Google is a synthetic accessible button fixture, so these cases do not measure Google's actual embedded control.

Representative keyboard tests cover home feed tabs, sign-in validation, reel comment arrows, Studio sticker-panel Escape/focus return, and account deletion. Browser API fixtures also cover creator/payment cancellation, privacy-setting save failures, account controls for outdated terms, moderation queues and accessible preference persistence.

## Recorded executions

| Check | Result | Evidence |
|---|---|---|
| `pnpm --filter @workspace/social typecheck` after main integration and Studio/Bazaar edits | PASS, exit 0 | Local execution on 17 October; pnpm first completed the frozen workspace dependency resolution. |
| `node --test tests/font-assets.test.mjs tests/media-client.test.mjs tests/client-session.test.mjs` | PASS: 42 passed, 0 failed, 0 skipped | Executed before main integration; these results are bounded to that earlier tree and must be considered with the final root unit run. |
| `pnpm exec playwright test --list` | PASS: 104 Chromium tests discovered | Discovery verifies test registration only. |
| Current production build and full Chromium run | In progress; do not count as PASS | `PLAYWRIGHT_PORT=4179`, `CI=true`, one worker, JSON and line reporters. Final results are added after completion. |
| Frontend lint | Not available; not counted as PASS | No frontend/root lint script or ESLint configuration is present. TypeScript checks do not replace linting. |

An earlier frontend run was interrupted by Windows paging-file exhaustion before a usable result and is not counted as passing. One later CLI launch failed before tests because PowerShell expanded an unquoted comma in the reporter argument; quoting `--reporter=line,json` corrected the invocation.

## Remaining verification and product gaps

| ID | Severity | Status | Remaining work |
|---|---|---|---|
| A11Y-01 | P2 | PARTIAL | Complete route/state coverage, including populated creator tools, media overlays, upload dialogs, command menus, live/RTC interfaces and all administrative workflows. The current automated sample cannot support a whole-application contrast or keyboard PASS. |
| A11Y-02 | P2 | PARTIAL | Perform screen-reader checks with NVDA/Firefox or equivalent, VoiceOver/Safari and mobile assistive technology. Automation does not verify reading order, quality of generated descriptions or actual announcements. |
| A11Y-03 | P2 | PARTIAL | Manually verify gradients, image/video backgrounds, placeholder text, custom accent presets, disabled/control boundaries, focus contrast/obscuration and forced-colors behavior. Axe incomplete results require triage; do not convert them into passes. |
| A11Y-04 | P2 | PARTIAL | Test 200%/400% zoom, text-spacing overrides, portrait/landscape, all dialogs and soft-keyboard reflow on actual devices. Requested viewport widths are a useful sample, not equivalent to these tests. |
| A11Y-05 | P2 | PARTIAL | Review caption/transcript/audio-description support for user media and enabled live content. The stored captions preference is not evidence that every uploaded video has captions. |
| A11Y-06 | P2 | PARTIAL | Studio's optional preview sticker positioning still uses pointer dragging; a keyboard/single-pointer positioning alternative needs a product-specific interaction and regression coverage before claiming WCAG 2.1.1/2.5.7 for that tool. This preview is expressly not published, and removing capture or inventing export behavior would not resolve the interaction correctly. |
| A11Y-07 | P3 | PARTIAL | Add a maintained lint configuration and component-level accessibility checks as a separately reviewed baseline. No new lint framework/dependencies were introduced solely to produce a green checklist entry. |

No global WCAG badge or compliance claim is authorized by this report. The accessibility requirements for alternative text, contrast and keyboard navigation remain **PARTIAL** until the outstanding coverage and confirmed interaction gap are resolved.
