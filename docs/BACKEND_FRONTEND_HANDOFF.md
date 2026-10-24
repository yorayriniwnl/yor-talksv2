# Backend integration handoff - 22 October 2026

The user excluded frontend implementation. This file records integration still
needed to expose the repaired backend workflows. It does not change the UI.
The authoritative contract is [OpenAPI](../lib/api-spec/openapi.yaml); React and
Zod clients are generated from it with `pnpm contract:clients:generate`.

## Privacy verification page

Transactional challenge email currently links to
`/privacy/verify?token=<proof>&purpose=<purpose>` at `CLIENT_ORIGIN`. That browser
page is not implemented in the inspected frontend and must be provided before
advertising this end-to-end email workflow.

| Step | API call | Expected handling |
| --- | --- | --- |
| Request proof | `POST /api/privacy/challenge` with `{email, purpose}` | Show the generic receipt; do not infer whether an account or reservation exists. Purposes: `access`, `correction`, `restriction`, `objection`, `erasure`; default is `access`. |
| Inspect proof | `POST /api/privacy/verify` with `{token}` | Read `data.valid` and `data.purpose`. Use the server-returned purpose; the URL purpose is display context only. This call does not consume the proof. |
| Execute | `POST /api/privacy/request` with `{token, requestType, details?}` | `requestType` must match the proof. Correction accepts `details.preferredUsername`; an optional `details.reason` is at most 500 characters. Display the returned outcome. |
| Expired/used proof | Verification or execution returns 400 | Offer a new challenge; do not automatically repeat a destructive request. |
| Active account erasure | Execution returns 409 with `authenticated_login_required` | Direct the person to authenticated account deletion. An email link cannot erase an active account. |
| Temporary dependency outage | 503 with `privacy_unavailable` | Show a retry state without exposing server/provider internals. |

Keep the proof in page memory, remove it from browser history after reading it,
and exclude it from analytics, logs, referrers and persisted client caches. Use
`Referrer-Policy: no-referrer` on the page as well as the API. Do not execute a
rights mutation automatically when an email scanner or person opens the link.
Verification is safe to repeat; successful execution is single-use.

## Restricted accounts and moderation

Authenticated users retain access to their own notices, acknowledgement and
appeal operations while processing or moderation restrictions apply. Use
`GET /api/moderation/appeals/mine` for the person's appeal history. Public review
rationale is separate from staff notes. Do not display a guessed appeal deadline
or suggest acknowledgement waives the ability to appeal. Handle stale review
conflicts by refreshing current state.

Deleted/expired standard messages return no readable body, attachment, reaction
or preview. Retried sends can return a tombstone with the original message ID.
Preserve this behavior in client reconciliation instead of interpreting an empty
body as an unsent message to recreate with a new ID.

## Deployment verification

`node ops/verify-deployment-boundary.mjs` checks API/worker readiness, unauthenticated
private routes and realtime origin/authentication boundaries. Optional login,
rotation and logout checks require an explicit target plus a dedicated test
account through `SMOKE_AUTH_ENABLED`, `SMOKE_LOGIN_IDENTIFIER` and
`SMOKE_LOGIN_PASSWORD`. Supply these through the environment; never put real
credentials in source or reports. API checks alone do not certify the frontend,
provider callbacks or capacity.
