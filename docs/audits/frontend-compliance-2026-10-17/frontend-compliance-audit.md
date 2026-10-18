# Frontend Compliance Audit

Requested audit date: **17 October 2026**. Execution: **18 October 2026 (Asia/Calcutta)**. This is an implementation and evidence review, not legal approval, WCAG certification, or a production release decision.

## Source and delivery boundary

- Repository: `yorayriniwnl/yor-talksv2`; remote default branch `main`, observed at `72bd6a9500e686f9f5385acea1b89a03be26d06a`.
- On resumption, `main` was fetched at `8c5a763893a53bad412946888a3c965deec46598`. The intervening seven files concern backend/release evidence; no frontend file changed on that default-branch line. The supplied baseline still diverges from `main`, so focused delivery retains its explicit stacked base.
- Inspected frontend baseline: `62920ade36e6310f3dc449c8dfc6da07a2585f05`, the supplied checkout's latest frontend commit, dated 17 October. It already contains work beyond `main`, including backend changes and earlier frontend repairs. Those existing improvements are not counted as new fixes in this audit.
- Isolated branch: `audit/frontend-compliance-20261017`; worktree `C:/Users/yoray/Projects/yor-talks-frontend-audit-20261017` (Windows resolves the Projects junction to `F:/CHATPGPT/Projects/...`). Original checkout and its uncommitted `api-server/src/config/env.ts` and `dev.mjs` changes were left untouched.
- Focused comparison base: `codex/compliance-audit-20261017` at the baseline SHA. The PR is stacked on that supplied baseline, so its diff does not republish unrelated backend work against `main`. Reviewing or integrating the baseline is a separate release responsibility.
- PR #25 was read through GitHub's API: open, `mergeable_state: dirty`, head `release/unified-release-20261009`, base `main`. It was not modified or merged.
- Only `social/**`, newly named frontend compliance test/support files under `e2e/`, and this report directory are changed. No root dependency lockfiles, backend, database, migrations, workflows, or operations files were changed. No deployment, real payment, production-data mutation, or external message was performed.

## Requirement matrix

PASS means the inspected current frontend behavior satisfies the stated scoped check with evidence. PARTIAL means useful behavior is implemented but the remaining verification or integration condition prevents a whole-requirement pass. BLOCKED requires an external decision or evidence. A local test pass does not establish production/legal compliance.

| Requirement | Before | After | Evidence | Remaining issues |
| --- | --- | --- | --- | --- |
| 1 Privacy Policy | PARTIAL: notice existed, account/export/storage disclosures incomplete | PARTIAL | `social/src/pages/legal.tsx`; [legal review](legal-pages-and-consent-review.md); public-route regression | Approved retention periods, provider locations/contracts, rights operations and actual operator assertions require review |
| 2 Terms of Service | PARTIAL: version gate existed; acknowledgement wording and successful/mismatched acceptance UX defective | PARTIAL | `pages/auth.tsx`, `pages/consent.tsx`, `App.tsx`, `lib/store.ts`; consent tests | Backend must bind the recorded acceptance to the version actually displayed |
| 3 Refund Policy | PARTIAL: Premium supplied refund text; some checkout surfaces bypassed frontend payment flag | PARTIAL | `pages/premium.tsx`, `pages/billing.tsx`, `lib/razorpay-checkout.ts`; commerce tests | Non-Premium refund/quote contracts and approved payment launch remain blocked |
| 4 Cookie and Storage Policy | PARTIAL: `/cookies` existed with useful inventory | PARTIAL | [storage inventory](legal-pages-and-consent-review.md); `pages/legal.tsx`; service-worker/font tests | Provider/browser internals and actual deployment settings need verification; unknown periods are identified, not invented |
| 5 Cookie Consent | PARTIAL: analytics off by default; withdrawal/send races and saved-choice controls defective | PASS for current frontend/no-collection release | Consent tests exercise persistence, rejection, cross-tab withdrawal, storage denial, eligibility and actual batching source | No optional collectors are mounted; server consent enforcement is required before future activation. No unnecessary tracking/banner added |
| 6 Form Consent | PARTIAL: explicit unchecked terms existed; error focus/retained-choice/accessibility gaps | PARTIAL | Auth, reacceptance, grievance, recovery, eligibility and Settings regressions | Version-bound backend acceptance and real-provider end-to-end delivery remain external |
| 9 Dark Patterns | PARTIAL: false urgency and live/verified-looking local previews remained | PARTIAL | [commerce review](commerce-and-claims-review.md); sample and cancellation tests | Some product previews remain local-only and explicitly labelled; no real paid cancellation/provider acceptance performed |
| 10 Hidden Fees | PARTIAL: paid controls could bypass local gate; unsupplied Super Pass price shown | PARTIAL | Payment gate and sample-copy fixes; server Premium amount/refund display | Server-authored complete quotes and versioned policies needed before enabling other paid flows |
| 11 Fake Reviews | PARTIAL: baseline had removed fabricated reviews; residual sample audience/rank/progress looked genuine | PASS for inspected frontend source | Explicit sample/local-preview labels; real media-kit/trophy sources preserved; commerce and existing regressions | Does not certify the truth of future UGC or a production database; synthetic test fixtures remain isolated |
| 12 Unsupported Claims | PARTIAL: unsupported latency/codec/provider badges and plan benefits | PARTIAL | Commerce review; dashboard chart/rate semantics; no compliance certification added | Actual operational/provider/security/legal assertions require owners' evidence |
| 13 Accessibility Alt Text | PARTIAL: some collapsed/icon controls unnamed; decorative canvases/labels inconsistent | PARTIAL | [accessibility audit](accessibility-audit.md); axe and keyboard tests; named shared controls | UGC descriptions and untested populated route/provider combinations need manual review |
| 14 Color Contrast | PARTIAL: light-theme communication controls failed | PARTIAL | Shared foreground token fixes; light/dark axe evidence at five widths | Automated coverage is sampled; arbitrary UGC colors, media, third-party UI and manual review remain outside a blanket pass |
| 15 Keyboard Navigation | PARTIAL: Stories lacked modal keyboard/focus behavior; composer/search/voice gaps | PARTIAL | Dialog focus trapping/restoration, Escape, skip link, Story pause/seek and search regressions | Screen-reader/assistive-device and all-provider/all-content manual acceptance remain outstanding |
| 16 Business Details | BLOCKED: configured fields are assertions, not verified identity/approval | BLOCKED | Whitespace/date checks, explicit incomplete-notice warnings; legal review | Verified identity/address/officer/contact ownership, legal approval and deployment configuration are operator launch gates |
| 19 Font and Image Licensing | PARTIAL: pinned fonts existed, Windows checkout broke evidence hashes; art/photo provenance incomplete | PARTIAL | [asset inventory](asset-license-inventory.md), local/remote CSVs, shipped Lucide notice, exact upstream font hashes | Commercial-use/attribution/ownership evidence for branded/native art and remote photos; dormant external audio remains excluded from active routes |

