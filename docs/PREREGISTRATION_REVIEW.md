# Preregistration page review — 19 October 2026

Scope: `/preregister` and `/launch`, including the countdown, product previews, signup flow and shared-link presentation. No production services or real signup recipients were used.

## Confirmed issues and fixes

| Issue | Evidence | Resolution |
| --- | --- | --- |
| Incomplete successful API responses displayed an empty member pass | A synthetic HTTP 201 with `data: {}` produced a bare `@` and nonfunctional pass controls. | Validate the receipt discriminator and displayed pass fields before showing confirmation; keep entered details available for retry. |
| Connection and timeout failures exposed browser exception text | A simulated disconnected request displayed `Failed to fetch`. | Give readable connection/timeout recovery instructions while preserving specific API validation messages and form values. |
| Returning from confirmation lost keyboard focus | The focused Back button was removed while focus remained on the page body. | Focus the email field after the form is restored. Signup anchors are also focusable destinations. |
| Mobile controls and disclosures were hard to use | Social actions used 8px text, navigation 9px; some product/camera buttons were below 44px high. | Enlarge functional labels and touch areas, including social, Studio, Dream, camera and main signup controls. |
| The headline split awkwardly on narrow phones | At 320px, the last line became “Rooted in / India.” | Scale the narrow-screen heading so the complete phrase fits on one line. |
| Mobile 3D labels were clipped after district selection | Dream Dock extended about 23px past the scene boundary at 320px after selecting Creator Studio. | Clamp projected label positions using each label’s actual width; verified with 8px clearance at 320px and 375px. |
| The offscreen 3D scene downloaded and initialized immediately | The lazy component was rendered on initial page load, triggering its roughly 539KB raw bundle before the section was visible. | Delay mounting and loading until the section is within 300px of the viewport; reserve its dimensions with a concept image. Isolate countdown updates so they do not rerender the full page every second. |
| Shared links and lower sections retained the previous branding | Static OG/Twitter metadata and artwork said “Make things happen”; product controls still used lime accents. | Update static metadata, the 1200×630 share card and app description; align landing controls and signup surfaces with the champagne palette. |

## Verification

- Frontend TypeScript check passed.
- Local layout checks at 320, 375, 601, 768, 900, 1024 and 1440px found no initial horizontal overflow; section links clear the sticky header.
- The mobile Axe scan at 375px found zero violations.
- Loaded 3D labels stayed inside their scene at 320px and 375px after changing districts.
- Browser regressions cover connection failure/retry, timeout recovery, malformed receipts, return focus and deferred 3D loading alongside the existing signup and product tests. Production browser execution is pending completion of the local rebuild.

India-only hosting and legal compliance remain launch review items. This review does not verify production data residency or certify GDPR compliance.
