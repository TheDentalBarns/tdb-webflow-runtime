# Treatment carousel cleanup — 9 October 2026

Native component: `1cc1fff8-4b9a-3eb7-19af-da2473371baf` (four instances).
Preserve the single native CTA outside the moving CMS track, its text node,
CMS destination handoff, busy state, native dimensions, blur and timing.

Designer cleanup removes the hidden per-item label and SVG children (24 nodes
across six initial cards), the unused three-node pagination block, and replaces
the visible CTA's inline SVG with the existing shared currentColor arrow span.
CMS source anchors remain natively bound to their collection pages.

Parallax plugin 1.2.0 uses four loop copies per side on desktop and two on smaller
breakpoints (14 / 10 total slides for six treatments). Direct desktop-to-phone
resize reconciles the budget even though both use slidesPerView:auto. Selected
arrow feedback belongs to the existing global handler. Width animation measures
only former/new wide cards and any still-animating cards during interruption.

Shared carousel visibility 1.0.0 uses Swiper's existing visibleSlides geometry.
It exposes at most one visible copy per logical item, with aria-hidden/inert on
other copies; restores attributes at teardown. Currently mounted by Treatments.

Parallax 1.3.0 locates the two rendered progress neighbours with binary search in
DOM order: at most four slide geometry reads for 14 slides instead of 18 previously.
The real rendered-position progress, reverse/loop seam and native track remain.

Build base is staging carousel release e0d8134. Immediate preparation carries
forward d46a198 (Parallax 1.2.3) plus the conditional Finsweet loader from the
concurrently deployed navbar release 221fa9a. Immediate version becomes 0.11.7.
Keep registry src/motion pin and footer runtime base unchanged; change only
registry data-tdb-carousel-base and immediate script src to this release.

Validation: real built Swiper in JSDOM with native-like geometry: 20 forward and
20 reverse movements, six CMS destinations, one CTA/text identity, busy state,
desktop/phone/tablet clone budgets and retained index across resize. Shared
visibility deduplication and teardown pass. Progress fixtures cover variable
widths, loops/reverse, resize/DPR, offscreen/hidden pause and idle no-read behavior.
Existing plugin lifecycle tests pass. The unrelated swiper-behaviour fixture
has a pre-existing missing matchMedia stub and was not modified in this task.
Live staging verification follows publication; JSDOM is not a physical touch test.

Remaining IX2 bindings e-312/e-313 reference a-9/a-10 on treatment card
`e1ab4f6c-7c16-0d13-bbe6-88c01d005639`; their descendant target classes no longer
exist. Replacing that wrapper to shed the obsolete bindings was rejected by
automatic approval review. No wrapper replacement was performed. Remove these
bindings in Designer when authorized/available; shared action lists still have
other consumers and must not be globally deleted as part of this cleanup.
