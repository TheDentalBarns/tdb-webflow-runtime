# Location shared hero — 27 October 2026

Reference: [TDB architecture and engineering standard](https://chatgpt.com/space/page_c22eaec26d7c819197df9524f243acbd).

## Implementation and ownership

Location now uses the existing **Hero - Vimeo** component (`b1a810af-870e-98e2-c9cd-c1f7607452ce`), also used by Home. Its instance is `f30c8035-7949-9221-6dc1-221fb830f9ec`; its native layout variant is **Location — centred heading** (`8c75878c-cb6e-a5e6-e920-a198c7ca4318`). Main VIP remains a separate page-level hero for a later migration.

No elements were added to the component definition or Home. The existing logo wrapper gained a Boolean visibility binding, default true, so all existing consumers retain their logo. Location sets it false. Existing heading, subheading, poster, video and optional CTA properties supply the Location content. CTA, arrow and extra fading are disabled. Desktop and mobile video IDs both remain `1047445489`; both poster properties use the existing `681cdba311c32c7e05997667` asset.

Designer owns native structure and variant layout: centred content, 64rem heading width, subheading above the heading with a 1rem gap, existing responsive vertical clearance and original video gradient. All rules are scoped to the new variant in Webflow's external generated stylesheet. No custom CSS embed, inline override or page-specific JavaScript was added. Shared runtime remains pinned to `a0f146664e1e1d0d47187b71fd6e606fee3b97ed`.

The existing external Vimeo controller and compact-control styles own play/pause, consent feedback, buffering and motion. The existing early feedback service remains available before video consent; the Vimeo loader retains consent and proximity gates. Central motion timing, poster fade and scroll/fade hooks are reused. The shared component has desktop/mobile player shells; the controller activates the visible shell, and the inactive iframe remains unnavigated.

## Four-perspective assessment and delivery cost

- Startup: no added Home HTML, element or script request. Home's full document remains 184,887 raw bytes and 1,132 elements; its hero remains exactly 5,871 serialized bytes and 20 elements. The hero outerHTML is byte-for-byte identical. Full body string differs because Webflow reorders the existing CMS partner entries on publication.
- In-page use: Location inherits one semantic keyboard-operable play/pause button and the existing shared consent/controller lifecycle. No new controller or timing source exists.
- Visual polish: desktop title bounds and vertical positions match the baseline exactly; the original gradient and media remain. Responsive browser previews cover 390×844, 834×1112 and 844×390 in addition to 1280×720.
- Maintenance: Home and Location share one definition and runtime, with page content and optional elements configured through properties. An isolated native variant handles Location geometry. Future changes must preserve existing consumers and add no unnecessary Home nodes.

Measured before/after native page CSS: Home 182,531 → 183,562 raw bytes (30,123 → 30,296 gzip); Location 174,949 → 175,897 (29,088 → 29,242 gzip). Location HTML is 285,351 → 286,356 raw bytes (76,967 → 76,304 gzip), and its hero is 32 → 22 elements / 5,236 → 6,240 serialized bytes. The shared responsive media markup adds bytes while compact controls remove nodes. This is a maintainability migration, not an established overall performance improvement. The shared native CSS file, initial runtime JS, early UI and deferred JS/CSS release are unchanged; the new control uses existing resources. No fresh lab LCP/TBT/CLS claim is made.

## Acceptance

29 existing targeted tests passed: Vimeo consent gate, compact toggle/cancel feedback, poster motion clock and consent scroll-lock cleanup. Staging desktop verifies playback, pause/resume, expected media ID and one active iframe; no captured browser warnings/errors. The desktop heading is 949.34×124.58px at x165.32/y312.91, unchanged; tagline y282.5, unchanged. Responsive previews have no horizontal overflow, and portrait/landscape text and controls remain legible. Physical-device testing is not claimed. Home hero raw markup is identical and total document element count unchanged.

Staging only was published. Production domains retain their prior publication. Local raw HTML/CSS, comparison script/results, screenshots and full Designer baseline are retained in the task's `hero-migration-evidence` directory and `hero-migration-baseline-20261027.json`.

## Rollback

The original Location hero is preserved as the uninstantiated **Archive — Location hero before shared migration 2026-10-27** component (`f04a94d8-4eea-a6b8-059d-b945b7073b4a`). It adds no page DOM. To roll back, remove only the new Location hero instance, insert the archive component at the start of Location's main wrapper (`f3a6c255-9ed7-32a9-be96-9b7f1e282565`), and publish staging. No runtime pin change is required. The shared logo-visibility default remains true and can safely stay. Do not alter Home's hero instance or variant.

## Desktop poster layout shift — 30 October 2026

The user's desktop Lighthouse capture attributed CLS 0.119 to the Location hero poster. Its inherited native rule combined `width:auto`, `min-width:100vw` and `height:100vh` inside a centred flex frame. When a landscape poster decoded in a relatively tall desktop viewport, its intrinsic ratio widened the image box and changed its centred position. This was reproduced with the actual Location poster bytes and the original sizing rules: at 1200×900 the image changed from x0 / width1200 to x−200 / width1600, recording an isolated layout shift of 0.1667. This is a reproduction of the mechanism, not a rerun of the supplied Lighthouse report.

The existing shared native `.vimeo-bg__placeholder.hero` combo now sets **width:100%** at the base breakpoint. Its existing height, `object-fit:cover`, mobile overrides, Home overscan, motion, fade, consent and Vimeo controls are unchanged. The fixed reproduction remained x0 / width1200 before and after decode, with no layout-shift entries. No image was duplicated, no eager loading of the hidden responsive alternative was introduced, and no JavaScript sizing patch was added. Webflow also shortened both exported poster `sizes` attributes to `100vw`.

Published to Webflow staging only, task `393bbb4e-d8f2-43e3-84a5-dfafe84e5188`. The runtime remains `e22e39f4f7bb75d76fa0e46a5fade9ba7ef77563`. Home retains 1,133 elements and Location 1,022; hero HTML differs only in the exported `sizes` attributes. Native page CSS changes by +16 raw/+4 gzip bytes on Home and +39 raw/+8 gzip on Location. Home's export also deduplicated an identical ambient poster aspect-ratio declaration, with no semantic change. HTML changes by −56 raw/−11 gzip bytes on Home and −56 raw/+6 gzip on Location. Shared CSS, initial JS, external UI CSS, deferred modules and request count are unchanged: the combined initial code delta is −40 raw/−7 gzip bytes for Home and −17 raw/+14 gzip bytes for Location. This is a geometry correction, not a material byte-saving claim.

Acceptance: live staging Home and Location were inspected at 1280×720. The published native hero markup/CSS was also checked without the site enhancement scripts in isolated 1200×900 and 393×844 frames: all four poster rectangles remained stable, Home's existing scale remained, and the intended responsive poster alone occupied space. The Location fixture records small other shifts, so no full-page zero-CLS claim is made. A new complete Lighthouse run and physical-device verification remain separate checks. The supplied foundation reflow offset maps to initial cookie-dialog focus after visibility changes; starter maps to the review summary visibility safeguard. These small one-off operations were left intact; keyboard focus and the no-visible-count-rewind rule are preserved.

Four perspectives: startup geometry is deterministic before decode, in-page playback and consent behaviour are unchanged, cover composition is retained, and maintenance stays with the shared native hero class. Evidence is in the task's `location-faq-evidence/hero-cls-delayed-decode.json`, `hero-native-publish-verification.json`, `hero-published-native-geometry.json` and `location-hero-sizing-fixed.png`. Roll back only this correction by removing the base `width` property from the `hero` combo under `vimeo-bg__placeholder` and republishing staging. The canonical architecture ownership policy is unchanged.
