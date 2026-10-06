# Global compliance: age, consent and privacy foundation

**Status:** Draft for user review; product implementation has not started.
**Date:** 7 October 2026
**Requested scope:** EU-based operator, global users, three experiences: under 13, ages 13–17, and adults 18+.
**Repository baseline:** `5185898a8018bbc3d3c9bee09fbdd3cc86301c1d` on `codex/media-lifecycle-20261006`.

## Intended outcome

Give each person an experience appropriate to their verified eligibility, protect their data, and make the evidence behind launch decisions inspectable. The three experience bands are product categories; they do not replace national minimum-access ages, parental-authorisation rules, contractual capacity or other legal requirements.

Global availability is the intended outcome. Each territory and feature becomes available only after its policy and operating evidence are approved. A country without an approved policy remains unavailable for account activation. A consent checkbox, a date entered by a user, or a green test suite must never be represented as verified age, verified parental responsibility or complete legal compliance.

The EU operator's member state, actual legal entity, business size, approved age/parental-assurance provider and processor agreements have not been supplied. They remain explicit release gates. Do not invent these facts or infer them from the developer's location, a repository fixture or an email domain.

## Programme decomposition

This specification covers the first implementation workstream only. Separate specifications and plans are required for the remaining independent systems.

| Workstream | Outcome | Dependencies |
| --- | --- | --- |
| 1. Eligibility and immediate privacy repairs | Shared server policy for age, territory and required authorisation; protected complaint receipts and message exports | This specification |
| 2. Data rights and lifecycle | Complete data inventory; rights request handling, purpose-specific consent, retention schedules, provider/backup deletion and justified holds | Eligibility identity and restricted account access |
| 3. Content notices and enforcement | EU notice-and-action intake, urgent child-safety escalation, enforced decisions, reasons, review/appeals and usable staff queues | Eligibility policy; approved legal applicability |
| 4. Notices and operator governance | Accurate notices, child-readable terms, user/authority contacts, processing records, processor/transfer assessment and required risk assessments | Actual operator, providers and data inventory |
| 5. Commerce and AI | Applicable consumer disclosures, trader/merchant checks, refunds, payment classification and AI transparency | Separate feature approval; eligibility and provider acceptance |
| 6. Global release acceptance | Country-specific rules, real verification and moderation operations, rights/deletion drills and deployment evidence | Completed applicable workstreams |

Completing workstream 1 does not authorise a public launch for minors or establish that the other workstreams are complete.

## Approach selected for review

Use one server-owned eligibility policy across HTTP, sockets, discovery, media and transactions. Feature-specific checks alone would create different answers for the same person; changes to legal-page copy alone would leave access unchanged. A central decision with explicit feature capabilities is the proposed approach.

Keep existing content ratings and audience controls, but apply them within the eligibility ceiling. A person can choose stricter preferences; preferences cannot grant access that the server policy denies.

## Workstream 1 design

### 1. Repair the two existing privacy disclosures first

Public grievance submission and tracking return an explicit projection: `ticketId`, `status`, `createdAt`, and the current operational deadline where present. Never return reporter identity, the reported URL, description, internal officer notes or the database row identifier. Preserve complete records behind authenticated moderator access. Remove the public interface's dependence on internal notes. Do not describe an India-specific deadline as an EU statutory deadline; the later notice-and-action workstream will replace that lifecycle.

Account export excludes messages marked deleted and messages whose expiry has been reached. Use the same current visibility semantics as ordinary message reads, including read-triggered expiry. Do not export another person's deleted or expired message text, attachments or access grants. This repair does not claim that the current export is a complete GDPR access or portability response; export coverage and lawful retention exceptions belong to workstream 2.

### 2. Separate proof, consent and experience

Represent the effective experience as `unknown`, `under_13`, `teen_13_17`, or `adult_18_plus`. `unknown` is an internal safety state, not a fourth public experience.

