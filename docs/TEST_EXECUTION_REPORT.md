# Test execution report

Updated **17 October 2026**. **Provisional: final revision verification is in progress.** Release remains **BLOCKED / NO-GO**. Results are recorded by command and source boundary; no skipped, aborted, stale or mocked-provider case is counted as real production acceptance.

## Reproduction and isolation

Use Node 24 and the pinned pnpm 11.28.5. Install with `pnpm install --frozen-lockfile`. Current source must pass contract/client generation checks, design/config checks, root unit tests, both typechecks, API tests, frontend build/Chromium tests and isolated production container/backup checks. There is no configured general ESLint script; a typecheck is not reported as lint. The CI job uses serial API tests and FFmpeg decoder coverage on Linux.

Root backend fixtures are disposable PostgreSQL 16 / Redis 7 containers bound only to loopback 55447 / 16391, using synthetic credentials kept outside the repository. Tests must not target production or the six pre-existing user containers. Agent fixtures/projects use their own names/ports. Never copy environment values or private test payloads into reports.

## Observed executions

| Scope and command | Observed result | Revision / limitation |
| --- | --- | --- |
| Earlier full API, `node --import tsx --test --test-concurrency=1 src/__tests__/*.test.ts` | 495 tests: **494 passed, 0 failed, 1 skipped**, 381.257 seconds | 16 October post-audit run, before the newest Google/push/terms/logging/upstream reconciliation. Historical regression evidence only; the skipped native decoder is not a pass. Raw log was retained in the local temporary audit directory. |
| 17 October focused client/font tests | **42 passed, 0 failed** | Agent observed run before latest Studio/merge changes; not full current-root or browser acceptance. |
| Earlier root unit / browser runs | 106 root cases and 86 browser cases were previously reported passing | Superseded by added font/SW/Studio/security changes. These are not final revision counts. |
| Current production configuration and Compose parsing | Passed, schema checker reported 69 API keys | Agent observed before final upstream reconciliation; repeat affected checks after changes. |
| Latest remote `main` CI | **FAIL**, no jobs, no downloadable job log | [38730221079](https://github.com/[REDACTED legacy test credential]/yor-talksv2/actions/runs/38730221079), `72bd6a9500e686f9f5385acea1b89a03be26d06a`. Duplicate workflow/lockfile mapping keys found in source; application tests did not execute. |
| PR #25 historical CI | **PASS**, old head only | [38168692161](https://github.com/[REDACTED legacy test credential]/yor-talksv2/actions/runs/38168692161), `203f6de9a6513ef21361e31edd6f3918ea0b15c8`. Draft/conflicted PR and NO-GO unchanged. |
| Windows resource interruption | **NOT A PASS** | Code-mode/shell launch failed with OS error 1455 (paging file too small). Live handles must be revalidated; no completed result inferred from progress output. Heavy checks are serialized. |

The focused security report records a 66-case attempt (65 pass, one fixture assertion failure) and the corrected affected 11/11 notification cases. It does not imply that a final aggregate suite has run. See [SECURITY_FINDINGS.md](SECURITY_FINDINGS.md) for the precise fixture and test boundary.

## Required current evidence still being collected

Frozen-lockfile install and all-scope dependency audit; strict workflow/lockfile parsing; both API clients and route contract; design tokens and production config; current serial root/API suites; fresh migration and repeat migration; API/frontend typechecks and builds; current Chromium E2E at the requested widths/themes with console, reduced-motion and representative keyboard/axe checks; exact image build/runtime readiness and provider isolation; restricted DB-role denials; encrypted backup/restore success and failure cleanup; Linux secret permissions; final diff/secret inspection and exact pushed commit/hosted CI.

This is a pending evidence list, not a claim that any item passed. Findings and inaccessible providers are tracked in [release gates](RELEASE_GATE_STATUS.md). Real OAuth/mail/media/payment/age assurance, production DNS/TLS/WebSocket/worker deployment, off-host durability and manual screen-reader acceptance cannot be established by mock responses or loopback smoke.
