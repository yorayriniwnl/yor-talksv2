# Talks Premium Feature Suite Implementation Plan

> **For agentic workers:** Execute the tasks in this plan task-by-task with a fresh test cycle and a scoped commit after each completed task.

**Goal:** Add a coherent, server-authorized Yor Advanced feature system spanning privacy-aware stories, reliable analytics, unread message previews, curated text styles, profile distribution, and pinned posts.

**Architecture:** Extend the existing Express + Drizzle/PostgreSQL + Socket.IO stack instead of adding a second API or state layer. A feature-entitlement service owns rollout decisions, a shared audience policy owns visibility, and repositories expose bounded/cursor-based reads. The React/Vite client consumes those contracts through the existing API client and Zustand store, with a single `/advanced` hub and focused composer/profile affordances.

**Tech Stack:** TypeScript, Express 5, Zod, Drizzle ORM, PostgreSQL, Socket.IO, Redis-backed rate limiting, React 19, Vite, Zustand, Framer Motion, Node test runner, Playwright.

**Spec:** User-provided `pasted-text.txt` mission, especially sections 1–31.

## Global Constraints

- Server-side authorization is the source of truth for story visibility, viewer identity exposure, message read state, pin limits, and profile-only distribution.
- Raw bio and message text remain unchanged; styles are stored as validated IDs and rendered with accessible fallbacks.
- Every schema change is represented in `lib/db/src/schema/index.ts` and the idempotent beta migration.
- Story queries use persisted `publishedAt`/`expiresAt`; no new code derives expiry from `createdAt + 24 hours`.
- Viewer analytics return identifiable rows only when the stored view mode permits it; private rows remain aggregate-only.
- New list endpoints are bounded and cursor-based or search-limited; they never load an unbounded viewer set.
- Realtime events contain server-derived IDs and are emitted only after authorized persistence.
- No billing integration is added; rollout is controlled by feature flags and per-user overrides.
- Respect the existing Yor design tokens, dark/light themes, reduced motion, keyboard navigation, and existing error envelope.

---

### Task 1: Feature-entitlement and audience foundation

**Files:**
- Create: `api-server/src/features/premium-features.ts`
- Create: `api-server/src/services/feature-entitlement-service.ts`
- Create: `api-server/src/utils/audience-policy.ts`
- Create: `api-server/src/__tests__/premium-foundation.test.ts`
- Modify: `api-server/src/types/index.ts`
- Modify: `lib/db/src/schema/index.ts`
- Modify: `lib/db/src/index.ts`
- Modify: `lib/db/scripts/migrate-beta.mjs`
- Modify: `api-server/src/validators/user.ts`

**Interfaces:**
- `PremiumFeature` is a closed string union covering the mission’s fifteen entitlement keys.
- `FeatureEntitlementService.hasFeature(userId, feature)` returns `Promise<boolean>` and checks an active override before the environment default.
- `evaluateAudience(input)` returns `{ allowed: boolean; reason: AudienceDecisionReason }` and applies blocks before audience membership.

- [ ] Write pure tests for default feature flags, active/expired user overrides, public/follower/close-friend/custom audience decisions, and block precedence.
- [ ] Run `pnpm --filter @workspace/api-server exec tsx --test src/__tests__/premium-foundation.test.ts` and observe the expected missing-module failures.
- [ ] Add the feature union, feature-flag parser, typed user settings for story viewing mode and style IDs, and the pure audience evaluator.
- [ ] Add `feature_entitlements`, `user_feature_overrides`, `story_audience_members`, and `story_audience_exclusions` tables with foreign keys, active-status indexes, and uniqueness constraints; export them from the DB package.
- [ ] Add idempotent SQL to `migrate-beta.mjs` for those tables and the user-settings validation-compatible JSON fields.
- [ ] Add Zod validation for the new user settings without accepting arbitrary style names or CSS.
- [ ] Re-run the focused test and both package typechecks.
- [ ] Commit and push as `feat: add Talks Premium entitlement foundation`.

### Task 2: Story lifecycle, privacy views, analytics, and reactions

**Files:**
- Create: `api-server/src/services/story-analytics-service.ts`
- Create: `api-server/src/validators/premium-story.ts`
- Create: `api-server/src/__tests__/premium-story-domain.test.ts`
- Modify: `lib/db/src/schema/index.ts`
- Modify: `lib/db/scripts/migrate-beta.mjs`
- Modify: `api-server/src/types/index.ts`
- Modify: `api-server/src/repositories/story-repository.ts`
- Modify: `api-server/src/services/story-service.ts`
- Modify: `api-server/src/controllers/story-controller.ts`
- Modify: `api-server/src/routes/stories.ts`
- Modify: `api-server/src/services/notification-service.ts`
- Modify: `api-server/src/lib/realtime.ts`

