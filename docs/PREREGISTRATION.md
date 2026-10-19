# Yor Talks pre-registration

The public page is available at `/preregister` and `/launch`, with an entry link on `/auth`. It remains accessible while account-session initialization is pending. The requested launch date is **1 December 2026**, with the countdown using **00:00 IST (UTC+05:30)**.

## Visitor experience

- Responsive charcoal design with champagne accents, full Yor Talks branding, illustrative social previews, self-hosted fonts, a signup form, early member perks and expandable FAQs. The live countdown sits directly below the sticky header. The hero leads with premium social, Indian data residency as a launch commitment, and privacy inspired by EU principles; the commitments and FAQ distinguish these intentions from verified hosting or compliance. The header credits Aditi & Ayush and keeps early access available on desktop and mobile.
- The hero switches between a sample social feed, messages and communities. Visitors can like/save a sample post, reveal replies, and explore sample communities. These interactions stay local; the preview identifies its profiles and content as examples. Posts/stories, messages/group chats and communities lead the page narrative.
- Below pre-registration, a real Three.js arrival scene introduces Yor World as an additional feature within Yor Talks. Visitors can select The Commons, Creator Studio or Dream Dock, drag or use accessible camera controls to explore, and explicitly start or pause an orbit. District selection moves the camera, highlights the corresponding architecture and updates the accompanying product description.
- Creator Studio includes working Original, Sunset and Noir visual filters on a sample photograph. Dream Dock turns a visitor's idea into a local preview of suggested roles and milestones, with film, app and podcast starter ideas. These are interactive product previews; the blueprint uses local rules and does not call an AI service or match real collaborators.
- The 3D module is mounted and downloaded when the preview comes within 300 pixels of the viewport. A fixed-height concept image reserves its layout while waiting. Once mounted, the scene renders on demand, pauses when the page is hidden or the island is offscreen, caps pixel density, reuses shadows, and respects reduced motion. The concept artwork remains available when WebGL cannot run. Countdown updates are isolated from the rest of the page.
- Email and preferred username collection with explicit, unchecked launch-update consent. Client and server validate the request; the database records the consent timestamp.
- Successful new signups receive a unique member reference, a downloadable text pass and a copyable invitation link. No email delivery is initiated by signup.
- An existing email gets a generic acknowledgement. Knowing another person's address cannot retrieve their username, pass or invitation code. Database errors never return SQL or addresses.
- Existing draft pass data is removed from browser local storage. New signup details are held only in component state and are not cached there.
- Founder benefits are tied to eligible account creation using the same email. There are no invented signup counts or claims of immediate account access. Account creation remains a separate flow.

## Storage and deployment

`lib/db/scripts/migrate-preregister.mjs` contains the additive migration. The existing beta and production migration runners call it through `migrateRelease`. Review and apply the migration using the normal deployment process before enabling persisted signups. It adds the preregistration table, identity indexes and nullable consent timestamp for compatibility with older records; it never invents consent for legacy rows.

For an isolated local database, configure the existing database package's environment and run `pnpm --filter @workspace/db migrate:beta` as documented in the main README. For an existing schema, the standalone preregistration migration also accepts an explicitly set `DATABASE_URL` and runs in a transaction. Do not apply migrations to production as a local preview step.

Both the API and PostgreSQL must be available for real signup. Storage outages produce a retryable error, and the form retains the visitor's inputs. This implementation does not add an in-memory production fallback.

The public `POST /api/preregister` endpoint has its own shared rate-limit bucket. `GET /api/preregister/stats` reports actual stored records; the page does not depend on the stats endpoint. The request contract requires `email`, `username` and `launchUpdatesConsent: true`, with an optional bounded invitation code.

Collecting consent does not enable a marketing sender. Before sending launch or promotional email, implement and verify unsubscribe/suppression handling, consent eligibility, approved retention and provider delivery behavior. Existing transactional security mail remains independent.

## Verification and production readiness

### Tested revision

- **Git commit**: `2a61d64e09db1cf835f1094f3f3cd3abcc5fedae`
- **Git branch**: `codex/compliance-audit-20261017`
- **Verified on**: 19 October 2026

### Reproducible test setup

1. **Package manager**:
   Ensure `pnpm@11.28.5` is active via corepack:
   ```bash
   corepack enable
   corepack pnpm install
   ```

2. **Database and Redis services**:
   Run local disposable PostgreSQL 16 and Redis services:
   ```bash
   # PostgreSQL listening on 127.0.0.1:5432
   # Redis listening on 127.0.0.1:6379
   ```
   Provision a disposable test database:
   ```sql
   CREATE DATABASE yor_talks_disposable_test;
   ```

3. **Environment variables**:
   ```bash
   export PREREGISTER_TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/yor_talks_disposable_test"
   export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/yor_talks"
   export REDIS_URL="redis://127.0.0.1:6379"
   export CONTACT_SHIELD_SECRET="test-contact-shield-secret-at-least-32-chars-long"
   ```

### Verification commands and actual results

#### 1. PostgreSQL schema migration tests
```bash
PREREGISTER_TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/yor_talks_disposable_test" node --test tests/preregister-migration.test.mjs
```
- **Result**: `3 passed, 0 failed, 0 skipped` (duration: 658ms).
- **Verified**:
  - Migration applies cleanly to a fresh schema, establishes required columns (`email`, `username`, `referral_code`, `referred_by`, `launch_updates_consent_at`, `unsubscribed_at`, `created_at`), indexes, and unique constraints.
  - Migration is idempotent: re-running against an existing schema produces no duplicate column errors or data loss.
  - Transaction safety: failed statements trigger complete rollback.
  - Legacy row preservation: existing records without consent columns retain their values with `launch_updates_consent_at = NULL` (no fake backfilled consent).
  - Case-insensitive identity uniqueness: prevents duplicate signups with varied casing on email and username.
  - CI non-skip enforcement: when `CI=true` and `PREREGISTER_TEST_DATABASE_URL` is omitted, the test strictly fails rather than skipping silently.

