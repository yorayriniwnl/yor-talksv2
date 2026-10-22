# Backend Security Audit

Audit scope: backend branch `audit/backend-security-20261017`, based on `62920ad`. The assignment is dated 2026-10-17; execution occurred on 2026-10-18. Only synthetic identities and local infrastructure were used. This report records the authentication, authorization and realtime review; companion reports cover privacy, dependencies, database, CI and infrastructure. The implementation changelog contains the consolidated test and release decision.

## Confirmed findings and repairs

| ID | Severity | Component | Root cause | Fix | Test | Evidence | Remaining risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-01 | P2 | Authenticator second factor | Password, Google, email OTP, setup and disable called `authenticator.check` without recording consumption. The same valid TOTP could be reused during its validity period, including concurrent requests. | A shared `consumeTotpCode` validates the code then claims a strict, atomic Redis `SET EX NX` key. The key hashes the secret and code; the value is only `used`; expiry is 90 seconds for the existing 30-second, zero-skew verifier. All five verification paths use it. | `totp-replay-security.test.ts`: 20 concurrent logins produce exactly one session; cross-method and setup/disable replay denied; invalid codes do not claim storage; outage fails closed; the next period remains usable. | `api-server/src/services/auth-service.ts`; `RedisRepository.setIfAbsentStrict`; targeted run: 4/4 pass. | Redis failure prevents TOTP authentication. Redis must remain trusted and available. A setup-confirmation code cannot immediately be reused to log in; obtain the next code. Already authenticated device approvals remain a separate, single-use flow. |
| AGE-01 | P2 | AI API delivery and consent revocation | `/ai/chat`, `/ai/moderate` and `/ai/search` used admission-time eligibility only. Topic/provider/search awaits could complete after authority withdrawal and still return a result. | Refresh current database-backed AI capability before outbound provider calls and before response delivery. Search refreshes before returning hydrated results. Revocation returns static HTTP 403 without generated/search content. | `ai-eligibility-security.test.ts`: both API prefixes; admission denial; context-time revocation without a provider call; provider-time revocation without response content; search hydration revocation; authority outage; authorized success. | `api-server/src/routes/ai.ts`; targeted run: 5/5 pass. | A completed outbound request cannot retract data already sent to a provider. Production AI remains gated by release, adult eligibility and approved territory policy. |
| TEST-01 | P2 | Backend security verification | Two existing test cases omitted their closing `});`, so TypeScript and the affected test files could not parse. Once repaired, one existing push-registration helper triggered TS7023. Three newly executable/related message tests also retained obsolete contact or immediate group-membership fixtures. | Restore the two case boundaries; annotate the fetch helper with `ReturnType<typeof fetch>`. Supply the missing conversation lookup/contact fixture in the expiry unit case; bind synthetic adults and explicitly accept refreshed group invitations in reaction/deletion fixtures. Assertions and test selection remain intact; group membership and reaching the visibility filter gain explicit assertions. | Backend TypeScript check passes. Disappearing-message and message-service suites: 17/17 pass against disposable PostgreSQL/Redis. | `disappearing-message.test.ts`, `message-preview.test.ts`, `push-registration-route.test.ts`, `message-service.test.ts`; `evidence/message-fixture-regression.txt`. Before: TS1005, then TS7023; full-suite failures showed missing lookup/unauthorized contact. | Contact policy is intentionally isolated in repository-focused fixtures with the existing `allowTestContacts`; dedicated eligibility/contact suites remain required. No production eligibility/contact code was weakened. |
| API-01 | P2 | Request parsing and error responses | Malformed JSON and parser failures were represented as generic internal errors; non-production error responses could expose raw exception details. | Map malformed/oversized parser errors to bounded client responses and return generic unexpected-error details in every environment. | `request-body-security.test.ts`: 3/3 passed in the main audit execution. | `api-server/src/middlewares/error-handler.ts`; main execution evidence in consolidated results. | All dependency/API errors still need safe server logging and handling; a generic response alone does not establish end-to-end service health. |
| PRIV-05 | P3 | Parsed request body retention | Every parsed JSON request also retained raw bytes, duplicating sensitive authentication/request content without a signature-validation need. | Retain raw bytes only for the Razorpay signature webhook; assurance callbacks already have their separate bounded raw parser. | Same three request-body security regressions verify preservation only where required. | `app.ts`, `middlewares/payment-webhook-body.ts`; main audit execution. | Verified signature callbacks necessarily retain request bytes transiently; do not log those payloads. |
| ENT-01 | P2 | Administrative paid-feature denial | Snapshot filtering compared a UTC `timestamp without time zone` override expiry directly with `now()` (`timestamptz`). A positive-offset database session could discard a still-active denial and fall back to an existing paid grant. | Normalize the expiry to a UTC instant according to its actual SQL storage type for filtering and JSON serialization; compare with `clock_timestamp()`. Apply the same normalization to the alternate override lookup. Availability flags and paid-grant checks remain intact. | Six real SQL TEMP-shadow scenarios cover `timestamp`/`timestamptz` in UTC, Asia/Calcutta and America/New_York, exercising active/expired/indefinite denials, positive grants, expiry and operational flags. | `feature-entitlement-service.ts`, `feature-entitlement-timezone.integration.test.ts`; before: 5 pass/1 fail (active denial bypass in timestamp + Asia/Calcutta); after plus premium foundation: 9/9 pass. `evidence/feature-entitlement-timezone-before.txt`, `evidence/feature-entitlement-timezone-after.txt`. | Requires an existing paid grant and feature availability to expose the denial bypass; no production exploitation is asserted. Existing incorrectly written non-UTC naive data needs separate reviewed reconciliation; this fix interprets the documented UTC storage convention. |

