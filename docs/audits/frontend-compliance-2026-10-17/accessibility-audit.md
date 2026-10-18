# Accessibility audit

Audit scope: Yor Talks frontend, 17 October 2026 work package. Local execution date: 18 October 2026. This is a source and browser audit, not a WCAG conformance certification.

## Method and evidence

Reviewed the route shell, shared controls, avatars, composer, command palette, story viewer, charts, media players, voice recording controls, loading states, reduced motion handling, and existing accessibility preferences. Used [WCAG 2.2 guidance](https://www.w3.org/WAI/WCAG22/quickref/) for names, keyboard access, focus, text alternatives, contrast and motion.

The new `e2e/frontend-compliance-accessibility.spec.ts` uses explicit synthetic API fixtures. Unexpected API requests fail. No production accounts, content, purchases or permissions are exercised. It checks six principal routes (`/`, `/explore`, `/messages`, `/notifications`, `/worlds`, `/saved`) at 320, 390, 768, 1024 and 1440 pixels in light and dark themes. Each scan uses axe tags `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`, retaining both violations and cases needing manual review. Additional cases cover populated messages, the dashboard table, keyboard dialogs, a collapsed sidebar and a narrow PWA prompt.

Evidence is generated under `evidence/accessibility/`: per-surface axe JSON and representative screenshots. Playwright traces/videos are retained in its output directory on failure. Existing `core-social.spec.ts` already covers settings, legal, grievance, project and public authentication surfaces at these widths/themes; the root test report records the executed results of that suite.

## Corrected findings

| ID | Before | Repair | Verification |
| --- | --- | --- | --- |
| A01 | Story viewer was a fullscreen visual overlay without dialog semantics, focus containment, Escape handling or focus restoration. | Reused installed Radix dialog primitives with title, instructions and the original story trigger as the restoration target. | Keyboard test opens a story, cycles Tab and Shift+Tab, exits with Escape and checks restored focus. |
| A02 | Stories advanced every five seconds without a keyboard pause or previous/next control; reduced motion did not stop the timer. | Added pause/resume and previous/next buttons, arrow keys, initial pause for reduced motion, and timer suspension during replies, insights and tipping. | Story sequence checks and paused-state assertion under reduced motion. |
| A03 | Story close, reply and send controls lacked durable accessible names. | Named the controls and voice media; improved the story image fallback with the author's supplied text when available. | Story axe scans and role-based locators. |
| A04 | Composer opened without a Radix trigger, so closing could lose keyboard focus. `overflow-hidden` overrode dialog scrolling in short viewports. | Remember the actual trigger, restore it on close, and retain vertical scrolling. | 390 × 640 dialog bounds, scroll behavior, focus trap and restoration assertions. |
| A05 | Inline and modal composers reused field IDs; poll inputs used only placeholder labels. | Give compact composer fields an instance prefix and durable poll option names. | Source review; the modal test opens a poll while the inline composer remains mounted. |
| A06 | Search input lacked an explicit name; listbox contained exposed heading roles, producing an axe critical `aria-required-children` violation. | Name the combobox and groups; hide duplicated group headings from the accessibility tree. | Independent first run reproduced the violation in both themes; subsequent verification scans search again. |
| A07 | Keyboard search selection could scroll beyond the visible results; short viewports could clip the results list. | Scroll the active option into view and allow the result list to shrink inside its container. | Keyboard traversal and source review. |
| A08 | Some collapsed sidebar controls relied on initials, a loaded avatar or `title` for their identity. | Explicitly name More and the profile link, and distinguish the sidebar navigation landmark. | Collapsed-sidebar named-role test. |
| A09 | Ambient player switched to desktop bottom positioning at 640px while mobile navigation remained until 1024px. A rendered 390px conversation also showed it covering the message composer. | Align the bottom-position breakpoint with navigation and render the same mounted player in normal flow on active conversation routes. Playback state and controls remain available. | Player/navigation rectangles at sub-1024 matrix widths and actual composer/player nonoverlap assertions. |
| A10 | PWA prompt used viewport-wide content plus a right offset, clipped narrow screens, and had an unnamed dismiss icon. | Constrain width by the available inset, name the prompt/dismiss action and retain mobile bottom clearance until desktop navigation. | 320px bounds and scoped axe test. |
| A11 | Voice recording preview play/pause and discard buttons were unnamed; the visual waveform canvas had no semantic treatment. | Name preview/discard actions and mark the decorative canvas hidden. | Source review; recording permission itself is not requested by this audit. |
| A12 | Light-theme message CTA used black text on crimson, measured by axe at 3.9:1. Other communication controls hard-coded white regardless of theme, and sent timestamps reduced text opacity. | Use the existing primary foreground token on signal-colored surfaces, including sent messages and controls; preserve full-opacity timestamp text. | First run reproduced CTA failure at every light-theme width; populated-message and theme scans verify repairs. |
| A13 | Dashboard chart exposed visual bars without equivalent day/count values for nonvisual readers. | Add a semantic table based on the same seven publication-day cohorts; keep duplicate chart geometry out of the accessibility tree. The caption identifies current cumulative interactions rather than implying interaction timestamps. | Test checks the named table and eight rows, followed by a dashboard axe scan. |
| A14 | Escape in Studio's sticker drawer also closed its parent camera modal and stopped its stream. | Prevent the parent Radix Escape dismissal when closing the nested preview. | Existing camera lifecycle regression now passes, including one recorder start and release of late permission streams. |
| A15 | Representative light/dark screenshots showed the companion covering audio volume/preset controls. | Position it above the observed player bounds, updating on resize and player expansion. | Two additional theme cases test collapsed/expanded bounds at every requested width; corrected screenshots were visually inspected. |

## Test execution

Initial independent run: 14 tests executed, 7 passed and 7 failed. All seven failing cases stopped at the pre-existing message contrast or search listbox defect described above. They were not represented as passing baseline checks. Expanded run: 16 tests executed, 12 passed and 4 failed (two ambiguous test locators corrected; two context/teardown timeouts during concurrent browser jobs). Final verification uses one worker and isolated build/output directories. Its executed result is recorded in the frontend test report; this document must not be read as a pass claim before that run completes.

Completed final verification: **26 cases passed, 0 failed/skipped**, including 16 shared-flow and ten legal/account matrix cases. These produced **141 axe scans with zero reported violations**, with incomplete rules retained in the committed scan summaries. Two further companion/audio cases passed across all widths/themes, and the existing ambient-player and Studio lifecycle cases passed after their final changes. The complete selected frontend unit suite passed 96/96, and the final typecheck and production build passed. Earlier runs and test-only locator/fixture corrections remain in the test report's history.

Manual visual review was limited to representative rendered screenshots: narrow light-theme messages and saved content, wide dark-theme saved content, and corrected overlay positions. It found the companion collision that automation initially missed. Native screen-reader/physical-device review was not performed.

## Remaining limits and findings

| Severity | Finding | Status / required evidence |
| --- | --- | --- |
| P2 | User-provided image descriptions cannot be inferred from pixels or author names. Current feed/post/story contracts expose media URLs and general text, not an image-specific authored alternative. | PARTIAL. Fallback alt text and decorative avatars are present. A complete solution needs image-associated alt text in upload metadata and the read/write contracts for `/posts`, `/feed` and `/stories`, then frontend entry/edit/display support. No fictional description is generated. |
| P2 | User video/voice media has no verified caption/transcript delivery contract. A preference to show captions does not establish actual captions. | BLOCKED for authored synchronized captions/transcripts. Preserve playback controls; request language-tagged caption/transcript references and delivery authorization from the media API. |
| P2 | Automated contrast cannot resolve all images, gradients, hover combinations or personalized themes, and cannot establish screen-reader behavior. | PARTIAL. Axe `incomplete` results are retained. Representative rendered screenshot review is separate from automation; native screen-reader/mobile-device and personalized-theme review remains required. |
| P3 | Dormant `ProfileMusicPlayer` and `AudioWaveformPlayer` source components have no current import into a mounted route. | Excluded from live-flow pass claims. Inspect their semantics and playback behavior before enabling them. |

No claim is made that all possible user-generated media, browser/assistive-technology combinations, transient states or every route is fully WCAG conformant. The report separates directly exercised flows from static inspection and integration gaps.
