# Instagram paint after rapid navigation — 31 October 2026

The user reported improved scrolling after `f8ccb59c2366b44ae266c27e5a8c4f05a089c681`, but could still trigger the repeated-webpage-error screen on iPhone Safari by rapidly tapping Location's carousel arrows.

## Observed gap

The first guard applied only to images never prepared. Navigating through the feed permanently enabled every visited slide's glass effects. In a Location WebKit run, 144 rapid forward/backward arrow activations took enabled glass panels from 10 to all 48. They remained at 48 after the movement settled. DOM/ticker counts returned to baseline and animations settled; the test did not demonstrate a ticker leak or reproduce the physical iPhone process failure.

## Change

Keep the existing image cache and introduce a separate paint window in the native Instagram owner. The window includes the rendered cards with a buffer of one feed width on either side, plus the selected destination posts and their loop copies. Distant cards retain geometry and cached sources while their paint visibility and backdrop filters are disabled.

Two batched geometry reads locate the rendered track; Swiper's cached offsets and sizes locate the other cards. Sampling runs during the track transition, drag/translate updates, resize/loop corrections and foreground return. It stops at rest and is cancelled on teardown. This follows actual rendering during interrupted transitions; asynchronous intersection callbacks alone were insufficient in an unpublished candidate under extreme loop reversals.

The existing image window still controls fetches. Prepared destinations are available synchronously. Controls accept the same input; carousel speed, easing, looping, first-view entrance, metadata tickers, 20 px visible blur and reflections are unchanged. Native/unmounted and explicit loading-fallback states remain visible. No new global owner, external dependency, page override or permanent animation loop is introduced.

## Validation before publication

- Node 24 runtime build and pinned custom Swiper build; generated runtime changes confined to native Instagram JavaScript/CSS, its readable output and artifact metadata.
- Full verification: 851 passed, 0 failed, 3 skipped (854 total). Prettier passed with Windows-compatible glob quoting and line-ending handling.
- Added a lifecycle regression covering cached offscreen retirement, outgoing rendered cards, destination copies, repeated navigation and queued-frame cancellation on teardown.
- Windows WebKit: 144 rapid arrow activations per page, including forward runs, alternating directions and reverse runs. Across 416 Home and 413 Location frame samples, no visible card was hidden or missing its normal blur. Location matched the baseline final indices and event counts for these inputs.
- Enabled glass in that stress run peaked at 20 panels on Home and 22 on Location, then settled to 10–14. These are computed-style counts, not measured GPU allocations or memory savings.
- Separate emulated touchscreen tests delivered all 80 pointerdown/click pairs on each page; both settled with visible cards, original blur and 14 enabled panels. The paint sampler made no further root-geometry reads during a 500 ms idle check.
- Both pages passed rapid initial viewport crossings, widths 440/768/992/1440, a shorter mobile viewport, arrow navigation, full normal-speed loops, fallback and unmounted checks. Initial paint still enabled 10 panels; after a complete normal-speed loop it returned to 10 despite all images having been prepared.

Physical iPhone Safari remains the acceptance test. Reducing retained offscreen effects addresses a measured buildup but does not prove that this is the sole cause of the device's webpage error. Image caches remain cumulative.

## Release

Base and immediate rollback: `f8ccb59c2366b44ae266c27e5a8c4f05a089c681`. Current main is an ancestor with no incoming changes. Back up exact head/footer code outside the repository, verify the immutable CDN assets, replace the four global SHA references together, and publish only the Webflow staging subdomain. Production custom domains are excluded.
