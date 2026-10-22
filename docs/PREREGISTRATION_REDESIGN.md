# Preregistration redesign — 21 October 2026

The `/preregister` and `/launch` pages now introduce Yor Talks through personal connection, Indian data residency and a transparent privacy direction.

## Experience

- Replaced the previous charcoal/champagne page with ivory, forest and mint; large editorial typography; a shorter narrative; and a clear invitation to join.
- Kept the launch countdown directly below the header, before the hero.
- Removed the landing page's Three.js world, district navigation and unrelated creative demos from its import graph.
- Added a CSS/SVG private-delivery illustration with three keyboard-accessible stages. The recipient sees the sample message only at the final stage. It makes no requests and identifies itself as an illustrated example.
- Retained the interactive social-app demo, with the private-delivery explanation alongside the security commitments.
- Retained registration validation, explicit consent, referrals, member receipts, QR invitations, downloads, retry handling and focus restoration.
- Updated document, social sharing and manifest metadata, including a new 1200×630 share image.

## Security claim boundary

The user's desired model is a platform that carries personal messages without access to their contents. The separate `/private-messages` mode implements this for one-to-one text and small files; the existing standard messaging mode continues to process readable content.

The audit of standard messaging found:

- `social/src/lib/api-client.ts` sends message content as ordinary JSON.
- `api-server/src/services/message-service.ts` passes readable content to `enforceTextContentPolicy` before storing it; edited messages use the same policy.
- `api-server/src/services/content-policy-service.ts` calls AI moderation.
- `api-server/src/services/ai-service.ts` includes content in a configured Gemini moderation prompt, with an AI gateway fallback.
- `api-server/src/repositories/message-repository.ts` persists readable content in the message table's text field.
- Message attachments also pass through server/provider moderation.

The landing links to Private chats and limits its encryption statements to that mode. It explains the client-held keys, recovery file, passphrase and out-of-band fingerprint verification. The FAQ explicitly states that standard messages are not end-to-end encrypted, group chats and calls are outside the private mode, and an independent security audit has not been completed.

The delivery illustration explains this boundary without performing encryption itself. It also distinguishes encrypted message content from the account and delivery metadata the service still sees.

Existing features described on the page include two-factor authentication, session controls, optional analytics off by default, and account export/deletion. Indian data residency remains a launch commitment pending confirmation of hosting, backups and service providers. EU principles describe the intended privacy approach, not a verified compliance claim.

There is no blanket “Yor cannot read all your chats” guarantee, no provider recovery of a lost private key and no claim of an independent security certification. Production deployment and the operational review of the private mode remain separate from the landing-page verification.

## Verification

- The earlier redesign production build and its 16 frontend browser cases passed on 20 October. Those earlier results are not evidence of the new private-chat backend.
- On 21 October, all 33 production-browser cases passed: 19 preregistration cases (including three using the real API and an isolated database), 11 interactive-demo cases and three private-chat cases. External requests were blocked. The three updated private-chat cases passed again after recovery/import and restored-access coverage was added.
- Browser checks cover public routes, consent/field validation, success receipts, referrals/downloads, duplicate acknowledgement, malformed responses, connection and timeout recovery, focus restoration, authentication races, privacy disclosures/links, countdown position, keyboard/reduced-motion relay operation, and absence of the retired World/Three/canvas.
- Fresh layout screenshots at 320, 375, 768, 1024 and 1440px show no horizontal overflow. Desktop, tablet and mobile views were visually inspected.
- The fresh mobile Axe scan at 375px found zero violations; the desktop scan in the browser suite found no serious or critical violations.
- Scoped `git diff --check` passed.
- Both frontend and backend TypeScript checks now pass, as do the frontend and API production builds and the generated API contract check.
- During release preparation on 21 October, all 33 browser cases passed again against a production bundle built with patched Vite 7.3.7. The isolated database used the restricted application role for the real signup cases. The latest log is `test-results/private-chat-release-postgres/browser-tests.log`.

The final production run used `playwright.config.ts` and is recorded in `test-results/private-chat-final-browser`. Current full-page screenshots are `test-results/preregister-desktop.png` and `test-results/preregister-mobile.png`; the multi-width layout/Axe report is in `test-results/preregister-final-visual`. These local review artifacts are ignored by Git. See [Private chat security](PRIVATE_CHAT_SECURITY.md) for the completed cryptography and database verification. No deployment or production service changes were made.
