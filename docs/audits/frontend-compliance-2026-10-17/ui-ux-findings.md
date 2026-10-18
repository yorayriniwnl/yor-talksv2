# UI and UX findings

Audit work package: 17 October 2026; local execution: 18 October 2026. The changes preserve Yor's current shell, colors, typography, routes and established component library.

## Implemented repairs

| Journey | Reproduced/source-backed defect | Result |
| --- | --- | --- |
| Stories | Overlay lacked keyboard navigation and reading-time controls. | Named modal, Escape cancellation, focus restoration, previous/next navigation and pause/resume. Reduced motion starts stories paused. Reply focus and nested interactions stop automatic advance. |
| Composer | Short screens could clip long/poll forms and closing could lose the initiating focus position. | Scrollable dialog with focus returned to the initiating desktop/mobile/topbar control. Inline/modal fields no longer share label targets. |
| Search | Invalid listbox structure, unnamed combobox, selection outside the visible result list. | Named input/groups, valid option structure, result scrolling and bounded layout. |
| Navigation | Compact profile identity relied on avatar or initials; tablet audio overlay used desktop positioning too early. Active conversation screenshot showed ambient controls covering the composer. | Stable profile/More names, clearance above mobile navigation until 1024px, and inline ambient controls on active conversation routes, retaining the same audio component and playback state. |
| Installation | Prompt could overrun a 320px screen and the dismiss action lacked a name. | Inset-aware width and named dismissal; no false FAST PWA badge. |
| Communication | Theme-specific text colors failed contrast on crimson controls. | Foreground tokens track the active theme; sent timestamps remain readable. |
| Dashboard | Chart values required pointer/visual interpretation. Wording implied interaction dates despite grouping cumulative counts by publication day; zero followers used an invented denominator of one for an engagement percentage. | Equivalent day/count table; accurate publication-day wording and unavailable rate where its inputs do not support a percentage. |
| Nested camera controls | Escape closed the parent camera when used in the sticker drawer. | Close only the drawer and preserve stream/recording readiness; lifecycle regression passes. |
| Companion and audio controls | Screenshot review showed the companion covering audio controls in both narrow light and wide dark layouts. | Companion follows actual player bounds, including expanded presets; two theme cases and manual corrected-screenshot review confirm separation. |
| Promotional badges | Every story author received an unconditional PRO badge, with no supporting account entitlement check. | Removed that unsupported badge; legitimate account/user content remains. |

## Responsive and keyboard evidence

The added test matrix checks horizontal document width at 320, 390, 768, 1024 and 1440px, both themes, across home, discovery, messaging, activity, worlds and saved content. It asserts actual loaded/empty content before each scan. The matrix also checks audio-player clearance above the mobile navigation. Additional tests cover 390 × 640 modal bounds, a 320px install prompt, repeated forward/reverse Tab traversal, skip-to-content focus, Escape and focus restoration. It uses synthetic accounts with explicit network routes; fixture data is test-only.

Results, traces and limits belong in the frontend test report. A successful axe scan is evidence for the particular rendered fixture state, not a blanket approval of every state. Representative screenshots are generated in `evidence/accessibility/`.

## Remaining UX review scope

- No production deployment, real transaction or real notification/microphone/camera permission was performed.
- User-generated image descriptions and real captions/transcripts require media API support, described in the accessibility audit.
- Personalized themes, image-heavy contrast, native screen readers and physical touch targets still need device/assistive-technology review. The matrix checks layout and accessible names; it does not substitute for that review.
- Optional ambient audio remains user initiated. The audit preserves the player and its underlying browser-generated sound engine.
- Legal, privacy, consent, payments, licensing and launch configuration findings are documented in their dedicated reports. Test-only operator details never establish production business identity.

P0/P1 issues found within these shared-component repairs: none left knowingly unaddressed. Two integration gaps and the broader manual contrast/assistive-technology review remain P2; dormant component reactivation review is P3. These counts describe this report's scope and must not be substituted for the repository-wide finding counts.

## Completion follow-up, 19 October

Further checks repair the companion popover focus lifecycle and native browser-zoom collision with ambient controls; startup accent persistence; highlighted menu contrast and native share-menu keyboard activation and rapid close/reopen behavior; and the Story builder name, scrollable layout, labels, focus restoration and author-entered photo description. Photo descriptions use the existing persisted textContent field and the existing viewer alt text. No descriptions are invented.

Static demo stock photographs, an unrendered GIF gallery and a dormant music reference were removed or replaced with local geometric preview art. Genuine server-provided media and brand assets remain. Inactive optional analytics no longer solicits a new opt-in; an existing device choice can be removed with confirmed or uncertain-removal feedback. See the final test report for executed results and retained earlier failures.
