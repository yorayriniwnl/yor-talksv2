# Frontend Implementation Changelog

Baseline `62920ad`; changes on `audit/frontend-compliance-20261017`. Counts are defect families, not individual DOM nodes, line changes, tests, or previously implemented baseline work. Corrections made during review of this patch are included within their original family, rather than counted as extra pre-existing bugs.

| ID | Corrected defect family | Principal evidence | Accessibility family |
| --- | --- | --- | --- |
| FC-01 | Terms acceptance wording now distinguishes contractual agreement and privacy acknowledgement | Auth and consent pages; unchecked-consent regression | No |
| FC-02 | Reacceptance focuses missing choice, retains failed choice and prevents duplicate submission | Consent page and pending-request tests | Yes |
| FC-03 | Successful/current acceptance can leave or revisit `/consent` without a 404 | Consent navigation; accepted route redirect | Yes |
| FC-04 | Mismatched server terms return visible feedback and cannot hydrate social datasets | Consent page and store gate; mismatch regression | No |
| FC-05 | Legal configuration rejects blank identity/version values and invalid calendar dates; incomplete notices show blockers | Public-beta config, Vite guard, legal/grievance notices | No |
| FC-06 | Grievance length limits and tracking validation match server contracts with input focus | Grievance page and validation tests | Yes |
| FC-07 | Report failures preserve drafts and explain uncertain delivery; intake minimizes unnecessary sensitive disclosures | Grievance page; error guidance | No |
| FC-08 | Privacy/storage notices accurately qualify deletion, archive exclusions, providers and retained data | Legal review and source contracts | No |
| FC-09 | Google SDK loads after explicit provider choice, retaining retry and responsive controls | Auth page; actual script-request test | No |
| FC-10 | Inactive analytics offers no new opt-in; previous device choices can be cleared with cross-tab updates and honest storage-error feedback | Settings and consent regressions | No |
| FC-11 | Withdrawal remains effective in memory when browser storage cannot be cleared | Telemetry batcher/source harness | No |
| FC-12 | Withdrawal/session changes stop queued, concurrent and unload sends; late responses cannot restore another queue | Batcher revision/abort/owner checks; network/source harness | No |
| FC-13 | Ineligible accounts can withdraw a saved choice without granting new analytics permission | Settings/telemetry helpers; consent regression | No |
| FC-14 | Premium new/resumed checkout respects the disabled frontend payment flag | Premium and disabled-payment regression | No |
| FC-15 | Billing continuation and shared provider loader respect the same flag while recovery/cancellation remain available | Billing/checkout loader; commerce tests | No |
| FC-16 | Premium advertised benefits use the actual server plan | Premium page and server catalog fixture | No |
| FC-17 | Products without photos show a genuine empty state rather than random stock product imagery | Marketplace and Creator Store | Yes |
| FC-18 | Static audience/rank/progress/market data are clearly identified as samples | Podcast, rankings, clans, predictions, pass and commerce preview review | No |
| FC-19 | Unconfigured Super Pass price/reward and countdown urgency are removed | Pass and tournament preview copy | No |
| FC-20 | Local communications and fan-club previews avoid unsupported live-microphone/codec/latency/provider-verification claims | Lounge, squad communications, fan club | No |
| FC-21 | Signed-in Points Shop profile no longer uses an unrelated stock portrait | Points Shop avatar | Yes |
| FC-22 | Push permission/manual synchronization avoids duplicate subscriptions and rechecks account eligibility at async boundaries; prompt is named and fits 320px | Push manager and isolated synthetic permission tests | Yes |
| FC-23 | Password reset associates errors with fields, focuses feedback, retains failed values and prevents duplicate requests | Recovery page and regression | Yes |
| FC-24 | Guardian-permission read failures stay retryable and preserve confirmed records | Eligibility page and outage regression | Yes |
| FC-25 | Windows font checkouts preserve pinned upstream hashes; bundled icon license notice ships with the frontend | Font unit test, `.gitattributes`, exact DM Mono upstream bytes | No |
| FC-26 | Stories expose modal semantics, focus trapping/restoration, Escape, pause, labelled navigation/reply and media-safe arrow handling | StoryViewer and keyboard/audio regression | Yes |
| FC-27 | Collapsed profile/sidebar/navigation actions retain accessible names | AppShell and axe checks | Yes |
| FC-28 | Composer fits short screens, has unique field IDs and restores its activating control | Composer/AppShell and keyboard test | Yes |
| FC-29 | Search has named combobox/listbox groups and scrolls active results into view | CommandPalette and keyboard/axe tests | Yes |
| FC-30 | Voice preview/discard controls are named and decorative waveform canvas is hidden | VoiceNoteRecorder | Yes |
| FC-31 | Install prompt fits narrow screens and exposes named dismissal | PWA prompt and responsive/axe regression | Yes |
| FC-32 | Ambient audio clears tablet navigation and active-message composer while retaining playback and reachable controls | Audio player, shell and rectangle regression | Yes |
| FC-33 | Light-theme communications and highlighted menus use readable foreground tokens | Messages/shared communication styles and dark/light axe | Yes |
| FC-34 | Interaction chart provides an equivalent table, accurate loaded-post/publication-day description and no invented rate for zero followers | AnalyticsChart/dashboard populated-data regression | Yes |
| FC-35 | Escape in Studio's sticker preview closes the nested preview and keeps the camera modal/stream available | StudioCameraModal Radix Escape interception; existing camera lifecycle regression | Yes |
| FC-36 | Companion no longer covers audio volume and preset controls, including when the player expands | Measured player height and CSS breakpoint positioning; light/dark five-width and native 200% zoom regressions | Yes |

Initial delivery: 36 corrected defect families, including 19 accessibility-related families. Completion follow-up adds the five families below. The accessibility subset is the rows marked Yes. This is not a count of unique WCAG success criteria or all affected controls.

All existing server eligibility/guardian gates, password confirmation for deletion, moderation controls and working media APIs remain enforced. Optional tracking was not mounted, payment flags were not enabled for the application, and no application-side fake API response was added. Enabled-payment and push profiles are isolated browser fixtures only.

Validation outcomes, changed-file count and delivery SHA are recorded separately after the final checks, rather than asserted here before execution.

## Completion follow-up, 19 October

| ID | Corrected defect family | Principal evidence | Accessibility family |
| --- | --- | --- | --- |
| FC-37 | Companion controls provide initial focus, Escape dismissal, focus restoration, bounded scrolling and a precise local-preference disclosure | Radix nonmodal popover; keyboard/AX/native-zoom regressions | Yes |
| FC-38 | Saved accent theme applies at startup on public, auth and signed-in routes before opening desktop More | App startup initializer; all three accents/reload in both themes | Yes |
| FC-39 | Story builder has a name, scrollable controls, retained focus/draft, labelled type/poll/media fields and author-entered photo descriptions through existing textContent | StoryBuilder; upload/retry/viewer description regressions | Yes |
| FC-40 | Unverified static stock/GIF/music references are removed or replaced with local geometric previews; verified native-template notice ships | Zero static remote-media inventory; exact official native provenance; media delivery regression | No |
| FC-41 | Post action/share menus retain accessible page context and keyboard opening/navigation/dismissal without duplicate keyboard activation or lingering close animation | Nonmodal post menus and native Share trigger and immediate menu dismissal; menu keyboard/axe tests | Yes |

**41 corrected defect families; 23 accessibility-related families.** Follow-up paths for already-counted families (inactive analytics, menu contrast and native-zoom audio positioning) are retained in their existing family rather than double-counted.