**Interfaces:**
- `recordView(storyId, viewerId, eventKey)` is idempotent and returns aggregate counts plus the server-selected exposure mode.
- `getAnalytics(storyId, ownerId)` returns total views, unique viewers, rewatches, rewatch rate, identified/private counts, and bounded timestamped viewers.
- `searchViewers(storyId, ownerId, query, cursor, limit)` returns only permitted identified viewers with a next cursor.
- Story reactions use `NORMAL_HEART | SUPER_HEART | CUSTOM` rather than overloading an emoji string.

- [ ] Write failing tests for duplicate view event keys, private-view aggregate-only output, rewatch rate math, timestamp formatting input, capped priority boost, duration entitlement limits, and SUPER_HEART duplicate rejection.
- [ ] Run the focused test and verify failures are caused by missing domain behavior.
- [ ] Add `story_view_events`, `story_reaction_type`, story `published_at`, `publish_mode`, `priority_boost`, and story audience/highlight linkage columns/tables; preserve legacy rows during migration.
- [ ] Replace the unique-view-only write path with an event write plus aggregate upsert, selecting private/identified exposure from the viewer’s persisted setting rather than request data.
- [ ] Add owner-only analytics and cursor/search endpoints with blocked-user filtering and no private-view identity leakage.
- [ ] Add duration validation (24/48/72/custom configured ceiling), `expiresAt`-based active queries, highlight-only publish support, priority ranking, and audience policy checks to create/view/react paths.
- [ ] Add SUPER_HEART rate limiting, idempotent persistence, creator notification, and typed Socket.IO events; emit only after the database operation succeeds.
- [ ] Run focused tests, API typecheck, and migration-safety checks.
- [ ] Commit and push as `feat: add privacy-aware story analytics and reactions`.

### Task 3: Message preview state and message presentation styles

**Files:**
- Create: `api-server/src/utils/message-lifecycle.ts`
- Create: `api-server/src/__tests__/message-preview.test.ts`
- Modify: `lib/db/src/schema/index.ts`
- Modify: `lib/db/scripts/migrate-beta.mjs`
- Modify: `api-server/src/types/index.ts`
- Modify: `api-server/src/validators/message.ts`
- Modify: `api-server/src/repositories/message-repository.ts`
- Modify: `api-server/src/services/message-service.ts`
- Modify: `api-server/src/controllers/message-controller.ts`
- Modify: `api-server/src/routes/messages.ts`
- Modify: `api-server/src/lib/realtime.ts`

**Interfaces:**
- `MessageDeliveryState` is `DELIVERED | PREVIEWED | OPENED | READ`.
- `previewConversation(conversationId, userId)` returns messages and records a preview event without writing `message_reads`.
- `markRead(messageId, userId)` is the only operation that advances sender-facing read receipts.
- `textStyleId` is a validated nullable message field and never changes `content`.

- [ ] Write failing tests proving preview does not create a read row, explicit read does, deleted messages cannot be previewed, unauthorized participants receive no data, and invalid style IDs are rejected.
- [ ] Run the focused test and observe the expected failures.
- [ ] Add message lifecycle/read-event persistence and validated `text_style_id` migration columns while preserving legacy `seen_at` behavior for existing clients.
- [ ] Add a dedicated preview endpoint and keep list/fetch endpoints free of implicit read writes.
- [ ] Add style validation, persistence, redacted analytics logging, and typed `message:previewed`/`message:read` events.
- [ ] Update the API client and existing store actions so preview and read are explicit.
- [ ] Run focused tests and both typechecks.
- [ ] Commit and push as `feat: add unread message previews and text styles`.

### Task 4: Profile styles, app icon capability, profile-only posts, and six pinned posts

**Files:**
- Create: `api-server/src/services/profile-premium-service.ts`
- Create: `api-server/src/validators/profile-premium.ts`
- Create: `api-server/src/__tests__/profile-premium.test.ts`
- Modify: `lib/db/src/schema/index.ts`
- Modify: `lib/db/scripts/migrate-beta.mjs`
- Modify: `api-server/src/types/index.ts`
- Modify: `api-server/src/repositories/post-repository.ts`
- Modify: `api-server/src/services/post-service.ts`
- Modify: `api-server/src/controllers/post-controller.ts`
- Modify: `api-server/src/routes/posts.ts`
- Modify: `api-server/src/validators/post.ts`
- Modify: `api-server/src/routes/users.ts`
- Modify: `api-server/src/controllers/user-controller.ts`
- Modify: `api-server/src/validators/user.ts`

