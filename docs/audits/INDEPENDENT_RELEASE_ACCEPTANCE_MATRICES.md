# Independent Release Acceptance Matrices

**Audit Date**: 19 October 2026  
**Status**: All release flags held **DISABLED** (`false`). Independent technical readiness, entry-point gating, settlement decoupling, and synthetic acceptance suites verified.  
**Governing Rule**: Do not charge real users, enable live production features, send unsolicited notifications, or incur unapproved provider costs until individual owner launch decision and provider account acceptance are complete.

---

## Executive Summary of Completed Technical Work

1. **Decoupling of Settlement from Purchase Gate (`PAYMENTS_ENABLED`)**:
   - `RazorpayService.isConfiguredForSettlement()` and `assertSettlementConfigured()` ensure that if `PAYMENTS_ENABLED=false` (blocking new purchases), background dispute reconciliation (`PaymentDisputeService.reconcile`/`scan`), checkout recovery/reconciliation (`CheckoutIntentService.reconcile`), subscription order reconciliation, and webhook signature verification continue processing existing commitments.
   - New charges (`createOrder`) remain strictly gated behind `PAYMENTS_ENABLED=true` and `payments` capability.
2. **Missing `EligibilityCapabilityError` 403 Exception Handlers Added**:
   - `POST /api/economy/orders` & `/superchat`: catches `EligibilityCapabilityError` -> HTTP 403 `capability_unavailable`.
   - `POST /api/economy/orders/:orderId/verify`: catches `EligibilityCapabilityError` -> HTTP 403 `capability_unavailable`.
   - `POST /api/subscriptions/subscribe` & `/:id/verify`: catches `EligibilityCapabilityError` -> HTTP 403 `capability_unavailable`.
   - `POST /api/products` (seller listing): catches `EligibilityCapabilityError` -> HTTP 403 `capability_unavailable`.
   - `POST /api/products/:id/order` & `orders/:orderId/verify`: catches `EligibilityCapabilityError` -> HTTP 403 `capability_unavailable`.
   - `POST /api/streams`, `PUT /api/streams/:id/status`, and `GET /api/streams/:id/token`: catches `EligibilityCapabilityError` -> HTTP 403 `capability_unavailable`.
   - `GET /api/ai/search`: requires `ai` capability upfront before querying database and re-checks on delivery.
3. **No Bank Payouts Implication**:
   - Cleaned up copy in `social/src/pages/creator-analytics.tsx`, `social/src/pages/control-room.tsx`, and `social/src/pages/treasury.tsx`. Explicitly disclosed that bank payouts are not supported in this release without accepted settlement infrastructure.
4. **Web Push Lock-Screen Disclosure & Consent**:
   - Updated `social/src/pages/settings.tsx` with explicit disclosure that browser push notifications contain minimized metadata to protect lock-screen privacy and that consent can be withdrawn at any time.
5. **Synthetic Acceptance Regression Suite**:
   - Added `api-server/src/__tests__/independent-release-acceptance.test.ts` covering synthetic denial/outage/retry tests across all 6 feature domains, proving denied users cause 0 provider calls.

---

## Matrix 1: Payments (Tips, Superchat, Marketplace Checkout, Premium)

