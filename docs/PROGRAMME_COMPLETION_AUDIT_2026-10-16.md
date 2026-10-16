# Programme completion audit — 16 October 2026

**Release decision: not ready for public launch.** This audit compares the current working tree, including uncommitted repairs, with the [approved programme specification](superpowers/specs/2026-10-07-global-age-consent-design.md). It separates tested repairs, missing implementation and unknown operating inputs. It does not approve a territory, certify compliance or authorise deployment.

## Scope of the preparation audit

The original specification covers workstream 1: eligibility and immediate privacy repairs. This historical preparation audit also records repairs to existing application/deployment behavior and unresolved launch decisions. The **17 October master objective expands the active task to all 20 compliance requirements, security, verification and reviewable GitHub delivery**; see the [current compliance audit](COMPLIANCE_AUDIT_2026-10-15.md). The workstreams below remain release gates where their outcomes have not been implemented or accepted; this historical scope paragraph does not exempt safely executable work from the current task. The implementation plan's [execution ledger](superpowers/plans/2026-10-07-global-age-privacy-foundation.md#current-execution-evidence-16-october-2026) separates implementation commits from historical procedure checkpoints whose original evidence is unavailable.

## Public-release workstreams requiring separate design

### 1. Report disposition does not enforce a content decision

**P1 before opening the service.** `api-server/src/routes/reports.ts` locks a report and updates its status, reason and staff history. It never changes the target's visibility. `ModerationService.updateGrievanceStatus` likewise changes only grievance status/private note. A report marked resolved therefore does not establish removal or restriction of the reported material.

Current author/eligibility/audience/media controls are real (`content-safety-service.ts`, `media-authorization-service.ts`). However, posts/videos have no persisted staff moderation state, and their deletion services require the author. Source-derived reproduction: resolve a report on an otherwise visible public post, then read it as an eligible viewer. The disposition changes none of its visibility authority. This was established by source tracing, not a new runtime test.

Required follow-up: explicit actions separate from case status, including reasoned no-action decisions; immutable decision/action history; authoritative restrictions across reads, discovery, media and realtime; and audited restoration. Do not reinterpret every historical `resolved` row as a deletion instruction. Structured report intake also excludes videos (`validators/report.ts`); generic URL grievances are currently their complaint path.

### 2. Private decision notices and decision-linked review are absent

**P1 before claiming complete notice/action or appeals.** Report submission returns `data: null`; history is staff-only. Grievance receipts intentionally expose only ticket ID, status and creation time (`utils/grievance-view.ts`). Preserve these privacy boundaries while adding verified party access to safe decisions and durable notification.

Grievance intake has no original-decision identifier, appellant relationship or review record (`validators/grievance.ts`, `lib/db/src/schema/index.ts`). Staff updates overwrite status/private note without reviewer history, required final rationale or enforceable reversal. A fresh generic grievance is not a complete review workflow.

Required follow-up: decision-linked review intake, private party access, reviewer/outcome history and enforceable upheld/reversed outcomes. Keep reporter identity and internal evidence confidential. The specification requires a separate design/plan for this workstream; this audit does not manufacture an approved action policy, deadline or staffing model.

### 3. The broader rights and retention programme is incomplete

**P1 before claiming complete data-rights operations.** Implemented controls include:

- Streaming owner export with explicit projections and migrated account-foreign-key coverage; see [account export](ACCOUNT_EXPORT.md).
- Password-confirmed transactional deletion, removal of departing authored messages and preservation of surviving group history (`account-service.ts`, `account-integrity.test.ts`), following the user's product decision.
- Managed-media deletion, retry/lease fencing and CDN invalidation (`media-service.ts`, `storage-service.ts`, `media-lifecycle.integration.test.ts`). Legacy ownership holds still require reviewed resolution.
- Separate terms acknowledgement and disabled optional analytics/profiling for governed accounts. A missing general consent ledger is not evidence that those disabled features currently collect data without consent.

Remaining outcomes include verified rights handling beyond the signed-in archive, linkage to unbound records, post-deletion requests, objection/restriction handling, purpose/version consent and withdrawal, a complete retention schedule and justified hold lifecycle. Database foreign-key coverage does not inventory every processor, log, transfer, purpose or backup. Profile editing does not supply a complete correction/request workflow.

Encrypted backup/verification/restore helpers and local retention exist; remote retention is an operator/provider configuration. No erasure replay procedure was established that prevents recovery of older backups from reintroducing erased records. Required follow-up includes a recovery/erasure design and drill. Actual periods, lawful exceptions and processor duties require identified operators and approved policy; do not invent them in code.

## EU applicability and law watch (checked 16 October 2026)