Store age/eligibility assessments separately from public profiles. An assessment records the account, assurance method and issuer, verified threshold assertions, country-policy version, verification time, expiry/reassessment time, status and a minimised evidence reference. Use states `pending`, `verified`, `expired`, `revoked` and `rejected`.

Store parental authorisation separately: child account, verified holder of parental responsibility, verification reference, authorisation purposes and notice versions, country-policy version, granted time and any withdrawal/revocation time. A parent account being over 18 or having a verified email does not prove parental responsibility.

Retain threshold assertions and provider references where sufficient. Do not put birth dates, identity documents, facial images, verification tokens or parent identities in public profiles, general logs or JWTs. If a selected verification method requires temporary sensitive material, its minimisation, secure handling and deletion must be approved before that integration is enabled.

Terms acceptance, acknowledgement of a privacy notice, and optional data-processing consent are separate records. Accepting the terms is not universal consent to analytics, profiling or marketing. This workstream defines the eligibility interface; the purpose-specific consent ledger is implemented in workstream 2.

Optional analytics and profiling stay disabled for every newly governed public account until workstream 2 supplies an applicable server-side purpose-consent decision. A browser storage flag alone cannot enable them. The adult capability in the matrix means eligibility to request that later decision, not immediate permission to collect events.

### 3. Country-aware policy

An approved, versioned territory entry defines permitted account ages, the applicable independent-consent threshold for consent-based processing, required parental authorisation, allowed capabilities, review/effective dates and primary legal sources. Apply all identified operator- and recipient-related obligations; selecting one country must not discard another applicable regime.

Country self-declaration is an input to policy assessment, not proof of age or permission to bypass restrictions. Do not infer residence from a language or email domain. Resolve conflicting or insufficient territory evidence by denying activation and requesting reassessment. Do not collect continuous precise location to implement this policy.

No default entry claims worldwide permission. Unknown or unreviewed territories, unavailable proof, expired proof, revoked authorisation and contradictory assertions deny activation. The UI explains the missing step and preserves access to safety reporting and verified data-rights requests.

### 4. Proposed product capability matrix

These are proposed safety choices. Their implementation does not assert that every listed restriction is mandated identically in every country.

| Capability | Under 13 | Ages 13–17 | Adults 18+ | Unknown or not authorised |
| --- | --- | --- | --- | --- |
| Activation | Only in approved territories with required verified parental authorisation | Approved territory; required parental authorisation below its applicable threshold | Approved territory and valid eligibility assessment | No social activation |
| Content ceiling | Approved child-safe content | Child-safe and regular content; mature blocked | User preference, within lawful availability | Approved child-safe public content and safety/legal surfaces only |
| Profile defaults | Private; no public indexing or public precise location | Private; no public precise location | Existing user-controlled defaults | Not discoverable |
| Direct/group contact | Verified guardian or explicitly approved contacts; no unsolicited adult contact | Accepted connections and explicit group acceptance; unsolicited adult contact blocked | Existing block and contact preferences | No social messaging |
| Payments, tips, seller activity and memberships | Disabled | Disabled pending a separately approved model | Separate commerce/provider approval required | Disabled |
| Live rooms and RTC calls | Disabled pending separate child-safety design | Disabled pending separate child-safety design | Existing provider and safety release gates | Disabled |
| Optional analytics/profiling and profiling-based ads | Disabled | Disabled | Separate applicable consent and advertising rules | Disabled |
| AI companion | Disabled pending separate child-safety design | Disabled pending separate child-safety design | Separate AI/provider release gates | Disabled |
| Autoplay, read receipts, push and engagement streaks | Off by default; no engagement-based exceptions | Off by default | User-controlled where available | Off |

Guardian approval is specific, recorded and revocable. It cannot override a national prohibition, the mature-content ceiling or a safety block. A guardian link does not silently grant access to a child's entire message history.

### Contact and invitation authority

Add a separate contact-authorisation record with both account IDs, the initiating account, approval actor(s), policy version, `pending`/`accepted`/`rejected`/`revoked` state and timestamps. Following an account is never evidence of accepted contact. Both participants must accept a teen connection; an adult cannot initiate a social contact request to a minor. A teen-initiated adult connection additionally needs guardian approval where required by the approved product/territory policy.

