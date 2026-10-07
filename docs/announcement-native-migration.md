# Announcement native migration — 7 October 2026

Scope: the floating availability bar only. Smile Gallery and Reviews hero availability markup and page scripts are unchanged.

Webflow site: 677cf86cf9952f978d94d80c.
Native component: Announcement (Banners), ce1342a8-e83e-b099-c1ac-71da7b84c3ae.
One instance in Footer (91d57bb2-8236-c862-18aa-956ad5c7502e), instance 7672aea5-de09-c907-bc64-e9818d8315c7.
Editable structure/styles snapshot: src/banner/designer/. Webflow publishes the CTA as a Link with role=button; Space and Enter open the existing VIP drawer.

Designer owns dimensions, spacing, typography, colours, number boxes and SVG markup.
The remaining announcement-state.css contains runtime state selectors, the live-dot keyframes, SVG paint and the existing exact 640px responsive threshold (not a native Webflow breakpoint). Shared tdb-ui.css still owns chrome entrance/exit motion.
The legacy shell ID/class are retained as integration hooks for navbar, gallery focus, phone landscape and VIP visibility. No Elfsight widget is mounted.
The loader moves the floating native root from Footer to body to avoid ancestor transforms/inert regions affecting fixed placement. Designer structure stays reusable; data-placement marks this instance as floating. Existing hero instances are not migrated.

TDBModules deduplicates the site's shared Swiper, TDBMotion and TDBNativeTicker resources. Announcement is registered through TDBSwiper; it owns CMS/date parsing, consent, eight-second dwell, progress ring, reading pauses, manual-stop state and VIP routing. Native ticker handles each countdown unit. Hidden/background states settle tickers and stop countdown/rotation timers. CMS failure retains neutral copy, bounded retry and online recovery.
The lazy announcement plugin is no longer in the initial footer bundle. Existing interaction/scroll gates and 4-viewport Home/Location vs 1-viewport other-page reveal thresholds remain.
All unrelated deferred footer assets retain the previous 336d766 release root. Shared engines resolve through the site's d71d7f0 module registry.

Build:
- node tools/runtime-build/build.cjs dist/tdb-footer-runtime.min.js
- node tools/runtime-build/build-service.cjs dist/tdb-immediate-runtime-batch.min.js
- node tools/build-shared-runtime.mjs (or copy the two announcement entries for an isolated build)

Release: immutable GitHub commit; replace only immediate-runtime-batch URL in site footer, add deferred announcement-state stylesheet and a tiny initial pending guard in site head. Publish Webflow subdomain only.
Rollback: restore previous immediate-runtime-batch URL at 336d766; detach the new Announcement instance from Footer to avoid the old renderer mounting beside native markup. Retain component definition for repair. Remove the announcement-state stylesheet and pending guard when the instance is detached.
