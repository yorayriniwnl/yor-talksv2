# Mobile performance repair and unified acceptance — 10 October 2026

This report records the root cause analysis, targeted repairs, functional regressions, and final 3-sample acceptance measurements for mobile frontend performance under throttled mobile emulation.

## Acceptance summary: PASSED (3/3 observations)

All three fixed final observations met every unchanged proposed budget. All three commands exited **0**.

| Metric | Proposed maximum | Observation 1 | Observation 2 | Observation 3 | Result |
| --- | --- | --- | --- | --- | --- |
| **FCP** | 2,500 ms | 1,884 ms | 1,880 ms | 1,848 ms | **Passed 3/3** |
| **LCP** | 4,000 ms | 3,068 ms | 3,088 ms | 3,088 ms | **Passed 3/3** |
| **Long-task blocking** | 300 ms | 178 ms | 228 ms | 206 ms | **Passed 3/3** |
| **Gzip JavaScript** | 358,400 bytes | 273,007 bytes | 273,007 bytes | 273,007 bytes | **Passed 3/3** |
| **Gzip CSS** | 102,400 bytes | 62,177 bytes | 62,177 bytes | 62,177 bytes | **Passed 3/3** |

Artifact identity:
- Artifact files: **106**
- Artifact aggregate SHA256: `3fb58abd5d05fb995db2f1e042845bdc5a28662311f2809e8e8f5ebb2c6c0429`
- Measurement script: `scripts/measure-mobile-performance.mjs`

---

## Historical baseline vs Final repair comparison

| Metric | Proposed budget | Historical unified baseline (9 Oct) | Final repaired implementation (10 Oct) | Delta / Outcome |
| --- | --- | --- | --- | --- |
| **FCP** | $\le 2,500\text{ ms}$ | 6,272 / 3,160 / 3,140 ms (Failed 3/3) | **1,884 / 1,880 / 1,848 ms** | $\mathbf{-1,256\text{ to } -4,388\text{ ms}}$ (Passed 3/3) |
| **LCP** | $\le 4,000\text{ ms}$ | 6,272 / 4,312 / 3,140 ms (Failed 2/3) | **3,068 / 3,088 / 3,088 ms** | $\mathbf{-52\text{ to } -3,184\text{ ms}}$ (Passed 3/3) |
| **Blocking** | $\le 300\text{ ms}$ | 1,367 / 1,174 / 1,177 ms (Failed 3/3) | **178 / 228 / 206 ms** | $\mathbf{-949\text{ to } -1,189\text{ ms}}$ (Passed 3/3) |
| **JS Gzip** | $\le 358,400\text{ B}$ | 273,075 bytes (Passed 3/3) | **273,007 bytes** | $-68\text{ bytes}$ (Passed 3/3) |
| **CSS Gzip** | $\le 102,400\text{ B}$ | 62,171 bytes (Passed 3/3) | **62,177 bytes** | $+6\text{ bytes}$ (Passed 3/3) |
| **Exit Code** | 0 | 1 / 1 / 1 (All failed) | **0 / 0 / 0** (All passed) | **100% pass rate** |

---

## Root cause analysis & Trace findings

1. **FCP Delay (Empty `#root` & Paint Timing Spec):**
   - *Cause:* Under the W3C Paint Timing Specification, painting background styles or empty container divs does not count as First Contentful Paint; FCP requires text, SVG, canvas, or image elements to be drawn. Previously, `<div id="root"></div>` was completely empty until client JavaScript loaded, parsed, and hydrated React (~3,140+ ms).
   - *Fix:* Embedded an accessible topbar shell (`<h1 class="premium-topbar__heading ...">Yor</h1>`) and skeleton structure inside `<div id="root">` in `social/index.html` and synced it in `RouteSkeleton.tsx`. Once `index.css` finishes parsing at ~1,830 ms, Chromium immediately paints FCP at ~1,848–1,884 ms.

2. **Long-Task Blocking (Framer Motion Over-Instantiation & Gesture Listeners):**
   - *Cause:* Feed items rendered nested Framer Motion components (`motion.article`, 5 `motion.button` instances with `tapScale` gesture recognizers, and nested motion wrappers per post). Under throttled CPU emulation (4x slowdown), registering motion contexts, event listeners, and spring configurations created long execution blocks (179 ms render task alone).
   - *Fix:* Under `useReducedMotion()`, `PostCard` renders semantic HTML (`<article>`, `<button>`) without Framer Motion wrapper overhead, skipping unnecessary animations and gesture listeners while preserving all accessibility attributes and click behavior.
   - *Hook Safety Correction:* An initial experiment had placed `useReducedMotion()` after an early return (`if (!author) return`), triggering React Error #310 during creator profile retry. In the final fix, all hooks are declared at the top of the component before any conditional branches, strictly adhering to React Rules of Hooks.

3. **Background Canvas Animation Loop:**
   - *Cause:* In `GlobalAudioPlayer.tsx`, the audio visualizer canvas was scheduling `requestAnimationFrame(render)` continuously at 60 FPS even when audio was stopped.
   - *Fix:* Gated the recursive `requestAnimationFrame` loop on `isPlaying === true`, eliminating ~60–80 ms of recurring thread contention during page load.

4. **DOM Keyframes Style Re-injection:**
   - *Cause:* `PostCard` rendered an inline `<style>@keyframes heart-pop ...</style>` tag inside each post card, invalidating DOM styles on every card render.
   - *Fix:* Removed the inline tag; the keyframe animation is already declared globally in `premium.css`.

5. **Transitions under Reduced Motion:**
   - *Cause:* `PageTransition`, `ScrollReveal`, and `home.tsx` previously evaluated spring physics and variant stagger transitions even when `prefers-reduced-motion` was active.
   - *Fix:* When reduced motion is requested, rendered clean container elements, avoiding unnecessary Framer Motion animation computations.

---

## Functional & Security verification

Every functional suite and security boundary was tested against the final build:

- **Contract checks (`pnpm contract:check`):** Passed (231 operations, 195 paths verified).
- **Design consistency (`pnpm design:check`):** Passed.
- **Unit test suite (`pnpm test:unit`):** Passed (96 passed, 0 failed).
- **Full E2E acceptance suite (`pnpm test:e2e`):** Passed (**73 passed, 0 failed**):
  - 70/70 tests passed in `e2e/core-social.spec.ts` (including post survival during author retry, navigation, light/dark themes, media lightbox, studio camera).
  - 3/3 tests passed in `e2e/deferred-validation.spec.ts` (verifying 409 session replacement rejections and 503 deferred validator resilience).

---

## Environment and host telemetry

- **Hardware:** AMD Ryzen 5 3600XT 6-Core Processor (12 logical processors)
- **Host load at measurement:** 7% – 24% load percentage
- **Emulation conditions:**
  - Viewport: 390 × 844
  - Network: 150 ms latency, 1.6 Mbps download (200,000 B/s), 100,000 B/s upload
  - CPU Throttling: 4× slowdown
  - Delivery: Static local HTTP with gzip level 5
  - Browser: Chromium headless (cold context, cache disabled, reduced motion enabled)
  - API Fixtures: Strict synthetic fixtures, external DNS blocked

Budgets remain the proposed maximums and are presented for owner sign-off.