The table contains four security-control defects, one privacy minimization defect and one verification defect. No P0 or P1 vulnerability was confirmed in this scoped authentication/eligibility review. Other cross-domain findings are counted in the consolidated report, not inferred from this table.

## Authentication and session controls examined

| Control | Result and technical evidence | Practical limit |
| --- | --- | --- |
| Password storage | bcrypt hashing with cost 10 on registration and reset; comparison through bcrypt. Request schemas enforce passwords. | This is a source review, not a password-strength or offline-cracking benchmark. |
| Email verification and login OTP | Password login rejects unverified email. Email OTP claims are strict Redis operations with a bounded attempt count, reservation binding and auth-version checks. Public request responses avoid exposing account-specific throttle outcomes. | Provider delivery is mocked/local; live mailbox delivery is not established. |
| Google OAuth | `OAuth2Client.verifyIdToken` receives the configured audience; verified email and provider subject are required. External, unlinked email cannot bootstrap linking without current Google mailbox authority. Existing subject links, subject conflicts, email changes and second-factor challenge binding are tested. | No live Google project, redirect origin or production client acceptance was changed or verified. |
| Refresh tokens | Refresh JWT uses a separate secret, an explicit type, device ID, auth-version and unique `jti`. Rotation uses atomic compare-and-swap of the stored hash. Old hashes cannot win a concurrent rotation. | DB/Redis lifecycle results are reported by the full integration run. |
| Password reset | Random 32-byte token, hash storage, expiring single-use database redemption; password and auth-version update occur in a transaction. | Synthetic integration covers token races/rollback; production email and operational recovery remain external gates. |
| Session revocation | Every protected HTTP request checks strict Redis device session and current DB auth-version/status. JWT roles/permissions do not override current database role/permissions. Optional authentication retains an anonymous ceiling for invalid/restricted identity. | Correct clock, JWT keys and trusted Redis/database access are operating requirements. |
| Second factor | Seeds encrypted using AES-256-GCM; setup is pending in Redis before conditional DB enablement; disable matches the stored seed. AUTH-01 adds atomic replay protection. Device approvals are owner-bound, number matched, expiry bound and single use. | Recovery codes and provider-independent recovery are not implemented here; their policy needs a separate product decision. |
| Browser session origins | Session-issuing login, Google, email OTP, refresh and approved-challenge completion require a trusted origin. Logout also validates origin. Cookie configuration is environment validated. | Local tests verify middleware behavior, not deployed proxy/CORS/DNS correctness. |

## Authorization and realtime controls examined

`authenticate` resolves current `EligibilityService.decisionFor` and then enforces a generated route capability catalog. An authenticated route without a reviewed authority is denied; no capability or missing decision does not grant access. Restricted identities have exact security, assurance and data-rights routes. Moderation-restricted identities retain a narrower rights/security set. Report submission has an explicitly classified safety authority. Generated authenticated-route mapping and every client socket event have executable coverage in `eligibility-boundaries.integration.test.ts`.

Socket.IO checks trusted browser origin before identity work, requires a signed access token, validates the strict Redis device session and DB auth-version, and checks current eligibility. Each admitted event uses an allowlisted strict schema, payload and burst limits, shared budgets and a fresh capability decision. Per-recipient dispatch checks token expiry, active session and capability around asynchronous hydration and delivery guards. Conversation/contact membership and RTC target authority have separate guards. Existing `socket-security.test.ts` exercises consent/device withdrawal, contact withdrawal, receipt preferences, expiry during payload/guard awaits, malformed events and room membership. Those tests passed locally; no production socket proxy was changed.

