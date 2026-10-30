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

## Startup and shared footer cleanup — shipped

Runtime e22e39f4f7bb75d76fa0e46a5fade9ba7ef77563 is pinned in all four global references. CDN bytes match the build. Native staging publish: 6b447e37-48e6-4bf6-ba7e-9dce139688de; custom domains were not published.

Location now uses the same native footer definition as Home, 4c8e5b24-0116-2a8d-4190-53cdd4860ef5, renamed **Footer — shared**. Location instance a541b16b-eed4-45d3-da2c-635209053127 replaces the former footer instance. The old definition remains for unmigrated pages. This shares the lazy USP, social artwork, VIP handle/drawer and appointment banner structures, not just their runtime controllers. VIP drawer authored descendants fall from 62 to 11; the announcement has zero authored descendants instead of 36. Home remains at 1,133 initial elements. Location falls from 1,273 to 1,022 across the complete export. This is initial markup reduction, not removal of the deferred content or its eventual cost.

Both pages already use Navbar New (83119b7e-a73e-66e3-0fce-5279000d146c); Home keeps Home fade entrance and Location keeps Transparent. The empty Location Transparent Nav Styles instance is removed. Location's page head and footer custom code are now empty. The two CSS links, obsolete initial parallax controls CSS, old navbar opacity/selection code and 10ms nav reveal patch are removed. Config ownership entries are also removed for Location, while other page consumers retain their files. Native controls and the shared slider/nav modules already own these behaviors. The native Instagram module separately loads its own stylesheet.

Before removing layout compatibility, the three still-matching layout18_content responsive rules were transferred into native Webflow styles: medium column gap 3rem, row flow and auto min-height; small row gap 3rem and one column; tiny column/row gaps 8rem. This preserves the shared Location — Setting and access/Contact layout in Designer without a new runtime correction.

Native feature and Vimeo pseudo artwork now opt into the existing shared mask observer via data-tdb-native-pseudo-icon. The native URLs remain useful in Designer; early shared UI CSS parks the published masks with a transparent fallback. src/runtime/lazy-icon-masks.js assigns the canonical artwork URL within the existing 400px proximity/consent gate. No additional elements, observer family or asset request type were added. The existing Instagram holder attribute is applied to Behind the Barns' CTA icon. Shared Vimeo consumers inherit this behavior. The generic arrow remains an early shared asset because Home and navigation use it; the hero's embedded play SVG makes no separate network request.

### Four perspectives and combined delivery

Startup: native content/space remain, unused Location CSS and old authored drawer content are gone. In-page: current shared components own controls and preserve interaction feedback. Readiness: the existing proximity, consent, availability and first-input paths still prepare content; deferred bytes have not been claimed as eliminated. Maintenance: one native footer and the existing shared artwork owner replace parallel Location structures and page patches. Other unmigrated pages retain their legacy dependencies.

Controlled measurements include HTML, native Webflow CSS, early UI, foundation and starter, plus the two legacy stylesheets where actually linked. Gzip is recompressed for comparison and is not a claim about CDN transfer. Unchanged Webflow/jQuery scripts, fonts and image payloads are excluded from this affected subtotal.

| Scope | Before raw / gzip bytes | After raw / gzip bytes | Delta |
| --- | --- | --- | --- |
| Location affected initial subtotal | 488,894 / 95,222 | 418,327 / 81,106 | −70,567 / −14,116 |
| Home affected initial subtotal | 469,351 / 88,567 | 469,811 / 88,636 | +460 / +69 |
| Shared deferred runtime | 73,669 / 20,091 | 74,270 / 20,302 | +601 / +211 |

Combined affected initial plus changed deferred delivery: Location −69,966 raw / −13,905 controlled gzip bytes; Home +1,061 / +280. Existing lazy VIP/announcement/USP modules may now be requested on Location at their normal gates; those feature costs remain. Full-page speed, memory and CPU gains have not been benchmarked. The screenshot's document transfer change and the recompressed HTML figures are different measurements.

### Verification

