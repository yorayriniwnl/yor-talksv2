# API Privacy Enforcement Design

**Status:** Draft for review
**Scope:** First workstream of the approved Yor Talks V2 privacy remediation

## Goal

Make API access to profile visibility, grievance status, and expired messages match the privacy expectations exposed by the product, while reducing public response fields to what the current UI uses.

## Context

The source review found three access-control gaps in existing flows:

1. `GET /reports/grievance/:ticketId` is intentionally public, but currently removes only reporter email and description before returning the rest of the database row. Grievance submission also returns that full row. The tracker UI renders the ticket ID, status, received date, SLA date, and an internal `officerNote`.
2. `/users/search` and `/search` filter contact shields, but do not consistently apply `profileVisibility`. Direct profile lookup does. `ContentSafetyService.canViewAuthorContent` also treats `private` and `followers` alike, allowing followers to see content for accounts whose profile is private.
3. Message list queries exclude expired messages, but ID lookup does not. An authenticated conversation participant can use the seen endpoint to receive an expired message row; other ID-based operations and reply/idempotency paths also depend on that lookup.

This is the first subproject in the previously reviewed staged scope. Account export/deletion, provider media cleanup, grievance lifecycle, queue retention, general log retention, and AI-provider disclosures remain separate follow-on workstreams with their own design and implementation plans.

## Design

### Grievance status

- Keep anonymous grievance submission and public status lookup.
- Define one public status projection containing only `ticketId`, `status`, `createdAt`, and `slaDeadline`. Use it for both the submission acknowledgement and public status response.
- Do not return the database UUID, category, reported URL, reporter name, reporter email, description, or `officerNote` from either public response. Preserve full records for the existing authenticated moderator queue.
- Replace the tracker’s officer-note rendering with neutral progress text based on status. The current contract has no separate reviewer-authored public note field.
- Generate new ticket IDs with 32 uppercase hexadecimal characters after `YT-GRV-` (UUID-derived randomness). Continue accepting the current 10-character form so existing tickets remain trackable.
- Redact the ticket ID from request-path logs for the grievance status route because the ID is the public lookup capability. Keep the existing rate limiter.

### Profile visibility and search

- Use one server-side `profileVisibility` policy for direct profile reads, `/users/search`, `/search`, and content filtering by author. Preserve the existing fallback from `settings.privateAccount` when `privacy.profileVisibility` is unset. Keep block, mute, and contact-shield checks as separate existing safety gates.
- `public` profiles are visible subject to those existing safety gates; `followers` profiles are visible only to accepted followers and the owner; `private` profiles are visible only to the owner.
- Ensure both search endpoints apply the policy before serializing users. Preserve viewer-specific search caching.
- Return only `id`, `username`, `fullName`, and `avatarUrl` in search-user results; these are the fields consumed by the current search, messaging, onboarding, and close-friends UI. Keep the broader public-profile projection for profile views that use additional fields.
- Apply the same private-versus-followers distinction when deciding whether authored content is visible, so the “profile and posts” setting has consistent server behavior. Preserve the existing content-rating, block, and mute checks.

### Message expiry

- Treat `deletedAt IS NOT NULL` and `expiresAt <= now` as unavailable in message-by-ID reads used by user-facing operations.
- Mark-seen, edit, delete, reaction, pin, reply-target, and idempotent retry flows must not return a deleted/expired message payload, create a read receipt, or emit a message update for an unavailable row.
- If an idempotency key collides with an already deleted/expired row, fail through the existing generic forbidden/key-in-use response rather than returning the stored row. Mutations must include availability in the database predicate so a message that expires between lookup and update is not returned.
- Existing conversation list and last-message filters remain in place. Physical deletion/purging of expired content is outside this subproject and belongs to the data-lifecycle workstream.

## Constraints and non-goals

- Do not access production services or real user data.
- Do not change anonymous grievance intake or add a database migration in this subproject.
- Do not expose reviewer notes as public notes; a separately designed public-note field is out of scope.
- Do not claim expired message rows are physically erased; this work only closes API access paths.
- Do not choose legal retention periods or make legal conclusions.
- No new runtime dependencies.

## Acceptance criteria

1. Public grievance creation and tracking responses contain exactly the four approved status fields; moderator queue responses continue to contain operational fields.
2. New ticket IDs use the longer format, while existing 10-character IDs remain accepted. Grievance status request logs omit the submitted ID.
3. A user who cannot view a profile through the direct profile policy cannot discover it through either search endpoint. A private profile’s authored content is not returned to another account; accepted followers can see followers-only profiles/content as configured. Existing block, mute, contact-shield, and content-rating gates remain effective.
4. Search-user response objects contain only the fields used by search UI, and the UI no longer renders internal officer notes.
5. Deleted or expired message IDs do not yield message content, read receipts, or message update events through user-facing operations, including retry, reply, reaction, and pin paths. An expired message that races a mutation remains unavailable.
6. Search caching remains partitioned by viewer so a visibility-filtered result is never reused across accounts.

## Source areas reviewed

- `api-server/src/routes/reports.ts`
- `api-server/src/services/moderation-service.ts`
- `api-server/src/validators/grievance.ts`
- `api-server/src/app.ts`
- `social/src/pages/grievance.tsx`
- `api-server/src/services/user-service.ts`
- `api-server/src/services/search-service.ts`
- `api-server/src/services/content-safety-service.ts`
- `api-server/src/controllers/search-controller.ts`
- `api-server/src/repositories/user-repository.ts`
- `api-server/src/repositories/message-repository.ts`
- `api-server/src/services/message-service.ts`
- `social/src/lib/api-client.ts`
- Search-user consumers in `social/src/pages/explore.tsx`, `messages.tsx`, `settings.tsx`, and `onboarding.tsx`
