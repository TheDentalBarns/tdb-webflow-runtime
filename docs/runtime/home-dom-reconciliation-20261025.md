# Home DOM reconciliation — 25 October 2026

Governing reference: [TDB Home architecture and engineering standard](https://chatgpt.com/space/page_c22eaec26d7c819197df9524f243acbd). This compares the exact 22 October pre-cleanup snapshot (`e56f6efb510da0ef966683c60db67fc8cc9f77f1`) with current Home, then corrects one complete relationship. It supersedes the earlier decision to retain all three compensating content-inset classes. Publication is to the Webflow subdomain only.

## Governing engineering principle

As reaffirmed by the owner during this pass: use sound engineering principles as the default. Prefer clear responsibility, simple composition, predictable behavior and easy maintenance. Measure payload and interaction performance as constraints; do not make element count or individual file size the design objective. Keep useful structure, avoid speculative abstraction, and adopt a change only when its complete implementation is clearer or demonstrably better. Small byte savings alone do not justify another migration.

## Adopted correction

Restore the original content-only `padding-global` wrapper in wellness, the shared location background component, and the closing sketch section. Keep each background as a full-width sibling. Remove the three replacement `tdb-content-inset-*` combinations and their six compiled rules. The existing global 3%/5% padding and native maximum-width containers again express this relationship directly.

This restores three useful elements while reducing the combined initial payload. No new CSS abstraction, JavaScript coordination, runtime dependency or request is needed. The location boundary belongs to the shared native component; its instances and property forwarding are retained. The other two boundaries belong to Home. The existing parallax loader continues to select the same outer sections, background frames and descendant images, so its measurements and preparation gates do not change.

| Layer | Before raw | After raw | Change |
| --- | ---: | ---: | ---: |
| Home HTML | 184,860 | 184,887 | +27 |
| Combined native CSS | 216,155 | 215,584 | −571 |
| Initial UI | 15,037 | 15,037 | 0 |
| Startup + foundation | 37,432 | 37,432 | 0 |
| **Tracked initial subtotal** | **453,484** | **452,940** | **−544** |

The paired published HTML/native files decrease 122 bytes with local Node level-9 gzip (HTML −20, page CSS −102). HTML compression also reflects publication metadata and the existing random partner order; this is not a wire-transfer or timing claim. All runtime/deferred assets remain byte-identical. Body descendants rise 1,093 → 1,096; total initial elements 1,129 → 1,132.

## What the wider comparison actually says

The archived snapshot was captured on 22 October at 06:05 UTC, with HTML hash `f8b5916f67e881dad6f836039b197f4a891271e5ac82fce7cecbcaf723a84bce` and 1,407 body descendants. The current page has 311 fewer body descendants, but most HTML savings have been offset elsewhere:

| Tracked layer | 22 October raw | Current raw | Change |
| --- | ---: | ---: | ---: |
| Home HTML | 213,938 | 184,887 | −29,051 |
| Native Webflow CSS | 196,134 | 215,584 | +19,450 |
| Initial UI CSS | 11,884 | 15,037 | +3,153 |
| Startup + foundation | 33,824 | 37,432 | +3,608 |
| **Tracked initial subtotal** | **455,780** | **452,940** | **−2,840 (0.62%)** |

The same per-file gzip subtotal is 86,813 → 86,419 bytes: only 394 bytes smaller. Separately, post-decision runtime grew 67,580 → 70,373 raw bytes (+2,793; +947 local gzip). Combining that later runtime with the tracked initial subtotal leaves almost no raw saving (−47 bytes) and +553 gzip bytes. Keep those phases separate when discussing startup.

This is a dated before/current comparison across all intervening work, including new behavior and shared timing/configuration work; it does not attribute every added byte to DOM reduction. It excludes Webflow's own JS, fonts, images and feature modules. It establishes that a large node reduction was not a comparable initial-payload reduction. No speed conclusion follows from these file sizes alone.

## Decisions across the relationships

| Relationship | Evidence and decision |
| --- | --- |
| Background versus content | Adopt the three restored wrappers. Their sole native spacing role replaces six special rules without touching motion targets. Other section padding combinations that carry vertical spacing or variants remain. |
| Hero control | Keep the semantic button, glass owner, independent glyph/spinner layers and interruption-safe feedback. The old control subtree was 16 elements / 2,440 serialized HTML bytes; current is 2 / 333. However, its new native rules serialize to approximately 3KB, including a 2,010-byte play-mask rule with prefixed/unprefixed artwork, plus early feedback CSS and the fade-completion bridge. This is not an established payload saving. Restoring the entire old multi-control subtree would retain shared legacy rules and require another behavior migration; a wrapper alone does not replace end-of-fade spinner control. No speculative hero rewrite is adopted. |
| Navigation | Retain the image-card clipping boundaries around the scaled hover image. Keep native initial geometry and early toggle state; enhanced choreography stays deferred. Removing these wrappers would need replacement clipping/transform ownership. |
| Services and treatments | Keep native CMS lists, stable tracks, visible copy/reveal targets, URL/price/duration sources and the treatment ticker relationship. The earlier duplicate hidden copy removal does not justify deleting the remaining data or animation owners. The gesture repair remains in deferred slider code. |
| Smile, Instagram and review cards | Keep Designer placeholders and reserved cards. Current Smile/IG holder markup matches the pre-cleanup snapshot; the review holder retains its later explicit height class. Modules continue to own prepared internal markup, CSS, active states and motion. No internal module is moved into an initial loader. |
| USP, review drawer, VIP and audio | Native launch controls/shells retain first-use feedback; deferred internals and their consent/readiness/activation gates remain. Audio behavior and its paused Safari investigation are unchanged. |

## Four-perspective decision

- **LCP/startup:** accept the combined −544 raw bytes, while recognizing the saving is small. Removing three global special-case selectors is preferable to claiming a large DOM-count win. Initial UI/JS and request chains do not grow.
- **In-page performance/usability:** existing background, grid, clipping, focus, CMS and interaction targets remain. Three static containers add no listener, measurement loop or runtime work. The prior mobile fling acceptance remains separate and unverified on a physical phone.
- **Polish/readiness:** preserve full-width backgrounds, original content insets, sticky heights, 20px blur, reveal targets and first-use spinner feedback. Asset readiness and proximity gates are unchanged.
- **Maintenance:** reuse the established Designer utility and visibly separate the background from its inset content. Remove the compensating classes. Keep module state and motion rules local.

Chair decision: adopt these three boundaries, retain the other functional structure, and stop treating DOM count as the optimization objective. A pseudo-element is still a rendered box and can carry substantial CSS; count the full HTML, native CSS, shared CSS, early JS and deferred consequences before adopting it. A useful wrapper is justified when it makes that complete relationship simpler.

## Verification and rollback

Staging publish task `537519b9-960e-41f2-a04e-6b76407f1bb0`. All four runtime pins remain `782454b4d242e7341af7df78e06a749329e33758`; no repin is needed. Current native page CSS is 184,005 bytes; shared CSS remains 31,579.

Both authored trees equal their before snapshots after undoing only the three intended changes. Published HTML likewise equals its before DOM after undoing those changes and normalizing the CSS link and existing randomized partner order. All 98 CMS items, 16 lists, links, image attributes, inline styles, scripts, native holders, audio controls and USP launchers remain. Published page CSS is exactly the prior file minus the six expected rules; shared CSS is byte-identical. The native timing projection, build parity and release inventory pass; no served asset changes. Existing runtime tests were not rerun for this native-only correction.

Desktop at 1363 × 936: all three backgrounds remain x=0 / width=1363; checked section, background and content heights are unchanged. Content width changes by +0.03125px from percentage rounding. Wellness Sight opens and closes; the location background and content boundary are visually checked. Responsive native rules retain 3% insets and 5% below 768px; this is not a physical-mobile visual acceptance claim.

The [machine-readable change record](home-dom-reconciliation-20261025.json) preserves original classes/properties, new wrapper IDs, before/after measurements and explicit reversal instructions. Restore the recorded combinations, move each retained content element before its new wrapper, restore its original class list, remove the now-empty wrappers and republish staging. Restore the provenance metadata from the preceding repository commit. Do not change runtime pins.
