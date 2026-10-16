# Account export version 2

`GET /api/users/me/export` streams a JSON attachment for the authenticated account. Restricted accounts retain this data-rights route. The response keeps the existing API envelope (`data` contains the versioned archive), so the Settings download continues to work.

The query inventory and explicit projections live in `api-server/src/services/account-export.ts`. The integration test compares its reviewed user foreign-key decisions with the migrated PostgreSQL catalog. Adding a user reference requires an export or privacy-exclusion decision.

| Archive section | Included data |
| --- | --- |
| `account` | Own profile, preferences, safety choices, device identifiers, account state and accepted terms; a boolean indicates whether 2FA is enabled. |
| `content` | Authored posts/comments/articles/videos/notes/stories, profile showcases/pins, received profile comments, highlights/polls, owned communities/events/channels/products/live streams, authored embedded discussions and channel messages, and visible sent/received messages. |
| `interactions` | Own likes, reactions, bookmarks, reposts, poll votes, story/reel views, saves and event RSVPs. Other actors' raw reaction or viewer lists are excluded. |
| `relationships` | Follow edges/requests, own favorites/close friends, community/channel/conversation memberships, own moderator/request assignments, conversation summaries, invitations, contacts and subscriptions. |
| `activity` | Own receipts/previews, notifications, push subscription metadata, profile-view events supplied by this viewer, guest appearances and attributed optional analytics events. |
| `creator` | Own drafts/workspace, projects and collaboration rows, businesses and own membership rows, topic associations, and aggregate creator analytics. |
| `commerce` | Membership/premium checkout and access records, entitlements, feature overrides, personally authored payment operations, and disputes/history linked to the account's orders. |
| `safety` and `eligibility` | Own moderation contributions, invitation summaries, verified-email waitlist association, author-owned audience choices, and account-linked assurance/guardian/contact/invitation summaries. |
| `media` | Own asset metadata and references. Expired/deleted message references and expired note/story references are excluded. |
| Existing top-level collections | Own reports and contact-shield metadata, ledger references, tip orders and marketplace orders. Purchase snapshots preserve item ID/title. Shipping fields are included for the buyer's archive. |

Received group messages use normalized conversation membership. Direct conversations use their legacy participant columns only when no normalized membership rows exist, matching the message service. Deleted/expired messages are excluded at one fixed export boundary, including text, attachments and receipts. Expired notes and non-highlight stories are also excluded.

Message projections omit the legacy shared `seenAt` timestamp: another reader can withdraw receipt sharing, and a retained timestamp cannot override that choice. The archive's `activity.messageReads` collection still includes the requesting account's own read records.

`activity.termsAcceptances` preserves recorded terms versions and their acknowledgement instants. The additive migration labels each surviving pre-migration acknowledgement `legacy_snapshot`; it cannot recover earlier versions that were already overwritten. Registration and later acknowledgements append records transactionally. These records do not grant optional analytics or marketing consent and cascade when the account is deleted.

Every collection uses stable primary-key keysets and pages of 200 rows (never more than 500). The HTTP handler consumes an async generator through Node stream backpressure, retaining one database page at a time. A read-only repeatable-read transaction keeps pages consistent when records change during a download. Missing accounts return 404 before attachment headers; stream errors terminate the download. Disconnects abort the generator and release its transaction. Per-query and idle-transaction timeouts are 30 seconds. Export requests have a separate per-account limit of four starts per hour, shared through Redis in production.

Cursor predicates and ordering use native UUID, text and bigint columns; JSON encodes only the returned cursor. Direct subject lookups have ordered subject/key indexes, and simple two-party scopes query each indexed party separately before merging bounded results. Legacy actor arrays use indexed JSON predicates before entry expansion. The release migration maintains these indexes and reuses suitable existing btree prefixes. Checked-out database clients retain error handlers while the consumer is paused, so a terminated or timed-out connection ends the download without an unhandled process error. Source failures are logged by error class without private database/provider details.

The indexes are created inside the release transaction rather than concurrently. For a populated deployment, measure migration duration and index storage on a restored copy and schedule the required maintenance window before starting the new API. Local plan checks establish native range index conditions and the availability of subject/key indexes; they are not a production capacity benchmark. Indirect ownership and legacy embedded-data queries still require measurement against the expected data volume.

The archive includes its exclusions. Authentication material, provider signatures, push delivery credentials, private assurance methods/evidence/nonces, invitation codes, unrelated private profile fields and other users' private audience/saved/browsing choices are omitted. Uploaded media values remain canonical references; storage provider URLs and reusable delivery grants are excluded. User-submitted external video links are retained through the same HTTPS host allowlist used at publication. Media bytes are not bundled, and subsequent protected delivery still requires current media authorization. System jobs, global aggregates, encrypted webhook payloads and internal security evidence are excluded.

Public grievance records and unbound guest assurance enrollments have no verified account link. They cannot safely be attributed from a matching email alone and require separate verified request handling. This archive covers the declared account-linked database inventory; operational provider copies, retention holds and backup handling remain part of the broader rights workflow.

Regression coverage includes catalog decisions and cursor types, authored content and received group history, cross-account privacy, buyer shipping isolation, safe dispute summaries, compound reaction/discussion paging, stable snapshots, cancellation, paused-consumer database termination, current HTTP session authority, per-account rate limits, sanitized stream failures, missing accounts and the attachment envelope.
