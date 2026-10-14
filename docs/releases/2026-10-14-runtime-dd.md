# Consent handoff and DD runtime

Scope: add dist/tdb-runtime.js with the previously deployed DD-loader functionality, release it from consent, and remove the standalone global DD-loader tag. Other page loaders, consent categories, analytics retries, and CSS are unchanged.

Consent v0.7.0 hands off after either valid saved choice and only when CookieScript.instance.isOpen() is false. The native banner retains ownership throughout its 470 ms closing motion; the existing settlement at close releases the runtime. Saved choices are eligible during initial preparation. A single in-flight request is shared; at most two attempts per page are made with a 1,000 ms retry delay and eligibility rechecked. Runtime and consent are pinned to the same release through the consent script's base URL. The existing Modules motion pin still resolves tdb-motion.js.

Runtime v1.0.0 initially contains only page DD mounting. It retains TDBDDFades as an alias for callers, the explicit page/calculator hooks, template/footer/IX2 exclusions, root/mode/preset options, shared opacity ownership, relevant mutation discovery, removed-target cleanup, lifecycle refresh, and failed-motion recovery on user input/online.

Initial scheduling waits for page load plus a 150 ms quiet period (reset by buffered LCP observations where available), with a 1,500 ms upper bound and pointer/keyboard interaction release. This is a heuristic, not a final-LCP guarantee. Background tasks use requestIdleCallback with a 1,000 ms timeout; unsupported browsers yield through 16 ms timers. The library request and mounting run in separate turns. Mounting batches process at most eight nodes and approximately four milliseconds, yielding earlier if the idle deadline is exhausted. A single mount cannot be preempted. The shared motion helper still owns geometry reads and visible-opacity preservation.

No new immediate opacity flag or viewport threshold is added. Readiness checks the ddText function actually called. Repeated refreshes coalesce; pending callbacks and observers are cancelled on destroy.

Validation: existing native consent and scoped analytics suites plus runtime-dd.test.cjs against the compiled artifacts. Covers fresh accept/reject, no premature release on refresh during closing, saved choices, retry/deduplication, opening settings during retry, batch limits, dynamic targets, cleanup/destruction, LCP/fallback scheduling and failure recovery.

Staging only. Rollback: restore the saved before-head (previous consent pin and standalone DD-loader). Historical DD code remains available at its original immutable pin.
