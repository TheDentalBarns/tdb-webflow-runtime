# Home / VIP hero scroll migration — 7 October 2026

The shared Hero - Vimeo component b1a810af-870e-98e2-c9cd-c1f7607452ce
uses the existing page-break loader and shared TDBMotion.pageBreaks controller.
No additional fetched animation script, scroll listener or frame loop is added
by this instance. TDBMotion 1.14.0 adds opacity-only mode and per-target opacity
endpoints. Existing image parallax and service-gradient behaviour are retained.
Page-break memory 1.3.0 restores the normalised fade before first paint on reload
or back/forward, using the same viewport/content/config validation as imagery.

Native component attributes:
- Header ...52ce: data-tdb-page-break=vimeo-hero,
  data-tdb-parallax-mode=opacity, data-tdb-parallax-fade-start=.5,
  data-tdb-parallax-fade-end=.85.
- Content ...52d1: data-tdb-parallax-fade=.25.
- Desktop video ...52e8 and mobile video ...52ec: data-tdb-parallax-fade=.6.

Fade targets stay scoped to their own wrapper. Native starting opacity is1;
video/poster roots finish at.6 and hero content finishes at.25. The gradient
stays fixed. No transform is written to the hero. Progress uses the existing
stationary-wrapper mapping; visible first paint/reloads are retained and any
initial difference is consumed by scrolling. This deliberately uses our shared
scroll-following behaviour rather than IX2's smoothing50 trailing animation.

Poster lazy loading, sources, responsive sizes and priorities are unchanged at
David's explicit request. Vimeo loader/controller/CSS pins, consent, pause/play,
viewport pausing and poster readiness are unchanged. The VIP template's separate
300ms-delayed, 500ms background entrance is removed so its background starts in
Designer state. Its navigation entrance and blur fix remain.

Temporary handoff: src/page-break/hero-bootstrap.js is inline in site head under
data-tdb-hero-scroll-bootstrap. It removes only published data-w-id
b1a810af-870e-98e2-c9cd-c1f7607452e7 inside the marked shared hero, before IX2
initialises. The parser observer disconnects at DOMContentLoaded. This is needed
because the supported API cannot unlink IX2; remove the bridge once e-872 is
unlinked manually from the shared overlay in Designer.

Do NOT delete the whole Home Hero Scroll Animation (a-33) yet. Event e-531 still
has a native target on page677cfb8a0f25478449823c5f, element
2fb12fc5-2a95-dd7d-550c-a03fc28d7921 (video-overlay-layer nav-fade), confirmed by
exact MCP lookup. Other legacy VIP Hero Scroll definitions are separate.
The obsolete Home-only exact logo target a4c09179-6b96-b44f-5bcd-424ae00e7a6c is
absent from current Home/VIP. The remaining active a-33 content target was global;
our migration has no global hero-content writes.

Validation: 13 memory tests, 15 DD tests, shared Swiper tests, existing page-break
and service-hero browser suites, and hero-opacity.browser.cjs. Browser checks
at1440x900,834x1112,667x375,390x844 exercise independent fade endpoints, native
first paint, delayed mount, early opacity restoration, late browser scroll
restoration, resize, lazy poster attributes, no hero transform and teardown.
Additional fixtures using published Home/VIP native HTML/CSS passed at all four
sizes with identical hero height and no initial opacity change. These are
controlled browser checks, not a live performance benchmark.

Rollback: remove the four header attrs and three child fade attrs, restore the
VIP background entrance selectors in template head/footer, remove the temporary
bridge, and restore memory/controller deployment pins from the prior release.
Existing native IX2 binding is retained until manual unlinking.
