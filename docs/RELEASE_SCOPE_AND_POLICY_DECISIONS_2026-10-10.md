# Yor Talks (v3) Release-Scope and Policy Decisions Dossier

**Document Reference:** `docs/RELEASE_SCOPE_AND_POLICY_DECISIONS_2026-10-10.md`  
**Evaluation Date:** 10 October 2026  
**Repository & Target:** `yor-talks-v3` (`https://github.com/yorayriniwnl/yor-talksv2.git`)  
**Status:** Authoritative Discovery Complete; Scope Frozen as **Adult (18+) Closed Testing Beta**; Implementation & Behavioral Alignment Verified.  

---

## 1. Executive Summary & Explicit Release-Scope Determination

### 1.1 Scope Determination: Adult (18+) Closed Testing Beta ONLY
Based on rigorous architectural, operational, and regulatory analysis, **Yor Talks v3 is strictly approved and bounded as an Adult (18+) Closed Testing Beta**.

**Any public release to minors (under 18) or unreviewed worldwide open self-registration is explicitly PROHIBITED and BLOCKED at both the runtime configuration and architectural policy levels.**

### 1.2 Core Release Invariants Maintained
* **Minimum Age:** Strictly enforced at **18** (`MINIMUM_AGE=18`, `VITE_MINIMUM_AGE=18`).
* **Audience Limitation:** Strictly enforced via closed-domain allowlists (`ALLOWED_EMAIL_DOMAINS`) for beta/staging.
* **Eligibility Protections:** Centralized deterministic policy engine (`api-server/src/eligibility/policy.ts`), empty approved territory registry (`api-server/src/eligibility/territory-policy.ts`), and unavailable assurance adapter (`ELIGIBILITY_ASSURANCE_ADAPTER=unavailable`) fail closed on all unverified requests.
* **Payments Disabled:** `PAYMENTS_ENABLED=false`, `YOR_PREMIUM_ENABLED=false`. All checkout, tipping, and subscription order creation endpoints fail closed before database queries.
* **Live Rooms Disabled:** `LIVE_ROOMS_ENABLED=false`. LiveKit stream tokens, status transitions, and participant rooms fail closed (HTTP 503).
* **Push Notifications Disabled:** `WEB_PUSH_ENABLED=false`. VAPID subscription and public key endpoints fail closed (HTTP 503).
* **RTC Direct Calls Disabled:** `RTC_CALLS_ENABLED=false`. P2P and relayed media call negotiations fail closed.
* **Other Unaccepted Capabilities Disabled:** Seller features (`SELLER_ENABLED=false`), creator memberships (`MEMBERSHIPS_ENABLED=false`), and AI companion (`AI_COMPANION_ENABLED=false`) remain completely disabled.

---

## 2. Discovery of Existing Authoritative Decisions

The following inventory details the findings across the 13 required operational and policy dimensions, distinguishing what is authoritatively decided in the repository from what remains missing:

