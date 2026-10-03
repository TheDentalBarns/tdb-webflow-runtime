# Partners staging cleanup

Marquee v0.9.0, loader v1.0.0. Reconciles marquee source with deployed v0.8.3 from b44ddf65a5809949619b985e071f42a803e634d7 before adding restart/restoration.

Loader waits for both an existing marquee within 600px and a CookieScript decision (accept/reject/close, including restored decisions). This is a scheduling gate, not a marketing-consent requirement. The marquee remains independent of the shared priority-ready promise. Runtime proximity remains 600px initialisation/200px active, with tab visibility suspension. Dynamic additions supported. No tracking added.

Webflow owns track width max-content, display flex, 12vw gaps, padding 0 1vw 0 0, user-select none and grab cursor. Existing tablet wrapping/alignment, image sizes, component properties and seven variants preserved. Remove only the matching .logo-slider .partner-featured_component rule from style[data-tdb-shared-component-styles]. Heading IX2 and tooltip behaviour remain unchanged pending their dependency audit.

Runtime build is derived from deployed 7790e7080229af3654b34eccc10cc7599ad80795, changing only the marquee eager-load call to an already-resolved promise and the runtime version. src/runtime/immediate-runtime-batch.js remains a legacy source and must not be used to regenerate this combined runtime without reconciling the other bundled features.

Validation: eight isolated loader scenarios passed, including both gate orders, saved reject, no component, removed/out-of-range component, malformed cookie, failure/retry and duplicate events. DOM lifecycle checks cover 1440/390/844 width media-query settings, animation movement, original attribute restoration and repeated destroy/start. These are logic checks, not visual device verification. Browser binary download failed in this execution environment.

Rollback: restore global footer immediate runtime pin 7790e7080229af3654b34eccc10cc7599ad80795, remove the new loader tag, restore the original global track rule, remove newly added main breakpoint track layout properties, restore medium row/column gaps to 3rem, then publish Webflow subdomain only. Existing main flex/grid properties must remain. Custom domains are not published.