- Full suite: 844 passed, three existing skips, zero failures. Build parity passed before publishing; CDN checks matched all four relevant local artifacts.
- Native medium/small/tiny layout readback and actual 393px Designer checked. No new Home elements; Home HTML length remains 186,174 bytes.
- Fresh staging exports show the same footer, VIP lazy flag, announcement lazy flag and navbar controller version on both pages.
- Static resolution of the published IX2 event targets finds zero matching event targets on either page. The sitewide Webflow bundle still includes 189 event definitions for other pages. One inert data-w-id remains on the shared Vimeo component; it has no matching event. This is not a claim that Webflow's IX2 code is absent from downloads.
- Separate fresh top-level tabs with saved essential-only consent and no interaction recorded 37 observed resource URLs on Location and 40 on Home. This inventory is not an incognito HAR, timings benchmark or exact identical-duration measurement. Location did not load far-below-fold business photos, brand logos or feature/video masks. The review panel can prepare sooner because its trigger is nearer the fold; both pages use the same 700px panel and 1200px inline readiness policy.
- Scrolling through the feature section correctly loaded all six pseudo masks. Desktop screenshot confirms the arched feature icons and video play artwork. Shared nav appeared on scroll-return, VIP handle prepared, and VIP drawer opened with the shared deferred form and closed without submission. No warning/error was captured in the checked tab. Native mobile was checked; a new physical Android runtime certification is not claimed.
- Evidence remains outside the repository in location-faq-evidence: startup-native-backup.json, startup-cost.json, after-parity-ix2.json, startup-location-fresh-observed.json, startup-home-observed.json, startup-icons-ready.png and test/build logs. The earlier reused-tab resource capture contained accumulated resources and is not used as a startup baseline.

### User HAR review

The user-provided 30 October HAR covers approximately 107 seconds, not startup alone. It contains 321 recorded entries and 7,403,935 transfer bytes over the whole session. The first wave is 16 entries / 272,751 transfer bytes, followed by no new requests until about 33.8 seconds. Native CSS, shared UI and some assets were cached, so 273kB is not a cold-cache budget. The native document load event is about 307ms in this recording, not an LCP or general speed score. Removed compatibility stylesheets and below-fold play/pause/feature masks are absent from startup.

No TDB asset returned an HTTP error. Google Maps tiles include one 503, 33 successful responses and 69 status-zero entries without a recorded HTTP response, concentrated around the camera transition. Cancellation during camera changes is plausible, but this HAR does not establish why every entry ended or prove that the failed tile retried. No exact successful retry of that failed URL is recorded. Review unnecessary camera/tile churn without discarding the user-approved visual transition. Google tile transfer totals about 2.51MB; Maps code is a further approximately 0.40MB, all later in the session.

Five Practice Gallery WebPs transfer 1,466,993 bytes (about 181–359kB each); they use original CMS images and 23.5-hour cache headers. Responsive sizing/compression is the next concrete image opportunity. Some later Instagram photos are JPEGs. Header caching is Webflow-owned; no page-JS cache workaround was introduced.

At approximately 75.3 seconds, Google tagging (~204kB), Meta code/config (~155kB), Intellimize (~90kB) and Brevo load. These are not initial-load requests. The timing is consistent with consent being released, but the HAR contains no banner-click evidence, so timing alone does not certify the consent state. Review whether Intellimize/experimentation is actively used before retaining its cost; do not remove marketing or measurement code without checking owners and consumers. Maps also requests Google UI fonts later; this is not a replacement of the site's Sweet Sans typography.

Repeated icon URL entries use memory/disk cache or 304 revalidation, not repeated full payloads. In particular the arrow transfers zero bytes on both recorded uses; subsequent barn/clock/spinner uses are cache hits. No duplicate play asset download appears in the recording. The HAR is retained locally, not committed or uploaded; the report excludes credentials, request bodies and query strings.

### Rollback

Restore Location's saved native footer instance/old definition and its page code from startup-native-backup.json together if reverting. Restore the four runtime pins to db135075b0a7e3af87a8c0bddf0f7e6c3609e54e, Location's ownership config entries and pseudo-icon attribute/style changes as a coordinated release; do not restore parked CSS without its loader or remove native artwork hooks independently. The native responsive grid declarations can stay as a correction. The former footer definition remains available to other pages. Preserve unrelated edits and user-approved content. Production publication remains separate.

## Earlier startup/parity/Lighthouse audit — historical findings

The startup/footer findings below describe the pre-cleanup snapshot and are superseded by the shipped section above. The separate Lighthouse, map-consent and brand findings remain outstanding unless explicitly stated otherwise.

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

