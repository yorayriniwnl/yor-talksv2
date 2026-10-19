# Pre-registration visual redesign

The `/preregister` and `/launch` pages introduce **Yor Talks as a social media platform** through a people-focused hero, an interactive sample social feed, messages and communities. Creative tools and Yor World support that social experience. Launch remains **1 December 2026 at 00:00 IST**, with email/username pre-registration.

## Visual direction and behavior

- Charcoal backgrounds, lime accents, a warm photograph of fictional friends, a contrasting light social preview, large Outfit headings, and the full Yor Talks name.
- The hero offers a local feed/messages/communities preview. Sample likes, saved posts, replies and community selection work without an account or any network mutation. Profiles and content are visibly labeled as examples; no user counts or endorsements are implied.
- The narrative leads with posts/stories, messages/group chats and communities, then introduces creative tools and pre-registration. The 3D scene appears after the invitation form as an additional Yor Talks feature.
- A sticky navigation bar keeps early access available throughout the page. Anchor offsets keep destination headings and the form visible beneath it.
- The original procedural Three.js arrival scene has faceted basalt, an illuminated portal framing a layered sunset, architecture, and a Dream beacon. District selection moves the camera; visitors can rotate, drag, reset, or explicitly start and pause orbiting.
- Shadows are calculated once for the static environment. Rendering pauses offscreen and in hidden tabs. Reduced motion makes camera transitions immediate. Browsers without WebGL retain the concept artwork and district navigation.
- Studio filters apply to local sample media. Dream generates a local sample blueprint. Both are labeled as previews; the artwork is labeled as a concept environment.
- The existing API-backed form, explicit consent, error recovery, duplicate privacy, referral links, pass download, and clipboard sharing remain intact. Registration alone does not create an account or activate premium access.

## Generated artwork

- Tool: built-in `image_gen` generation; no fallback CLI.
- Project asset: [`social/public/images/yor-world-portal-v2.jpg`](../social/public/images/yor-world-portal-v2.jpg).
- Dimensions: 1672 × 941. JPEG size: 279,477 bytes. The generated PNG was converted to JPEG for delivery.
- Role: concept artwork for the non-WebGL Yor World fallback. The social launch hero uses the friends photograph below. This portal artwork is not a screenshot of a shipped world editor.

Final generation prompt:

> Use case: stylized-concept. Asset type: premium website hero background for Yor, an upcoming social and creative platform with immersive 3D experiences. Create one ultra-wide cinematic landscape image, approximately 16:9, with NO text, NO interface, NO logo and NO people. Subject: a monumental circular dark brushed-metal portal standing vertically on a rugged volcanic basalt island, surrounded by a few architectural monoliths and delicate long grasses. Inside the portal, a powerful thin amber-orange light follows the circumference, framing a warm distant sunset and atmospheric mountain silhouettes. A winding metallic path leads into the ring. Sophisticated photorealistic 3D architectural visualization, physically believable materials, extraordinary detail in rough charcoal rock and smooth machined titanium, subtle orange reflected light, atmospheric dust and low fog. Composition: the portal and island occupy the RIGHT 55 percent, with the main portal centered around 70 percent from the left and 52 percent from the top. The LEFT 40 percent is near-black, spacious, softly atmospheric negative space for HTML headline overlay. Camera is low, slightly wide-angle, intimate and monumental, not an overhead toy diorama. Palette is deep charcoal, gunmetal, subdued warm amber and a small amount of cool slate blue atmosphere. Strong chiaroscuro, premium fashion-campaign art direction, warm sunset rim light, restrained cinematic grain. Full bleed landscape with very dark top and bottom edges that naturally fade to #090a0b. No neon purple, no cartoon geometry, no oversaturated cyberpunk city, no starfield, no UI, no typography, no watermark. This is conceptual campaign artwork, not a screenshot of existing software.

### Social post photograph

- Tool: built-in `image_gen`, generation mode.
- Project asset: [`social/public/images/yor-talks-friends-v1.jpg`](../social/public/images/yor-talks-friends-v1.jpg).
- Dimensions: 1122 × 1402. JPEG size: 212,583 bytes. Converted from the generated PNG for delivery.
- Role: fictional illustrative sample post, labeled as preview content. The pictured people are not actual platform users or endorsers.

Final generation prompt:

> Use case: lifestyle-photo. Asset: one sample social-media post photograph for the Yor Talks preregistration website. Create a portrait 4:5 candid editorial lifestyle photograph of three fictional young adult Indian friends, all clearly in their mid-twenties, laughing together on a sunlit city rooftop at golden hour. A woman in a cobalt blue overshirt in the foreground, a friend with short dark hair in a soft cream T-shirt and another friend wearing muted rust. Natural faces, natural skin texture, distinct believable people, spontaneous expressions, an ordinary warm moment between friends. Waist-up composition, a little room above their heads, the trio close together rather than posed in a row. Soft sun flare, hazy city buildings and a peach sky behind them, subtle analog grain, warm skin with cool blue details, premium contemporary magazine photography. Keep the mood authentic, social and joyful, not a corporate stock photo or an advertisement. This is a fictional illustrative post image, not real members or a testimonial. No text, no lettering, no logos, no UI, no social media frames, no watermarks, no phones held toward the camera. Deliver only the photographic image.

## Verification scope

The visual review uses the full production application. Registration requests in the browser fixtures are intercepted; this review does not submit real mailing-list entries or send email. Deployment and production email delivery are outside this visual change.

The focused Playwright run excludes the separately maintained real local API tests. It covers both public routes, mobile layout, validation and consent, successful registration, auth completion during submission, duplicate acknowledgement, retries, referrals and pass actions, the social preview interactions, keyboard district selection, WebGL fallback, Studio filters, and Dream blueprints.

Verified on 19 October 2026:

| Check | Result |
| --- | --- |
| Frontend TypeScript check | Passed, zero errors |
| Full application production build | Passed; the lazy Three.js bundle and the existing LiveKit bundle trigger Vite's 500 kB advisory |
| Registration browser fixtures | 13 passed, including the new social feed/messages/communities preview |
| Browser widths | 1440, 768, 375, and 320 px; no horizontal overflow |
| Axe accessibility scan | Zero violations at each reviewed width |
| Alternate social preview views | Feed, messages and communities reviewed at 1440, 375 and 320 px: no overflow, accessibility violations or JavaScript errors |
| Sticky navigation | Early-access anchor visible and clear of the header at all four widths |
| Live WebGL camera | Pixel comparisons confirm rotation, drag, reset, orbit, and pause; all three districts select correctly |
| Reduced motion / no WebGL | Immediate camera transitions, explicitly requested orbit works, artwork fallback and navigation remain usable |

Browser diagnostics contain only the expected mocked `401` from checking an anonymous account session; no JavaScript or shader errors were observed. Screenshots and JSON diagnostics are saved under the ignored `test-results/` directory, including `preregister-social-1440-viewport.png`, `preregister-social-375-viewport.png`, `preregister-social-1440-full.png`, `preregister-social-qa.json`, and `yor-talks-social-views-qa.json`. The separate 3D interaction verification is retained in `preregister-world-scene-qa.json`.
