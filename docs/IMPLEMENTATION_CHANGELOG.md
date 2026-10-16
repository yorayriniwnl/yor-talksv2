# Implementation changelog

Audit continuation: **17 October 2026**. This is the reviewed change map, not an assertion that every execution has passed. The broad local checkpoint `2e80acb` contains prior authorized work; final reconciliation and independent review remain required before GitHub delivery.

| Area | Change and reason | Verification source / remaining limit |
| --- | --- | --- |
| Privacy and storage | Added accurate `/cookies` route/navigation and browser-storage inventory, corrected account-linked analytics/transfer/retention wording; updated font disclosure to site-hosted files | Legal-route, consent/SW/font tests; actual legal/retention approval remains external |
| Terms | Additive versioned registration/reacceptance records with transactional writes, idempotent legacy snapshot and allowlisted owner export | Terms-history PostgreSQL and auth/account export regressions |
| Google authentication | Authoritative-email linking, provider subject/email/epoch CAS, defer binding until MFA/approval succeeds | Google security and real-DB binding concurrency cases; actual OAuth console acceptance pending |
| Credentials | Atomic OTP reservation/redemption and refresh/epoch invalidation, origin checks, logout cookie ordering and browser session clearing | Auth/OTP/HTTP/origin/client-session/browser tests |
| Data minimization | Canonical credential-route logging, safe push failures, bounded completed queue payloads, subject-scoped archives; operational error sanitization under independent review | Logger/request-path/job/export regression cases; historical logs and broader retention open |
| Outbound requests | Allowlisted browser push endpoints validated at registration and delivery, with URL/credentials/port/host restrictions | Push URL/registration/delivery tests; actual browser/provider acceptance pending |
| Realtime privacy | Current device/token/epoch/contact/audience checks after awaited work; optional read receipts respect current adult choice | Socket and message regression cases using real local Socket.IO with synthetic authority |
| Media and expiry | Recheck lifetime at grant/delivery, all retained highlight forms, normalize both PostgreSQL timestamp representations to true instants | Media/message/archive non-UTC timezone and legacy-type integration cases |
| Account rights | Bounded repeatable-read owner export; password-confirmed deletion, session/guardian revocation, actor/reference pruning and durable cleanup; preserve remaining group history | Account integrity/archive/HTTP/eligibility/lifecycle tests; no complete backup-erasure replay claim |
| Staff operations | Private grievance lookup projection, cursor-paged queues, reasoned immutable closure history and removal of invented grievance deadlines | Staff/grievance/report regressions; closure is not a restriction, decision notice or appeal implementation |
| Product honesty | Disabled commerce/optional capabilities; preview disclosures and real backend-backed states; camera/creator copy and accessibility under review | Relevant UI/payment tests; real fees/taxes/refund and provider acceptance pending |
| Fonts and assets | Vendor 34 unmodified WOFF2 files across six families, pinned SHA-256/source revision and six OFL notices; no runtime Google Fonts dependency | Font asset tests; unresolved other brand/native/stock provenance remains gated |
| Accessibility | Shared avatar/decorative semantics, named appearance controls, reduced-motion controls, media names, camera and deletion dialog checks | Current requested width/theme/axe/keyboard E2E and separate manual limits |
| Infrastructure | Dedicated runtime DB role, no owner credentials in API, constrained Linux secret readers, offline Alertmanager renderer, exact-origin CSP/static headers and production Vite builds | Restricted-role CRUD/DDL tests, config/header/build/unit/Linux checks and container smoke |
| Backups | Encrypted helper, temporary plaintext cleanup on success/error/signal, all-schema nonempty-target guard, synthetic roundtrip/failure tests | Disposable encrypted restore and shell regressions; remote durability/key custody/erasure replay pending |
| CI and delivery | Correct duplicated keys, pin toolchain/actions, audit all dependency scopes, verify contracts/clients, serial API/decoder/browser/container/backup/role checks, remove profile volumes on cleanup | Current hosted CI required after commit/push; historical main failure not hidden |

No production deployment, production database/account mutation, paid feature activation, DNS change, secret rotation or merge of PR #25 is authorized by these changes. Final commit/PR and exact result links will be recorded in the release and test reports after they exist.
