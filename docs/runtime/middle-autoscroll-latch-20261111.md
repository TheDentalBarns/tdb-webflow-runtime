# Middle-mouse autoscroll handover

Chrome can deliver a native `scrollend` after middle-click has cancelled an existing Lenis wheel animation. It also delivers one when the pointer pauses in the autoscroll dead zone. Neither event ends the browser's latched autoscroll gesture, but the previous listener cleared the native-input guard.

The shared startup owner now retains that guard until its existing exit paths: a finishing click, hold-and-drag release, Escape/navigation keys, pointer cancellation, blur/page lifecycle, or a normal wheel after quiet movement when Chrome swallowed the finishing click. Lenis stays instantiated and rebases to the current native scroll position.

Regression coverage includes delayed completion from interrupted wheel inertia and an autoscroll pause. Browser validation exercises a wheel interruption, stationary middle click, movement down and up, finishing click and the next wheel on Blog, Contact, Dental Cost Calculator, a Blog Post and Pricing.

Validation used Node 24.22.1: all runtime and vendor builds, generated parity and formatting checks passed; 1,082 tests passed with three opt-in tests skipped. Chrome on Windows passed the five-page gesture check. Chrome consumes the finishing click, so the existing quiet-wheel recovery was checked after movement settled, with no jump back to an earlier scroll position.

The change has no page-specific installer or release override. Publish the same immutable commit through all four shared installer references.