| Item | Current Authoritative State in Repository | Implementation Location & Binding | Missing / Unresolved Elements |
| :--- | :--- | :--- | :--- |
| **1. Legal Operator Identity & Address** | **MISSING / UNKNOWN**. Repository records: "EU-based operator... The actual EU member state and legal entity are unknown." (`PRODUCTION_READINESS_REVIEW_2026-10-07.md`). Example envs use `CHANGE_ME`. CI and Playwright use explicit test fixtures. | `api-server/src/config/env.ts` (`LEGAL_OPERATOR_NAME`, `LEGAL_OPERATOR_ADDRESS`), `social/src/lib/public-beta-config.ts` | Registered legal entity name, corporate registration number, registered office address, and EU member state of establishment. |
| **2. Support Contact** | **MISSING / PLACEHOLDER**. Repository uses `support@your-domain.example` in examples and `support@example.test` in tests. | `api-server/src/config/env.ts` (`SUPPORT_EMAIL`), `social/src/pages/legal.tsx` | Production support inbox and escalation routing owned by operational staff. |
| **3. Privacy Contact** | **MISSING / PLACEHOLDER**. Repository uses `privacy@your-domain.example`. Falls back to support contact in frontend trust center. | `api-server/src/config/env.ts` (`PRIVACY_CONTACT_EMAIL`), `social/src/pages/legal.tsx` | Designated privacy officer/team email for data rights and regulatory inquiries. |
| **4. Grievance Contact / Responsible Person** | **MISSING / PLACEHOLDER**. `GRIEVANCE_OFFICER_NAME` and `GRIEVANCE_CONTACT_EMAIL` are unpopulated in deployment templates. Frontend displays fallback notice. | `social/src/pages/grievance.tsx`, `api-server/src/routes/reports.ts`, `api-server/src/config/env.ts` | Appointed trust & safety / grievance redressal officer identity and official address/email. |
| **5. Intended Territories** | **AUTHORITATIVELY FROZEN AS EMPTY REGISTRY**. Initial intake evaluated EU, US, UK, AU, BR, CA, IN as historical research; `api-server/src/eligibility/territory-policy.ts` contains `approvedRegistry: ApprovedTerritoryPolicy[] = []`. | `api-server/src/eligibility/territory-policy.ts`, `api-server/src/eligibility/policy.ts` | Formal owner approval of specific country deployment whitelist. Until approved, policy engine fails closed with `territory_unavailable`. |
| **6. Adult Closed Beta vs Adult Public Service** | **AUTHORITATIVELY DECIDED AS ADULT CLOSED BETA**. Code and runbooks explicitly gate open registration. `PUBLIC_BETA=false` in staging template; `PUBLIC_BETA=true` in production requires all operator values. | `ops/.env.staging.example`, `docs/PRODUCTION_LAUNCH.md`, `social/src/lib/public-beta-config.ts` | Formal confirmation from release owner to transition from closed tester beta to public beta. |
| **7. Approved Audience / Email Domains** | **IMPLEMENTED VIA ALLOWLIST; DOMAINS PENDING OWNER SPECIFICATION**. `ALLOWED_EMAIL_DOMAINS` enforced across registration, password login, email OTP, and Google OAuth. | `api-server/src/validators/auth.ts` (`isAllowedEmail`), `api-server/src/services/auth-service.ts` | Specific domain strings to enable for staging/closed-beta (e.g. organizational domain or tester list). |
| **8. Terms / Privacy Versions** | **CANDIDATE DRAFT IDENTIFIED (`2026-08-public-beta-1`)**. Default in dev is `development`; staging uses `2026-08-staging-1`. | `api-server/src/config/env.ts` (`TERMS_VERSION`), `social/src/pages/legal.tsx`, `api-server/src/utils/consent.ts` | Owner sign-off on final version identifier and legal text adoption. |
| **9. Retention & Deletion Policy** | **TECHNICAL DEFAULTS IMPLEMENTED; CORPORATE POLICY MISSING**. Queue prunes completed jobs in 1h, failed in 7d; backups kept locally 14d; analytics queried up to 90d. Account deletion cascades immediately. | `api-server/src/lib/notification-job-policy.ts`, `api-server/src/services/account-service.ts`, `lib/db/scripts/backup-database.sh` | Formal organizational retention schedule. (Technical queue/backup limits must not be conflated with organizational policy). |
| **10. Shared-Group History Policy** | **CONSERVATIVE AUTHOR ERASURE + SURVIVING CONTRIBUTION PRESERVATION IMPLEMENTED**. When a user deletes their account: `senderId` cascades (deleting their own messages); `conversations.participantA/B` and `messages.recipientId` set null (preserving group and surviving members' messages). | `lib/db/src/schema/index.ts` (lines 182-202), `api-server/src/services/account-service.ts`, `scripts/test-cascade-safety.mjs` | Policy decision whether to retain anonymized author placeholders (e.g. "Deleted User: text") or preserve current conservative erasure. |
| **11. Processor & Storage Locations** | **TECHNICAL SERVICES CATALOGED; JURISDICTIONS UNKNOWN**. Primary DB (Postgres 16), Cache (Redis 7), Media (Cloudinary), Email (Resend), Moderation (Gemini/OpenAI), Payments (Razorpay - disabled). | `social/src/pages/legal.tsx` (`providerSummary`), `docker-compose.production.yml` | Hosting physical cloud region (e.g., EU Frankfurt, AWS us-east-1), cloud vendor data processing agreements (DPAs), and cross-border transfer mechanisms (SCCs). |
| **12. Telemetry Purposes & Consent Requirements** | **PERFORMANCE/NAVIGATION ONLY; OPT-IN CONSENT IMPLEMENTED**. Ingestion schema restricted to `navigation` and `react:profiler`. Client stores consent in `localStorage` (`yor:telemetry:consent:v1`). Opt-out flushes queue. | `social/src/lib/telemetryBatcher.ts`, `social/src/pages/settings.tsx`, `api-server/src/routes/product-analytics.ts`, `api-server/src/services/product-analytics-service.ts` | None for beta telemetry. Workstream 2 server-side purpose consent ledger remains a future architectural milestone. |
| **13. Release Owner** | **GIT AUTHOR RECORDED (`yorayriniwnl@gmail.com`)**. Formal production operational owner and on-call escalation authority not designated in repository. | Git commits, `SECURITY.md`, `docs/PRODUCTION_LAUNCH.md` | Named operational release owner and emergency contact roster. |

---

## 3. Concise Decision Sheet for Genuinely Missing Items

The following decisions require owner determination. Each entry identifies the affected engineering implementation:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   OWNER ACTION & DECISION SHEET                                        │
├──────────────────────────────┬─────────────────────────────────────────────────┬───────────────────────┤
│ Missing Decision Item        │ Options / Parameters                            │ Affected Code Paths   │
├──────────────────────────────┼─────────────────────────────────────────────────┼───────────────────────┤
│ D-01: Legal Entity Identity  │ - Legal Entity Name                             │ - env.ts              │
│       & Member State         │ - Member State / Country of Establishment       │ - public-beta-config.ts│
│                              │ - Physical Registered Address                   │ - legal.tsx           │
├──────────────────────────────┼─────────────────────────────────────────────────┼───────────────────────┤
│ D-02: Public Contact Inboxes │ - Support Email (e.g. support@domain)           │ - env.ts              │
│                              │ - Privacy Email (e.g. privacy@domain)           │ - legal.tsx           │
│                              │ - Grievance Officer Name & Contact              │ - grievance.tsx       │
├──────────────────────────────┼─────────────────────────────────────────────────┼───────────────────────┤
│ D-03: Beta Audience Scope    │ - Closed Beta with Allowlist (Recommended)      │ - env.ts              │
│                              │   (Specify ALLOWED_EMAIL_DOMAINS)               │ - auth.ts             │
│                              │ - Open Registration (Requires prior D-01 & D-02)│ - auth-service.ts     │
├──────────────────────────────┼─────────────────────────────────────────────────┼───────────────────────┤
│ D-04: Terms & Privacy Version│ - Confirm release version (e.g. 2026-10-beta-1) │ - env.ts              │
│       Authorization          │ - Formal legal text review approval             │ - consent.ts          │
├──────────────────────────────┼─────────────────────────────────────────────────┼───────────────────────┤
│ D-05: Group Deletion Policy  │ - Retain current: Author messages erased,       │ - schema/index.ts     │
│                              │   surviving members' messages intact (Default)  │ - account-service.ts  │
│                              │ - Alternative: Anonymized retained placeholder  │                       │
├──────────────────────────────┼─────────────────────────────────────────────────┼───────────────────────┤
│ D-06: Infrastructure Hosting │ - Primary Region (e.g. EU eu-central-1, Hetzner)│ - ops/Caddyfile       │
│       Region & DPA Agreements│ - Off-host encrypted backup bucket location     │ - backup-database.sh  │
└──────────────────────────────┴─────────────────────────────────────────────────┴───────────────────────┘
```

---

## 4. Current Applicable Legal Requirements (Primary Source Research)

Treating the 7 October 2026 intake as historical background, current legal benchmarks were verified directly against official primary sources:

### 4.1 European Union (Operator Establishment Framework)
* **General Data Protection Regulation (GDPR) — Regulation (EU) 2016/679**  
  * *Citation & Source:* OJ L 119, 4.5.2016, p. 1–88; [EUR-Lex CELEX:32016R0679](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679).  
  * *Requirements:* Data minimization (Art. 5), lawful processing basis (Art. 6), special conditions for children's consent in information society services (Art. 8, national thresholds 13–16), data subject rights to erasure and export (Arts. 15, 17, 20), and privacy by design and default (Art. 25).  
  * *Application:* By restricting the service to **adults (18+)** and requiring affirmative terms/age confirmation, Article 8 child consent mechanisms are not triggered for activation. Account export and deletion endpoints satisfy core technical requirements.
* **Digital Services Act (DSA) — Regulation (EU) 2022/2065**  
  * *Citation & Source:* OJ L 277, 27.10.2022, p. 1–102; [EUR-Lex CELEX:32022R2065](https://eur-lex.europa.eu/eli/reg/2022/2065/oj).  
  * *Requirements:* Points of contact for authorities and users (Arts. 11, 12), clear terms of service (Art. 14), notice-and-action mechanisms for illegal content (Art. 16), and statements of reasons (Art. 17). Micro and small enterprises are exempt from certain additional Section 3 obligations (Art. 19).  
  * *Application:* In-app reporting and the grievance portal provide structured notice intake.
* **European Accessibility Act (EAA) — Directive (EU) 2019/882**  
  * *Citation & Source:* OJ L 151, 7.6.2019, p. 70–115; [EUR-Lex CELEX:32019L0882](https://eur-lex.europa.eu/eli/dir/2019/882/oj).  
  * *Requirements:* Mandatory accessibility compliance for covered products and services placed on the market as of **28 June 2025**. Microenterprises providing services are exempt subject to financial/staff criteria.  
  * *Application:* Frontend components are tested against axe-core accessibility standards in CI.
* **Distance Consumer Services & Online Withdrawal Rights — Directive (EU) 2023/2673**  
  * *Citation & Source:* OJ L 2023/2673, 28.11.2023; [EUR-Lex CELEX:32023L2673](https://eur-lex.europa.eu/eli/dir/2023/2673/oj).  
  * *Requirements:* Consumer withdrawal functions for distance financial contracts.  
  * *Application:* All payment and paid subscription capabilities are completely disabled (`PAYMENTS_ENABLED=false`).

### 4.2 United States
* **Children's Online Privacy Protection Rule (COPPA) — 16 CFR Part 312**  
  * *Citation & Source:* FTC Children's Online Privacy Protection Rule, Codified at 16 CFR Part 312; [Federal Register 16 CFR Part 312](https://www.federalregister.gov) and [FTC COPPA Enforcement Resources](https://www.ftc.gov).  
  * *Application:* Yor Talks v3 is strictly restricted to adults aged 18 and older. It does not direct services to children under 13 nor knowingly collect under-13 personal information.

### 4.3 United Kingdom
* **Online Safety Act 2023 & Ofcom Protection of Children Codes**  
  * *Citation & Source:* Ofcom Statement "Protecting children from harms online", published **24 April 2025** (legal duties active from **25 July 2025**); [Ofcom Online Safety Statement](https://www.ofcom.org.uk).  
  * *Application:* Without an approved UK age-assurance provider capable of satisfying Ofcom's "highly effective" age assurance standard, UK minor access is blocked.

### 4.4 Australia
* **Online Safety Amendment (Social Media Minimum Age) Act 2024 & Strengthening Enforcement Bill 2026**  
  * *Citation & Source:* Enacted 29 November 2024, commenced 11 December 2024; strengthened September 2026; [eSafety Commissioner Regulatory Guidance](https://www.esafety.gov.au).  
  * *Application:* Prohibits accounts for individuals under 16 on covered social platforms. Yor Talks' 18+ policy satisfies this age ceiling, but Australian recipient territory remains unapproved in the registry.

### 4.5 Brazil
* **ECA Digital (Lei 15.211/2025) & LGPD (Lei 13.709/2018)**  
  * *Citation & Source:* Lei 15.211 de 2025 (effective 17 March 2026); ANPD Binding Enunciado 1/2023; [Portal da Legislação](https://www.planalto.gov.br).  
  * *Application:* Prohibits minor commercial profiling and requires legal representation in Brazil. Access blocked by empty approved registry.

### 4.6 India
* **Digital Personal Data Protection Act, 2023 (DPDP Act) & IT Rules 2021**  
  * *Citation & Source:* DPDP Act 2023 (Act No. 22 of 2023, published 11 August 2023); MeitY Notification of DPDP Rules 2025 (13 November 2025, G.S.R. 843(E)); IT Rules 2021 (G.S.R. 139(E)); [MeitY Portal](https://www.meity.gov.in).  
  * *Application:* Section 9 requires verifiable parental consent for users under 18. Historical India-specific grievance references in earlier drafts have been reframed into a neutral "Operational review target".

---

## 5. Facts-and-Behavior Matrix

The table below provides an exact audit mapping across all 11 required alignment domains, rigorously categorizing every aspect:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ CATEGORICAL CLASSIFICATION LEGEND:                                                                      │
│ [ENG]   Engineering implementation in source code and configuration.                                    │
│ [FACT]  Owner-supplied factual parameter or credential.                                                 │
│ [POL]   Product or organizational policy choice.                                                        │
│ [LEGAL] Legal interpretation requiring qualified counsel review.                                        │
│ [ACC]   Remaining operational, vendor, or legal acceptance gate.                                        │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

| Domain | Implemented Product Behavior | Categorical Classification | Audit Finding & Verification Evidence |
| :--- | :--- | :--- | :--- |
| **1. Terms / Privacy / Trust Center Pages** | Static legal documents served at `/terms`, `/privacy`, `/community-guidelines`. Interpolates configured operator details or renders clear development/unconfigured notices. Minimum age 18 prominently stated. | `[ENG]` Render logic in `legal.tsx`<br>`[FACT]` Operator & contact values<br>`[POL]` Notice copy choices<br>`[ACC]` Final legal sign-off | **ALIGNED**. Pages explicitly display configured values or clearly disclose unconfigured status. No misleading compliance guarantees are rendered. |
| **2. Runtime Operator Fields** | Strict environment validation parses operator identity, addresses, and contacts. In `PUBLIC_BETA=true`, startup throws if placeholders remain. | `[ENG]` `env.ts` schema validation<br>`[FACT]` Production values<br>`[ACC]` Runtime secret deployment | **ALIGNED**. System prevents running public beta with unpopulated placeholders (`CHANGE_ME`). |
| **3. Registration & Eligibility Behavior** | Registration requires `acceptedTerms: true` and `confirmedAge: true`. `isAllowedEmail` blocks unauthorized domains. Central eligibility engine fails closed if territory is unapproved. | `[ENG]` `auth-service.ts`, `policy.ts`<br>`[POL]` 18+ age limit<br>`[POL]` Allowlist enforcement<br>`[ACC]` Territory registry approval | **ALIGNED**. Registration verified in `policy-and-release-scope.test.ts`. Adult threshold and domain filters prevent unauthorized activation. |
| **4. Consent & Withdrawal** | Terms consent recorded at timestamp `termsAcceptedAt`. Missing consent returns HTTP 428. Telemetry consent can be revoked at any time in Settings. | `[ENG]` `auth.ts` middleware, `settings.tsx`<br>`[POL]` Consent withdrawal model<br>`[ACC]` Workstream 2 consent ledger | **ALIGNED**. Revoking telemetry clears `localStorage` and buffered queues immediately. Session consent gating verified. |
| **5. Telemetry Purpose Enforcement** | Server route `/api/telemetry/events` validates batches against `productEventSchema`. Only `navigation` and `react:profiler` events are allowed. Ad tracking and marketing profiling are rejected. | `[ENG]` `product-analytics-service.ts`<br>`[POL]` No third-party trackers<br>`[LEGAL]` Purpose limitation under GDPR | **ALIGNED**. Verified in `policy-and-release-scope.test.ts`. Third-party marketing scripts are completely absent. |
| **6. Account Export** | Authenticated endpoint `GET /users/me/export` collects profile, interactions, relationships, and orders. Excludes all deleted messages (`deletedAt != null`) and expired messages (`expiresAt <= now`). Excludes password hashes and TOTP keys. | `[ENG]` `account-service.ts`<br>`[POL]` Export data scope<br>`[LEGAL]` GDPR Art. 20 portability compliance | **ALIGNED**. Verified in `account-service.test.ts`. Deleted and expired content rows are completely excluded from exports. |
| **7. Account Deletion** | Authenticated `DELETE /users/me` requires password confirmation. Executes in single SQL transaction: anonymizes ledger rows, scrubs marketplace shipping PII, clears contact shields, and deletes user row. | `[ENG]` `account-service.ts`<br>`[POL]` Transactional deletion<br>`[ACC]` Off-host backup disposal policy | **ALIGNED**. Transaction rollback verified in `account-service.test.ts`. Password verification and session invalidation confirmed. |
| **8. Group Conversation History** | User deletion sets `conversations.participantA/B` to NULL and `messages.recipientId` to NULL. Message `senderId` cascades on delete. Group conversation and surviving members' contributions remain intact. | `[ENG]` `lib/db/src/schema/index.ts`<br>`[POL]` Conservative author erasure<br>`[LEGAL]` Joint controller & communication rights | **ALIGNED**. Verified in `scripts/test-cascade-safety.mjs`. Surviving contributions remain preserved without orphan cascades. |
| **9. Logs & Queue Payload Retention** | BullMQ notification queue prunes completed jobs after 1 hour (max 1000) and failed jobs after 7 days (max 1000). Stack traces limited to 0 to prevent SQL leakage. Redis is transport; PostgreSQL outbox is deduplication source. | `[ENG]` `notification-job-policy.ts`<br>`[POL]` Queue operational limits<br>`[POL]` Corporate retention policy (missing) | **ALIGNED WITH OPERATIONAL LIMITS**. Operational cleanup parameters are strictly bounded. Distinct from corporate retention schedule. |
| **10. Media Cleanup & Holds** | Staged media uses server-owned lifecycle with signed presets. Account deletion queues `media_cleanup_holds`. Background lifecycle worker periodically sweeps unreferenced media. | `[ENG]` `lifecycle-worker.ts`, `media-service.ts`<br>`[ACC]` Provider credential acceptance | **ALIGNED**. Periodic sweeps run every 60s under advisory database locks. Preserves deletion holds for review. |
| **11. Backups & Restored Copies** | Database dumps encrypted with `age` public key, uploaded off-host via `rclone`. Local staging files pruned after 14 days. Restore script enforces isolated target verification and refuses populated databases. | `[ENG]` `backup-database.sh`<br>`[FACT]` `BACKUP_AGE_RECIPIENT`<br>`[ACC]` Disaster recovery drill acceptance | **ALIGNED**. Script verified in `deployment-validation.test.mjs`. Multi-tenant and dirty database overwrites prevented. |

---

## 6. Grievance Redressal Alignment

Public grievance intake (`POST /reports/grievance`) and receipt tracking (`GET /reports/grievance/:ticketId`) have been aligned with strict privacy guarantees:

1. **Explicit Public Receipt Allowlist:**
   The public response contains strictly:
   ```json
   {
     "ticketId": "YT-GRV-849201ABCD",
     "status": "received",
     "createdAt": "2026-10-10T00:00:00.000Z",
     "slaDeadline": "2026-10-12T00:00:00.000Z"
   }
   ```
2. **Protection of Private Case Fields:**
   * `reporterName`, `reporterEmail`, `reportedUrl`, `description`, internal `id`, and moderator `officerNote` are completely omitted from public API envelopes.
   * Public tracking by ticket ID confirms case receipt and current status without disclosing underlying complaint details.
3. **Operational Review Target Framing:**
   * The `slaDeadline` timestamp is explicitly displayed as an **"Operational review target"** in both the UI and documentation.
   * It is not framed as a statutory deadline, preventing misleading legal commitments.
4. **Staff Authorization Barrier:**
   * Moderation queues (`GET /reports/grievances`, `GET /reports/queue`) and status updates (`PATCH /reports/grievance/:ticketId/status`) require authenticated JWT tokens with `admin` or `moderator` roles.
   * Unauthenticated or ordinary user requests receive HTTP 401 or HTTP 403.

---

## 7. Retention Disclosures vs System Settings

A critical governance distinction is maintained between **operational cleanup durations** and an **approved organizational retention policy**:

```
OPERATIONAL SYSTEM SETTINGS (Implemented)               ORGANIZATIONAL RETENTION POLICY (Pending)
┌──────────────────────────────────────────────┐        ┌──────────────────────────────────────────────┐
│ • Redis Queue Completed Jobs: 1 hour / 1000  │   ≠    │ • User Account Data: Active duration + audit │
│ • Redis Queue Failed Jobs: 7 days / 1000     │        │ • Grievance Records: Statutory retention     │
│ • Local Backup Staging: 14 days              │        │ • Financial Ledgers: Tax statutory period    │
│ • Product Analytics Query Window: 90 days    │        │ • Security Audit Logs: Compliance schedule   │
└──────────────────────────────────────────────┘        └──────────────────────────────────────────────┘
```

* The BullMQ queue cleanup duration (1 hour) is an in-memory transport constraint designed to prevent Redis memory exhaustion, **not a policy statement that notification records are destroyed after one hour**. (Notifications persist durably in PostgreSQL `notificationsTable`).
* The local backup staging duration (14 days) is a local disk hygiene setting, **not the total retention lifecycle of remote off-host disaster recovery backups**.
* The owner must adopt a formal Corporate Data Retention Schedule defining lawful retention periods for all data categories.

---

## 8. Verification & Test Evidence

Product behavior and release guards have been verified via automated test suites:

| Test Suite / Script | Verification Command | Result | Verified Behaviors |
| :--- | :--- | :--- | :--- |
| **Release Scope & Policy Invariants** | `pnpm --filter @workspace/api-server exec tsx --test src/__tests__/policy-and-release-scope.test.ts` | **8 passed, 0 failed** | Min age 18; disabled capabilities; empty territory registry; age-18 registration gate; grievance allowlist projection; message visibility expiry boundary; queue retention distinction; group cascade safety; telemetry schemas. |
| **Root Unit Suite** | `pnpm test:unit` | **79 passed, 0 failed** | Core session boundaries, deployment configuration validation, Google OAuth hardening, media client, Alertmanager configuration rendering. |
| **Beta Feature Gates** | `pnpm --filter @workspace/api-server exec tsx --test src/__tests__/beta-feature-gates.test.ts` | **2 passed, 0 failed** | Gated payment creation; live room, push, and stream endpoints stay closed through both `/api` and `/api/v1` prefixes. |
| **Eligibility Policy Engine** | `pnpm --filter @workspace/api-server exec tsx --test src/__tests__/eligibility-policy.test.ts` | **15 passed, 0 failed** | Fails closed on missing/synthetic proof; empty registry rejection; strict content ceilings. |
| **API Contract Validation** | `pnpm contract:check` | **237 operations across 200 paths verified** | OpenAPI spec matches route implementations and typed Zod schemas. |
| **Production Config Schema** | `pnpm production-config:check` | **70 schema keys verified** | Environment variables synchronized across Compose, API, and frontend. |

---

## 9. Regulatory Disclaimer & Boundary Statement

**Explicit Disclaimer:**  
This document and the associated code verification establish that the software product implements specific architectural bounds, error handling, access controls, and data sanitization routines. **They do not constitute legal advice, an attorney-client communication, or an absolute certification of compliance with European Union, United States, United Kingdom, Australian, Brazilian, Indian, or other international laws.** 

Legal compliance is an organizational, contractual, and operational status that requires qualified legal counsel review, authentic corporate disclosures, executed data processing agreements with third-party vendors, designated data protection officers, and active organizational privacy practices.
