# Homepage layout reads — 9 October 2026

Immediate runtime 0.11.5 / Parallax 1.2.3 / RenderedProgress 1.0.1.
Baseline: `84f3b904072e377e272e5240304bfd5a2f0770c8`.

- Collect progress geometry before writing track and marker styles. Reuse the
  viewport rectangle and calculated service-track width instead of reading back
  a width immediately after setting it. Designer treatment-track width is still
  measured without changing its native geometry.
- Merge resize, intersection and visibility invalidations into the existing
  rendered-progress frame. Offscreen tracks wait for their 100px proximity
  observer; idle tracks do not poll. Actual slide rectangles remain the source
  of truth during dragging, CSS transitions and wrapping.
- Read animation activity before painting markers.
- Remove an unused initial CTA scroll read. Touch/wheel input continues to
  capture its own origin before checking movement.

Validation: existing progress geometry and rendered-progress browser checks
pass. `tests/parallax-layout.browser.cjs` compared the old and new modules at
375, 390, 667, 768, 1024 and 1440px, including fractional and reverse positions.
Both the variable-width fixture and downloaded staging markup/Designer CSS
produced matching marker positions. Ten same-frame resize notifications across
the homepage cases caused 318 geometry reads before and 90 after; idle reads
were zero. This is a controlled work-count comparison, not a Lighthouse speed
claim. Live DOM/CSS files were supplied via `TDB_HOME_HTML`/`TDB_DESIGNER_CSS`.

The optional older swiper suite cannot complete in this checkout: its VM lacks
a matchMedia stub and jsdom is not installed. Neither underlying slider engine
was changed. Targeted browser tests use real matchMedia and browser layout.

The footer is released independently from its deployed baseline
`70586ad78a23937997654cdd336f83b0ae99f723`, preserving all other feature pins.
Publish to Webflow staging only. Roll back by restoring the prior immediate
script SHA and footer `data-tdb-runtime-base` in site footer custom code.
