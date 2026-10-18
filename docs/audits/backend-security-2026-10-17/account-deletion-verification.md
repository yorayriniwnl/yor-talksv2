# Account Deletion Verification

Audit date: 2026-10-18 (Asia/Calcutta). Requirement 20. All executable verification uses disposable synthetic identities, local PostgreSQL/Redis and provider mocks. No production account or provider object was deleted.

## Contract and authorization

`DELETE /api/users/me` authenticates the current account and validates a password confirmation body. The controller supplies only `req.user.id` to the lifecycle service; the route has no target account ID. Incorrect passwords produce 401. A missing/deleted account returns 404. Successful deletion clears the refresh-token cookie and returns the existing success envelope. An already-running second request that finds the user absent cannot delete another identity.

`AccountService.deleteAccount` compares bcrypt before acquiring a row lock, then checks that the locked password hash still matches the one confirmed. This prevents a password change between confirmation and deletion from using stale credentials. Database changes and enqueue of the cleanup job occur in one transaction; database failure rolls them back together. Subsequent authentication must still resolve the user row, so surviving token bytes do not grant an account after its row disappears.

## Findings

| ID | Severity | Component | Root cause | Fix | Test | Evidence | Remaining risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DEL-01 / PRIV-01 | P2 | Waitlist | Independent email row did not cascade with account deletion | Erase only addresses proved by the locked account's verified email, case-insensitively, in the transaction | New verified/unverified cases in `account-service.test.ts` | `AccountService.deleteAccount`, waitlist schema and export ownership predicate | Unattributed guest records require verified support handling |
| DEL-02 / PRIV-02 | P3 | Redis cleanup | Pending setup/OTP credentials were omitted from durable cleanup | Remove encrypted setup state; use hashed address locator and atomic stored-user check for email OTP; strict dependency errors preserve retry behavior | `account-credential-cleanup.test.ts`: 4/4 pass; account-integrity payload assertions | `cleanAccountSessions`, `deleteEmailOtpForUserStrict` | Email verification mappings expire within 24h; old jobs have no address locator; bounded TTL remains the fallback for races |
| DEL-03 / PRIV-04 | P2 release gate | Legacy media, independent records, provider/backup copies | Account DB transaction cannot prove legacy URL ownership or physical erasure outside this database | Canonical cleanup stays retryable; ownership holds are retained rather than deleting arbitrary URLs; required evidence below | Canonical cleanup/provider-mock tests; live erasure not performed | `media_cleanup_holds`, media lifecycle service, backup script | Full lifecycle erasure is PARTIAL until policies, ownership review, provider records and restore replay are verified |

Repeated PRIV/DEL IDs describe the same findings and must not be double-counted in global totals.

## Transactional coverage

| Domain | Observed deletion behavior | Verification source |
| --- | --- | --- |
| Profile / credentials | Remove user row, password reset rows and normalized dependent records by FK behavior; setup secret removed by durable Redis cleanup | Account service and credential tests |
| Guardian authority | Bump affected child/enrollment revisions and record revocation before guardian reference becomes NULL, so an older grant cannot reappear | Account service SQL; eligibility tests in the full backend run |
| Ledger / orders | Null departing financial account IDs, keep immutable settlement/provider references; clear buyer shipping name/address/phone and payer message; minimize seller product snapshot | Account integrity and payment-dispute tests |
| Subscriptions | Cancel creator/subscriber subscriptions and revoke associated subscription entitlements | Account service transaction; payment tests |
| Posts / authored messages / relationships | Delete owned rows by FK and explicit authored-message deletion; remove deleted actor from reactions, liked-by arrays, block/mute lists, guest IDs, community moderator/request lists and embedded discussions | Account integrity tests |
| Shared direct/group conversation history | Null direct legacy references and remove JSON participant; rebuild group legacy pointers from surviving normalized members; preserve other authors' messages; revoke/prune affected invitations; empty groups removed | Account integrity group/direct cases and message-service cases |
| Reply / forward links | Null links to erased authored messages before deletion | Group deletion cases |
| Notifications / queue | Delete notices attributed to departing actor/channel; queued deliveries resolve canonical row rather than restoring copied payload | Account integrity and notification worker tests |
| Media | Delete content references transactionally; last-use trigger schedules canonical cleanup; leases, fencing and retry handle provider errors; legacy references enter ownership-review holds | Media publication/lifecycle tests |
| Sessions / approvals / OTP / TOTP setup | Best-effort immediate session invalidation after commit; durable worker uses strict Redis operations; a failed dependency retries; new-account OTP at the same email survives an old job | Account service + new cleanup suite |
| Waitlist | Verified email ownership permits erasure; unverified account claim alone does not | New waitlist deletion cases |