For an under-13 account, a verified holder of parental responsibility approves each contact, and the recipient must accept. Contact involving two under-13 accounts needs both verified guardians' approval. A minor can always block a contact; a guardian cannot undo that safety block. Guardian identity, approval and withdrawal stay private.

Group creation and additions create `pending` invitations. A pending invitee cannot read history, join the room or receive group messages. Membership begins only after explicit recipient acceptance and any required guardian approval, with current policy checked against every existing participant. In particular, accepting one teen cannot permit that teen to introduce an unapproved adult. Existing conversations and membership changes undergo the same checks at reads, sends, socket joins and delivery. Withdrawal or a safety block stops subsequent contact without deleting evidence or bypassing verified data-rights handling.

### 5. Shared server decision and enforcement

The decision consumes current account status, verified age assertions, approved territory policy, required authorisation, terms/notice version and feature release flags. It returns the effective experience, permitted capabilities, maximum content rating, policy version and an owner-safe reason for any restriction. Deny on missing or inconsistent evidence.

Use current database records as authority. JWT claims, cached preferences and frontend state do not grant eligibility. Apply the same decision to mandatory and optional HTTP authentication, socket connection and each restricted socket action, direct content lookup, SQL discovery reduction, search, expiring media grants, messages, group invitations, calls/live rooms and commerce creation.

An author-selected `child_safe` rating is not evidence of suitability for children. Child-accessible content needs the approved server moderation/classification path; unclassified or contradictory content cannot enter that experience. A verification result granting access to a bracket does not approve content posted by that account.

Anonymous requests and accounts without current authorisation have the same public-browsing ceiling: approved child-safe public content and safety/legal surfaces only, without social interactions or personalisation. Neither can receive regular/mature content or private minor profiles. Dropping a bearer token therefore grants no additional content capability. Territory restrictions on the availability of the service also apply to public browsing where the approved policy requires them.

Recheck at access or publication boundaries. Provider callbacks are signed, issuer/audience checked, account- and challenge-bound, expiring and idempotent. Client-supplied `verified`, `adult` or `guardianApproved` values never establish authority. A provider outage cannot downgrade verification into a checkbox fallback.

Revocation, expiry, a changed applicable policy or parental withdrawal restricts subsequent requests and long-lived socket actions. Recheck eligibility at media-grant issuance/renewal and delivery; invalidate outstanding grants for subsequent delivery requests when a capability is removed. Data already received cannot be recalled. Preserve appropriately verified safety and data-rights access without restoring social privileges.

### 6. Restricted sessions, account journeys and migration

Separate identity authentication from permission to use social features. Successful password/Google/OTP authentication can issue a restricted session when eligibility is pending, unknown or expired. The session remains subject to existing identity, MFA, device, token-expiry and revocation checks. Refresh cannot turn a restricted account into an activated one without a current server eligibility decision.

Use a method-and-normalised-path allowlist for restricted account sessions, including both existing `/api` and `/api/v1` mounts:

- `GET /users/me`: only the owner's restricted account/security/eligibility summary.
- `POST /users/me/consent`: current terms acknowledgement; never establishes age proof.
- `GET /users/me/eligibility`, `POST /users/me/eligibility/challenges`, and `GET /users/me/eligibility/challenges/:challengeId`: owner-bound assurance progress.
- `POST /users/me/guardian-authorizations`, `GET /users/me/guardian-authorizations`, and `POST /users/me/guardian-authorizations/:authorizationId/withdraw`: authorised, owner/guardian-bound progress and withdrawal. These endpoints cannot accept client assertions as verified parental responsibility.
- `POST /auth/verify-email/resend`; existing public email verification/recovery routes retain their existing token and rate-limit checks.
- Existing owner-only `POST /auth/2fa/setup`, `/confirm`, `/disable`, and authenticated challenge listing/approval/denial routes: existing proof and fresh-authentication requirements still apply, and resulting login sessions remain restricted until eligibility permits activation.
- `GET /users/me/export`, `DELETE /users/me`, `POST /auth/logout` and `POST /auth/logout-all`: verified rights and session control, including existing password confirmation for deletion.

