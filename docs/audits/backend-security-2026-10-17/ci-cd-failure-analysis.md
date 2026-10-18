# CI/CD Failure Analysis

Evidence collected on **18 October 2026**, using GitHub repository metadata, actual jobs, authenticated job logs, local source checks and local reproduction. GitHub's existing credential helper was used in memory only; no token was printed or written into this report. No workflow deploys, merges, or modifies production.

## Repository baseline and release candidate

Default branch: **`main`**, observed SHA **`8c5a763893a53bad412946888a3c965deec46598`**. Audit baseline: **`62920ade36e6310f3dc449c8dfc6da07a2585f05`** on `codex/compliance-audit-20261017`; implementation branch: `audit/backend-security-20261017`. The audit baseline and current main share `72bd6a9500e686f9f5385acea1b89a03be26d06a`; main has one additional commit and the audit baseline has two. The baseline differs from current main in **333 files**, including already existing frontend changes. Those inherited changes are not authored by this backend audit and must not be folded into an apparently backend-only PR against main. Delivery is stacked against the baseline branch so the new review diff contains only authorized backend/security work.

Open PRs observed:

| PR | State / base | Head SHA |
| --- | --- | --- |
| [25](https://github.com/yorayriniwnl/yor-talksv2/pull/25) | Draft; `main` | `203f6de9a6513ef21361e31edd6f3918ea0b15c8` |
| [24](https://github.com/yorayriniwnl/yor-talksv2/pull/24) | Open; `codex/global-age-privacy-20261007` | `598a18bff5c433d68df983dda1e92702c770ce5a` |
| [23](https://github.com/yorayriniwnl/yor-talksv2/pull/23) | Open; `codex/media-lifecycle-20261006` | `d5b83bffc0f38dce1dcdbd8c58205e3db5226290` |
| [20](https://github.com/yorayriniwnl/yor-talksv2/pull/20) | Draft; `main` | `e45b10d1734dcd1d59f0eef5c980e8b71f304708` |

PR #25 is **85 commits ahead and 19 behind** current main, with merge base `f29d74c6c0b7aa81ef1e86bd882de29276e51f89`. The direct difference between the two current trees is **383 files, 40,265 insertions and 11,707 deletions**. This is distinct from GitHub's merge-base comparison. Exact [direct file statuses](evidence/pr25-vs-main-files.txt), [direct diff statistics](evidence/pr25-vs-main-stat.txt), and [GitHub comparison metadata and commits](evidence/pr25-comparison.json) are retained. PR #25 includes different authentication, ingress/proxy, eligibility, media, lifecycle, notification, migrations and deployment revisions; its historical results are not substituted for this audit baseline.

## Actual failing runs

| Run / job | Commit | Actual failure and classification | Reproduction / disposition |
| --- | --- | --- | --- |
| [39122349281 / 117660331490](https://github.com/yorayriniwnl/yor-talksv2/actions/runs/39122349281/job/117660331490) | Current main `8c5a763` | **Install dependencies**: `ERR_PNPM_BROKEN_LOCKFILE`, duplicated YAML mapping key at line 12. Source/lockfile defect. Main repeats `engine.io`, `ip-address` and `proxy-addr` override keys. | Exact main lockfile inspected with `git show`; actual log retained. Audited baseline has unique mappings and installs with pinned pnpm. Main itself was not edited or pushed. The eventual main integration must retain the corrected baseline lockfile. |
| [38980926025 / 117241355596](https://github.com/yorayriniwnl/yor-talksv2/actions/runs/38980926025/job/117241355596) | Audit baseline `62920ad` | **Run browser-state and session-boundary unit tests**: one failure, `tests/font-assets.test.mjs:7`; license/source asset SHA expected `2bada5ea…` but actual `febfd2b4…` at line 29. Frontend artifact/provenance defect. All later backend/database/container steps were skipped by the single job. | Full job log retrieved. Local font test also fails, earlier at line 15 on the stylesheet/service-worker cache key. This is a separate locally observed assertion, not claimed to reproduce the exact Linux SHA assertion. No frontend files or tests were changed. |
| [38964583881 / 117187763006](https://github.com/yorayriniwnl/yor-talksv2/actions/runs/38964583881/job/117187763006) | Previous baseline `2e80acb` | Same font asset test and SHA mismatch in the browser-state unit step. Source/frontend artifact defect. | Actual job log retrieved; handed off with the same frontend acceptance contract below. |

Raw job logs: [main install failure](evidence/github-job-117660331490.log), [baseline font failure](evidence/github-job-117241355596.log), [previous baseline font failure](evidence/github-job-117187763006.log). [Jobs metadata](evidence/github-jobs-38980926025.json), [recent run snapshot](evidence/github-runs.json), [main annotations](evidence/github-main-annotations.json), and [local font reproduction](evidence/frontend-font-existing-failure.txt) support the classifications.

The PR #25 run [38168692161](https://github.com/yorayriniwnl/yor-talksv2/actions/runs/38168692161) succeeded at its historical head on 11 October. It does not establish passing CI for this audit's changed files, audit baseline or current main. Of the latest 20 run records inspected, 3 succeeded and 17 failed; these are workflow history counts, not current-branch test totals.

## Implemented repair

Added an **independent `backend` job** to `.github/workflows/ci.yml`. It has no dependency on the full `verify` job and no conditional skip or `continue-on-error`. It preserves the existing `verify` job unchanged, including its frontend, security, container and release checks.

The added job uses PostgreSQL 16, Redis 7, SHA-pinned existing actions, Node 24 and pnpm 11.28.5. It requires frozen-lockfile installation, all-scope dependency audit, API contract validation, backend/infrastructure regression tests, database package build and migrations, API typecheck, mandatory media decoder tests, the complete serial API test glob, API build, production configuration validation, backup temporary-file cleanup tests and restricted runtime-role verification. All credentials are explicit synthetic CI fixtures. Assurance remains `unavailable` and the production policy source remains `approved_registry`; test fixtures do not activate real providers.

The new regression test checks that frontend failures cannot skip backend evidence, that security/integration steps remain required, that actions are pinned and that the original web unit/browser checks remain present. Local infrastructure regression result: **11 tests passed, 0 failed, 0 skipped**, including this new regression. [Executed result](evidence/infrastructure-regression.txt). Dependency auditing with the exact pinned CLI also passed; current-head API/database results are in the final test report. A newly pushed PR run must be inspected before any claim that remote current-head CI passes.

An independent fresh-output check also tested the suspected API-Zod build prerequisite: the ignored `lib/api-zod/dist` directory was temporarily moved to a unique verified sibling, API typecheck ran with incremental compilation disabled, and the original outputs were restored in `finally`. The command exited **0** without diagnostics. The API project references the validation project but currently imports no `@workspace/api-zod` source, so missing declaration outputs do not produce TS6305. No speculative build repair was applied. [Command and restoration evidence](evidence/ci-missing-api-zod-output.txt).

## Workflow security review

- Workflow permissions are restricted to `contents: read`; there is no `pull_request_target`, shell interpolation of PR titles/bodies, repository write token or deployment step.
- Actions use full commit SHAs. Tool versions match the root manifest. `pnpm audit` includes development/build packages; failures are not ignored.
- Pull requests and manual dispatch trigger verification. Push triggers remain limited to main and `codex/**`; the audit branch receives CI through its PR.
- GitHub currently warns that the pinned actions declare Node 20 while runners force Node 24; this is a maintenance warning, not the observed install/font failure. An additional annotation announces the `ubuntu-latest` transition to Ubuntu 26 beginning 19 October 2026. The next actual run must be evaluated on its selected runner. [Exact annotations](evidence/github-main-annotations.json).
- Full release verification retains container/provider-isolation and encrypted-backup round-trip checks. Source presence does not mean those steps ran when the font test failed. No required check was removed to hide that failure.

## Frontend handoff contract

GPT 1 owns `social/public/fonts/*`, `social/public/sw.js`, `social/index.html` and `tests/font-assets.test.mjs`. The exact failing test is **“font delivery uses local complete WOFF2 assets and ships their pinned source license notices”**. Reconcile the checked-in source/license SHA with the actual vendored file, verify the source provenance, and make the stylesheet cache key match the service-worker cache update. Acceptance: the existing font test passes on Linux and the full `verify` job proceeds past root unit tests without removing assertions or weakening provenance checks. No API route change is needed for this issue.

## Findings

| ID | Severity | Component | Root cause | Fix | Test | Evidence | Remaining risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CI-001 | P1 | Current-main dependency install | Duplicate lockfile YAML override keys. | Correct mappings are already in the chosen audit baseline; no main mutation performed. | Main actual log and `git show`; audited baseline duplicate-key regression passes. | Job 117660331490; current main lockfile. | Current main remains failing until reviewed integration preserves the corrected lockfile. |
| CI-002 | P2 | Full release verification | Frontend font provenance/cache assertions fail. | Precisely handed off within frontend ownership. Existing checks kept. | Actual two failing Linux jobs; local font test fails at a separate cache assertion. | Jobs 117241355596/117187763006 and local failure evidence. | Full release CI remains failing; later steps are not successful merely because they exist. |
| CI-003 | P2 | Backend verification coverage | Monolithic workflow stops all backend checks after an unrelated frontend failure. | Added mandatory independent backend job; preserved full verification. | Infrastructure regression 11/11, no skips; new job regression included. | Workflow diff and `evidence/infrastructure-regression.txt`. | New remote job must complete at the delivered PR head; full release readiness still requires the full job. |

**CI release gate: FAIL for the observed main and baseline runs. Independent backend job: implemented and locally validated; remote PR status must be recorded after delivery.**

## Continuation on 19 October 2026

The delivered backend head `41024f2755723395b02a0d9184d9189e54943b86` has actual hosted evidence: [backend job 117722619699](https://github.com/yorayriniwnl/yor-talksv2/actions/runs/39143532456/job/117722619699) passed on Linux with PostgreSQL 16 and Redis 7, including all **593 API tests, zero failures/skips**, backup failure cleanup and restricted runtime-role checks. The [full verify job 117722619940](https://github.com/yorayriniwnl/yor-talksv2/actions/runs/39143532456/job/117722619940) failed the existing frontend font license hash assertion. [Exact job/step metadata](evidence/hosted-ci-41024f2.json) supersedes the earlier pending-at-commit statements for that head.

Commit `3382ed5647cb7785ecb8ca49c6f93be447af8077` moves the existing four production infrastructure steps into an independent `infrastructure` job. Compose validation, Linux secret permissions, actual image builds, provider-isolated stack smoke, encrypted backup retrieval/restore, runtime identity and Redis rate-limit assertions are preserved. The backend job and all preceding full verify steps are unchanged; frontend assertions still fail the workflow when incorrect. This removes the remaining frontend dependency from infrastructure evidence without claiming branch-protection settings were changed. Local backend/infrastructure selection now passes **13 tests, zero failed/skipped**, including the new workflow regression and existing Multer regression.

The minimal font repair already exists in frontend commit `dafdb974f972040fbc16ee036dac6d5628820ff0`: `social/.gitattributes` and `social/public/fonts/dmmono-OFL.txt`. The corrected license matches the manifest and the pinned Google Fonts revision byte for byte. [Source/hash and read-only test evidence](evidence/font-fix-handoff-20261019.json). The original task prohibits `social/**` changes; these files require a narrow ownership exception before integration. No font assertion or expected hash was changed.
