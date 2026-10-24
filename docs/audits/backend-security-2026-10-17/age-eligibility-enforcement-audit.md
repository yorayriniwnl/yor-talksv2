# Age and Eligibility Enforcement Audit

Requirement 17 reviewed against private backend authority, direct HTTP requests and Socket.IO events. Assignment date: 2026-10-17; execution: 2026-10-18. Evidence is source inspection and disposable synthetic tests. No real child account, real guardian identity or live age-assurance provider was activated.

## Finding

| ID | Severity | Component | Root cause | Fix | Test | Evidence | Remaining risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AGE-01 | P2 | AI request revocation boundary | AI route handlers retained admission-time authority across provider/context/search awaits. | Recheck current `ai` capability before outbound provider calls and before returning generated or hydrated search data. Handle current denial as static HTTP 403. | Five new HTTP tests covering both API prefixes, denied admission, provider/context/search revocation, safe authority outage and authorized success. | `api-server/src/routes/ai.ts`, `ai-eligibility-security.test.ts`; 5/5 pass. | An earlier outbound provider request cannot be retracted. Production AI stays unavailable without adult authority, approved policies and its release flag. |

## Backend authority model

| Boundary | Verified behavior | Evidence |
| --- | --- | --- |
| Registration | An authorized enrollment and nonce are consumed and bound transactionally. Old age checkboxes are not authoritative proof. | `AuthService.register`, `eligibility-enrollment-service.ts`; enrollment fixtures/tests in the full integration selection. |
| Assessment | Missing, rejected, revoked, expired, future, contradictory or incomplete proof does not activate an account. Proof must be bound to the account and include issuer, method, evidence reference and a valid interval. | `eligibility/policy.ts`; `eligibility-policy.test.ts` passed locally. |
| Territory and operator | All applicable recipient and operator policies intersect. Trusted/declarative territory conflicts, missing operator policies, stale policy versions or withdrawn/unapproved policy deny access. | `applicablePolicies`, `EligibilityService`; policy tests passed. |
| Guardian authorization | Where needed, latest authority per purpose must be granted, unwithdrawn, current, responsibility bound and compatible with notice/policy versions. New withdrawal cannot fall back to an older permissive grant. Equal conflicting revisions deny. | `guardianPurposesCovered`, `guardianCovers`; policy tests passed. |
| Consent versioning | Current terms version and a non-future acceptance instant are independent requirements even when age proof exists. Policy or terms changes alter authority revision. | `evaluateEligibility`, `revisionFor`; policy tests passed. |
| Underage ceiling | Under-13 activation requires guardian authority in addition to approved policy. Teen/adult experience requires consistent threshold assertions. Minors cannot gain adult AI/payment/seller/membership/live/RTC features through guardian approval. | `evaluateEligibility`; policy/feature fixtures passed. |
| Privacy defaults | Synthetic minor settings clamp optional collection/discovery preferences; optional analytics/profiling remain false; minors do not emit sender-visible read receipts. | `eligibility-features.integration.test.ts`, `socket-security.test.ts`; local fixture tests passed. |
| Direct API requests | Every generated authenticated operation has reviewed capability, restricted or safety authority. Missing/malformed/unmapped capabilities deny access. Exact restricted rights routes preserve export/delete/security without opening social features. | `route-capabilities.ts`, `restricted-routes.ts`, `authenticate`; boundary tests passed. |
| Content/media/contact | Separate service paths apply content ceilings, current participants and guardian/contact authority. The media and database-backed scenarios remain part of the full integration evidence, not implied by unit policy results. | Eligibility content/media/contact/group suites; results in consolidated test report. |
| Socket.IO | Admission requires active session/current eligibility. Every allowlisted client event has a capability. Current recipient checks surround asynchronous delivery guards and token expiry. Withdrawal, contact loss or device revocation prevents governed events. | `socket/index.ts`, `socket/policy.ts`; existing socket regression suite passed. |
| Reverification | Expired assessments, stale terms/policy versions, revoked authority and territory conflicts fail closed until fresh approved evidence exists. | Policy tests and current request-time DB reads. |

## Operational gate

The checked-in approved production policy registry is empty (`approvedRegistry: []`) and `loadOperatorPolicyIds()` returns an empty list. Synthetic policies can be registered only for exact fixture users in `NODE_ENV=test`; production registry validation rejects synthetic entries. This intentionally makes production activation unavailable. A legal/provider approval is not implied by successful synthetic fixtures or enabling an environment flag.

| Gate | State | Evidence needed to pass |
| --- | --- | --- |
| Fail-closed policy and route behavior | PASS in scoped synthetic tests | Already supported by the policy, route, feature and socket results below; rerun for every implementation revision. |
| Live territory/operator authority | BLOCKED | Reviewed actual operator establishment and recipient territory policies, explicit approval references, effective/review periods and current notices/terms, checked into the approved registry through review. |
| Live age/guardian assurance | BLOCKED | Accepted provider adapter and contract; signed callback, proof/subject binding, replay/expiry and retention acceptance in an approved isolated provider test environment. |
| Real public minor activation | BLOCKED | Legal and provider acceptance plus end-to-end guardian/contact/content/privacy verification. No real minor was enrolled in this audit. |
| Production API/Socket connectivity | BLOCKED by lack of live verification in this scope | Authorized staging evidence of TLS, trusted origin, cookie, HTTP session, websocket upgrade and current authority withdrawal across nodes. |

## Test evidence and limits

The local scoped selection passed 85 distinct tests with zero failures/skips/cancellations, including 15 eligibility policy cases, seven eligibility feature cases, five route/socket capability catalog cases and the five new AI route cases. Exact commands, total durations and the full selection are recorded in `backend-security-audit.md`. That selection also includes authentication, socket, origin, diagnostics and metrics tests; it is not a count of 85 age-only tests. Database-backed assurance/enrollment/content/media/group tests are separately reported by the full-suite run. Do not count mocked decisions as live assurance or legal approval.

No new database migration or public assurance claim was added by AGE-01. No frontend changes are necessary for enforcement. Frontend acceptance contract: if any protected feature returns `403` with `capability_unavailable`, stop rendering pending private results, refresh `/api[/v1]/users/me/eligibility`, and offer only the server-granted capabilities. An adult-looking profile, old checkbox or cached JWT must never authorize a feature.
