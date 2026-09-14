# Initial parallax controls and history feedback — staging

14 September 2026. Supersedes the scroll-fade revision. User asks for previous/next arrows and Discover service to appear during initial setup, and consistent white touch feedback on Back/Forward. The interpretation of “before and after” as previous/next arrows was stated in conversation.

The existing CTA controller moved out of the deferred slider bundle into src/sliders/parallax-controls.js, included at the start of the existing immediate runtime batch. No new initial JavaScript request. Arrow/CTA presentation moved from deferred slider CSS to src/styles/tdb-parallax-controls.css, embedded in Home and Location head blocks. The Swiper library and motion engine remain demand-loaded. Controls and their CMS-derived destination exist before Swiper. One early arrow command is retained while loading; explicit initial navigation skips the automatic entry advance. Repeated preparation reuses the same controller.

Touch appearance is stored under history.state.tdbParallax per page/component with the CMS destination and slide index, preserving other history properties. A rebuilt back_forward document restores the matching slide and white state; a cached document retains it. Fresh navigation and deliberate reload keep normal initial behaviour. Only a vertical touch gesture plus actual scroll displacement, or wheel scrolling, triggers the 300ms fade. Ordinary taps, horizontal gestures, restored scroll positions and pointer cancellation after click do not clear it. Keyboard focus remains available. Blur stays 20px on the CTA. Storage failures do not block navigation; non-object history state is left untouched.

Versions: initial controls 1.0.0; motion sliders 0.6.0; deferred slider CSS 1.4.0; footer 1.4.12; immediate 0.9.0-parallax-initial-controls-staging.
Assets/CSS source pin: f94f7b3dd24084385aa5c58ecc2814a30e9d1516
Footer pin: eb71e908eb096ea8d0ad7797eec16bb6725d925a
Immediate release: the commit containing this document.

Validation: eighteen focused controller tests plus thirteen existing deferred-loading/focus/CSS tests (31 total), covering initial rendering without Swiper, first pointer/keyboard arrow command, recoverable load failure, CMS updates/missing links, cached and rebuilt history, reload, cancellation, touch/wheel scroll, listener cleanup and continuous CSS transitions. Physical Android/iOS rendering remains unverified; simulated lifecycle events cannot prove mobile Back-cache timing. Live staging checks follow publication.

Tradeoff: lightweight controls and 4,536 raw bytes of page-specific CSS now arrive during initial setup. The deferred slider bundle is smaller; this is an intentional redistribution toward early readiness, not a claimed initial-download saving. No measured performance improvement is promised.

Rollback: remove only the style[data-tdb-initial-parallax-controls] block from the current Home and Location heads. In the current global footer, restore immediate pin af5c4ce17ae555557f2e000e8ee57eff1a32c172 and reconcile manifest comments to footer cbb59b04c9a38e957de8a32c1bf8290bd5cad0a5 and slider 17ee4abe875ce8acf959f584628ab04cc3fada3b. Preserve unrelated edits. Publish Webflow subdomain only, customDomains empty. Production is outside this change.

## Staging verification
Published 2026-09-14 at 21:25:36.382 UTC. Immediate pin 1dc5aeed5f0c9e5c39096726017701f43633ce1c; footer eb71e908eb096ea8d0ad7797eec16bb6725d925a; slider f94f7b3dd24084385aa5c58ecc2814a30e9d1516. All five served assets (including inline CSS source) matched local builds byte for byte. Both pages served the new pin and exactly one early-controls style block.

Live desktop browser: Home and Location each had one visible CTA plus the arrows before motion initialization or a Swiper script request. Home next changed the CMS link from Cosmetic Dentistry to Restorative Dentistry. Following that link navigated to /services/general-dentistry; browser Back returned to Home with that same link and a single CTA. Location's next arrow worked after initialization, retaining /first-visit and one CTA. These actual browser checks do not substitute for physical mobile touch testing. Cached and rebuilt white-state behavior is covered by local controlled tests; a physical phone remains the final visual check.

All four production domains retained publication timestamp 2026-09-12T19:20:19.204Z.
