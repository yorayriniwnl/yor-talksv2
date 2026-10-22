# Preregistration app demo — 20 October 2026

The `/preregister` and `/launch` pages now put a full-width interactive app window immediately below the opening message. The primary invitation and navigation lead to the demo. The existing private-delivery concept sits with the privacy commitments, while the countdown remains above the hero.

## Visitor experience

- **Feed:** like a sample post, write a reply, save it and find it in Saved. Replies remain when switching screens or expanding the window.
- **Messages:** type and send a message into the sample group conversation.
- **Communities:** explore three sample communities, join or leave them, and retain those choices while switching screens.
- **Studio:** select a visual look, write a caption and add the creation to the demo feed with the chosen look intact.
- **Guided tour:** start from the window toolbar and move through the four screens with contextual instructions and progress. Publishing a Studio creation completes the tour, retains the post, and brings a signup invitation into view.
- **Expanded window:** use the native modal dialog, dismiss with Escape, or go directly to signup. State survives expansion, and focus returns to the appropriate control.
- **Early access:** a direct invitation below the demo and the tour completion panel lead to the existing signup form.

All demo content is illustrative. Interactions use component state, do not call product mutation APIs, and reset on a reload. Messages are not sent to other people. Studio uses the existing local still-life image and three browser-applied looks. The existing signup and privacy disclosures are retained.

Implementation: `social/src/components/launch/YorSocialPreview.tsx` and `yor-live-demo.css`, integrated by `social/src/pages/preregister.tsx`.

## Verification

- Production build passed in 13.46 seconds: `pnpm --filter @workspace/social exec node scripts/build.mjs --outDir dist/demo-review`.
- All 27 frontend browser cases passed against that build in 1.5 minutes, including 11 new demo cases and the 16 existing preregistration cases.
- All four screens fit 320, 375, 768, 1024 and 1440px viewports without page or panel horizontal overflow.
- Axe found zero violations in every demo screen, editable replies, and completed-tour dialogs at 375 and 1440px, and in the expanded mobile dialog.
- Checked keyboard tour navigation, reply submission and whitespace rejection, scrollable conversation history, reduced motion, dialog focus restoration, and signup navigation from the modal. The completed tour's signup link is fully in view at 375 and 1440px.
- The latest full-project TypeScript check reported unrelated errors: `social/src/lib/private-chat-crypto.ts:22` cannot resolve `openpgp`, and `social/src/pages/moderation.tsx:681` reads an `updatedAt` property missing from `ModerationAppeal`.

The tracked browser tests are `e2e/preregister-demo.spec.ts`. The local production review configuration, logs, build and screenshots are ignored artifacts under `test-results/` and `social/dist/demo-review/`. API/auth responses were intercepted; database-backed cases were excluded. No deployment was performed.