Safety/legal pages and public harm-reporting remain accessible independently of social activation. Every other authenticated endpoint requires an activated capability unless explicitly added by a reviewed policy change. Test exact methods and routes, not permissive path prefixes. Eligibility provider callbacks are a separate signed, challenge-bound provider boundary, never a general restricted-session exemption.

Suspended/deactivated accounts may authenticate only into the verified rights/security flow; completing age assurance cannot remove a moderation restriction. Deleted accounts do not regain sessions. Rights to data that require a separate request after account deletion are covered by workstream 2.

Registration collects only the information needed for the approved assurance journey. Pending accounts can verify email, complete assurance/authorisation, read notices, contact support, report harm and exercise verified data rights. They cannot publish, be indexed, message or purchase.

Prescreen without creating a discoverable account or collecting unnecessary child identifiers. In territories requiring authorisation before collection, the under-13 journey is guardian-led: obtain the required direct notice and verified authorisation before collecting the child's normal account/profile information. Any limited pre-authorisation collection must have an approved purpose and applicable exception; storing a full child profile in a pending account is not the default. If the required guardian/assurance journey is unavailable, do not collect that profile or activate the account.

Use an additive migration. Existing `ageConfirmedAt` values are historical attestations, not verified age; existing accounts start with eligibility `unknown`. Preserve account data and current attestations. Require reassessment before granting adult or minor capabilities. Present a clear transition notice; do not infer an adult from the old 18+ checkbox.

When an assessment expires or a person crosses a threshold, require fresh applicable assurance/consent evidence. Do not automatically release adult features from an unverified date. A stricter policy always takes effect before permissive cache refreshes.

`PUBLIC_BETA=false` must not bypass eligibility on a deployed service. A non-production test adapter may supply synthetic proofs only in isolated test/development environments; production rejects that adapter and any fixture policy. Provider credentials, approved territories and genuine legal identity are required before activation.

## Implementation boundaries and source areas

- Add private eligibility/authorisation tables and an additive migration under `lib/db`; update the typed account model without exposing proof fields through owner/public serializers.
- Add dedicated eligibility policy, repository and verification-adapter units under `api-server/src`; integrate the existing consent helper, auth service, HTTP middleware and socket gates.
- Apply the effective ceiling through `content-safety-service.ts`, `discovery-scope.ts` and direct/media delivery paths, plus contact and payment boundaries.
- Repair the existing `reports.ts` public projection and `account-service.ts` message export; update only their corresponding consumers and regression tests.
- Update registration/consent/eligibility UI, shared client types and generated API contracts. New UI receives server decisions; it does not implement a separate legal policy.
- Keep the unrelated pre-existing frontend changes out of commits. Inspect any overlapping diff before staging. No production migrations, deployment, paid verification-provider activation or publication is part of the specification-writing stage.

## Acceptance requirements

1. Public complaint responses contain only the approved fields; moderator access remains protected and functional.
2. Recipient and sender exports exclude deleted/expired messages, including expiry-boundary cases, while permitted messages remain available.
3. Registration, login, optional authentication and sockets cannot bypass pending, unknown, revoked, expired or prohibited social eligibility. Pending/expired users can authenticate to complete verification and request export/deletion; exact restricted-session method/path checks prevent unrelated access. Suspended users cannot reactivate social access through assurance.
4. All three experiences are derived from trusted assertions; forged, replayed, wrong-account and contradictory proof is rejected. A provider outage preserves the restriction.
5. Guardian authorisation is verified, purpose-specific, withdrawable and ineffective where country policy prohibits the service.
6. Mature content cannot reach minors through feed, search, direct IDs, media grants, settings, an old session or an anonymous fallback.
7. Unapproved contact, group addition, payment, live/RTC or AI use is blocked at the server boundary, including races with revocation. Pending invitees receive no history/socket events; adding an adult is checked against all minors; legacy conversations and withdrawn approvals cannot bypass the decision.
8. Private proof and parent identity never appear in public/owner profile payloads or logs. Owner status explains the next step without disclosing security evidence.
9. Legacy-account migration never invents age; production cannot activate synthetic proofs or unreviewed territory policies. Under-13 collection follows the approved guardian-led journey, and the same public URL has the same child-safe ceiling with restricted, absent, invalid or expired credentials.
10. Focused behavioural regressions, applicable real database/HTTP/socket integration checks, client flow checks, type checks, API-contract checks and normal repository checks pass for the actual implementation revision. Tests use isolated synthetic data; live provider and deployment acceptance are separately recorded.

