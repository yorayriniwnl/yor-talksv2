# Asset provenance register

This register records assets visible in repository files and the font service
reference in `social/index.html`. A repository path or a successful build is
not evidence of ownership or commercial-use permission. `UNVERIFIED` means
source, licence, attribution, commercial-use permission, or modification
history must be confirmed before launch use.

| Asset / family | Creator or source evidenced in repository | Known licence / attribution | Commercial use | Modifications | Evidence / status |
|---|---|---|---|---|---|
| `social/public/favicon*.svg` | No author or source identified in the files inspected | UNVERIFIED | UNVERIFIED | UNVERIFIED | Repository files only; obtain original source and rights evidence |
| `social/public/images/yor-discovery-still-life-v1.{jpg,png}` | No creator/source metadata identified | UNVERIFIED | UNVERIFIED | UNVERIFIED | Repository files only; verify image source and derivative relationship |
| `assets/hero.svg`, `assets/architecture.svg` | No author or source identified in the files inspected | UNVERIFIED | UNVERIFIED | UNVERIFIED | Repository files only; obtain original source and rights evidence |
| Google Fonts: Cormorant Garamond, DM Mono, Inter, JetBrains Mono, Newsreader, Outfit | Google Fonts CSS is linked by `social/index.html` | Provider/source is visible; exact font licence and required attribution were not verified in this review | UNVERIFIED | UNVERIFIED | External runtime stylesheet; verify each family’s licence and deployment choice |
| Lucide icons used by the social app | `lucide-react` is imported in application source | Dependency is evidenced; licence and attribution obligations were not verified for this register | UNVERIFIED | UNVERIFIED | Inspect the installed package licence and record applicable attribution |
| E2E media fixtures: `e2e/fixtures/delivery.{wav,webm}` | Test fixture paths are evidenced; creator/source is not recorded | UNVERIFIED | Not assessed for product use | UNVERIFIED | Test-only by path; do not publish or reuse in product without rights evidence |
| Runtime user-uploaded images, audio, and video | Supplied by users at runtime; no asset file or rights record is part of this inventory | User rights and moderation process are governed by product terms, not established by this register | UNVERIFIED | Transformations may occur in media processing; exact derivative provenance must be recorded per asset | Verify notice/takedown and rights-handling operations before launch |

## Release control

Do not represent any item marked `UNVERIFIED` as commercially cleared. Before
public commercial use, record the creator/source URL or contract, licence text,
attribution, commercial-use permission, modification history, and retained
evidence for each asset. Remove or replace assets only after a compatible,
verified source is available.
