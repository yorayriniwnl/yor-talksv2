# Asset provenance register

Technical inventory dates: **16–17 October 2026**. Scope: the current working tree, before public release. The 17 October continuation verified and vendored the six font families from official Google Fonts resources with their pinned source licenses. Other ownership approvals below remain unestablished.

This is an inventory and approval worksheet. File presence, a source URL, or a generation recipe does not establish ownership or permission to distribute. This is not a full dependency license audit, legal approval, or accessibility conformance assessment. Pending entries are not approved for release.

## Web visual files

These nine files are in the Vite public directory and are copied into the web build. No creator, ownership, license, attribution, or applicable model/property release evidence was established for them during this inventory.

| Exact path | Release use / source evidence | Approval status |
| --- | --- | --- |
| `social/public/favicon.svg` | Default icon linked by `social/index.html`. | Pending owner and permission evidence. |
| `social/public/favicon-crimson.svg` | Icon variant selected by `social/src/lib/app-icon.ts`. | Pending owner and permission evidence. |
| `social/public/favicon-monochrome.svg` | Icon variant selected by `social/src/lib/app-icon.ts`. | Pending owner and permission evidence. |
| `social/public/apple-touch-icon.png` | Apple touch icon linked by `social/index.html`. | Pending owner and permission evidence. |
| `social/public/pwa-icon-512.png` | Installable app icon referenced by `social/public/manifest.json`. | Pending owner and permission evidence. |
| `social/public/og-card.svg` | Public vector artwork; the HTML share metadata references the PNG variant. | Pending creator, source and permission evidence. |
| `social/public/og-card.png` | Open Graph / Twitter image referenced by `social/index.html`. | Pending creator, source and permission evidence. |
| `social/public/images/yor-discovery-still-life-v1.png` | Public image; no application reference found in the scoped source search. Public-directory presence still includes it in the build. | Pending creator, source and permission evidence, or removal from release. |
| `social/public/images/yor-discovery-still-life-v1.jpg` | Public image; no application reference found in the scoped source search. | Pending creator, source and permission evidence, or removal from release. |

## Other asset sources

| Asset / exact source scope | Release scope and known evidence | Pending approval / evidence |
| --- | --- | --- |
| `assets/hero.svg`; `assets/architecture.svg` | Repository documentation artwork, referenced by `README.md`; separate from the web public directory. | Creator, ownership, permission and attribution review for repository/public documentation distribution. |
| Android splash PNGs: `social/android/app/src/main/res/drawable/splash.png`; `drawable-land-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/splash.png`; `drawable-port-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/splash.png` under the same `res/` directory. | **11 PNGs** in native Android resources. Brace groups enumerate the actual directory suffixes, not additional files. | Creator/source, ownership, license and attribution evidence before a native release. |
| Android launcher PNGs: `social/android/app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/`, each containing `ic_launcher.png`, `ic_launcher_round.png`, `ic_launcher_foreground.png`. | **15 PNGs**, bringing the Android total to **26**. Native packaging scope. | Creator/source, ownership, license and attribution evidence before a native release. |
| iOS: `social/ios/App/App/Assets.xcassets/Splash.imageset/` (`splash-2732x2732.png`, `splash-2732x2732-1.png`, `splash-2732x2732-2.png`); `AppIcon.appiconset/AppIcon-512@2x.png` under the same `Assets.xcassets/`. | **4 PNGs** in native iOS resources. | Creator/source, ownership, license and attribution evidence before a native release. |
| Cormorant Garamond, DM Mono, Inter, JetBrains Mono, Newsreader, Outfit. | Self-hosted through `social/public/fonts/fonts.css`, with 34 unmodified WOFF2 downloads (1,246,044 bytes) and six copyright/OFL notices. `sources.json` records every official Gstatic URL, size and SHA-256, and pins the Google Fonts license revision `47d54ca1ebb14fd864695f1d39dc734f39017c33`. | SIL Open Font License 1.1 notices ship alongside each family; bundling/embedding is permitted subject to the shipped terms, including keeping notices and not selling fonts alone. No rename or font modification was performed. `tests/font-assets.test.mjs` verifies bytes, notices and local-only CSS; final browser results are in the test report. |
| Lucide React icons, installed version `0.545.0`. | Declared by `social/package.json`; local `social/node_modules/lucide-react/package.json` reports ISC. Its `LICENSE` contains ISC terms for Lucide and MIT terms for portions derived from Feather, with their copyright notices. | Preserve the applicable notices in release distribution and record a reviewer-approved notice location. This package finding does not cover other dependencies. |
| `e2e/fixtures/delivery.webm`; `e2e/fixtures/delivery.wav`. | Test-only synthetic video and tone. `e2e/fixtures/README.md` records FFmpeg 9.0.2 recipes using a solid-color source and a generated 440 Hz sine wave. No camera/microphone or provider media is described. | Retain recipe/provenance with test artifacts; repository owner to confirm distribution approval. No external asset license asserted. |
| `social/src/lib/ambient-audio.ts`; `audioEngine.ts`; `sound.ts`. | Runtime sounds generated with Web Audio oscillators/noise. Source inspection identified code-generated sound in these modules, rather than bundled audio samples. | Confirm code ownership and review any later added sample assets separately. |
| Seeded image URLs in `api-server/src/scripts/seed.ts`, `seed-database.ts`, `seed-massive.ts`, `seed-ultra-massive.ts`. | These scripts contain `https://images.unsplash.com/…` avatar, cover and content URLs. Exact IDs/transformations remain in the scripts. Script presence does not show that a deployed database contains the records. | Identify each original creator/source page and applicable terms, attribution and releases; confirm production data excludes unapproved seed content. A direct image URL is not permission evidence. |

## Review record and release gate

For each applicable row or individual asset, attach the following record before approving its distribution:

| Field | Current value / required entry |
| --- | --- |
| Release identifier and scope | Pending: immutable release revision and web, native, documentation or test-artifact distribution. |
| Responsible asset owner | Pending named owner. |
| Creator and original source | Pending, except the limited source/generation evidence recorded above. |
| Ownership/license evidence | Pending document or archived license tied to the actual asset/version; include permitted commercial use and modifications. |
| Attribution / notices | Pending required wording and the location shipped with the release, or a documented determination that none is required. |
| Model/property permissions | Pending applicability decision and evidence where required. |
| Reviewer and review date | Pending named reviewer and date. The technical inventory date above is not approval. |
| Decision / removal action | Pending: approve, replace, exclude from the specific release, or investigate; record the responsible owner and follow-up date. |

The release owner must close pending entries for assets included in that release and record exclusions explicitly. Reconcile newly added assets, remote sources and seeded production content against this register when preparing the final release. Keep a removal/contact process alongside the operating policy for user-uploaded content; this static inventory does not establish upload ownership or takedown operations.
