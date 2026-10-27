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