| Dimension | Specification & Current Implementation |
|---|---|
| **Release Flags** | `PAYMENTS_ENABLED=false`, `YOR_PREMIUM_ENABLED=false` |
| **Authority Required** | `experience === 'adult_18_plus'`, non-minor, `payments` capability active, account status `active`, valid terms version. Minors and guardian-approved minors are strictly blocked. |
| **HTTP Entry Points** | - `POST /api/economy/orders` (`createTipOrder`)<br>- `POST /api/economy/superchat` (legacy alias)<br>- `POST /api/economy/orders/:orderId/verify`<br>- `POST /api/economy/webhooks/razorpay`<br>- `POST /api/products/:id/order`<br>- `POST /api/products/orders/:orderId/verify`<br>- `POST /api/premium/orders`<br>- `POST /api/premium/orders/:id/verify` |
| **Background & Worker Entry Points** | - `premium_reconcile` job (PlatformPremiumService)<br>- `checkout_reconcile` job (CheckoutIntentService)<br>- `dispute_reconcile` job (PaymentDisputeService)<br>- Periodic dispute scanner (`PaymentDisputeService.scan`)<br>- Durable webhook inbox (`PaymentWebhookInbox.drain`) |
| **Anti-Bypass Protection** | - Server re-evaluates `decisionFor(userId)` at transaction start and provider binding.<br>- Guardian approval for minors cannot grant `payments` capability.<br>- Forged amounts or currency are rejected: minor units strictly validated (`100 <= amountMinor <= 2147483647`, currency === `'INR'`). |
| **Recheck Authority Before Work** | Authority checked before order creation, before calling provider, and immediately before ledger credit in verify route. |
| **Settlement Decoupling** | When `PAYMENTS_ENABLED=false`, new order creation throws `PaymentsNotConfiguredError` (HTTP 503). Existing webhooks, captures, refunds, dispute scans, and order inquiries continue via `assertSettlementConfigured()`. |
| **Pricing, Fees, Taxes, Disclosures** | - 100% tip pass-through to creator balance.<br>- Fixed catalog prices with `acceptedTermsVersion` and `acceptedPriceMinor` snapshot binding.<br>- Explicit disclosure: No bank payouts supported in this release; balances represent internal ledger obligations. |
| **Synthetic Denial Evidence** | Verified in `independent-release-acceptance.test.ts`: denied users / `PAYMENTS_ENABLED=false` cause exactly 0 calls to Razorpay `orders` endpoint. Settlement HMAC signatures and disputes succeed under `PAYMENTS_ENABLED=false`. |
| **Remaining Owner Inputs** | - Decision on whether to launch Payments.<br>- Registered production Razorpay merchant account and verified Indian business KYC.<br>- Production webhook secret registered at Razorpay Dashboard.<br>- Banking partner / settlement infrastructure agreement if payouts are ever to be supported in future versions. |

---

## Matrix 2: Memberships & Seller Functionality

| Dimension | Specification & Current Implementation |
|---|---|
| **Release Flags** | `SELLER_ENABLED=false`, `MEMBERSHIPS_ENABLED=false` |
| **Authority Required** | Seller: `adult_18_plus`, `seller` capability. Subscriber: `adult_18_plus`, `payments` capability. Both parties must have `active` accounts. |
| **HTTP Entry Points** | - `POST /api/products` (`productController.create`)<br>- `DELETE /api/products/:id`<br>- `POST /api/products/:id/order`<br>- `POST /api/products/orders/:orderId/verify`<br>- `POST /api/products/orders/:orderId/fulfill`<br>- `POST /api/products/orders/:orderId/cancel`<br>- `GET /api/subscriptions/tiers/:creatorId`<br>- `POST /api/subscriptions/subscribe`<br>- `POST /api/subscriptions/:id/verify`<br>- `DELETE /api/subscriptions/:id` |
| **Service Entry Points** | - `ProductService.createProduct`<br>- `SubscriptionService.createOrder`<br>- `SubscriptionService.verifyPayment`<br>- `SubscriptionService.cancel`<br>- `MarketplaceService.createOrder` |
| **Anti-Bypass Protection** | - In `ProductService.createProduct`: enforces `requireCapability(sellerId, 'seller')`.<br>- In `SubscriptionService.createOrder`: enforces `requireCapability(subscriberId, 'payments')` AND `requireCapability(creatorId, 'memberships')`.<br>- In `MarketplaceService.createOrder`: enforces `requireCapability(buyerId, 'payments')` AND `requireCapability(sellerId, 'seller')`.<br>- Guardian approval cannot unlock `seller` or `memberships` for minors. |
| **Error Contract** | Returns HTTP 403 `capability_unavailable` (instead of 500) whenever `seller` or `memberships` flag is false or user lacks eligibility. |
| **Moderation & Safety** | Products require approved image media IDs verified via `MediaLifecycleService`. Obscene or unapproved uploads cannot be published. |
| **Synthetic Denial Evidence** | Verified in `independent-release-acceptance.test.ts`: minor facts or disabled `seller`/`memberships` flags result in `false` capability decisions; 0 provider orders initiated. |
| **Remaining Owner Inputs** | - Decision on whether creator monetization and subscriptions are in scope for public release.<br>- Creator terms of service and seller fee schedules.<br>- Dispute handling policy and creator refund liability terms. |

