# Private chats: implementation and limits

21 October 2026. This describes the local implementation, not a production deployment or an independent security audit.

## What people can use

`/private-messages` is a separate one-to-one conversation mode. Both people must have an eligible account, an accepted contact connection, and a registered private-chat identity. Existing blocking and message-permission restrictions apply to reading and sending. Standard messages remain a separate feature and are explicitly labelled as server processed; their history is not retroactively encrypted.

The browser creates an OpenPGP v6 Ed25519 signing key and X25519 encryption subkey using pinned `openpgp@6.3.2`. Text and files are signed and encrypted on the sender's device for the two participants. The signed application envelope binds the message ID, thread ID, sender and complete participant list. The receiving browser validates that context and the sender's signature before displaying content.

Before reading or sending, the user must enter the other person's fingerprint obtained through an independent trusted channel. A directory lookup by itself does not establish identity. A missing or mismatched saved fingerprint stops content loading; substituted directory keys cannot silently replace a verified contact.

Limits are 4,000 text characters and one file up to 512 KiB per message. Attachments, including their filenames and media types, are inside the encrypted payload. Received files are downloaded as binary files rather than rendered as active HTML or SVG.

## Keys and recovery

- The API receives public keys and opaque encrypted messages. It has no private-key, passphrase or readable-content field.
- A recovery JSON file contains the passphrase-encrypted private key. Registration requires downloading it and acknowledging recovery responsibility.
- Protection uses the library's standard iterated-and-salted S2K with count byte 224. The setup requires a separate passphrase of at least 16 characters and 8 distinct characters; random words are recommended. It does not require an unsafe-eval or WebAssembly CSP exception.
- An encrypted copy of the recovery file remains in this browser's local storage, scoped by account. Private keys are unlocked only in memory. Messages, passphrases and decrypted attachments are not persisted by this mode.
- Explicit lock, logout, account change, leaving the page, and 60 seconds in the background discard the unlocked key. In-flight operations cannot publish their result after locking.
- Another device requires importing the same file and entering its passphrase. An account password reset cannot recover the private key. The API does not permit identity replacement.

## Server boundary

The additive `private_chat_identities`, `private_chat_threads` and `private_chat_envelopes` tables store public identities, the participant pair and encrypted envelopes. The release migration installs immutable-key, immutable-message and participant constraints. Ordinary message moderation, AI providers, media providers, search, sockets and notification previews are not used for this mode.

The API validates the supported encrypted outer packet structure and binds its two recipient key IDs to the thread's registered keys. It cannot validate the inner plaintext. Clients must still reject unsigned, corrupted, misaddressed or otherwise invalid encrypted payloads.

Armor validation preserves the original encrypted packet bytes. OpenPGP.js may change partial packet-length encodings when serializing large messages, so those rewritten bytes are not compared with the submitted ciphertext. Single-block armor, packet grammar, recipient binding and complete packet consumption are still checked; extra plaintext, armor headers and concatenated messages are rejected.

Authentication, messaging eligibility, active accounts, accepted contact relationships, blocks and applicable follower restrictions are checked by the service. Transactions and relationship locks protect the authorization boundary. A retry with the same message ID and identical ciphertext returns the original message; reusing an ID for different bytes fails. Cursor pagination is scoped to a thread and bounded by both item count and a 4 MiB response payload budget.

Responses use `Cache-Control: no-store`. Requests do not add plaintext to logs. Account exports include participant ciphertext and the requesting person's public identity, not secret recovery material. Account deletion cascades the private identity, its direct threads and their stored envelopes; deletion replay through the existing user erasure path has the same cascades. Files already downloaded by a participant remain outside server control.

## Deployment checks

The database readiness probe requires release marker `20261020-private-chat-1`, the relay columns readable by the application role, enabled integrity triggers, validated checks and usable indexes. A missing or incomplete migration returns HTTP 503 with the existing generic dependency error; it does not expose SQL errors or read message contents. Replica-only triggers do not satisfy this check.

Run the reviewed production migration with the migration-owner connection and the separate application-role configuration before routing traffic to this build: `corepack pnpm --filter @workspace/db migrate:production`. The runtime connection must remain the restricted application role. The migration is additive; rolling back an application build must not drop the private-chat tables or discard stored identities and ciphertext.

`ops/smoke-test.mjs` also checks anonymous GET requests to the private identity and thread-list endpoints at both `/api` and `/api/v1`. All four must return the API's 401 JSON rejection with `Cache-Control: no-store`. Missing routes, HTML fallbacks, redirects, cacheable errors and oversized or malformed responses fail the check. This smoke check creates no account, key or message; authenticated relay behavior is covered separately by the HTTP integration tests.