## Native CSS and structural audit — 30 October 2026, final pass

This was an identification and verification pass. No native styles or elements were deleted, no runtime was changed, and nothing was published. The native inventory contains 2,735 styles; Designer's cleanup preview identifies 510 grouped selectors. The preview was cancelled. Its full selector chains and native IDs are saved locally in `location-final-audit/native-unused-styles.json`.

### Deletion shortlist

The first bounded batch contains the following 22 legacy selectors. Each appears in Designer's unused list and its base class has no textual reference in the 261 inspected runtime source/configuration/build/service files. These are removal candidates, not a blanket certificate covering external scripts, every historical custom-code embed or retained rollback components. Check those consumers and retain a native backup before deletion; then validate shared consumers on staging.

| Family | Exact selectors |
| --- | --- |
| Old testimonial artwork | `.testimonial1_logo-wrapper`, `.testimonial1_logo`, `.testimonial1_client-image-wrapper`, `.testimonial1_client-image` |
| Old FAQ combinations | `.faq3_question.is-first`, `.faq3_question.is-white`, `.faq3_question.is-white.is-first` |
| Old contact/map structure | `.contact16_item`, `.contact16_item-icon-wrapper`, `.contact16_item-text-wrapper`, `.contact16_map` |
| Replaced image wrappers | `.layout18_image-wrapper`, `.layout18_image` |
| Old gallery 17 | `.gallery17_lightbox-link`, `.gallery17_image-wrapper`, `.gallery17_image`, `.gallery17_slide-nav` |
| Old gallery 14 | `.gallery14_mask`, `.gallery14_image`, `.gallery14_slide-nav` |
| Old inline Vimeo artwork | `.vimeo-bg__btn-play-svg`, `.vimeo-bg__btn-pause-svg` |

None of those 22 exact selectors appears in either current exported Location stylesheet. Their removal would clean the Designer library; it is not a demonstrated reduction in Location's shipped CSS or startup requests.

Do not run Delete All. A conservative source scan flags 147 entries whose final state class occurs in JavaScript, and 121 with an exact full-selector reference in the source tree; those groups overlap. Confirmed live examples include navbar `is-nav-desktop`, `is-nav-motion`, `is-menu-frosted`, VIP checkbox `is-vip-checked`/`is-vip-focused`, treatment `is-runtime`, and consent `is-consent-content-open`. These are applied after load and can legitimately look unused to Designer. The scan is a protection list, not proof that every flagged combination is still needed. Existing legacy footer/marquee definitions also have other page consumers and must not be removed as part of Location alone.

### Structural findings

Fresh staging HTML confirms 1,022 elements, one main landmark, no duplicate IDs, no nested anchor/button elements and no image missing an alt attribute. These checks do not certify alt-text quality or full accessibility. Existing runtime-only source links are intentionally empty data carriers and must not be deleted on that basis.

Two native cleanup items remain. Location retains a hidden seven-element `section_header46 hide` welcome quote (element `ca677289-5ddd-5abb-c65e-83e284591779`) alongside the Owner Quotes component. It also ships two H1 elements: the visible Location hero and the hidden generic Home heading inside Review Introduction. The latter should be excluded from Location's published markup through the shared component's native visibility contract while preserving Home's heading. No compensating JS is appropriate for either issue.

The shared footer still authors Pinterest as `href="#"`; this is distinct from the intentionally scripted cookie-settings and share controls. Confirm its intended destination or remove the unused link at the shared owner. A separate Home-only check found a repeated Webflow-generated grid ID in the shared showcase; that was recorded as a follow-up, not changed in this Location audit.

### Designer visual checks

Actual Designer was inspected at desktop and 393px mobile, rather than relying on the connector's image renderer, which had omitted fonts/masks. Mobile hero sizing, Contact stacking, journey placeholder and equal-height footer actions, partner caption containment, first-open FAQ, and footer legal content were inspected. The native mobile body measured 393px client width and 393px scroll width. Contact's previous horizontal grid overflow and oversized journey action were not reproduced. This is a targeted visual pass, not a fresh end-to-end interaction test on physical Android.