This is a technical launch-gate map, not a legal opinion. Provider/service classification, establishment, target markets and size determine which duties and national rules apply.

- Under the Digital Services Act, hosting providers must provide notice-and-action mechanisms and statements of reasons. The online-platform internal complaint system in Article 20 is free and electronic, remains available for at least six months after the covered decision, and is subject to Article 19's micro/small-enterprise exclusion; designated very large platforms are not excluded. Therefore, the implementation gaps above are concrete regardless of size for notice/action, while the required complaint scope depends on classification. See the [DSA, Articles 16–20](https://eur-lex.europa.eu/eli/reg/2022/2065/oj/eng).
- The Commission's 2025 [minor-protection guidelines](https://digital-strategy.ec.europa.eu/en/library/commission-publishes-guidelines-protection-minors) describe a risk-based, privacy-by-design reference for platforms accessible to minors, including private-by-default accounts, age assurance and improved moderation/reporting. The Commission describes the measures as non-exhaustive and voluntary; following them alone does not guarantee compliance. Their small/micro exclusion makes the still-unknown entity size material to applicability.
- GDPR Article 8's national age threshold of 13–16 applies when processing is based on consent for an information-society service offered directly to a child; it is not a general minimum-account-age rule. The selected Member State and the product's lawful-basis map are needed before fixing the policy. The broader rights and retention gaps also need a lawful, operational response under GDPR Articles 12–22; see the [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng).
- Commission Recommendation (EU) 2026/1035 asks Member States to make an EU age-verification solution available by 31 December 2026 and describes selective, privacy-preserving proof. It is a recommendation to Member States, not a direct platform launch deadline. Check whether the selected country's law or eventual approved provider requires integration; see the [Recommendation](https://eur-lex.europa.eu/eli/reco/2026/1035/oj).
- The Commission's 17 September 2026 [EU KIDS Act proposal](https://digital-strategy.ec.europa.eu/en/library/proposal-eu-kids-act-eu-keeping-internet-digital-spaces-accountable-and-trustworthy) proposes a minimum age of 15 for autonomous accounts on specified social-networking services. It is still a proposal in this audit and is not treated as current enacted law; monitor the legislative process.

## Requirement and evidence crosswalk

| Requirement | Evidence | Status and boundary |
| --- | --- | --- |
| Confirmed backend/frontend/security repairs | Readiness review's 16 October export, authority, session/cookie, Saved and moderation repairs | Implemented for the recorded defects; missing outcomes above remain open |
| Root/API checks | 106/106 root; final CI-mode API run 452 passed, 0 failed, 1 explicit decoder skip (453 total); native decoder case passed 1/1 in the final Linux image | Passed locally with disposable PostgreSQL/Redis and synthetic fixtures; both enrollment cases and real-session integration ran and passed |
| Types/contracts/clients/dependencies | Typechecks; 253 operations/215 paths; 233 generated artifacts; design/configuration checks; no reported production dependency vulnerabilities | Local working-tree evidence; current-tree hosted CI acceptance absent |
| Complete browser suite | Initial 85 case run: 83 passed, two failures; focused Studio/logout regressions 3/3; corrected full Chromium suite **86/86 passed in 5.9 minutes** | Current working-tree browser suite passed; the initial page-setup timeout did not recur |
| Production artifacts, startup and backup | Latest migrate/API/web/backup images built; migration exited 0; isolated Compose services healthy; smoke/readiness, provider DNS isolation, Alertmanager/Prometheus checks and encrypted backup round-trip passed | Synthetic local-only fixtures; no live provider, remote object durability, key recovery, public domain/TLS or deployment acceptance |
| Account deletion product policy | Departing authored messages erased; surviving group history retained; integrity tests | Implemented locally; territory/retention acceptance remains open |
| Moderation programme | Queues, reasons, report history and client authority safeguards | Partial: action enforcement, party notices and linked review absent |
| Rights/lifecycle programme | Export, deletion, media cleanup and specific expiry controls | Partial: broader workflows above absent or unaccepted |
| Branding/assets | Design tokens, metadata and [asset register](ASSET_PROVENANCE_REGISTER.md) | Inventory available; ownership/license approval not established for every shipped asset |
| Accessibility | Axe and focused keyboard/preferences cases | Limited coverage; complete route/manual/screen-reader acceptance absent |
| Operating acceptance | Runbook, empty territory registry and disabled feature gates | Open pending real operator/provider/deployment evidence |

## Foundation acceptance evidence

The ten numbered requirements in the approved specification map to these current sources and behavioral suites. Test files below are under `api-server/src/__tests__`; their presence alone is not execution evidence. The recorded complete API run executes the integration files with disposable database/Redis fixtures. Newly found realtime and expiry repairs are undergoing a further complete rerun before this table can establish final acceptance.

