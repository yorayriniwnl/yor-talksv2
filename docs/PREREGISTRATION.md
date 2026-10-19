# Yor Talks pre-registration

The public page is available at `/preregister` and `/launch`, with an entry link on `/auth`. It remains accessible while account-session initialization is pending. The requested launch date is **1 December 2026**, with the countdown using **00:00 IST (UTC+05:30)**.

## Visitor experience

- Responsive dark/coral design with self-hosted fonts, a live countdown, planned early member perks and expandable FAQs.
- Email and preferred username collection with explicit, unchecked launch-update consent. Client and server validate the request; the database records the consent timestamp.
- Successful new signups receive a unique member reference, a downloadable text pass and a copyable invitation link. No email delivery is initiated by signup.
- An existing email gets a generic acknowledgement. Knowing another person's address cannot retrieve their username, pass or invitation code. Database errors never return SQL or addresses.
- Existing draft pass data is removed from browser local storage. New signup details are held only in component state and are not cached there.
- Perks are clearly described as planned. There are no invented signup counts, free paid-plan promises or guaranteed handle reservations. Account creation remains a separate flow.

## Storage and deployment

`lib/db/scripts/migrate-preregister.mjs` contains the additive migration. The existing beta and production migration runners call it through `migrateRelease`. Review and apply the migration using the normal deployment process before enabling persisted signups. It adds the preregistration table, identity indexes and nullable consent timestamp for compatibility with older records; it never invents consent for legacy rows.

For an isolated local database, configure the existing database package's environment and run `pnpm --filter @workspace/db migrate:beta` as documented in the main README. For an existing schema, the standalone preregistration migration also accepts an explicitly set `DATABASE_URL` and runs in a transaction. Do not apply migrations to production as a local preview step.

Both the API and PostgreSQL must be available for real signup. Storage outages produce a retryable error, and the form retains the visitor's inputs. This implementation does not add an in-memory production fallback.

The public `POST /api/preregister` endpoint has its own shared rate-limit bucket. `GET /api/preregister/stats` reports actual stored records; the page does not depend on the stats endpoint. The request contract requires `email`, `username` and `launchUpdatesConsent: true`, with an optional bounded invitation code.

Collecting consent does not enable a marketing sender. Before sending launch or promotional email, implement and verify unsubscribe/suppression handling, consent eligibility, approved retention and provider delivery behavior. Existing transactional security mail remains independent.

## Verification

Focused backend regression tests cover normalization, consent, duplicate privacy, concurrent conflicts, safe error handling, real counts and isolated rate limits. The migration test can exercise repeat execution, legacy preservation and case-insensitive uniqueness inside a rolled-back isolated schema when `PREREGISTER_TEST_DATABASE_URL` explicitly identifies a disposable PostgreSQL database.

The focused Playwright spec `e2e/preregister.spec.ts` intercepts signup requests and blocks third-party traffic. It checks public routes, responsive layout, validation, consent, referral handling, success, duplicate acknowledgement and error/retry behavior. Browser tests establish UI behavior with fixtures; they do not prove production email or database connectivity.

The prior backend-audit status is recorded separately in `docs/audits/backend-security-2026-10-17/STATUS-CHECK-2026-10-19.md`. Its passing CI belongs to the separate audit PR and does not certify these local changes or production readiness.

### Local results, 19 October 2026

- Frontend typecheck and production build passed; API typecheck/build and shared database build passed.
- Seven focused Chromium tests passed, including both public pages while authentication initialization is deliberately stalled. Desktop and 375px mobile screenshots were reviewed. The accessibility scan reported no serious or critical findings.
- New signup download and invite copying were tested with synthetic API/clipboard fixtures; no recipient was emailed and the system clipboard was not modified.
- Forty targeted backend/migration-safety regression tests passed, including signup, privacy, authorization errors, rate limits, origin checks and logging. One real PostgreSQL migration test was skipped because no disposable database was configured. The full database-backed API suite was not run. These are verification limits, not migration success.
- API contract generation/checking and generated React/Zod client generation/checking passed.

No production deployment or database migration was performed. Apply and verify the migration against approved staging infrastructure before using real signup data.
