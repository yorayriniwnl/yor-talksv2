# Discovery authorization and query budgets

Story and Note rails return at most 100 eligible active records. SQL reduces
audience, author status/privacy, mutual blocks, discovery mutes and rating before
the result limit. Services then apply the shared current-record policy using one
distinct author/viewer batch and one relationship batch. Story selection/exclusion
membership uses one additional batch; ranking reuses those relationships. Polls
and the viewer's own interactions remain batched. No audience membership list is
returned to the client. Existing relationship priority and paid priority scores
are preserved after authorization.

Indexed and fallback keyword search apply the same candidate reduction and shared
final policy. Search reuses its contact-shield result instead of repeating the
same database work for user results. The fallback intentionally searches only the
250 newest eligible records while the indexed path can search older records; this
bounded fallback limitation is unchanged. Profile-only and shielded records no
longer consume that fallback allowance. Feed keyset pagination and its bounded
candidate scans retain the F02 regressions. Close Friends profile hydration and
comment author hydration also load distinct users together.

## Reproducible local evidence

Run `src/__tests__/discovery-batching.test.ts` with the documented API test command
and isolated PostgreSQL 16 / Redis 7. The fixtures use 50 distinct authors with
public, follower, Close Friends, selected/excluded, private, blocked, muted and
mature cases. They clean up their own rows. Other tests retain their own fixtures.

| Operation | Before-policy query count | Updated request query count | Local elapsed observations |
| --- | --- | --- | --- |
| Story list, 50 authors | 245 for the former per-item checks/ranking, excluding the initial list query | 7 without polls; at most 9 with poll options/votes | First isolated run: former checks 176.5 ms, updated list 17.8-23.2 ms across three calls |
| Note list, 50 authors | Per-item policy plus duplicate relationship reads | 3 | 12.4 ms in the first isolated run |
| Search, 50 authors | 100 for per-item policy alone | 10 for the whole search in each implementation | Focused run: former policy 82.1 ms, indexed request 31.7-49.7 ms, fallback request 34.3-37.3 ms across three calls each |

These are individual loopback observations, not production load tests or latency
percentiles. A concurrent typecheck changed the Story baseline to 615.3 ms and
updated samples to 21.6-36.1 ms, illustrating why query counts are the regression
assertions and wall time is diagnostic only. Network, data size and host load will
affect deployed latency. The search baseline is policy-only and is not a measured
end-to-end old request.

Regressions also insert 105 newer restricted Story/Note authors and 260 private
search posts, exceeding the old result/candidate limits. Older eligible records
remain discoverable. Live changes to follows, selected/excluded membership,
privacy, blocks, mutes, account suspension and rating are rechecked. Suspended
owners do not bypass policy. The focused compatibility run passes 12/12 tests.

No schema migration is needed for this chapter. Preserve the existing audience
and relationship indexes. Current-record moderation and media enforcement will
extend the same policy during F03/F09; performance checks must remain in the final
release verification matrix.

The complete API suite at this chapter passes 168/168 (104.4 seconds); API
TypeScript passes. These are local integration results on Node 24.14.0.