| Spec requirement | Current implementation and authoritative regression paths |
| --- | --- |
| 1. Private complaint receipts and protected moderation | `routes/reports.ts` uses `toPublicGrievance` for submission and lookup; staff routes retain authorization. `report-authorization.integration.test.ts` sends real HTTP requests and checks exact public fields, concealed case details and staff access. |
| 2. Deleted/expired message export and preview | `services/account-export.ts`, shared message visibility and preview/read writes apply deletion and expiry predicates. `account-service.test.ts`, `account-integrity.test.ts`, `disappearing-message.test.ts` and export HTTP/database tests cover sender/recipient archives, equality at expiry and read-triggered tombstones. |
| 3. Restricted identity, HTTP, optional authentication and sockets | Exact method/path permissions in `eligibility/restricted-routes.ts`; current account/session decisions in authentication and socket policy. `restricted-session.integration.test.ts`, `eligibility-http.integration.test.ts`, `eligibility-boundaries.integration.test.ts` and socket tests exercise both API mounts and real database/Redis sessions. |
| 4. Trusted experiences, proof binding and outages | Policy intersection, separate threshold assertions, challenge/revision-bound assurance and unavailable production adapter. `eligibility-policy.test.ts`, `assurance-service.test.ts` and enrollment/HTTP tests cover forged, replayed, wrong-subject, contradictory and unavailable proof. |
| 5. Verified purpose-specific guardian authority | Private authorization storage and current purpose/notice/policy checks; withdrawal increments authority revision. Assurance, contact and group integration tests exercise each required guardian and prohibited territory/feature combinations. |
| 6. Content ceiling across feed, direct reads, media and anonymous access | Current server classification hash, discovery reduction and final content/media authorization. `eligibility-content.integration.test.ts`, `eligibility-media.integration.test.ts`, discovery and profile tests cover stale preferences, direct identifiers, copied/cached grants and authority changes during provider reads. |
| 7. Contact, group, feature and realtime delivery restrictions | Explicit contact acceptance and canonical invited membership; current pairwise checks at reads, sends, joins and dispatch. `contact-eligibility.integration.test.ts`, `group-eligibility.integration.test.ts`, `eligibility-features.integration.test.ts` and `socket-security.test.ts` exercise withdrawal, contention, pending-history denial, provider-call denial and current device/contact delivery. |
| 8. Private proof/parent identity and safe owner status | Explicit public/restricted-owner serializers, owner-safe assurance DTOs and bounded request logs. Assurance, `user-view.test.ts` and repository privacy cases prevent private proof/parent identity escaping those public/status surfaces. Authorized account archives deliberately include scoped guardian/contact/group relationship IDs, while excluding private verification method/evidence/nonces; archive tests prove that narrower projection. |
| 9. Unknown legacy accounts, production isolation and child collection | Additive eligibility migration retains historical attestations; empty production registry, forbidden fixture startup and guardian-led enrollment. Repository, enrollment, policy and production-startup tests cover real migrations, one-time collection and denial without approved authority. |
| 10. Actual implementation checks | Revision-bounded API/root/browser/type/contract/config/build evidence is recorded in the readiness review and current test report. The 17 October master objective authorizes scoped commit/push and one unmerged PR; exact hosted CI remains required before acceptance and does not authorize deployment. |

## Accessibility evidence boundary

Located axe cases cover home light/dark, authentication, privacy, recovered inbox/activity, settings deletion, billing, Premium and payment operations. Some inspect only `main`; several whole-page cases reject critical/serious violations rather than all violations. Tests use WCAG 2 A/AA and, in some cases, 2.1 AA tags. Chromium is the only configured browser and external DNS is blocked; live Google Fonts are not exercised.

No complete route inventory with keyboard/focus return, screen-reader operation, zoom/reflow and both-theme contrast acceptance was established. These results do not justify a blanket conformance claim. The September audit is now prominently marked historical so its India, age and remote-font assumptions cannot be mistaken for current approval.

## Unresolved operating inputs

The user selected the EU and has not yet selected a Member State, legal entity/entity size, domain or hosting provider. The [readiness review](PRODUCTION_READINESS_REVIEW_2026-10-07.md#release-evidence-still-required) and [runbook](PRODUCTION_LAUNCH.md) retain approved policies/notices, assurance methods, processor agreements, real media acceptance, TLS/session/realtime checks, alert delivery, backup recovery/key custody, staffing and safety/rights drills as open gates.

Payments, live rooms, push, RTC and AI need their separately applicable release acceptance. Empty territory policy and unavailable assurance must continue to deny activation. No operator facts, approvals or live results were fabricated. Nothing in this audit deploys, publishes or commits the working tree.
