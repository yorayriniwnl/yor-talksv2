# Email Unsubscribe and Messaging Audit

Audit date: 2026-10-18 (Asia/Calcutta). Requirement 18 reviewed against actual server call sites. No real recipients or live Resend credentials were used.

## Category inventory

| Category | Implemented sender | Purpose / handling |
| --- | --- | --- |
| Password reset | `EmailService.sendPasswordResetEmail` from `AuthService.requestPasswordReset` | Essential account recovery; one-hour, single-use, hashed DB token; dispatch throttle; token cancelled after provider rejection |
| Email verification | `EmailService.sendVerificationEmail` from `AuthService.requestEmailVerification` | Essential account ownership proof; 24-hour hashed Redis mapping; resend throttle; mapping removed after rejection |
| Email sign-in OTP | `EmailService.sendEmailLoginCode` from `AuthService.requestEmailOtp` | Essential authentication; five-minute code state, atomic attempt/claim, dispatch reservation and rollback on rejection |
| Security warning / essential service bulletin | No additional email sender found | Security events and notifications use logs, in-app/push/socket paths; do not infer an email category from UI wording |
| Marketing / newsletter / promotional campaign | No server sender, route, worker or provider campaign integration found | Not currently sent; waitlist storage alone does not send messages or demonstrate marketing consent |

Evidence: source search for `sendEmail`, all three typed helpers, `unsubscribe`, `marketing`, `newsletter` and `promotional` across `api-server/src` and `lib/db/src`; only `auth-service.ts` invokes actual send helpers. `sendEmail` is a public internal primitive, not an HTTP endpoint.

Requirement 18 is **PASS for the current transactional-only backend scope**, with no marketing suppression path to exercise. This does not establish compliance for a future promotional sender or any campaign configured directly in a provider account. Provider-console campaign state was not inspected.

## Findings and implementation

| ID | Severity | Component | Root cause | Fix | Test | Evidence | Remaining risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EMAIL-01 / PRIV-03 | P3 | Dispatch logs | Each result logged a deterministic 16-hex email hash and simulated messages also logged HTML size; the correlation was unnecessary and hash values can be guessed from known addresses | Remove address-derived identifiers and body-size metadata; keep static success/simulation outcome and numeric failure status | Five email-service cases pass, including capture of actual logger calls and known address hash exclusion | `services/email-service.ts`; `__tests__/email-service.test.ts` | Log platform retention and provider retention not independently verified |
| EMAIL-02 | Informational prerequisite | Any future marketing sender | No consent, suppression, unsubscribe token, campaign idempotency or preference persistence exists because marketing is not implemented | No marketing service enabled; specify prerequisite API contract below | Not applicable to current sender; future acceptance tests required | No matching production call sites | Do not reuse the unrestricted internal transactional primitive to launch marketing |

## Verified transport behavior

`sendEmail` posts only `from`, `to`, `subject`, `html`, and optional plain `text` to the fixed HTTPS Resend endpoint, with a bearer credential from environment configuration. `fetchWithTimeout` bounds request/body time and response size. Production without key/from configuration throws instead of claiming success. Development/test without a key explicitly simulates delivery. Provider non-2xx responses produce an error containing only the numeric status; response bodies, recipient address, credentials, links and OTP-bearing subjects are excluded from application logs. The patch does not alter authentication message delivery based on notification preferences.

There is no automatic email retry queue in the current service. A timeout may occur after provider acceptance, so an application retry may send a duplicate message. Current credential reservations and single-use expiry constrain use; production delivery and bounce handling still require provider-side evidence. No `List-Unsubscribe` header is added to authentication mail. No marketing suppression is applied to recovery/verification/security messages.

## Required contract before promotional delivery

This is a proposed future interface, not a claim that these routes exist and not a frontend change in this patch.

* Authenticated `GET /api/users/me/email-preferences` should return `{ marketing: boolean, updatedAt, consentVersion }` without exposing another account's address.
* Authenticated `PATCH /api/users/me/email-preferences` should accept only `{ marketing: boolean, consentVersion }`. Set the subject from authentication, validate consent version, preserve an auditable receipt, and make a withdrawal effective before the next dispatch/retry.
* `POST /api/email/unsubscribe` should consume an opaque, purpose-scoped, cryptographically protected token or high-entropy persisted-token hash, idempotently set marketing suppression and never affect security mail. Account IDs/email query parameters must not authorize unsubscribe by themselves. Handle one-click unsubscribe and expiry/reissuance deliberately; a crawler GET should not accidentally create consent.
* The promotional sender must check current suppression at final dispatch and every retry, use campaign-recipient idempotency, redact all tokens/addresses, add provider-supported unsubscribe headers/link, enforce limits and handle bounce/complaint signals. Store suppression with a reviewed minimum identifier and retention purpose.

Acceptance tests must prove cross-account preference changes fail; tampered/wrong-purpose tokens fail; repeat withdrawals are safe; queued/retried campaigns cannot bypass withdrawal; marketing opt-out still permits OTP/reset/verification; unsubscribed addresses never appear in logs; and provider-mocked requests contain required headers. The frontend owner can implement a preference screen after this backend contract exists. No live campaign may be inferred as authorized by this audit.

## Reproducible verification

From `api-server`, with `NODE_ENV=test` and no live provider keys:

```text
node --import tsx --test src/__tests__/email-service.test.ts
```

Result: **5 passed, 0 failed, 0 skipped**. Tests cover simulation log privacy; the actual mocked provider request for all three categories; error/log privacy on provider rejection; and production missing-credential failure. This is mock transport evidence, not actual deliverability, domain/DKIM/SPF validation or provider campaign evidence.
