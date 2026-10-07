# Footer parallax migration

Shared Footer component `91d57bb2-8236-c862-18aa-956ad5c7502e`.
Wrapper `6600af83-014f-3237-03d6-938890e6b81c` now carries
`data-tdb-page-break="footer"`, `data-tdb-parallax-from="-10%"`,
and `data-tdb-parallax-to="10%"`. Image
`91d57bb2-8236-c862-18aa-956ad5c750af` carries `data-tdb-page-break-image`.

Motion 1.12.0 accepts signed vh, %, or px endpoints. Defaults remain -2vh/2vh.
Percentages use the moving element height. Endpoints are clamped to native crop.
The existing stationary wrapper determines viewport progress. The existing
loader, scheduler, scroll catch-up and memory handle footer and page breaks
together. No footer-specific runtime or perpetual animation loop is added.
Webflow smoothing 50 is replaced by the shared scroll-driven catch-up policy.

The image now uses native `tdb-footer-parallax-image` instead of
`header69_background-image is-footer`. This removes the a-54 selector match
without a runtime DOM-detachment patch. Its native absolute layout is width
100%, height 125%, top -12.5%, left/right 0%, cover, object-position 50% 75%.
The old image was height 120%, top 0%, which cannot cover positive translation.
The slightly revised native crop covers both +/-10% endpoints. Overlay, logo,
section dimensions, image asset and alt text are retained.

The three other a-54 event handles in the VIPs template no longer exist in its
native tree; that template now uses the shared Footer component.

Memory 1.1.0 accepts the larger configured travel and includes from/to in the
saved configuration, rejecting a snapshot when the authored movement changes.
Existing unconfigured page-break snapshots remain compatible.

Rollback: restore the image's two original classes, remove the wrapper's three
new attributes and the image marker, and restore prior motion/memory releases.
Do not remove a-54 until published checks show its selector has no live targets.
Staging only; preserve unrelated custom code and release pins.