**15 primary requirements reviewed: 2 PASS, 12 PARTIAL, 0 FAIL, 1 BLOCKED, 0 NOT APPLICABLE.** The after column describes the current evidence boundary; it is not a completion percentage.

## Discovery and verification coverage

The app uses React/TypeScript/Vite, Wouter routing, Zustand, Tailwind/theme tokens, Radix dialogs and existing media/security contracts. Public notices are matched before authentication/eligibility gates. Source review covers account/settings/security/consent, registration/verification/onboarding, social navigation/content/media, creator tools, gaming/local-preview areas, marketplace and billing. Existing code was preserved where it already used genuine APIs or documented unavailable features.

Principal browser journeys cover public legal and grievance routes, registration/reacceptance/provider choice, account eligibility/guardian records, Settings/export/deletion/privacy, home/explore/messages/notifications/worlds/saved, modal composer/search/Stories, populated conversations, dashboard charts, billing recovery/cancellation and representative demo-commerce surfaces. Both themes and requested widths **320, 390, 768, 1024 and 1440px** are represented. Detailed executed outcomes and limitations are in the [test report](frontend-test-report.md), including failures found and corrected, preserved legacy-test assumptions, and infrastructure failures.

Read-only HTTP checks of `/`, `/privacy`, `/terms`, `/cookies`, `/community-guidelines`, `/grievance` on `https://yor-talks.vercel.app` returned 200 HTML on 18 October. This confirms SPA route delivery only; browser evidence in this audit comes from the local production build with explicit synthetic API/provider fixtures, not live authenticated production acceptance.

## Remaining findings and owners

| ID | Priority | Remaining condition | Owner / disposition |
| --- | --- | --- | --- |
| LEGAL-01 | P1 | Verified operator/contact/officer details, approved terms/retention/provider/transfer facts and legal evidence | Operator/legal; public-launch blocker |
| CONSENT-01 | P1 | Registration/reacceptance API accepts a boolean without binding the displayed terms version | Backend/release; exact proposed contract in [dependencies](backend-dependencies.md) |
| ANALYTICS-01 | P1 before activation | Server-persisted, revocable analytics permission and enforcement/retention absent | Backend/privacy; collectors remain unmounted |
| DELIVERY-01 | P1 | Real staging acceptance for cookie/security/provider/email/rights paths and build configuration | Deployment/operations; no production deployment authorized |
| COMMERCE-01 | P1 before paid launch | Non-Premium complete payable quote, fee treatment and versioned refund disclosure/acceptance | Backend/payment/legal; checkout remains gated |
| LICENSE-01 | P1 before publication approval | Evidence incomplete for branded/native assets and remote imagery | Asset owner/legal; unknown evidence is not a finding of infringement |
| RIGHTS-01 | P2 | Operational verified-support workflow for guest/unbound data access/correction/deletion | Privacy/support; documented API exclusions preserved |
| GRIEVANCE-01 | P2 | No server idempotency contract for ambiguous report-submission delivery | Backend/trust; draft and uncertainty remain visible |
| A11Y-ACCEPTANCE-01 | P2 | Screen-reader/device, arbitrary UGC/media, captions/transcripts and remaining route/provider manual acceptance | Product/accessibility; automated sample results are not certification |
| TEST-MIGRATION-01 | P2 | Preserved legacy tests assume automatic Google loading or ambiguously select repeated shell/page headings; payment cases require an explicitly enabled synthetic fixture | Existing-test/CI owner; new compliance files provide corrected coverage; ownership rules prohibit editing the old test/config files |
| TOOLING-01 | P3 | No configured lint script or ESLint configuration in this checkout | Frontend maintainers; attempted and reported, no unrelated toolchain installation |
| BUNDLE-01 | P3 | Vite reports existing large production chunks | Frontend/performance; build succeeds; no audit-driven application rewrite |

**Open register: P0 0; P1 6 (two conditional on future tracking/payments); P2 4; P3 2.** These counts refer to distinct rows above; overlapping requirement dependencies are not double-counted. See [implementation changelog](implementation-changelog.md) for the separate, enumerated corrected-defect count and [delivery](github-delivery.md) for file/commit/PR evidence.

Accessibility checks use the [W3C WCAG 2.2 reference](https://www.w3.org/WAI/WCAG22/quickref/). The reports deliberately make no GDPR, DPDP or WCAG compliance claim.
