# Location partner facts and FAQ/startup audit — 30 October 2026

This change follows the [Home architecture standard](https://chatgpt.com/space/page_c22eaec26d7c819197df9524f243acbd), full-motion review and shared-artwork budget. Website publication is staging-only.

## Partner location ticker — shipped

Runtime commit: db135075b0a7e3af87a8c0bddf0f7e6c3609e54e. All four global runtime URLs point to that immutable commit. CDN parallax bytes match the local build. Final native publish task: 2dc267f1-2d13-4b70-a86c-37042e4de991.

Location remains an instance of Home's Shared showcase carousel (5e5b55f7-9a7f-d930-e0b9-f598c4c91772), using Light (e1399f25-064c-5442-699e-599a1560515e). It now has one native CMS location fact in the existing CTA/facts row. Native conditional visibility is bound to All businesses, with Keep in HTML when hidden off. Home publishes none of these six additional elements.

Blackbrook Retailers (678a9501e48e15ea9e303a51) owns the new single-line field Unit or location, slug unit-or-location, ID 46385c930d1a550ec46e3e4bed8585e0. The initial fact queries the first item using the same Sorting-descending order as the carousel, limit one. Its text is natively bound to the field. Each existing business source link carries the same CMS value in data-tdb-treatment-location-source. This adds no per-slide elements or JSON fetch.

| Partner | Saved location | Basis |
| --- | --- | --- |
| Blackbrook Barns: Wedding Venue | Blackbrook Barns | Site-wide venue name |
| LB's Coffee Shop | Blackbrook Barns | No more precise visitor unit verified |
| Primrose Flower Boutique | The Cottage | Public listing and user confirmation |
| The Art of Wellness / Llewella | Unit 3 | User confirmation |
| Charlotte Christopher Photography | Unit 4 | User confirmation |
| Caroline Bailey Bridal | Unit 1 | User confirmation |
| Muse — The Studio | Blackbrook Barns | No more precise visitor unit verified |
| The Ladies Lounge | Unit 5 | User confirmation |

Companies House did not establish additional visitor units. The Ladies Lounge registered office is not its Blackbrook visitor address; it was not substituted. Do not infer a retail unit from an unrelated or registered-office address.

### Ownership and behavior

- Designer owns the native CMS text, reserved ticker geometry, variant colours and existing shared fact classes.
- src/sliders/treatment-ticker.js selects the current original slide's location and uses the existing TDBNativeTicker mount/update lifecycle, just as Home's treatment facts do.
- src/shared/native-ticker.js supplies the existing directional slide, cancellation, cleanup and reduced-motion fallback. Central TDBMotion/TDBMotionProfile timing/easing are unchanged. No separate motion implementation or timers were added.
- The fixed barn icon reuses data-tdb-journey-icon="barn", the canonical asset and existing lazy mask loading. It remains decorative and absent in unenhanced Designer/no-JS, with reserved geometry.
- Equal values do not animate unnecessarily; missing values clear rather than retaining the previous partner's unit. A transition uses a temporary incoming node, removed on settlement. Rapid changes settle to the latest selected item.
- The native Light variant had inherited a last-child translateY(100%) rule intended for Home's second authored incoming value. The new single authored value would consequently disappear when animation finished. Light's main last-child transform is now none, with the redundant mobile offset removed. Its old mobile white colours are removed so black inherits. These are native component corrections, not runtime patches. Home's two-value structure and variant remain unchanged.

### Delivery cost and four perspectives

Controlled measurement compares the post-FAQ 9289fd3 staging export with the final partner export. Initial subtotal includes HTML, native Webflow CSS, early UI CSS, foundation and starter, deduplicated within each page. Gzip is recompressed consistently for comparison, not claimed as actual CDN transfer.

| Scope | Before raw / gzip bytes | After raw / gzip bytes | Delta |
| --- | --- | --- | --- |
| Location initial subtotal | 465,913 / 90,196 | 467,471 / 90,396 | +1,558 / +200 |
| Home initial subtotal | 468,304 / 88,499 | 469,351 / 88,567 | +1,047 / +68 |
| Existing deferred parallax bundle | 44,889 / 14,035 | 45,050 / 14,054 | +161 / +19 |

Combined affected initial plus deferred delta: Location +1,719 raw / +219 controlled gzip; Home +1,208 / +87. Home's shared native CSS export grows despite unchanged DOM. No new module, stylesheet, feed or unique icon request is introduced. This is an added feature, not an overall performance saving.

Native Location element count: 1,267 → 1,273; shared showcase descendants 145 → 151. Home stays at 1,133, with 121 descendants under the measured showcase layout and no partner facts/source attributes.

Four perspectives: startup retains accurate native first text and bounded additional markup; in-page behavior shares the working ticker rather than a second controller; readiness uses existing slider/ticker/artwork gates with static fallback; maintenance uses one CMS field, one shared showcase, existing artwork and central motion. The cost of the native CMS boundary is six elements, accepted to keep Designer and initial published content accurate.

### Verification and limits

- Full runtime suite: 843 passed, 3 skipped, zero failures; build-preservation check passed.
- Published CMS values match all eight expected items and sort order.
- Desktop staging: all values, fixed icon, outgoing/incoming translation, final single-value settlement and rapid reverse changes checked. Home price ticker still slides and settles correctly.
- Actual Designer at desktop and 393px: native first CMS text appears, black text fits its reserved row; icon remains intentionally deferred. Corrected mobile resting transform and colour are native declarations.
- Published source verifies initial text and Home DOM preservation. Mobile runtime/physical Android certification is not claimed: the browser viewport override applied to a different active surface, so it was reset.
- Evidence: workspace location-faq-evidence/partner-verification.json, partner-full-tests.log, partner-ticker-desktop.png, partner-designer-mobile.png. Native and runtime screenshots should be distinguished.

Rollback: restore the four runtime pins to 9289fd37d5487b46f61d8f5726a5a15dc368ba15 and remove only the new conditional partner fact wrapper (dd9d5d96-b991-8b4f-eb22-e8620996b4ca) plus the source attribute binding from e34898af-a43f-226b-ed0d-808cdcfa516e, coordinated before publish. Keep the user-approved CMS locations unless separately asked to remove them. Native ticker styling can stay as a correction for a single authored Light value; restoring the former offset would reintroduce the disappearing-text defect. Do not revert unrelated user edits or earlier FAQ work.

## FAQ migration — shipped before the ticker

FAQ - Location (b59f35db-3413-c0b3-c7f2-f127dba1c803) is shared with Contact. Seven rows now use TDBDisclosure and Home Awards' native question, panel and copy structure. First row is open in Designer/published HTML; six remaining panels are closed/hidden/inert. Foundation v1.2.2 synchronizes the question's native is-open class with panel/item state. Shared chevron, copy and bounded gap motion remain centrally controlled.

Old FAQ IX2 class targets, spacer nodes and inline icon markup are removed from this component. Global IX2 definitions used elsewhere remain. FAQ descendants: 93 → 44, a reduction of 49. Home remained 1,133 elements; Location became 1,267. The preceding native/runtime release is 9289fd3.

Desktop staging and keyboard Enter/Space/focus checks passed on Location; shared Contact exported structure and Home Awards were verified. A script-free native fixture confirmed first-open geometry and chevrons. Home Wellness's separate five-item group was left unchanged. Controlled affected subtotal changed by −2,356 raw / −81 gzip on Location, +128 / +20 on Home. No whole-page speed claim.

Rollback requires restoring the saved FAQ native tree and its former IX2-target classes together with the earlier disclosure controller pin if reverting behavior. Do not remove the shared controller merely to reverse a native layout.

## Startup/parity/Lighthouse audit — findings, not implemented fixes

The pages are not yet identical in their deferred footer/chrome wiring:

| Area | Home | Location |
| --- | --- | --- |
| Navbar | Navbar New, Home fade variant | Same definition, Transparent variant; an additional small Transparent Nav Styles embed remains |
| Footer | Footer — Home (lazy USP), 4c8e5b24-0116-2a8d-4190-53cdd4860ef5 | Separate Footer, 91d57bb2-8236-c862-18aa-956ad5c7502e; eager USP/social structures |
| Appointment banner | Empty deferred shell | Same controller/data, 36 authored descendants and no equivalent lazy flag |
| VIP drawer | Compact 11-descendant deferred shell | Same controller, 62-descendant authored form |
| VIP handle | Shared action with compact pulse decoration | Extra pulse node/legacy artwork remains |

Location's initial network evidence has 16 extra resources and lacks Home's three award assets: a net 13. Extras include two compatibility stylesheets, four review-platform images in an old hidden footer template, direct-URL feature masks, play/pause/spinner masks, Instagram/close artwork and an old USP logo. A mask still fetches eagerly if its native CSS directly supplies its URL. The migrated Review Introduction is already lazy; the old footer template is a separate consumer. Legacy review-cms.js still references its icon hooks, so removal requires a consumer check.

tdb-layouts-owned-bf28eec4e7.css is a 1,702-byte generated responsive compatibility stylesheet, not a tracker. Its owner is config/page-layout-css.json and tools/runtime-build/build-page-layouts.cjs, with src/styles/secondary-layouts.css input. It still supplies three matching layout18_content rules on Location. The larger tdb-page-compat.css had no initial DOM selector matches after FAQ migration, but dynamic consumers were not exhaustively checked. Do not remove either solely on initial-match evidence.

The reported 0.119 CLS identifies the hero poster as a shifted element, not a proven cause. Location's lazy desktop hero poster lacks intrinsic width/height; native cover geometry and LCP readiness deserve the next check. Home also has an unsized poster. No compensating runtime layout patch was added.

The source-mapped 26ms foundation reflow is consent-dialog focus following style changes; the starter review visibility measurement was about 1ms, other reported foundation/Webflow entries 0–1ms, and 47ms unattributed remains unidentified. Do not blame SVGs based on Lighthouse's presentation.

The two Practice Gallery WebPs are roughly 180,602 and 277,722 bytes, with 84,600-second Webflow CDN max-age. Native lazy images can load ahead of the viewport; these lack responsive sizes/srcset and request original files. Image size/responsive delivery is actionable; Webflow's CDN cache lifetime cannot be changed from page JS. Lighthouse's 181KiB estimate concerns repeat-visit caching, not proof of that much first-load saving.

The map remains gated by functional consent and near-view readiness. Recommendation only: retain a useful static placeholder, let an explicit enable-map action open the existing cookie controls, show a static waiting icon before consent and the normal spinner only during actual loading. No consent category was changed. See [ICO exceptions](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/), [Chrome forced reflow guidance](https://developer.chrome.com/docs/performance/insights/forced-reflow) and [cache insight](https://developer.chrome.com/docs/performance/insights/cache).

The remaining brand category Designer discrepancy and short-screen pop-out placement issue remain documented in location-blackbrook-brands-20261030.md. This ticker release does not resolve them.