Durable `background_jobs` uses unique deduplication keys, `FOR UPDATE SKIP LOCKED` claims, lease tokens, backoff and visible exhausted-attempt state. A crash after successful provider work but before completion is handled by idempotent operations. Successful job completion clears its JSON payload. Pending/dead jobs retain the minimum user/hash locator needed for retry and require monitored operational resolution; terminal row/dedup-key retention has no universal expiry policy.

The email locator is SHA-256 of normalized address, not anonymization. It is an internal transient lookup only, never logged or exported. Worker deletion compares `state.userId` atomically; a new account that reuses the same address retains its own OTP. TOTP replay claims are deliberately left to their 90-second security TTL.

## Exceptions and unverified erasure

* Retained financial order, dispute, audit and ledger records support reconciliation. Account references and selected free-text/shipping fields are erased, but provider IDs and reference IDs remain. Required retention duration and lawful purpose must be approved; this audit invents no statutory period.
* Surviving authors retain their own messages and shared conversation context. Deletion removes the departing author's messages and explicit identity arrays, but cannot infer or erase every human-written mention in another person's text.
* `media_cleanup_holds` intentionally retains deletion UUID, source identifiers and legacy references for ownership review. There is no automated resolver for these holds. Canonical media provider deletion does not prove deletion of arbitrary preexisting URLs, CDN/provider backups or moderation provider copies.
* Unbound grievance/enrollment records cannot safely be attributed from an account email. Guest access/deletion requests need a separately authenticated support process; no blanket deletion by supplied email was introduced.
* Redis verification mappings contain only a hashed token key and account UUID, expire in 24 hours and cannot update a missing user. There is no reverse token index for immediate erasure. In-flight auth requests can repopulate short-lived state after a cleanup scan; their TTLs and user lookup remain necessary boundaries.
* Encrypted historical backups retain pre-deletion data until backup expiry. No verified remote expiry or deletion journal/replay-before-restore procedure was available. A restore must remain isolated from application traffic until outstanding deletion requests have been reconciled.
* Provider-side email delivery logs, Cloudinary storage/CDN backup copies, assurance evidence, observability stores and payment records require provider-specific retention/erasure evidence. Source code and mocks alone cannot establish physical erasure.

## Tests and current result

The final serial run (`evidence/api-full-suite.txt`) passes credential cleanup **4/4**, export **9/9**, export HTTP **3/3**, account service **5/5**, account integrity **10/10**, and email **5/5**: **36 passed, 0 failed, 0 skipped** across these six files. The initial Redis 3.0.504 queue failure remains recorded in `evidence/api-full-suite-initial.txt`; a separate disposable Redis 5.0.14.1 instance allowed real queue and worker verification. The complete final API run is **593 passed, 0 failed, 0 skipped**. Production Redis 7, provider erasure and restoration acceptance remain separate gates.

Relevant reproducible command, from `api-server` with synthetic `DATABASE_URL`, `REDIS_URL` and `NODE_ENV=test`:

```text
node --import tsx --test --test-concurrency=1 src/__tests__/account-credential-cleanup.test.ts src/__tests__/account-service.test.ts src/__tests__/account-integrity.test.ts src/__tests__/account-export.test.ts src/__tests__/account-export-http.test.ts
```

Requirement 20 release gate: **PARTIAL**. Local transactional account removal, shared-history integrity and safe retry are testable; complete external/legacy/backup erasure remains blocked on the evidence above. No production release approval follows from this report.