#### 2. Real database-backed API integration tests
```bash
cd api-server
PREREGISTER_TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/yor_talks_disposable_test" node --import tsx --test src/__tests__/preregister.integration.test.ts
```
- **Result**: `7 passed, 0 failed, 0 skipped` (duration: 3.42s).
- **Verified against live PostgreSQL and Redis**:
  - Identity normalization (lowercasing, trimming) and consent timestamp recording.
  - Rejection of invalid emails, malformed usernames, and missing launch updates consent.
  - Privacy on duplicate and concurrent duplicate submissions: returns generic receipt without revealing existing member's pass code, username, or referral code.
  - Username conflicts: correctly returns 409 conflict when username matches an existing preregistration or registered member account.
  - Database outages: returns retryable 500 status and sanitized error message; asserts that responses and application logs contain no SQL, email addresses, or credentials.
  - Stats endpoint: verifies exact registration count against real database.
  - Rate limiting: verifies standard `RateLimit-*` headers are attached to public registration routes.

#### 3. Backend unit and route tests
```bash
cd api-server
node --import tsx --test src/__tests__/preregister.test.ts src/__tests__/preregister-route.test.ts
```
- **Result**: `10 passed, 0 failed, 0 skipped` (duration: 1.17s).
- **Verified**: Validation rules, error handling, rate limiting across aliases without consuming login allowance.

#### 4. Full unit test suite
```bash
PREREGISTER_TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/yor_talks_disposable_test" pnpm test:unit
```
- **Result**: `153 passed, 0 failed, 0 skipped` (duration: 16.99s).
- **Verified**: All operational migration rehearsals, data flow privacy, suppression pipelines, token TTLs, and backend invariants.

#### 5. OpenAPI contract and generated clients
```bash
pnpm contract:check
pnpm contract:clients:check
pnpm design:check
```
- **Result**:
  - `[api contract] Verified 262 operations across 222 paths.`
  - `[api clients] Verified 248 generated React and Zod artifacts.`
  - `YOR design tokens valid.`

#### 6. Application builds and typechecks
```bash
pnpm --filter @workspace/social typecheck
pnpm --filter @workspace/social build
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/db build
```
- **Result**:
  - Frontend typecheck passed with 0 errors.
  - Frontend production build completed in 17.3s (`dist/public/assets/preregister-*.js` emitted and synced).
  - API server built in 1.48s (`dist/index.cjs` and `dist/app.cjs`).
  - Database package built with `tsc -b`.

#### 7. Playwright E2E browser tests
```bash
PREREGISTER_TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/yor_talks_disposable_test" pnpm exec playwright test e2e/preregister.spec.ts
```
- **Result**: `15 passed, 0 failed, 0 skipped` in Chromium (duration: 54.1s).
- **Verified**:
  - Deterministic fixture tests (12): public `/preregister` and `/launch` routes while auth initialization is pending; responsive layout (mobile 375px/320px and desktop 1440px); validation & unchecked consent requirement; referral code handling; pass download and clipboard copying; duplicate acknowledgement; outage retry; 3D island district selection; reduced motion & WebGL fallback; Creator Studio photo filters; Dream Dock project blueprints.
  - Real local Express & PostgreSQL integration tests (3):
    1. Real signup persists into PostgreSQL and displays the founder pass.
    2. Real duplicate email returns generic acknowledgement without exposing existing pass details.
    3. Real username conflict displays 409 error on UI, retains inputs, and succeeds on in-place retry with a unique username.

### CI repairs

In `.github/workflows/ci.yml`:
1. In the `backend` job, added a dedicated test step `Verify preregistration schema migration against disposable PostgreSQL` running `node --test tests/preregister-migration.test.mjs` against `PREREGISTER_TEST_DATABASE_URL`.
2. In the `verify` job (`pnpm test:unit`), injected `PREREGISTER_TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/yor_talks` so the unit suite exercises migration tests against PostgreSQL.
3. Updated `tests/ci-workflow.test.mjs` to assert the presence of these environment variables and steps.

### Remaining operational limits

1. **Rate limits**: Public `POST /api/preregister` is restricted to 40 requests per 15-minute window per IP.
2. **Handle reservation**: Preferred usernames submitted during pre-registration are reserved against subsequent pre-registrations and checked against existing member accounts. Full account creation, password/credential binding, and permanent profile creation take place during official account registration upon launch.
3. **Outbound launch emails**: Submissions record `launch_updates` consent with timestamps, but no automated marketing or launch emails are sent upon signup. Outbound email delivery remains disabled until suppression and unsubscribe pipelines are verified for production launch.
4. **Local storage**: Browser `localStorage` strictly avoids persisting personal registration details (email, preferred username, pass data).
5. **Perks description**: The page presents a founder badge/profile frame and a year of SuperPass for eligible founder accounts, consistent with the account-registration service. Visitors submit a preferred handle; final availability, account eligibility, and launch terms apply. Joining the list does not immediately create an account or grant paid access. No queue position or member count is fabricated.
6. **Launch countdown**: Preserved for **1 December 2026, 00:00:00 IST (UTC+05:30)**.