## Important limits

This version does not provide forward secrecy, automatic key rotation, groups, calls, server recovery, disappearing messages or private-chat push notifications. Compromise of a participant's long-lived key can expose retained history. An unlocked or compromised device, malicious browser extension, or compromised web application can expose readable content. A web application cannot claim protection from all future changes to the code it delivers.

The service still sees accounts, contact relationships, public keys, thread membership, timing and ciphertext sizes. Encryption does not make this metadata anonymous. Participants may copy or disclose content themselves, including when choosing to submit a report.

There is no automatic plaintext fallback. A failed delivery can be retried with the original encrypted envelope or dismissed locally. Dismissal does not retract a message that may already have reached the recipient.

India hosting and backup residency require deployment/provider evidence. EU legal compliance requires approved policies and operational review. This implementation establishes neither of those facts; the existing release gates remain in force.

## Verification

The automated suites exercise actual cryptography, not mocked encryption:

- `tests/private-chat-crypto.test.mjs`: key generation, recovery, participant decryption, signatures, replay context, tampering, malformed keys, attachment limits and locking.
- `e2e/private-chat.spec.ts`: two isolated browsers, recovery download before registration and subsequent file import, fingerprint checks before reading/sending, encrypted text and file delivery, lost-receipt retry, tampered records, wrong recovery passphrases, locking, revoked/restored access and dismissing an uncertain delivery. Network assertions reject readable sentinel text, filenames, passphrases and private-key material.
- Backend private-chat tests: authorization, real container validation, immutable identity, idempotency, pagination, current relationship restrictions and HTTP validation. A bundled copy of the actual browser crypto implementation sends a 512 KiB file through HTTP and PostgreSQL; both participants decrypt it and exact retries retain one record.
- `private-chat-release.integration.test.ts`: missing migration metadata and twelve injected schema faults fail readiness; repeated migrations preserve real keys and decryptable ciphertext, and account deletion retains its cascades. Fixtures use isolated, rolled-back schemas.
- `tests/private-chat-smoke.test.mjs`: routing, cache-policy, response-size and timeout failures cannot produce a successful deployment smoke result. The same smoke helper also runs against the actual API router in the HTTP integration suite.
- `account-export.test.ts`: only participant envelopes and the subject's public identity appear in the private-chat export. Consent history, rights-request status, addressed moderation notices and the subject's appeals exclude other people's records, verification material and internal review notes.

### Completed local verification — 21 October 2026

- 13 cryptography tests and four deployment-smoke regression tests passed.
- 35 backend tests passed against isolated PostgreSQL 17 using the restricted `private_chat_app` role, including private-chat, export, schema readiness and the smoke helper against the real router. `runtime-role.log` confirms the test role has no superuser, role-creation, database-creation, RLS-bypass or public-schema creation privileges.
- Three additional migration integration tests passed, including twelve injected schema faults, repeated upgrades with retained ciphertext, decryption after upgrade and deletion cascades.
- All 33 production-browser cases passed again after the dependency patches: 19 preregistration cases, 11 app-demo cases and three private-chat cases. The private-chat cases cover recovery/import and restored access. Private-chat browser requests use fixtures; the separate HTTP interoperability case above uses the real relay and database.
- The production migration succeeded on a fresh isolated database and on reapplication, including the new private-chat schema and runtime-role grants.
- Both frontend and backend TypeScript checks, the API production build, the frontend production bundle used by Playwright and both API contract checks passed. The contract contains 277 operations across 232 paths; 255 generated React/Zod artifacts match. The production environment wiring check passed.
- Vite 7.3.7 and markdown-it 14.3.3 replace the vulnerable build-tool versions. The final all-scope dependency audit reports zero known vulnerabilities. This is a dependency database check, not an independent application audit.
- Landing screenshots were inspected at desktop and mobile sizes. The browser suites cover narrow-screen layout, keyboard access and accessibility scans.

The latest logs and dependency-audit JSON are in `test-results/private-chat-release-postgres`, with browser output in `test-results/private-chat-release-browser`. These ignored artifacts contain synthetic test data. The 88 passing tests do not establish production infrastructure readiness: HTTP authentication used the available Windows Redis 3.0.504 instance, while production and CI specify Redis 7; Docker/container and background-worker acceptance were not run locally. Nothing was deployed, and no independent security audit was performed. The hosting target, its migration and its operational smoke checks remain outstanding; see [Release gate status](RELEASE_GATE_STATUS.md).

The library and format are documented by [OpenPGP.js](https://github.com/openpgpjs/openpgpjs) and [RFC 9580](https://www.rfc-editor.org/rfc/rfc9580). These references describe the underlying format; they are not an audit of Yor Talks.
