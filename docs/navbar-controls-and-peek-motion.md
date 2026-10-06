# Navbar controls and shared bar motion

Designer owns the navbar control presentation:

- `navbar10_link`: Pricing, Location and Join VIP.
- `navbar10_dropdown-toggle`: Services and Discover.
- `button is-icon is-secondary is-navbar-control`: navbar First visit only.

Normal controls transition colour and opacity over 100ms ease with zero delay.
First visit also transitions its background colour. Existing hover opacity
(0.5 for links/toggles, 0.6 for First visit), palette, borders and component
variants are retained. Native active and focus-visible states live on these
classes. Global button classes are unchanged.

The shared Global Styles embed and head focus rules exclude these controls.
The existing dropdown focus ring (0.125rem blue) and link/button ring (2px
cream) are now native focus-visible styles, preserving their prior appearance.

The two transparent variants have a pre-existing Current-page link duration
of 300ms. Webflow's public MCP does not expose Current-state editing. That
native property still needs removal through Designer; do not mask it with
another CSS or runtime override. Keep its existing Current-page colour.

`src/styles/tdb-chrome-motion.css` is the shared source for the active
navbar/VIP/availability bar relationships, compiled into `tdb-ui.css`.
`--tdb-peek-duration` is 420ms and `--tdb-peek-ease` is
`cubic-bezier(.4,0,.2,1)`. Native VIP ready/peeking states and navbar movement
consume these variables. Slider-focus cleanup reads the duration, retaining
its existing 10ms/260ms cleanup margins. Visibility changes wait for travel
to finish. Existing desktop banner opacity fading remains 260ms.

Component controllers still decide when to show or hide. Consent, scroll,
intersection and intent gates are unchanged. Initial hidden/pending guards
and phone-landscape guards stay in their early-loading locations. Independent
legacy calculator/review styles are outside this consolidation.

Full-panel opening continues to use `src/shared/panel-motion.js`, bundled
with navbar and VIP, with its existing viewport-height curve. Nav glass,
menu text and full-panel timings are not control-hover timings. UI remains
asynchronously loaded from the head; VIP/banner/focus keep their existing
UI readiness gates. Navbar's CSS fallback preserves early interaction.

The release also retains the independently deployed review-filter footer fix
from commit `4312fe15e656cce5be8d8e7b945886a710f417d0` byte-for-byte.

## Staging verification — 6 October 2026

Runtime release `336d76648a3395fad41dd5bec9749b3554f14c34` is deployed to
the Webflow staging subdomain. No custom production domain was published.

- 17 automated checks pass, including alternate peek durations, cancellation,
  VIP full-panel timing, desktop/tablet/mobile surface state logic, full-motion
  policy and shared module loading.
- On Home and Pricing, normal control transitions are 100ms ease with no delay;
  First visit retains background, colour and opacity transitions. Desktop
  hover-in/out and native focus rings were checked in the published browser.
- Menu keyboard opening, Escape closing, transparent/solid colours and VIP
  open/close focus restoration work. At a 936px viewport height, VIP retains
  its 632ms full-panel duration; the navbar exits on the shared 420ms clock.
- Published tablet/mobile CSS has no additional control timing overrides.
  Responsive surface logic was tested; physical touch/orientation and actual
  tablet/mobile viewport interaction were not available in this session.
- The published Current-page link still computes to 300ms in the two
  transparent variants. This remains an explicit native Designer follow-up;
  no runtime workaround or additional override has been added.

Build only the affected outputs:

```sh
python3 tools/build-ui.py --global-only
node tools/runtime-build/build.cjs dist/tdb-navbar.min.js dist/tdb-footer-runtime.min.js
node tools/runtime-build/build-service.cjs dist/tdb-slider-focus.js
node --test tests/peek-motion.test.cjs tests/vip-panel-motion.test.cjs tests/nav-surfaces.test.cjs tests/full-motion-policy.test.cjs tests/shared-modules.test.cjs
```