---

## Matrix 3: Live Rooms

| Dimension | Specification & Current Implementation |
|---|---|
| **Release Flags** | `LIVE_ROOMS_ENABLED=false` |
| **Authority Required** | `experience === 'adult_18_plus'`, non-minor, active session, `live` capability AND `rtc` capability. |
| **HTTP Entry Points** | - `POST /api/streams` (`LiveStreamController.create`)<br>- `PUT /api/streams/:id/status` (`LiveStreamController.setStatus`)<br>- `GET /api/streams/:id/token` (`LiveStreamController.token`)<br>- `GET /api/streams` (`LiveStreamController.list`)<br>- `GET /api/streams/:id` (`LiveStreamController.get`) |
| **Socket Entry Points** | - `stream:join` (gates on `live` capability)<br>- `stream:leave` (gates on `live` capability)<br>- `stream:deliver` (gates on `live` capability) |
| **LiveKit Token Scope & TTL** | - Room bound: `room: yor-talks-<streamId>`.<br>- Identity bound: `identity: userId`, `name: displayName`.<br>- Grants: `roomJoin: true`, `canPublish: <boolean>`, `canSubscribe: true`, `canPublishData: <boolean>`.<br>- TTL: Strictly 15 minutes (`ttl: '15m'`). Decoded exp - nbf = 900 seconds. |
| **Dual Eligibility Verification** | In `LiveKitService.createRoomToken`: checks `requireCapability(userId, 'live')` and `requireCapability(userId, 'rtc')` BEFORE signing, and re-checks both AFTER signing before returning token to client. |
| **Revocation Separation** | Separated application tests from 3rd-party LiveKit token revocation: LiveKit JWTs are statelessly validated by LiveKit edge; revocation during live broadcast requires server calling `RoomServiceClient.deleteRoom()` or `removeParticipant()`, or waiting for the 15-minute token expiry. |
| **Error Contract** | Returns HTTP 403 `capability_unavailable` when ineligible or disabled, and HTTP 503 `Live video is unavailable` when LiveKit credentials are unconfigured. |
| **Synthetic Denial Evidence** | Verified in `independent-release-acceptance.test.ts`: disabled `LIVE_ROOMS_ENABLED` throws `LiveKitNotConfiguredError` without token signing; token TTL and grants verified via JWT decode. |
| **Remaining Owner Inputs** | - Decision on whether live streaming is in scope for launch.<br>- Hosted LiveKit server deployment (`LIVEKIT_URL`) and firewall ingress for WebRTC UDP ports (7880, 7881, 50000-60000).<br>- Live room moderation staffing and real-time takedown runbook. |

---

## Matrix 4: Web Push

| Dimension | Specification & Current Implementation |
|---|---|
| **Release Flags** | `WEB_PUSH_ENABLED=false` |
| **Authority Required** | `experience === 'adult_18_plus'`, `social` capability active, account status `active`, user setting `settings.notificationsEnabled === true`, valid browser push subscription. |
| **HTTP Entry Points** | - `POST /api/push-subscriptions` (register/update endpoint)<br>- `DELETE /api/push-subscriptions` (unregister endpoint)<br>- `GET /api/push/public-key` |
| **Service & Delivery Entry Points** | - `NotificationDeliveryService.deliver`<br>- BullMQ background notification worker |
| **Endpoint Allowlist Validation** | Strictly checked in `isAllowedPushEndpoint`: only `fcm.googleapis.com`, `updates.push.services.mozilla.com`, and `*.push.apple.com`. Rejects plain HTTP, localhost/private IPs, credentials, ports, and foreign domains before making network requests. |
| **Payload Minimization & Lock Screen** | Push payload restricted to generic metadata `{ title, body, icon, badge, data: { url } }`. Message content does not leak private chat bodies. Settings UI explicitly discloses lock-screen minimization and withdrawal rights. |
| **Consent Withdrawal & Auto-Cleanup** | When `notificationsEnabled: false`, push delivery immediately halts. When push provider returns HTTP 404 or 410 (unsubscribed/expired), endpoint is immediately deleted from database. |
| **Synthetic Denial Evidence** | Verified in `independent-release-acceptance.test.ts`: withdrawn notifications (`notificationsEnabled=false`) and minor accounts cause 0 calls to `webpush.sendNotification`. Unsafe endpoints rejected with 0 network calls. |
| **Remaining Owner Inputs** | - Decision on whether Web Push is in scope.<br>- Generate production VAPID keypair (`WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY`, `WEB_PUSH_VAPID_SUBJECT`).<br>- Browser service-worker registration in production domain. |