Database access inspected in these paths uses Drizzle/parameterized SQL. This is evidence for the inspected queries, not a claim that arbitrary unreviewed SQL or all application routes are safe. Source review of payment/media paths found server pricing, buyer/seller ownership, feature gates, signed/encrypted webhook inbox handling, idempotency and amount/currency checks, and media owner/publication locks, decoder bounds and authenticated delivery. No additional payment/media defect was confirmed by that review. Their gate is PARTIAL until database/provider-mock and decoder regressions execute; live provider operation is BLOCKED until independently verified. Media, content ownership, payment and deletion results are covered in the companion audit reports and consolidated execution record.

## Reproducible scoped verification

From `api-server`, using `NODE_ENV=test`, a disposable localhost PostgreSQL URL and Redis at `127.0.0.1:16379`:

```powershell
node --import tsx --test src/__tests__/totp-replay-security.test.ts src/__tests__/ai-eligibility-security.test.ts src/__tests__/auth-google-security.test.ts src/__tests__/eligibility-policy.test.ts
```

Result: 35 executed, 35 passed, 0 failed, 0 skipped, 0 cancelled; 4.85 seconds. This selection uses injected repositories/provider mocks and does not establish live provider or database integration.

```powershell
node --import tsx --test src/__tests__/socket-security.test.ts src/__tests__/auth-session-origin.test.ts src/__tests__/auth-request-enumeration.test.ts src/__tests__/auth-controller-error.test.ts src/__tests__/trusted-origin.test.ts src/__tests__/diagnostics-auth.test.ts src/__tests__/metrics-auth.test.ts src/__tests__/eligibility-boundaries.integration.test.ts src/__tests__/eligibility-features.integration.test.ts
```

Result: 50 executed, 50 passed, 0 failed, 0 skipped, 0 cancelled; 7.39 seconds. Despite two filenames ending in `integration`, the eligibility checks in this selection inject authority/repository fixtures. The socket tests open local HTTP/WebSocket servers and use the local Redis adapter; expected denial/cleanup warnings occurred. This is not a production connectivity check.

```powershell
node ../node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
```

Result after the documented baseline repairs: exit 0. Scoped total: 85 distinct tests passed. Do not add this count to a subsequent full-suite count that includes the same tests.

After the first full integration run exposed the three stale message fixtures in TEST-01, the focused database regression used the exact disposable URL `postgresql://audit@127.0.0.1:55432/yor_backend_audit` and the isolated Redis URL above:

```powershell
node --import tsx --test --test-concurrency=1 src/__tests__/disappearing-message.test.ts src/__tests__/message-service.test.ts
```

Result: 17 executed, 17 passed, 0 failed/skipped/cancelled; 5.44 seconds, recorded in `evidence/message-fixture-regression.txt`. An earlier attempt used the placeholder `postgres` role from the mock-only command, which this disposable cluster does not contain: it reported 4 passes and 14 connection/hook failures, with PostgreSQL `28000` (`role "postgres" does not exist`). That infrastructure invocation was corrected to the audit role; no production configuration or account was accessed. These focused results supersede the three corresponding first-full-run failures only, not unrelated failures or skips. The consolidated report records the final complete run.

ENT-01 regression:

```powershell
node --import tsx --test --test-concurrency=1 src/__tests__/feature-entitlement-timezone.integration.test.ts src/__tests__/premium-foundation.test.ts
```

Result after fix: 9 passed, 0 failed/skipped/cancelled; 2.19 seconds. The six timezone scenarios use checked-out connections and private TEMP shadows only; they preserve the caller timezone and discard their tables before releasing the connection. The pre-fix run failed specifically because the future administrative denial was lost, establishing the authorization impact. The premium access interval columns are `timestamptz` in `migrate-premium.mjs`; the same naive-expiry defect was not found in those columns.

## API behavior relevant to the frontend owner

- `POST /api[/v1]/ai/chat` (`{message}`), `POST /api[/v1]/ai/moderate` (`{text}`), and `GET /api[/v1]/ai/search?q=...` can return HTTP 403 with `errors: ["capability_unavailable"]` when current authority changes during the request. No generated or search result is returned. Clients should clear pending results and refresh eligibility.
- All TOTP-bearing login/setup/disable routes require a fresh, unused code. An immediately repeated code receives the existing invalid-second-factor response; no new client field is required. After setup confirmation, a subsequent direct TOTP login must wait for the next authenticator code. Already authenticated device approval remains available according to existing policy.

No frontend-owned files, production accounts/providers, billing settings or production databases were modified. Release remains blocked until live authority/provider and infrastructure gates in the companion reports have independently verified evidence.
