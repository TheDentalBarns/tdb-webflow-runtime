# Home structure and CSS continuation — 25 October 2026

Current whole-page assessment: [complete Home audit](home-full-audit-20261025.md). That report supersedes any implication that this bounded cleanup/variant review completed the full DOM-versus-delivery assessment. This file remains the historical implementation and rollback record.

Later reconciliation: [Home DOM reconciliation](home-dom-reconciliation-20261025.md) compares the exact pre-cleanup snapshot and restores three content-only padding boundaries. It supersedes the earlier retain-all-structure decision below for those three boundaries only. Current HTML is 184,887 bytes and native CSS 215,584 bytes; runtime remains `782454b4`.

Governing reference: [TDB Home architecture and engineering standard](https://chatgpt.com/space/page_c22eaec26d7c819197df9524f243acbd). This continues the integrated cleanup after runtime `34520173d263a2497ed3481a4b4eec3b3e59f757`; it is not a new DOM-count exercise. Publish only to `dentalbarns.webflow.io`.

## Decision

Keep the current native structure. This review did not establish a complete, simpler replacement for the remaining clipping, background/content, animation, CMS or reserved-card boundaries. Further wrapper removal is not an adopted improvement. Pagination remains one example of a shared primitive, not the scope of this work.

Adopt only the verified CSS deletions below. They reduce duplication without moving complex component rules into shared UI or changing loading gates. The saving is modest; it does not establish a measurable speed improvement or recover the earlier October footprint.

## Relationships checked

| Area | Current relationship and decision |
| --- | --- |
| Section spacing and full-width backgrounds | Earlier wrapper removal inset sticky backgrounds. Keep the corrected full-width backgrounds and existing 94%/90% content boundaries. The previous six inset-class consolidations remain in place. No further layout rewrite is justified by this pass. |
| Navigation image cards | The retained wrappers supply a 16:9 clipping window around scaled images. Preserve the crop/hover boundary. |
| Hero controls | Early loading and consent-cancellation feedback needs the compact control CSS plus its transition-completion bridge before Vimeo permission. Restoring a wrapper requires comparing the complete replacement across interruption and fade-out; deleting the bridge alone would lose behaviour. No hero or audio change here. |
| Service/treatment carousels and quotes | Preserve track, copy, price-ticker and content animation targets. Treatment prices consume Smile-named base styles, so a Smile class-name purge would cross component boundaries. |
| IG, Smile and review cards | Keep Designer reserved geometry and separately prepared internal module markup/CSS. Initial markup absence alone is not proof of unused styling. |
| VIP | Home has a native 12-element drawer shell and an empty body; form content is deferred. The visible footer form remains native. Related base/combo styles and other pages' drawer instances prevent a blanket removal of VIP-looking native CSS. |
| Shared primitives | Open-chevron state had two identical owners in the assembled UI. Keep one state owner. Partner spacing and review focus styles also contained identical repeats; remove the earlier copies without creating another shared bundle. |

## Native CSS findings

At the start of this continuation, published native CSS was 216,796 raw bytes: 31,579 shared plus 185,217 page CSS. In that page stylesheet, 213 rules containing Webflow variant selectors accounted for 37,087 bytes of serialized rules. Of these, 80 rules / 12,078 bytes mentioned only variant classes absent from the initial Home HTML. Counts exclude media wrappers and are not additional to the stylesheet total. Subsequent measured reductions are recorded below.

The largest such groups are two Smile-related variants (4,155 and 1,097 bytes); the remainder spans buttons, navigation, headings, banners and other component variants. These are **dependency-tracing candidates**, not a verified unused-code total. Deferred markup, alternate states and native consumers on other pages must be checked before changing authoring boundaries. No export purge or new stylesheet pipeline was introduced.

Exact repeated declarations inside native rules account for 1,109 raw bytes in the inspected export. This does not include repeated whole rules/selectors and is not a safe savings forecast. A bounded source-normalization trial removed then restored `text-align:center` on `.max-width-small.align-center.tdb-flat-center`. Its authored value was preserved; staging still emitted three identical declarations. Both published CSS files remained byte-for-byte identical, including their hashes. Do not repeatedly rewrite authored values or restructure components merely to chase this generated duplication.

## Adopted source deletions and delivery

- Initial UI: remove the earlier compact-chevron open-state transform from `tdb-control-effects.css`. `tdb-chevron-states.css` remains the owner in the same bundle; the first-use motion guard stays in place.
- Deferred partner card: remove one identical earlier spacing rule.
- Deferred review drawer: remove one identical earlier focus-visible action-button rule.
- Deferred VIP content: remove 18 invalid selectorless fragments and two identical earlier fine-print/consent colour rules. They were extraction residue, not intended global resets. Retain the last valid rules at their existing cascade positions.

All feature readiness, consent, intent/proximity preparation, first-input replay, motion and 20px blur remain unchanged. No JavaScript, template, native layout, authored head CSS or asset request was added.

| Delivered layer | Before raw | After raw | Raw change | Local gzip change |
| --- | ---: | ---: | ---: | ---: |
| Initial UI CSS | 15,148 | 15,037 | -111 | -3 |
| Deferred partner CSS | 13,246 | 13,111 | -135 | 0 |
| Deferred review-drawer CSS | 27,146 | 27,008 | -138 | -2 |
| Deferred VIP-content CSS | 11,558 | 10,620 | -938 | -133 |
| **Affected files combined** | **67,098** | **65,776** | **-1,322** | **-138** |

HTML structure remains 1,129 initial elements. Native CSS, startup/foundation (37,432 bytes), post-decision runtime (70,373 bytes), templates and all other served assets are unchanged. Gzip uses Node level 9 consistently; it is not measured CDN transfer size. Most of this saving is deferred, so do not describe the total as an initial-load reduction.

## Four-perspective review

| Perspective | Assessment |
| --- | --- |
| LCP/startup | Initial UI saves only 111 raw / 3 gzip bytes; blocking native CSS is unchanged. Variant emission and shared native/component dependencies are the more material investigation. |
| In-page performance/usability | Removing identical or invalid CSS does not change the effective rule sequence. Interaction controllers and loading gates are untouched. |
| Visual polish/readiness | Preserve dimensions, blur, current motion, spinner feedback, focus outlines and styles-ready gates. Test disclosures and deferred surfaces after the release. |
| Maintenance | Eliminate the genuine second state owner and extraction residue. Keep authored/native responsibilities clear; do not build a general CSS-purge system or duplicate component definitions just for a small byte reduction. |

Chair decision: adopt these deletions, retain useful DOM boundaries, and prioritize a consumer-by-consumer review of variant emission and native/deferred style overlap. Any further ownership migration must include the controller's readiness contract and all native consumers in one reviewable change.

## Verification and rollback

The assembled before/after CSS rule sequence is identical after ignoring the removed exact repeats and invalid selectorless rules. Build parity, UI preservation, release inventory and whitespace checks pass. All served JavaScript remains byte-identical. The first full run exposed an existing marquee test's strict floating-point equality at approximately 1e-14; that unchanged JavaScript test passed in isolation. The full rerun passed 757 tests, with three existing skips and zero failures. No test or JavaScript was altered to obtain that result.

Rollback: repin all four site references to `34520173d263a2497ed3481a4b4eec3b3e59f757` and publish staging only. Restore the four edited source fragments and their generated CSS through an ordinary repository revert. No functional native or DOM change requires restoration; the source-normalization trial preserved the same authored value and compiled stylesheets.


Staging verification: release `8b0455e26fd8f4b621600ae7eefee3f1e2713142`, publish task `d2670a0f-fab4-40fe-96bc-6670390fc936`. All four published pins match. All four changed CSS files plus startup/foundation match their immutable CDN files exactly. Home HTML remains 184,860 bytes; 1,129 total parsed elements (1,093 body descendants), 98 CMS items and 16 lists. Native stylesheet hashes, every authored inline style, link destinations and image attributes match the preceding release.

Desktop browser checks: Sight opens to the settled 180-degree chevron and closes to zero; review filters open and the keyboard-focused View reviews action retains its 2px outline / 3px offset; closing restores review-trigger focus. VIP first opening mounts its form, loads the new deferred stylesheet and retains white fine print/consent labels. The Sonos partner pop-out opens with the new stylesheet and retains zero top/side margins and its original bottom spacing. No form was submitted. Physical mobile devices and forced network failures were not tested; no new performance run or speed claim is made.

## Native Smile variant follow-up — 25 October 2026

The two largest candidate groups belong to the retained **Slider - Smile Gallery** component (`e0beb16c-1442-9d6b-ea4d-f24bdc4656ae`): Home (`90f60b07-3fe4-8c44-7899-81187e34ddca`, originally 4,155 serialized rule bytes) and Dark (`a6dd2098-844a-775c-39a4-fe1d4e445b09`, 1,097 bytes). These figures include rules in Home's native export; they are not a safe deletion budget.

The external Home Smile template and its live mounted section use neither variant. However, the **IG feed rollback - 15 Oct 2026** draft retains a native Home-variant instance. Dark appears on eleven scanned published treatment/area pages: Clear Aligners, Composite Bonding, Invisalign, Teeth Whitening and Veneers, plus the Sutton Coldfield and Tamworth Composite Bonding, Invisalign and Veneers pages. Other published pages retain the native base gallery. The public scan covered 48 URLs, comprising published static pages and relevant Home-linked treatment/service/area/VIP pages; it was not an exhaustive scan of every CMS item. Authored references and all four relevant variant breakpoints were checked separately.

**Decision:** retain both variants, their geometry and their consumers. Do not delete a variant because it is absent from Home's initial HTML, remove a rollback draft to improve a byte count, or clone the component merely to alter Webflow's CSS emission. The authored main variant has larger typography and spacing; many medium overrides are necessary resets even where Home's optimized export omits their main counterpart.

Removed only seven inherited repeats in the Home variant:

| Native style | Breakpoint | Removed repeats | Retained source |
| --- | --- | --- | --- |
| `tdb-smile-carousel` | Medium | `overflow:visible`, `margin-left:0px`, `margin-right:auto` | Same values in main variant; medium `width:70vw` remains |
| `tdb-smile-carousel` | Small | `overflow:visible`, `width:70vw` | Main overflow and medium width |
| `tdb-smile-viewport` | Medium and small | `overflow:visible` at each breakpoint | Main variant already supplies visible overflow; small native base also agrees |

Published to staging only, task `53713a12-f108-4aea-a753-83bcb05fc588`. Native page CSS falls **185,217 → 184,748 raw bytes** (−469); combined native CSS falls **216,796 → 216,327**. Node level-9 gzip for the page stylesheet falls **30,224 → 30,171 bytes** (−53). HTML remains **184,860 bytes / 1,129 elements**, shared native CSS **31,579**, UI **15,037**, startup/foundation **37,432**, and post-decision runtime **70,373**. No deferred asset changed. Runtime and all four site pins remain `8b0455e26fd8f4b621600ae7eefee3f1e2713142`; no runtime repin is needed for this native-only change.

Verification: a parsed transformation of the before stylesheet using only the expected deletions and the resulting duplicate-selector consolidation exactly equals the published after stylesheet. Shared native CSS is byte-identical. Initial HTML is identical after normalizing the publish comment, updated page-CSS URL/integrity and existing randomized partner order; all 98 CMS items and 16 lists remain. Native timing projection is byte-identical and build parity passes. On desktop, the Home gallery loaded its existing deferred stylesheet, rendered its current/nearby images and advanced from Smile 2 to Smile 3 of 11. Farther slides retain lazy image sources. This is not a physical-mobile or rollback-draft visual acceptance check, and no new timing run was performed.

Four-perspective decision: the LCP benefit is a small reduction in blocking native bytes; in-page controllers and readiness gates are untouched; polish retains geometry, typography, motion and image preparation; maintenance loses redundant overrides without adding a replacement abstraction. Preserve the actual native/deferred consumer boundary. Treat the remaining candidate families as unverified until traced; do not turn the 12,078-byte original candidate figure into a promised saving.

Rollback uses the exact `rollbackActions` in [home-smile-variant-cleanup-20261025.json](home-smile-variant-cleanup-20261025.json), followed by staging publication and native-provenance refresh. Reverting a runtime SHA alone does not restore these Designer properties. Refer to the architecture standard before the next change.

## Navigation and button follow-up — 25 October 2026

Retain the native variants. A fresh 48-URL scan found Navbar New's Transparent variant on 27 pages, Transparent Dark on four (Privacy Policy, Contact, Blog and Pricing), and Home — fade entrance on Home. The secondary White button appears on 20 scanned pages; the primary Stretch button appears on 26. Secondary Stretch was absent from this public sample, which does not establish absence from drafts or all CMS pages. Counts identify positive consumers and are not a complete site inventory.

The basic navbar loader and later enhancement both toggle `is-trans` on the navbar, logo, links, button and menu icon. Therefore colour/inversion resets support the actual early and enhanced menu states. Small-screen stacking, width constraints and border resets differ from inherited native properties. They are not redundant merely because the compiled selectors look similar. Generated grouped rules also share declarations with Home's active variant; adding per-variant byte totals double-counts those groups.

The primary Stretch export repeats `width:100%;min-width:100%` at medium and tiny. This remains a narrow candidate, not an adopted deletion: the variant connector identifies styles by terminal name, and `is-icon` belongs to several different combo chains. Its lookup returned an unrelated empty override; exact selector and style-ID lookups were rejected. No ambiguous mutation, class rename or substitute CSS was attempted. Resolve the exact authored combo before editing it. Retain the explicit Home navbar visibility state and the existing native/deferred handoff.

The concrete maintenance cleanup removes two unused sources: `src/styles/tdb-chrome-entry.css` (1,555 bytes) and `src/styles/tdb-mobile-navbar.css` (6,330 bytes), **7,885 source bytes total**. Neither is referenced by current build inputs, release assets, runtime code or any of the 48 scanned HTML documents. The former still described obsolete opacity-zero entrance behaviour; the latter duplicated an earlier version of mobile navbar states. Historical rollout notes now clearly point to the current owners and warn against reapplying their old loading instructions. Git history and dated release snapshots retain the prior sources; no new archive copy is needed.

| Current navigation responsibility | Owner retained |
| --- | --- |
| Native layout, contrast, reserved geometry and baseline menu structure | Designer/component variants |
| Essential controls before enhancement; native-to-enhanced handoff | Foundation navbar loader and shared early control-state CSS |
| Enhanced desktop/mobile choreography, scroll-dependent colours and glass states | Deferred navbar controller; `tdb-navbar-state.css` and `tdb-navbar-desktop.css` composed at build time |
| Shared timing tokens and narrow native timing projection | Existing shared motion profile/UI sources |

**Delivery change: zero bytes in every phase.** Home remains 184,860 HTML bytes / 1,129 elements, native CSS 216,327 bytes, UI 15,037, startup/foundation 37,432 and post-decision runtime 70,373. All generated `dist` files retain their hashes; build parity, release coverage and whitespace checks pass after the deletions. No Designer change, runtime repin or staging publication is necessary. No new browser/device or performance run is claimed for this source-only cleanup.

Four-perspective decision: LCP gains no transferred-byte reduction; interaction/usability and polish retain exactly the existing assets; maintenance benefits from removing misleading alternative sources and obsolete rollout guidance. Keep searching for meaningful initial-delivery overlap, but do not turn each retained component family into a promise of savings. Rollback is an ordinary revert of this repository-only change; the installed runtime remains `8b0455e26fd8f4b621600ae7eefee3f1e2713142`.

## Variant review closeout and gesture correction — 25 October 2026

The bounded variant review is complete. The final pass checked banner/logo, heading, review and image variants against authored base/responsive styles, external module/secondary-page CSS and a fresh 48-URL published consumer scan. This is a positive-consumer inventory, not a complete inventory of every draft or CMS item. Exact IDs and observed URLs are retained in [the final variant record](home-final-variant-cleanup-20261025.json).

| Family | Evidence and retained responsibility |
| --- | --- |
| Banner Partners / Dark — Awards | Published on VIP. Retain its contrast and responsive logo sizing. |
| Banner Partners / Base — Awards | Published on 12 scanned treatment/area pages. Retain the native instances and layout. |
| Other banner variants | Dark, Black, Black — Awards and Transparent — Awards were absent from the public sample. Their draft/CMS ownership remains unresolved; no variant was deleted. |
| Logo height resets | The main base logo is 8rem and the medium base becomes 10rem. A variant's repeated medium 6.25rem height is therefore a necessary reset. Keep it, as well as small/tiny sizing and active Home partner/award variants. |
| Heading colours | Location uses `39c01d68`; First Visit uses the dark five-senses entry `a3682485`. Other sampled-absent heading variants remain. Remove only the proven Review Introduction / Dark combo repeat described below. |
| Treatment Hero / Light | Used on Pricing. Its geometry must also be evaluated against deferred `secondary-layouts.css`; native absence is not an ownership proof. Keep it. |
| First Visit reviews / Light Cream | Used on First Visit. Keep background, spacing and image presentation. |
| Feature 3 / Dark | Used on 11 scanned treatment/area pages. Keep it. |
| Treatment-image and image-2 scaling | Five sampled-absent image variants retain scale/crop and transform-related declarations. Their complete consumer/controller relationship was not established. Preserve them as unresolved compatibility work, without moving motion into global UI. |
| Review Introduction / Dark section width | Its small-screen 100% width resets the base section's 90%. Keep width, full-width background and padding. |

Removed **one authored property**: `color` from **Hero Padding**, main breakpoint, in **Review Introduction / Dark** (`a520a091-48ff-33d4-59e1-92dfef73f651`). The base `heading-style-h3` variant retains the identical linked colour variable. The combo's base style and its medium/small/tiny overrides introduce no competing colour. Neither the inspected native colour rules nor external styles supply an intervening colour. The export drops this variant selector from two identical grouped rules; other variants stay in both groups.

Staging publish `c2b828ca-0bf0-4873-a954-1ec81a93edca` reduces native page CSS **184,748 → 184,576 bytes**, combined native CSS **216,327 → 216,155**: **−172 raw / −4 Node level-9 gzip**. The after stylesheet equals the before stylesheet with exactly those two selectors removed. Shared CSS and the native timing projection are byte-identical. HTML remains **184,860 bytes / 1,129 elements**, including 98 CMS items and 16 lists. Normalized HTML is identical after excluding publish comments, page-CSS URL/integrity and existing randomized partner order. The fresh HTML gzip difference is publication noise and is not credited as a saving. The Dark variant was absent from the public sample, so its own visual acceptance was not established by viewing base Home.

### Reported vertical-inertia/horizontal-drag glitch

The user's trigger is a vertical page throw followed by a horizontal slider drag while the page is still moving. Source inspection found that slider focus manages chrome visibility, while Swiper prevents current touch input. Neither previously acquired the existing page scroll lock or cancelled an already running Lenis trajectory when a horizontal gesture was accepted. This is a confirmed missing handoff; physical-device reproduction of the user's exact lag remains outside the cloud browser check.

The shared Swiper adapter now acquires the existing `TDBScrollLock` only on a confirmed horizontal `sliderFirstMove`. It cancels an active Lenis trajectory at the **current** scroll position once, then relies on the existing native root lock and event containment. It does not change Lenis' stopped/started ownership or write scroll position on each move. The native treatment-stamp strip uses the same helper after its own horizontal threshold. A tap, vertical gesture, arrow click or programmatic slide does not acquire this lock.

Release happens at gesture end/cancellation, blur, page departure, a second finger, disabling or destruction. A touch gesture is not released by cancellation of its duplicate PointerEvent stream. The carousel does not acquire another page lock inside an existing drawer lock; if a drawer opens during a drag, releasing the carousel's own token leaves the drawer locked. Horizontal coast and slide settling continue after finger release without preventing the next vertical gesture. Existing slide targets, durations, easing, focus/chrome lifetime and 20px blur are retained. No Designer motion, UI CSS, head logic or new request was added.

| Gesture-fix asset | Before raw | After raw | Raw change | Local gzip change |
| --- | ---: | ---: | ---: | ---: |
| Deferred shared Swiper engine/adapter | 97,544 | 98,466 | +922 | +329 |
| Deferred parallax/treatment controller | 44,717 | 44,817 | +100 | +44 |
| **Total** | **142,261** | **143,283** | **+1,022** | **+373** |

Regression tests exercise the real bundled Swiper event path, including a coasting Lenis stub, touch and mouse axis selection, cancellation, pinch, teardown and overlapping drawer ownership. The corrected touch fixture fails six lock assertions against the prior engine and passes with the fix. Native stamp tests also cover a touch stream continuing after pointer cancellation and release before coast/disposal. Full verification passes **768 tests, three existing skips, zero failures**. These checks establish gesture ownership and cleanup, not iOS compositor timing or a measured frame-rate improvement.

### Consolidated ownership and cost

| Responsibility | Owner and current boundary |
| --- | --- |
| Static layout, image crops, reserved cards and native appearance | Designer, including required responsive resets. Preserve useful clipping/background/content/CMS/accessibility boundaries. |
| Essential early feedback and handoff | Small startup/foundation loaders and early control states. Preserve the existing consent, first-input replay and readiness contracts. Audio/Safari remains paused. |
| Complex motion, mounted card internals and gesture implementation | Feature modules and the existing deferred carousel adapter. Remaining native compatibility rules are explicitly retained until their complete consumers can be migrated. |
| Shared logic and presentation | Genuine reusable tokens/primitives, composed into existing bundles. The carousel uses the existing scroll-lock service; no extra global gesture framework or CSS bundle. |
| Initial, nearby and opened delivery | Keep phase boundaries visible. Preparation is separate from activation; this pass changes no proximity distances or media/consent gates. |

Comparison scope: **the ownership-cleanup baseline `8915e4a2` through this closeout**, including the reported gesture fix. It is not a comparison with the archived October performance screenshot or a complete network budget.

| Tracked initial layer | Baseline raw | Current raw | Raw change | Local gzip change |
| --- | ---: | ---: | ---: | ---: |
| Home HTML | 184,915 | 184,860 | −55 | −10 |
| Native Webflow CSS, combined | 218,048 | 216,155 | −1,893 | −210 |
| Shared UI CSS | 19,005 | 15,037 | −3,968 | −629 |
| TDB startup + foundation JS | 37,432 | 37,432 | 0 | 0 |
| **Tracked initial subtotal** | **459,400** | **453,484** | **−5,916** | **−849** |

Post-decision runtime stays **70,373 raw bytes**. Across affected deferred assets, earlier cleanup saved 1,257 raw / 11 gzip bytes; the gesture fix adds 1,022 raw / 373 gzip, leaving a net **−235 raw / +362 gzip**. All affected delivered layers combined therefore change **−6,151 raw / −487 local gzip**. Separately, the removed obsolete sources save 7,885 repository bytes and **zero delivered bytes**. Gzip totals use recorded Node level-9 file comparisons, exclude publish/cache-key noise and do not represent CDN transfer measurements. No performance run or speed claim is made.

Chair decision: accept the verified deletions and the small deferred gesture correction. Initial delivery is smaller; the interaction repair has an explicit deferred cost. Retain the remaining native variants and necessary structure. Close this candidate sweep rather than repeatedly auditing every sampled-absent variant. Any further HTML/DOM work must compare a complete simpler relationship—layout, crop, motion target, CMS, accessibility and delivery—not pursue a node-count target. Consult the architecture standard before that work.

Rollback: restore all four runtime pins to `8b0455e26fd8f4b621600ae7eefee3f1e2713142` for the gesture change, and publish staging only. The native colour cleanup has an independent exact variable-linked rollback in the JSON record; a runtime repin does not restore Designer properties.

Published verification: runtime `782454b4d242e7341af7df78e06a749329e33758`, staging task `48a2fb69-d1b8-45b0-9e29-f3e65b8d9616`. All four site pins match. Both changed deferred files and the unchanged startup, foundation and UI files match their immutable CDN bytes. Both native stylesheets retain the verified post-colour-cleanup hashes. Home remains 184,860 bytes / 1,129 elements; normalized HTML changes only the runtime pins, publication comment and existing random partner order. Desktop Home loads the new shared engine and parallax controller; Services advances from Smile Design to Signature Assessment with the correct destination, and the page is unlocked after the arrow interaction. The base review heading remains black. The exact physical-phone fling and compositor performance remain unverified. The architecture standard is updated to version 11, including the gesture handoff rule, retained consumers, costs and rollback.
