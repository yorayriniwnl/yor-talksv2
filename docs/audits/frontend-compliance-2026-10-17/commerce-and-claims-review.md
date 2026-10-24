# Commerce, dark patterns and product claims review

Audit requested for 17 October 2026; inspected locally on 18 October 2026. Reviewed the current frontend baseline independently, including improvements already present. No payment flags were enabled for the application, no provider payment was created, and no backend or production data was changed. Browser fixtures use synthetic identities, prices, order references and policies.

## Findings repaired

| Finding | Severity | Before | After and evidence |
| --- | --- | --- | --- |
| Premium and billing bypassed the frontend payment switch | P1 | A server Premium catalog reporting `available: true` enabled upgrade/resume; billing exposed Continue payment for created orders despite `VITE_PAYMENTS_ENABLED=false`. | Premium purchase and Billing resume handlers now check the switch. Paused notices explain prices are not payable; upgrade remains disabled, resume is hidden, and the shared Razorpay loader rejects before reading a cached provider constructor or inserting a script. Recovery, history and cancellation remain available. |
| Premium listed benefits beyond the configured plan | P2 | A static list showed every supported benefit with checkmarks even if the server plan listed fewer features. | Perks now come from `catalog.plan.features`; mapped labels retain the app's terminology. Missing benefits say they are not configured. Operational feature outages retain their existing disclosure. |
| Product photo and personal avatar substitutions | P2 | Creator Store rendered a random Picsum photo as if it depicted a real listing; Points Shop substituted a stock portrait for a missing user avatar. | Removed those substitutions. Marketplace and Creator Store show an explicit empty-photo state; uploaded product images and actual avatars are preserved. |
| Static activity and rank resembled genuine social proof | P2 | Podcast listener totals/speakers looked live; rankings read as a Season 1 snapshot; Clans displayed National rank #4 without a data source. | Podcast counts and speakers are explicitly samples, rankings explain illustrative teams/results, and Clans says Sample guild. Existing API-backed social activity remains unchanged. |
| False urgency and reward progress | P2 | Super Pass showed a static 42-day countdown, an unconfigured ₹299 purchase price, earned-looking XP/claims; Predictions displayed static lock deadlines; tournament predictions promised +100 Karma. | Removed the price and countdown; season dates say Not scheduled; XP/claim states say sample. Predictions have no scheduled lock time and identify sample teams/odds/pools. Tournament picks state rewards unavailable. Purchase/claim controls stay disabled. |
| Voice demos implied transport, performance and microphone activity | P2 | Squad Comms claimed low-latency Opus and measured 12 ms Mumbai latency; Lounge said Mic Active; both had synthetic participants and local-only controls. | Both explicitly describe illustrative participants, absent live voice/microphone capture and local controls. Sample speaking states, mute/deafen/hand interactions are described accurately. The working local soundboard is preserved and says audio plays on this device. |
| Premature payment verification / broad promises | P2 | Fan Club said Razorpay verified before payment. Store implied every order already records seller settlement and said Buy securely. | Fan Club shows Payments paused or Payment confirmation required. Store describes reservation and server payment verification separately from fulfillment/payment status, and uses Buy now. |
| Unnamed saved-listing control | P2 | Marketplace heart buttons had no accessible name/state. | Buttons are named Save/Unsave plus the listing title and expose `aria-pressed`. |

## Purchase surface review

| Surface | Price authority and status | Refund / cancellation disclosure | Remaining dependency |
| --- | --- | --- | --- |
| `/premium` | INR minor-unit amount, term length and features come from the runtime-validated server catalog; payable checkout requires both build switch and server availability. Core account and safety controls remain free. | Server `refundPolicy` and `termsVersion` precede acceptance; no automatic renewal. Pending cancellation/recovery and paid-term cancellation remain reachable while payments are paused. | Operator approval of the actual catalog, taxes/fee treatment, refund wording, support operations and live provider configuration. |
| `/billing` | Runtime-validated server order history shows the amount/currency/reference. Paused builds cannot continue a payment even when a provider order exists. | Recovery, pending cancellation and membership end-at-expiry remain available. Explanations distinguish cancellation, late-payment refund review, refund and dispute effects. | Existing history is not a complete versioned refund-policy publication. |
| `/marketplace`, `/store` | Product prices are server-provided INR listing values. Creation responses supply provider amount/currency. Paused build hides payment/selling controls; Creator Store has an explicit paused page. | Existing refund-required order states are visible, but no versioned policy or fees/quote contract is provided before starting a new purchase. | **BLOCKED for live launch:** publish approved refund and fee/tax/shipping treatment and supply a reviewable quote/policy contract. Do not derive a full payable total from product price in the client. |
| `/fanclub` | Creator-specific tier prices come from the server, without a default fake creator/tier. No automatic renewal; disabled by the payment switch. | Existing cancellation calls the established server API and preserves access through expiry. | **BLOCKED for live launch:** versioned refund policy and authoritative final amount/fee disclosure before commitment. |
| Tip dialog | Amount is chosen by the user; provider checkout uses the server order amount. Controls remain disabled in beta. | Payment history/recovery link is present; no approved tip refund-policy field exists. | **BLOCKED for live launch:** approved tip refund terms, final payable amount and explicit acceptance/review. |
| `/pass`, `/points-shop`, `/bazaar`, `/merch`, `/treasury`, `/bounties` | Preview or unavailable feature disclosures; no working paid purchase was inferred. Static samples are not an authoritative price source. | No invented refund periods, guarantees, fees or payment success. | Actual commerce/reward integrations and policy approval are separate future work. |