---

## Matrix 5: RTC Calls (1:1 Audio & Video Calls)

| Dimension | Specification & Current Implementation |
|---|---|
| **Release Flags** | `RTC_CALLS_ENABLED=false` |
| **Authority Required** | `experience === 'adult_18_plus'`, non-minor, `rtc` capability active, account `active`. |
| **Socket Entry Points** | Gated under `SOCKET_EVENT_CAPABILITIES`: `call:invite`, `call:accept`, `call:reject`, `call:end`, `call:answer`, `call:ice`, `webrtc:offer`, `webrtc:answer`, `webrtc:ice-candidate`, `rtc:deliver`. |
| **Contact Authorization & Blocking** | - Call invitation verifies caller and recipient are not blocked (`blockedUsers`).<br>- Stranger calling blocked if recipient has `allowDmFromStrangers === false` and caller is not followed.<br>- `contactAuthorization.requireContact(userId, targetUserId, 'send')` enforced before ringing. |
| **Lifecycle & Outage Recovery** | - Redis reservation (`reserveSocketCallStrict`) with 90s ring timeout.<br>- Automatic expiration and signal cleanup releases both participants if unaccepted.<br>- Max active call duration enforced (6 hours). |
| **TURN Infrastructure** | Production requires Coturn or managed TURN service with time-limited HMAC credentials for NAT/firewall traversal. STUN alone is insufficient. |
| **Synthetic Denial Evidence** | Verified in `independent-release-acceptance.test.ts`: all call signaling events map to `rtc` capability; disabled flag emits `Realtime calling is disabled for this deployment` with 0 peer signalling. |
| **Remaining Owner Inputs** | - Decision on whether 1:1 calling is in scope.<br>- Deployed TURN relay infrastructure and credentials.<br>- Abuse reporting and harassment incident response procedures for private calls. |

---

## Matrix 6: User-Facing AI Features (Copilot, Search, Moderation)

| Dimension | Specification & Current Implementation |
|---|---|
| **Release Flags** | `AI_COMPANION_ENABLED=false` |
| **Authority Required** | `experience === 'adult_18_plus'`, non-minor, `ai` capability active, account `active`. |
| **HTTP Entry Points** | - `POST /api/ai/chat` (Copilot ideation)<br>- `GET /api/ai/search` (Semantic post search)<br>- `POST /api/ai/moderate` (Content auto-moderation) |
| **Input Bounding & Rate Limiting** | - Chat message length: 1 to 4000 characters.<br>- Moderate text length: 1 to 5000 characters.<br>- Search query: 1 to 200 characters.<br>- Express rate limiting applied via `aiRateLimiter`. |
| **Before & After Authority Recheck** | - Chat: requires `ai` capability before context hydration, calls AI provider, and rechecks `ai` capability before returning output.<br>- Search: requires `ai` capability upfront before running database queries and rechecks before returning search results.<br>- Moderation: requires `ai` capability before and after provider analysis. |
| **Safe Output & Error Contract** | - Revocation during provider execution returns HTTP 403 `capability_unavailable`.<br>- Unconfigured provider returns HTTP 503 `ai_not_configured`.<br>- Invalid length returns HTTP 400. |
| **Synthetic Denial Evidence** | Verified in `independent-release-acceptance.test.ts`: denied users cause exactly 0 calls to `ai.chat` and `ai.moderateContent`. Revocation in-flight halts response with `EligibilityCapabilityError`. |
| **Remaining Owner Inputs** | - Decision on whether Creator Copilot and Semantic Search are in scope.<br>- Provisioned OpenAI / Gemini API keys and rate/billing limits.<br>- Terms disclosure covering AI-generated suggestions. |