The mobile Review Introduction summary visibly clips the rating/count. Native CSS gives the score/count fixed `ch` widths with `min-width:0` and `overflow:hidden` inside a flex row. This needs a measured native layout correction at the shared Mini Review Widget owner, followed by Home/Location and no-JS verification. It has not been repaired or hidden by runtime code in this audit.

Correction to the earlier brand finding: a fresh Designer session eventually displayed the lifestyle logos (Sonos, Cano Water and Samsung visible in the mobile screenshot). Therefore an empty current preview is not a reproducible blocker in this pass. The historical category-label discrepancy is not proven repaired; no category data was changed. The previously reported short-viewport pop-out positioning issue was not retested.

### Remaining verification and evidence

The two authored preconnect origins remain the site asset CDN and Webflow's CloudFront script origin. The removed compatibility stylesheets remain absent from Location. The user's latest desktop Lighthouse screenshot reports 100 in all four categories, zero CLS and zero TBT; this audit does not claim a new Lighthouse run. The API-imported gallery image responsive-size/cache opportunity remains open as documented above.

Local evidence: `location-final-audit/audit-results.json`, `current-verification.json`, `location-current.html`, both current native CSS files, `mobile-journey-designer.png` and `mobile-partner-brands-designer.png`. Read-only audit scripts preserve the exact shortlist and source references. No behavior tests were rerun because no implementation changed. Proposed next work is the two native structural removals, the shared review-summary width correction, then the bounded style cleanup after its remaining consumer checks.

## Native cleanup — shipped to staging, 30 October 2026

The user authorised the preceding cleanup list. Staging publish task: `a8e491d2-cfbc-4302-9ed3-4cff0bb6031f`; custom domains were explicitly empty. The runtime pin remains `e22e39f4f7bb75d76fa0e46a5fade9ba7ef77563`. No runtime file, page custom code, loading gate or consent policy was changed. The pre-existing local modification to `dist/tdb-journey.css` was left untouched.

### Native owners and changes

- Removed all 22 selectors in the shortlist above. Before removal, all 127 retained component definition trees were read, including uninstantiated archives; none contained an exact candidate selector. The earlier native unused inventory and 261-file runtime scan also had no consumers. The native style count is now **2,713**, down from 2,735. Live dynamic state selectors were retained. No bulk Delete All was used.
- Removed Location's seven-element hidden welcome quote, `ca677289-5ddd-5abb-c65e-83e284591779`; Owner Quotes remains the content owner.
- Review Introduction (`1e6d2fa0-eb51-af7e-5dc2-307ef04c9501`) now exposes **Include page heading**, boolean prop `7dcaefe2-5935-bd2c-bce1-c058954917da`, default true. The existing hidden H1 (`...9509`) binds visibility to that property. Location's instance explicitly sets false and publishes no extra H1. Home inherits true and keeps its existing H1. No node was added and no runtime suppression was introduced.
- Removed the unconfigured Pinterest `href="#"` from **Footer — shared**, element `4c8e5b24-0116-2a8d-4190-53cdd4860f81`. This removes one published element from both Home and Location. The older footer used by other pages is retained.
- Corrected the native **Review Summary** owner (`50534c54-e1ae-0ff8-0bc0-38fd7b938d5a`), nested in Review Introduction. The earlier audit called this Mini Review Widget because that is the exposed property group's label; Review Summary is the actual definition. Score and count slots cannot flex-shrink. Their base widths are 4ch / 4.5ch. At the tiny breakpoint, count is 4ch, row text is .875rem and its column gap is .25rem. Existing vendor masks use 1rem width/height/minimums, and the star mask uses a proportional 3.5rem strip with no additional trailing margin. This removes the inherited 1.2rem vendor minimum and doubled star spacing that otherwise overflowed the narrow row. Existing ticker nodes, masks, timing, reduced-motion logic and lazy activation are unchanged.

### Acceptance and delivery

Fresh staging source confirms **Location 1,013 elements** (previously 1,022) and **Home 1,132** (previously 1,133). Each has one main landmark and one H1. Location has no duplicate IDs, hidden duplicate quote, Pinterest stub, nested interactive controls or images without alt attributes. The existing Home showcase generated grid ID remains a separate recorded follow-up; it was not changed by this cleanup.