## Remaining release decisions

The EU member state and legal entity must be supplied before notices, authority contacts and national obligations can be finalised. The assurance provider and parental-responsibility method require approval before minors can activate. Territory policies require current authoritative research and recorded approval; a user-facing global setting does not supply that evidence.

Each subsequent workstream needs its own concrete specification and implementation plan. A completion report must distinguish implemented controls, tests actually run, operating evidence, and unresolved release gates. No statement of complete worldwide legal compliance is generated automatically.

## Primary EU sources used in the design

- [GDPR, particularly Articles 3, 8, 12–22, 25, 28 and 32–37](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng): child consent is purpose/lawful-basis dependent, with national thresholds between 13 and 16; rights, privacy defaults and accountable processing remain separate duties.
- [Digital Services Act, particularly Articles 11–20, 26 and 28](https://eur-lex.europa.eu/eli/reg/2022/2065/oj/eng): notice/action and reasons are hosting duties; certain platform duties have micro/small-enterprise exceptions that need actual business evidence.
- [Commission guidelines on protection of minors, 14 July 2025](https://digital-strategy.ec.europa.eu/en/library/commission-publishes-guidelines-protection-minors): voluntary enforcement reference for proportionate age assurance, private defaults, safer contact and reduced engagement pressure; following them is not automatic compliance.
- [Commission guidance on AI transparency obligations](https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations): relevant Article 50 obligations apply from 2 August 2026; exact provider/deployer obligations are assessed in the AI workstream.

## Initial global policy research

The following sources demonstrate why a single worldwide age switch is insufficient. They are an initial applicability set, not an approved or complete country registry. None enables a production territory by itself.

- [US revised COPPA Rule, published 22 April 2025](https://www.govinfo.gov/content/pkg/FR-2025-04-22/html/2025-05904.htm), with [FTC applicability guidance](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions): covered under-13 data collection requires the applicable notice, verifiable parental consent, parental rights, security and retention controls. The ordinary revised-rule compliance date was 22 April 2026. Review the amended rule rather than relying solely on older FAQ text. The guardian-led collection design is necessary; a pending-account label does not create an exception.
- [UK Ofcom age-assurance guidance](https://www.ofcom.org.uk/online-safety/protecting-children/age-assurance) and [issued protection-of-children codes](https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/statement-protecting-children-from-harms-online): assess the service's UK links, children-access/risk duties, harmful content and required assurance. Do not treat every proposed social-media restriction as an enacted access-age rule. Applicability and risk controls require a UK-specific review before release.
- [Australian eSafety social-media age-restriction guidance](https://www.esafety.gov.au/about-us/industry-regulation/social-media-age-restrictions/faqs): from 10 December 2025, covered platforms must take reasonable steps to prevent under-16s ordinarily resident in Australia from holding accounts. Coverage depends on the service's features and legislative exclusions, not merely whether it appears on a list of large platforms. If Yor Talks is covered, parental approval cannot enable an otherwise prohibited account; the teen experience needs a separate verified 16+ threshold there.

Further global additions belong in the territory-policy research and do not silently replace the EU establishment duties. In particular, a single `teen_13_17` assertion is insufficient to distinguish a national 16+ access threshold; the trusted assurance record must carry the required threshold assertion separately from the experience band.
