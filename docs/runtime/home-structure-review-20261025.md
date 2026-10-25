# Home structure and CSS continuation — 25 October 2026

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

The published native CSS remains 216,796 raw bytes: 31,579 shared plus 185,217 page CSS. In the page stylesheet, 213 rules containing Webflow variant selectors account for 37,087 bytes of serialized rules. Of these, 80 rules / 12,078 bytes mention only variant classes absent from the initial Home HTML. Counts exclude media wrappers and are not additional to the stylesheet total.

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

The assembled before/after CSS rule sequence is identical after ignoring the removed exact repeats and invalid selectorless rules. Build parity, UI preservation, release inventory and whitespace checks pass. All served JavaScript remains byte-identical. Release/browser results are recorded below after publication.

Rollback: repin all four site references to `34520173d263a2497ed3481a4b4eec3b3e59f757` and publish staging only. Restore the four edited source fragments and their generated CSS through an ordinary repository revert. No functional native or DOM change requires restoration; the source-normalization trial preserved the same authored value and compiled stylesheets.