Actual Designer was checked at desktop and mobile while correcting the numeric slots. Published Location was checked at 320px and 393px; Home at 393px, with the browser viewport restored afterwards. At 393px both page bodies fit the viewport without horizontal overflow. Static published HTML carries 4.94 and (90); the shared runtime progresses to the same values and keeps the incoming values outside the clipping slot. Opening Location's summary still opens the patient review drawer at **Review 1 of 90**. The current mobile screenshot is `location-final-audit/location-review-cleaned-mobile.png`. This is targeted native and browser verification, not a new Lighthouse run or physical Android certification.

The affected HTML plus two native CSS files change by **−560 raw / −41 controlled gzip bytes on Location** and **+253 raw / +115 controlled gzip bytes on Home** against the preserved pre-cleanup exports. The 22 unused selectors were already absent from Location's export, so this is primarily Designer housekeeping and a layout/semantics correction, not a claimed speed gain. Initial shared UI/foundation/starter and all deferred JS/CSS remain unchanged. The head keeps its two authored preconnect origins; no layouts-owned/page-compat stylesheet is reintroduced. Its noscript UI fallback is retained.

Across the four perspectives: authoring improves through a smaller native library and an explicit H1 switch; native/no-JS layout remains usable with readable values; runtime behavior and first-use/consent gates remain unchanged; maintenance uses existing shared owners with no new wrapper, class family or motion implementation.

### Evidence and rollback

Local evidence includes `native-cleanup-before.json` (component/quote/footer trees), `styles-before-cleanup.json` (native base property inventory), `cleanup-consumer-check.json` (all 127 definition checks), `style-removals-receipt.json`, `cleanup-verification.json`, and both pages' cleaned HTML/CSS exports. The earlier Location and Home CSS exports preserve the previous responsive review rules. These snapshots supplement Webflow's native site backups; the base property inventory alone is not a complete breakpoint/variant backup.

For a selective rollback, restore the removed quote/Pinterest elements from their captured owner trees, set Include page heading true on Location or unbind it to restore the previous heading behavior, and restore the five affected native selectors from the prior export. Score/count were 3.4ch / 3.2ch with the default flex-shrink; tiny row gap was .4rem, with no new font-size or mask-size overrides. Restoring the 22 unused styles is only necessary if a future retained source is deliberately reintroduced. Review a pre-cleanup Webflow backup for full breakpoint/variant recovery rather than reconstructing unsupported properties from the base-only inventory. Publish any rollback to staging first.

Separate open follow-ups remain the API-imported image responsive/cache issue, Home's repeated generated grid ID, and the previously recorded brand pop-out placement on short viewports. No unrelated change was made to address them here.

## Map consent entry and mobile review correction — 30 October 2026

The empty map now reuses the existing CookieScript-compatible consent panel on click, Enter or Space. The handler belongs to `src/consent/consent.js` in the early shared foundation, because a visitor with no decision may not have downloaded the journey controller. It adds no element or request. The existing canvas temporarily receives button semantics; functional consent restores its original region semantics, and withdrawal restores the consent entry. External Google Maps links remain ordinary links. Google SDK, route and Places permission gates are unchanged. Focus/pointer feedback lives in the existing external consent-state stylesheet; no page head logic or Designer embed was added.

The preceding review clipping correction made the mobile card too small. The native shared Review Summary now uses the available mobile width, capped at 25rem, rather than shrinking to its content. Its platform icons and stars are larger again; bounded fluid sizing allows 320px screens to retain the fixed, nonshrinking numeric slots. This changes the same native owner used on Home and Location, with no new elements, CSS class or JS layout patch. Desktop remains unchanged.

Local acceptance: deterministic build checks pass; the full suite reports 850 passed, 3 skipped and zero failures. Six new consent-entry checks cover undecided/essential visitors, keyboard input, acceptance, withdrawal, no extra DOM/Google request, and delayed banner readiness. Existing route/consent/Vimeo tests also pass. Foundation increases by 923 raw / 313 gzip bytes, with a small addition to the already requested UI stylesheet; journey and other deferred bundles are unchanged. The pre-existing `dist/tdb-journey.css` working file was preserved byte-for-byte.

Rollback: revert this runtime commit and the saved native four-selector mobile changes, then restore the previous immutable release pin and publish staging only. Consent behavior uses no new persistent state. The previous native/mobile CSS exports and pre-release site code remain in the local `location-final-audit` evidence directory.

