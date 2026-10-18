# Independent frontend review

Review follow-up: 19 October 2026. A separate reviewer inspected current legal/privacy helpers, theme initialization, Story API compatibility, new SVG contents, dependency loading, and the compliance-test migrations. The primary implementer reviewed and corrected the resulting concrete findings.

- Backend `41024f2` and default `8c5a763` expose no supported version-bound consent, independent server analytics-consent record or grievance idempotency contract. Strict schemas reject invented fields. Those features remain documented integration boundaries.
- Story image descriptions use the existing optional `textContent` schema/service field; moderation and upload approval are retained. Frontend entry and viewer rendering can therefore improve without an API change.
- Saved analytics markers are account-specific; withdrawal remains possible when eligibility denies collection. Failed removal is disclosed. No collectors or new opt-in are mounted.
- Theme presets are allowlisted and restored through light/dark CSS tokens. Six SVG previews contain simple geometry with no scripts, external URLs or downloaded fonts.
- The companion's absolute activity-reading assurance was removed because it reads the current route; the replacement describes browser-local preferences precisely.
- Review caught a fourth stale legacy assertion for the old analytics switch. The migration preserves all 104 declarations, updates explicit assertions, and partitions 101 disabled-payment cases from three enabled synthetic free-plan/checkout cases. The first incorrectly combined profile's actual failures are retained.
- Media tests use the existing CSP-permitted upload host, intercepted locally; an arbitrary external fixture host is correctly rejected by CSP. Local artwork decoding is checked without assuming a particular number of image elements.
- LiveKit's 532.18 KB chunk is deferred from initial static imports/preloads. Its existing size warning remains visible; reshuffling SDK internals is outside this compliance repair's purpose.

No additional P0/P1 source regression was identified in this review. Final executed checks and their limitations are recorded in [the test report](frontend-test-report.md); this statement is not legal, release or universal accessibility approval.