The backend was read **only** to check existing contracts: Premium order creation requires accepted terms version and minor-unit price; marketplace reserves the listing against its current server price, verifies captured payment and records refund-required late captures. This does not prove provider operations, actual fulfillment, refund handling, taxes or compliance have been approved.

## Exact backend/operator contracts required

Existing `/products/:id/order`, `/subscriptions/subscribe`, and `/economy/orders` (tips) return checkout amount/currency/provider references; tier/product listing responses contain prices. They do not expose a versioned refund-policy text, policy link, accepted policy version, pre-purchase authoritative fee/tax/shipping breakdown, or expiry-bound quote for review. A future approved contract must provide:

1. A server-controlled quote/reference, product/recipient, currency, final payable minor-unit total and component breakdown or an explicit approved statement that no further amount is charged.
2. Applicable refund terms/version and support contact, plus term/fulfillment/cancellation conditions for the actual product.
3. A server-bound acceptance payload carrying the reviewed quote and policy version, with price/policy changes requiring review again.

The frontend must display those server values before a user commits, then submit the accepted references. This audit does not add fictional backend fields, promise a refund period, or enable unapproved purchase flows. Premium already has the accepted price/version and refund-text contract; its actual policy and any tax/fee treatment still need operator review.

## Requirement matrix for this workstream

| Requirement | Before | After | Evidence | Remaining issues |
| --- | --- | --- | --- | --- |
| 3 Refund policy | PARTIAL | PARTIAL | Server Premium policy and term acceptance preserved; paid actions consistently gated; history/cancel/recover preserved | Approved non-Premium refund contracts and publication are BLOCKED for live commerce |
| 9 Dark patterns | PARTIAL | PARTIAL | Removed static urgency, misleading voice controls and reward promises; payment-disable bypass repaired | Full launch decisions include the other audit workstreams; previews still require actual integrations to become live |
| 10 Hidden fees | PARTIAL | PARTIAL | Paused prices explicitly not payable; existing server amounts retained; no fabricated client fee total | Authoritative quote and approved tax/fee/shipping/refund disclosures before live checkout |
| 11 Fake reviews/social proof | PARTIAL | PASS | Local synthetic participants, listener counts, rankings and game/reward states clearly identified; random product imagery removed | This is a frontend-source/sample finding, not verification of every future server-supplied user claim |
| 12 Unsupported claims | PARTIAL | PARTIAL | Removed unsupported latency, premature verification, reward/urgency and broad settlement claims | Operator/legal approval of remaining legal/business assertions and actual provider operations is separate |
| 19 Asset licensing | PARTIAL | PARTIAL | Complete local/remote CSV inventories, authentic pinned font notice repair, distributable Lucide ISC/MIT notice | Seven web brand and two repository illustration source/owner records remain pending. Native templates now match official Capacitor assets with MIT notice; static stock/GIF/MP3 references retired. See asset report |

## Verification

`e2e/frontend-compliance-commerce.spec.ts` adds four behavioral browser tests using the strict shared API fixture boundary. They cover paused Premium despite an available catalog, no order creation/provider requests, retained recovery/cancellation, paused creator-payment resume, empty listing photos and named Save state, and explicit demo claims across Podcasts, Rankings, Pass, Comms, Lounge and Tournament predictions. Existing enabled-checkout tests are run only against the separate explicit synthetic payment build, not by weakening the beta gate. See [frontend test report](frontend-test-report.md) for actual browser/build/typecheck execution results; adding a test file alone is not a passing result.

`node --test tests/font-assets.test.mjs` ran successfully after authentic-byte repair: **1 passed / 0 failed / 0 skipped**. Font-license hashes are independently reflected in `asset-license-local-inventory.csv`. Full diff review found and repaired whitespace/import placement issues in the changed commerce files. No production provider, real account, shipping detail, payment or upload was exercised.

Final execution: all four new commerce cases passed in the final-functional production-build run, including the expanded communications/sample claims. The separate enabled-payment regression passed both existing Premium cases against synthetic provider/API fixtures. See the consolidated test report for earlier failures and remaining legacy-test migration.

## Licensing follow-up, 19 October

Current inventory has 85 local records and zero static external media URLs. The original remote inventory recorded 40 URLs and omitted eight dormant GIPHY references; the corrected historical total of 48 and all removals are preserved. All 34 native resources match the official Capacitor 8.5.0 template (XML after documented line-ending normalization); its exact MIT notice ships. Font/license downloads also matched 41 pinned upstream files. Seven web brand files and two repository illustrations still require genuine ownership/permission evidence. New media-delivery regressions exercise 12 demo routes and preserve genuine server-delivered listing images. Actual browser results are in the final test report.
