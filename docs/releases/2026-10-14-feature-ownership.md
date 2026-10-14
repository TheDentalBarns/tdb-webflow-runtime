# Feature ownership correction — 14 October 2026

Supersedes the foundation bundling in 2026-10-14-runtime-ownership.md.
Parent: 38ed45adc36c5e435a813c7b61832f4f00282b05. Staging only.

## Requested ownership

- Restore tdb-navbar-loader.js as the early entry. No foundation entry remains.
  Native navbar/disclosure behaviour, the physical-phone landscape detector and
  the remaining navbar scroll-lock fallback stay here. Landscape visual rules
  are already in tdb-ui.css; physical orientation avoids the portrait-keyboard
  false positive of a viewport-only orientation media query.
- The marquee loader owns its navigation guard, installed after runtime release.
- The runtime owns form discovery, attribution startup, arrow selection feedback
  and interaction capture while deferred feature loaders initialize. None of
  those is installed by the navbar. Existing optional control-motion CSS remains
  the styling owner; JavaScript still supplies the remembered selected-arrow state.
- Parallax presentation, controls, history restoration and progress are bundled
  in tdb-parallax.js, loaded behind runtime plus the existing proximity/intent gate.
  The old separately requested parallax-progress file is no longer required.
- Treatment-specific smile-gallery sorting is bundled in tdb-gallery.js before
  gallery registration. It retains the existing CMS priority fields and ordering.
- Remove src/page-compat/legacy-parallax.js entirely. Legacy Webflow card markup
  is no longer converted automatically; other pages will be corrected separately
  if needed, as explicitly requested by David.

## Preservation and intentional timing changes

The parallax plugin was recovered from the actual deployed 2afb6b9 file. Its
home variant at 996e193 differs in overflow-viewport handling; the combined source
keeps that option for the homepage only. Gallery sources were recovered from the
actual deployed e2c1929 file. No motion timing or artwork changes are intended.
Parallax still restores browser Back state, but only when its feature loads.

Interaction capture starts after consent releases runtime. Earlier clicks are
not saved by a site-wide foundation. Once runtime starts, an arrow or VIP click
while a feature is downloading is still retained. On pages with real anchor
links, their native behaviour remains available before runtime starts.

Form enhancements provide required-field completion, submit-button state,
treatment-selector placeholder styling and UK mobile-number normalization.
They retain their existing proximity and intent loading after runtime starts.
Attribution captures campaign/ad click identifiers, referrer, landing page and
page journey for enquiry fields; it is not a generic click recorder. Startup is
moved after the decision. Its existing performance-consent check still controls
persistent storage; reject remains memory-only. No pre-decision activity is
retroactively captured. The home source remains ed91771d; other pages keep 6fa2423.

## Validation and deployment

53 regression checks pass across navbar-runtime, navbar-handoff, runtime-dd,
marquee-handoff and runtime-ownership. Coverage includes both decisions and
closing settlement, absent early feature state, delayed interaction replay,
Back state before parallax observation, removed legacy conversion, shared
progress, attribution deduplication and sorting before gallery registration.

Build with tools/runtime-build/build-preservation.cjs and targets:
dist/tdb-navbar-loader.js, dist/tdb-runtime.js, dist/tdb-parallax.js, dist/tdb-gallery.js.
Raw bytes: 7053, 38638, 25967, 13735 respectively. This reduces early runtime entry
bytes; it does not claim a measured Lighthouse/LCP improvement.

Deployment: replace the foundation footer tag with navbar-loader; pin runtime,
parallax and gallery to this release; remove the home parallax override and direct
attribution tag; remove the unused parallax-progress pin. Keep all other pins,
consent code, UI CSS and font preload removal unchanged. Publish staging only.

Rollback: restore the custom-code state documented in runtime-ownership.md using
c6610198cd8248e3b6c5b82c6bfa3b75a17c45db for foundation/runtime and the previous
parallax/gallery pins. Historical commits preserve the removed files.


## Staging verification

Published code commit `d3f537204e1db498f68365537eb339fd015f1d55` to the Webflow staging subdomain only. Publish task: `38912f0c-cfdb-4355-9327-813e4ecf945b`.

Confirmed live navbar, runtime, parallax and gallery assets use the corrected release. No foundation or standalone parallax-progress request remains. Verified navbar open/close, VIP drawer and forms binding, gallery initialization, a queued arrow click during parallax download, treatment navigation and selected-treatment restoration on Back. No console errors or warnings were captured during these checks. No forms were submitted. No LCP improvement is claimed without a new performance measurement.
