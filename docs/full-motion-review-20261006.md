# Full motion for design review — 6 October 2026

David requested that the entire site keep its normal animation when a device
reports reduced motion, including the Read our reviews loading spinner. This
is the default for ongoing design review; individual effects will be tuned later.

The 300-byte policy is inlined at the start of the Webflow site head. It exposes
`TDBMotionPolicy.reduced` and marks `html[data-tdb-motion="full"]`. It does not
change `window.matchMedia`, force early feature loading, or change cookie gates.
`TDBMotion.reduced` exposes the same decision and defaults to full motion when
used independently. Existing duration, easing and lifecycle code is retained.

Shared drawers, filters, review cards/testimonials, DD text, native tickers,
parallax, marquee, VIP pulse, announcement and Instagram details use this policy.
Reduced-motion CSS suppression was removed from navigation, Vimeo, parallax,
Five Senses, availability states and page-specific custom code. The shared
loading spinner explicitly retains its normal one-second rotation.

The canonical module registry also resolves drawer, filters, ticker, marquee
and review availability to its release. There remains one Swiper engine and no
new network request for the early motion policy.

## Independent assets preserved

- Global UI sources were restored from the active `d880de2` release before
  editing. The output was compared with that deployed CSS: the only differences
  are removed reduced-motion rules and the explicit shared-spinner override.
- Navbar/Vimeo loader source and navbar build registration follow active
  `f5978da`. Consent-gated enhancement and native fallback are retained.
- Instagram sources preserve both active `ce65758` variants, including their
  different data loading. No posts or metadata changed.
- Five Senses keeps its `c847ee9` runtime, CSS and media URLs. Only its entry
  loader changes. Calculator keeps its `1d5919f` runtime; its stylesheet changes.
- The VIP native Designer migration remains intact. Manual pause/play controls,
  loading states, focus management, form behavior and lazy loading are retained.

## Verification

- Shared motion and registry tests; custom Swiper plugin lifecycle tests.
- Simulated OS reduced motion: drawer opening/closing and filter panel movement
  keep width-aware durations; both filter/X morphs retain 300 ms.
- DD text keeps its startup/scroll animation when OS preference changes.
- Shared spinner CSS retains 1 s rotation; global UI has no reduced-motion gate.
- Audited site custom code, all 53 page/template code blocks and active assets.

Build with `node tools/build-shared-runtime.mjs`,
`node tools/runtime-build/build-service.cjs`,
`node tools/runtime-build/build.cjs dist/tdb-navbar.min.js dist/tdb-navbar-loader.js`,
`python3 tools/build-ui.py --global-only`, and `node tools/build-vimeo.cjs` with
Terser resolvable from `tools/runtime-build/node_modules`.

Only the Webflow staging subdomain is published for this review.
