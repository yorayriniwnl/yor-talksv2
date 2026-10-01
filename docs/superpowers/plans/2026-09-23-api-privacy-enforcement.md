# API Privacy Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the confirmed grievance, profile-visibility, and expired-message API disclosure paths in Yor Talks V2.

**Architecture:** Keep grievance submission anonymous while giving public callers a narrow status projection and high-entropy lookup IDs. Centralize the profile-visibility rule and use it in profile, search, and author-content decisions. Make message lookup and mutation conditional on the row remaining undeleted and unexpired.

**Tech Stack:** TypeScript, Express, Drizzle ORM, PostgreSQL, React, existing API client.

**Spec:** `docs/superpowers/specs/2026-09-23-api-privacy-enforcement-design.md`

## Global Constraints

- Do not access production services or real user data.
- Preserve anonymous grievance intake and legacy 10-character grievance IDs.
- Do not add schema migrations or runtime dependencies in this workstream.
- Do not claim that message rows are physically purged; this work closes API access paths only.
- Do not add or run automated tests in this task; run relevant TypeScript typechecks and inspect the changed call paths.
- Keep general account lifecycle, media, queue, retention, and AI-provider changes for their separate approved workstreams.

## Review Focus

1. Public grievance responses must never spread the stored row; both create and status routes use the exact public projection.
2. Legacy ticket IDs still pass validation; new IDs use 32 uppercase hex characters; request-path logs redact the token.
3. `private` and `followers` visibility remain distinct, including the legacy `settings.privateAccount` fallback, and viewer-specific search caches remain partitioned.
4. Search-user DTOs contain only fields read by current search consumers; broader public profile responses retain their existing contract.
5. Deleted/expired messages cannot leak through ID lookups, read receipts, updates, replies, reactions, pins, or idempotency-key collisions.

---

### Task 1: Minimize public grievance disclosures

**Files:**
- Create: `api-server/src/utils/grievance-view.ts`
- Modify: `api-server/src/routes/reports.ts`
- Modify: `api-server/src/services/moderation-service.ts`
- Modify: `api-server/src/validators/grievance.ts`
- Modify: `api-server/src/app.ts`
- Modify: `social/src/pages/grievance.tsx`
- Modify: `social/src/lib/api-client.ts`

**Interface produced:**

```ts
export type PublicGrievanceStatus = Pick<GrievanceTicket, "ticketId" | "status" | "createdAt" | "slaDeadline">;
export function toPublicGrievanceStatus(ticket: GrievanceTicket): PublicGrievanceStatus;
```

- [ ] Add the typed status projection with an explicit field allowlist; do not spread a ticket record into a public response.
- [ ] Generate new ticket IDs as `YT-GRV-${randomUUID().replace(/-/g, "").toUpperCase()}` and validate both the legacy 10-character suffix and the new 32-character suffix.
- [ ] Use the projection for both anonymous grievance creation and public status lookup; leave the authenticated moderator queue and status update payload full.
- [ ] Change the request logger’s serialized path so `/reports/grievance/<ticketId>` is recorded as `/reports/grievance/:ticketId`, while retaining other request-path logging.
- [ ] Update the tracker UI and API response type to remove `officerNote`; show neutral progress text and keep the received date/SLA fields.
- [ ] Inspect the two public response construction paths and confirm none of the stored reporter or internal fields are referenced there.

### Task 2: Apply profile visibility to all discovery surfaces

**Files:**
- Create: `api-server/src/services/profile-visibility-service.ts`
- Modify: `api-server/src/services/user-service.ts`
- Modify: `api-server/src/services/search-service.ts`
- Modify: `api-server/src/services/content-safety-service.ts`
- Modify: `api-server/src/utils/user-view.ts`
- Modify: `api-server/src/controllers/user-controller.ts`
- Modify: `api-server/src/controllers/search-controller.ts`
- Modify: `social/src/lib/api-client.ts`
- Modify: `social/src/pages/explore.tsx`
- Modify: `social/src/pages/messages.tsx`

**Interface produced:**

```ts
export type SearchUserView = Pick<UserRecord, "id" | "username" | "fullName" | "avatarUrl">;
export function toSearchUsers(users: UserRecord[]): SearchUserView[];
```

- [ ] Add one profile-visibility service that preserves the legacy fallback and implements: owner always allowed, private owner-only, followers accepted-followers-only, public visible.
- [ ] Apply that policy in direct profile reads, `/users/search`, `/search`, and author-content filtering. Keep block, mute, contact-shield, and content-rating checks as separate gates.
- [ ] Add a search-only user projection with the four fields consumed by the UI; retain `toPublicUser` for profile views.
- [ ] Type `api.searchUsers` and `/search` results as `SearchUserView`; update the explicit result-state types in Explore and Messages. Settings and onboarding should infer the narrower type from the API method.
- [ ] Inspect each changed call path to confirm search filters run before results enter the viewer-keyed cache and no search UI reads removed fields.

### Task 3: Make deleted and expired messages unavailable by ID

**Files:**
- Modify: `api-server/src/repositories/message-repository.ts`
- Modify: `api-server/src/services/message-service.ts`
- Modify: `api-server/src/controllers/message-controller.ts` only if a typed conflict must map to the existing generic unavailable response.

- [ ] Change `findById` to return only rows where `deletedAt IS NULL` and (`expiresAt IS NULL` or `expiresAt > now`).
- [ ] Add the same availability predicates to `update` so a row that expires or is deleted between lookup and mutation is not returned.
- [ ] On an idempotency-key insert conflict, return the existing row only when it is still available; otherwise surface the existing generic forbidden/key-in-use response without the message payload.
- [ ] Ensure seen/read-receipt, edit, delete, reply, reaction, and pin flows stop when lookup/update reports the row unavailable; emit no message update for an unavailable row.
- [ ] Inspect all `findById` and `update` call sites to confirm they do not rely on returning deleted/expired message content.

## Final checks

- Run `pnpm --filter @workspace/api-server typecheck`.
- Run `pnpm --filter @workspace/social typecheck`.
- Re-read the spec acceptance criteria and inspect the changed response/visibility/expiry branches. Do not run tests or access production/real user data.