**Interfaces:**
- `BioStyleId`, `MessageStyleId`, and `StoryFontId` are curated unions shared by validation and clients.
- `setPinnedPosts(userId, orderedPostIds)` validates ownership and exactly enforces a maximum of six in one transaction.
- `distributionMode` is `FEED_AND_PROFILE | PROFILE_ONLY`; feed queries exclude profile-only rows while profile queries retain them.
- `getAppIconCapabilities()` returns platform support and the allowlisted icon catalog without claiming unsupported native behavior.

- [ ] Write failing tests for raw bio preservation, style allowlisting, profile-only feed exclusion, pin ownership, six-item limit, deterministic reorder, and unauthorized mutation rejection.
- [ ] Run the focused test and verify the expected missing behavior.
- [ ] Add profile style fields, post distribution mode, and `profile_pinned_posts` schema/migration with indexes and a position uniqueness constraint.
- [ ] Thread distribution mode through post creation, author-content checks, feed filters, profile feed reads, and API contracts.
- [ ] Add transactional pin/unpin/reorder endpoints with optimistic-update-safe conflict responses.
- [ ] Add profile settings endpoints for bio style and app icon selection; use a capability adapter for web, Android, iOS, and unsupported platforms.
- [ ] Run focused tests and typechecks.
- [ ] Commit and push as `feat: add profile distribution and pin controls`.

### Task 5: Yor Advanced client hub and connected social affordances

**Files:**
- Create: `social/src/pages/advanced.tsx`
- Create: `social/src/lib/premium-feature-catalog.ts`
- Create: `social/src/lib/text-styles.ts`
- Create: `social/src/components/premium/FeatureHubCard.tsx`
- Create: `social/src/components/premium/StylePicker.tsx`
- Create: `social/src/components/premium/AppIconPicker.tsx`
- Modify: `social/src/App.tsx`
- Modify: `social/src/lib/api-client.ts`
- Modify: `social/src/lib/store.ts`
- Modify: `social/src/pages/settings.tsx`
- Modify: `social/src/pages/messages.tsx`
- Modify: `social/src/components/feed/StoryBuilderModal.tsx`
- Modify: `social/src/components/feed/StoryViewer.tsx`
- Modify: `social/src/pages/profile.tsx`
- Modify: `social/src/index.css`
- Modify: `social/src/premium.css`

**Interfaces:**
- `/advanced` renders feature groups for Stories, Messages, Profile, Appearance, and Interactions from the server entitlement snapshot.
- The story composer submits duration, publish mode, audience mode, and curated text style IDs.
- The message list offers an explicit preview action and never calls the read endpoint until the conversation is opened.
- Profile controls use optimistic pin reorder with rollback and show the server’s six-item limit.

- [ ] Add client-side unit tests for style sanitization, app-icon capability fallback, timestamp formatting, and optimistic pin rollback.
- [ ] Run them red before adding the implementation.
- [ ] Add API methods/types and store state for entitlements, story analytics, message preview, styles, app icons, pins, and distribution mode.
- [ ] Build the responsive Yor Advanced page using existing components/tokens, visible focus states, skeleton/error/empty states, and reduced-motion-safe transitions.
- [ ] Wire existing story/message/profile surfaces to the new server-backed actions; remove any mock-only controls introduced for this suite.
- [ ] Run social typecheck, unit tests, production web build, and the existing E2E suite.
- [ ] Commit and push as `feat: ship Yor Advanced social controls`.

### Task 6: Full verification and release evidence

**Files:**
- Modify: `docs/PRODUCTION_LAUNCH.md`
- Create: `docs/YOR_ADVANCED_RELEASE.md`
- Modify: `e2e/core-social.spec.ts`
- Create: `e2e/premium-social.spec.ts`

- [ ] Add desktop and mobile E2E coverage for the advanced hub, explicit message preview/read transition, profile-only post visibility, story duration/audience controls, and pinned-post reorder.
- [ ] Run lint-equivalent typechecks, unit tests, API integration tests, migration safety, production build, E2E tests, and dependency audit where available; record exact output and infrastructure blockers.
- [ ] Scan changed production files for TODO/FIXME/placeholder/mock/console.log/temporary/any and remove inappropriate leftovers.
- [ ] Manually inspect dark/light, mobile/desktop/tablet, focus order, reduced motion, loading/empty/error states, and no-horizontal-overflow behavior.
- [ ] Document migrations, routes, events, security/privacy controls, tests, build status, residual risks, and honest 0–10 scores.
- [ ] Commit and push as `docs: record Yor Advanced release evidence`.

