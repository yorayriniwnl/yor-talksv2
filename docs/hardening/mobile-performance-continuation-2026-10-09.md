# Mobile performance continuation — 9 October 2026

This is historical pre-unification billing-deferral evidence. The [unified-release measurements](mobile-performance-unified-2026-10-09.json) separately record the exact deployed 3887cc4 artifact.


**Result: failed.** The retained change removes about **5.9%** of decoded
JavaScript and **4.4%** of estimated gzip JavaScript from the cold authenticated
feed. FCP and long-task blocking fail all three final observations; LCP fails
two. No timing improvement or all-budget pass is accepted.

The [measurement archive](mobile-performance-continuation-2026-10-09.json)
contains all 15 observations, their asset/report hashes and diagnostic evidence.
The [continuation record](CONTINUATION_2026-10-09.md) separates this candidate,
uncommitted at measurement time, from measurement baseline commit
`990fc062a7661eb8dafc4a33e8f3f252a6fb0715`. The later integration of remote commit
`23bfdc7678543d797593a731e5f3caa228bba7d9` preserves Google sign-in API security
work and required combined-revision CI; the subsequent unified release passed
the full suite, as recorded in the continuation record. Measured frontend bytes
were unchanged by that initial API integration.
Billing-validator deferral is the only frontend runtime change. Final normalized frontend
source SHA256 is `57b3658e67cf65b0c156c32a369cfd5a1e63a96b5598595640d919a310cee420`;
all **336** raw frontend file hashes matched after measurement.

## Fixed final observations

All three fixed final cold observations must meet every unchanged proposed gate.
No best-of selection is used, and profiling observations are excluded. These
budgets still require owner agreement.

| Metric | Proposed maximum | Final 1 | Final 2 | Final 3 | Result |
| --- | --- | --- | --- | --- | --- |
| FCP | 2,500 ms | 5,136 ms | 3,108 ms | 3,144 ms | Failed 3/3 |
| LCP | 4,000 ms | 5,136 ms | 4,076 ms | 3,904 ms | Failed 2/3 |
| Long-task blocking | 300 ms | 1,539 ms | 851 ms | 841 ms | Failed 3/3 |
| Estimated gzip JavaScript | 358,400 bytes | 273,173 bytes | 273,173 bytes | 273,173 bytes | Passed 3/3 |
| Gzip CSS | 102,400 bytes | 62,171 bytes | 62,171 bytes | 62,171 bytes | Passed 3/3 |

All three measurement commands exited **1**.

| Payload | Baseline | Retained candidate | Reduction |
| --- | --- | --- | --- |
| Decoded JavaScript | 928,461 bytes | 873,364 bytes | 55,097 bytes (about 5.9%) |
| Actual delivered JavaScript bodies | 286,323 bytes | 273,662 bytes | 12,661 bytes |
| Estimated gzip JavaScript | 285,832 bytes | 273,173 bytes | 12,659 bytes (about 4.4%) |
| Delivered gzip CSS | 62,171 bytes | 62,171 bytes | 0 bytes |

Estimated gzip compresses every loaded JavaScript body. Actual delivery leaves
bodies smaller than 1,024 bytes uncompressed; body counts exclude HTTP headers.

## Preserved observations and profiling

Every observation below exited **1**. Only the three final rows enter final
acceptance. The earlier billing variant and discarded editor split are separate
source states. Profiling adds overhead and its timings are diagnostic only.

| Group / observation | FCP (ms) | LCP (ms) | Blocking (ms) |
| --- | --- | --- | --- |
| Baseline 1 | 4,768 | 4,768 | 1,321 |
| Baseline 2 | 2,824 | 2,824 | 623 |
| Baseline 3 | 2,776 | 3,352 | 477 |
| Earlier billing 1 | 3,052 | 3,692 | 682 |
| Earlier billing 2 | 3,376 | 4,192 | 894 |
| Earlier billing 3 | 3,296 | 3,296 | 1,304 |
| Discarded editor split 1 | 3,068 | 4,152 | 870 |
| Discarded editor split 2 | 3,140 | 4,548 | 1,380 |
| Discarded editor split 3 | 3,200 | 3,200 | 900 |
| **Final 1** | **5,136** | **5,136** | **1,539** |
| **Final 2** | **3,108** | **4,076** | **851** |
| **Final 3** | **3,144** | **3,904** | **841** |
| Baseline control | 3,236 | 4,024 | 792 |
| Baseline profile | 2,832 | 3,436 | 436 |
| Discarded editor profile | 3,148 | 4,340 | 963 |

Module maps attribute the eager validator cost to the Zod type module: **117,228
rendered/unminified bytes**, moved into a **53,780-byte** deferred chunk. The
discarded editor split increased Home dependency requests from **5 to 15** and
its observed dependency interval by about **426 ms**. Review also found that a
cached rejected lazy import defeated the local surface retry. Both editor
changes were removed. Its **71-test local browser pass** is historical and does
not establish acceptance for the then-planned **72-test** suite. The later
unified release passed **73 browser tests** in both recorded CI runs.

The [original observation](mobile-performance-final.json) remains unchanged:
FCP **2,716 ms**, LCP **3,264 ms**, blocking **418 ms**; FCP and blocking failed.

## Measurement limits

Each sample used a fresh browser/context with cache disabled, a **390×844**
viewport, reduced motion, **150 ms** latency, **200,000 bytes/s** download,
**100,000 bytes/s** upload and **4×** CPU slowdown. Delivery used local static
assets with gzip level 5; APIs supplied strict synthetic authenticated-feed
fixtures. External DNS was blocked except loopback. No production accounts,
provider calls or production data were used.

On the AMD Ryzen 5 3600XT host, total CPU utilization sampled while the owned
build/browser work was idle was **54.64% / 55.64% / 61.03%**. These are utilization
values, not idle percentages. Unrelated user processes were not changed. Host
variation and profiling overhead prevent an accepted timing-causality claim.
Source/module maps establish payload provenance only.

These observations do not establish field percentiles, deployed Nginx/container
gzip acceptance, real provider timing or representative device performance.
Remaining work includes resolving or explicitly accepting the failed timing
gates, owner-approved budgets, quiet-host repeats and actual edge/device tests.
