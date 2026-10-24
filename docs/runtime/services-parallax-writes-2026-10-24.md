# Services parallax work reduction

Vertical Services image motion previously woke the horizontal progress sampler even though the slide boxes had not moved. Swiper also rewrote identical horizontal image transforms when slide progress was clamped. This release removes those two sources of repeated work.

The shared rendered-progress sampler accepts an optional mutation predicate. Services ignores only style mutations on its showcase images; the structural callback still receives every record. Track/slide layout, classes, identity, insertion, transitions, resize and lifecycle handling remain active. Other consumers retain their existing behaviour.

The reproducible Swiper patch compares the live inline transform before writing its no-scale parallax transform during direct dragging. Timed arrow/release transitions retain the previous unconditional writes. It retains every loop image and restores externally frozen/corrected matrices. Opacity and scale branches, image geometry, vertical synchronization, timing, blur and interruption handling are unchanged.

The first staging trial reported a pale trailing-edge flash on iPad portrait during arrow navigation between ordinary slides; finger swipes were clean. Exempting timed transitions from the write guard is a conservative comparison, not a confirmed Safari fix. The horizontal-progress mutation reduction remains active. No spacing or CSS changes were made; physical iPad confirmation is pending.

## Evidence

The preceding 45 unthrottled desktop Chromium trials used real Designer CSS and Services markup in a 390px-wide fixture with decoded photographs. Ordinary-input medians: horizontal image writes 1080 to 240, vertical-scroll progress calculations 112 to 3, and geometry reads 678 to 242. Measured swipe JS was 5% lower, but combined scroll/swipe JS was 8% higher; timing ranges overlapped and frame pacing was unchanged. These are operation reductions, not proof of a mobile CPU/GPU or FPS improvement.

The A/B continuity runs checked 353 frames each, loop crossings, interrupted/reversed motion, external transform correction and remounting. All 2400 transform-output comparisons matched. New regression tests exercise the built bundles, unchanged-write counts, external corrections, retained mutation triggers, active animation sampling and cleanup. The complete suite passed 691 tests, with 3 skips and no failures.

Publish only the Webflow staging subdomain using a single immutable collection pin. Physical Android Chrome and iPhone/iPad Safari checks remain necessary, particularly rapid reversals, loop boundaries and vertical scrolling while horizontal motion settles. Roll back by restoring the previous e5124bb0e90225f5fe6922dbf7d35228754b3b59 URLs in the saved site head/footer and publishing staging again. No Designer/CMS/CSS edits are required.
