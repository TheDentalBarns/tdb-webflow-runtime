# Home reload and parallax touch follow-up

Reconciles `parallax-initial-controls-staging-2026-09-14.md`. User authorized fixes and Webflow subdomain publication. No production publication.

## Evidence and changes

Baseline: immediate 1dc5aeed5f0c9e5c39096726017701f43633ce1c, footer eb71e908eb096ea8d0ad7797eec16bb6725d925a, sliders f94f7b3dd24084385aa5c58ecc2814a30e9d1516. Source branch staging/parallax-static-cta-20260914, preceding head 2d922cc154306aa4d77b69410d9b9e47870a44e4.

1. Confirmed: `parallax-controls.js` cleared held white only after vertical scroll. Horizontal touch, slider movement and arrow commands lacked reset paths. Those paths now release the same held class through the existing 300ms glass transition. A loop correction to the same CMS index retains state; moving to a different card clears it.
2. Confirmed integration failure: a CTA inside Swiper's container remains subject to its capture-phase click suppression, even outside the moving wrapper. The deployed Swiper integration test reproduces suppression with the old placement and verifies native navigation with the new placement. The single CTA is now a sibling of `.swiper`, absolutely positioned against the same component. It remains outside the slide track and uses original CMS indices inherited by loop clones. Live baseline contained five originals, four clones and no in-slide CTA links.
3. Confirmed competing visual ownership: native `:active` and `:focus-visible` could whiten the link without the persisted held class, including rejected transition-time taps. Touch now uses one explicit held state, including a touchstart fallback. Held entry settles immediately; release uses 300ms. Keyboard focus retains an outline. Touch input suppresses simulated mouse hover. A moved/disabled tap cannot navigate or re-latch. Back state is retained for both cached and rebuilt documents.
4. Confirmed initial presentation issue: Home CSS hid the entire hero background until a 10ms timer plus animation frame and 100ms fade. Remove that gate so the existing poster can paint immediately. Matching responsive preloads prioritize only the active desktop/mobile poster candidate. Existing Vimeo consent, playback, placeholder-to-video handover and scroll appearance remain owned by their existing controllers.
5. Confirmed initial presentation issue: the marquee heading first painted at opacity 1 before Webflow IX2 action a-52 applied its opacity curve (0, .5, .5, .1). A narrow pre-inline-style guard now seeds opacity 0 and releases as soon as IX2 writes opacity.

The user recording is 6.354633 seconds, 1344 x 2992, 120fps. Frame sampling near 2.40s found a brief simultaneous 28-video-pixel shift in the hero and marquee boundaries, followed by their original positions, plus the explicit black reveal and heading-brightness flash. Desktop live reload retained a 936px hero and 354.296875px marquee. The exact cause of that brief device-specific height change is unresolved; these fixes must not be represented as proof that all mobile jank is eliminated. No speculative global viewport-height or layout override was added.

## Validation and impact

Focused tests cover cached/rebuilt history, original/clone destinations, rejected gestures, early controls, arrow loader recovery, swipe/arrow reset, destruction and the actual deployed Swiper click-suppression boundary. A CSS handover test checks early poster visibility and IX2 ownership. Existing loader/CSS-demand tests remain required after pinning.

This is a reliability and first-frame presentation change, not a file-size optimization or measured speed gain. Lightweight initial controls and inline page CSS remain early. Poster requests are reprioritized using the same source sets and sizes as existing images; exactly one media query matches at a time.

## Rollback

Restore the prior Home/Location `data-tdb-initial-parallax-controls` blocks; remove only Home's `data-tdb-home-first-frame` and `data-tdb-home-poster-preload` additions; restore `.hero-vimeo_background-video-wrapper` in Home's existing timed reveal CSS/selector. Restore immediate pin 1dc5aeed5f0c9e5c39096726017701f43633ce1c and reconcile footer/slider manifest pins to the baseline above. Preserve unrelated changes, then publish only the Webflow subdomain (`customDomains: []`). Exact before/after page code is retained in the accompanying checkpoint JSON.

## Published release and live checks

Published staging at 2026-09-14T21:58:13.494Z. Immediate `d05960427433fb20d32a0762eff2253b1c270f96`; footer `c770bfe8d55cfb9af9928ca66b2ff4d347742ea1`; sliders and early CSS source `9280e180bb887553f2ad59829b990212b7c2eaa1`. Six CDN resources matched local sources/builds byte for byte. Home and Location each serve one initial-controls style block and the new immediate pin. Only Home has the first-frame CSS and the two mutually exclusive responsive poster preload tags.

All 36 focused tests passed; the 13 footer/loader checks also passed against the final pinned footer build. On fresh live desktop loads, both CTAs existed before Swiper initialization, outside its event container, with rgba(0,0,0,.3) and blur(20px). Home poster was decoded and visible at document interactive. Hero height remained 936px and marquee height 354.296875px.

Live Home next-arrow traversal visited CMS indices 2, 3, 4, loop-clone 0, 1, 2 with the expected respective routes and exactly one CTA throughout. No originals or clones contained extra CTA links. The physical-phone touch rendering and short recorded viewport/height shift remain unverified; no supported touch-device emulation was available in this browser.

All four production domains retained their prior 2026-09-12T19:20:19.204Z publication timestamp.

Additional live navigation: Home's CTA opened `/services/fast-track`; Back restored that same route on one CTA; Forward reopened the service page. Location's next control advanced to CMS index 2 with one `/first-visit` CTA; clicking opened `/first-visit`. Physical touch colour feedback is covered by the controlled tests, not claimed as a real-phone visual test.
