# Independent motion families — 31 October 2026

Feedback on the elegant staging trial identified hesitation in sideways Services/Treatments cards and requested independent accordion, navigation and fade timing. The original `c403998c1a4f1de2a6ec43430bcc7bfbcc7d7fd6` runtime was restored to staging while preparing this revision.

## Resulting settings

`config/motion.json` remains the single configuration source. Content movement retains `pace: 1.25`, `character: "soft"`: Instagram, Smiles, reviews, other carousels, drawers and their related movement stay coupled. Independent `navigation`, `accordion` and `fade` profiles each use `1` / `current`. They preserve their original responsive durations and per-component easing, and cannot inherit a later content pace change.

Navigation's JavaScript, native CSS, panel cleanup and chrome peek use its family. Disclosure CSS scopes restore the original 300 ms fade, 400 ms lift, chevron and spacing curves on both Home and Location. The existing native accessibility and toggle controller is unchanged. Standalone fades and their cleanup use the fade family; video placeholder removal follows its actual fade, not the carousel clock. The audited native CSS projection distinguishes opacity/visibility-only transitions from mixed movement and excludes navigation/disclosure controls from generic fade classification.

## Sideways hesitation

The earlier trial applied the soft travel curve to the Swiper wrapper while its compensating parallax images still used `ease`. The adapter now applies the selected curve to both once at binding. Touch release continues to use its own curve on both, settlement restores travel, and teardown restores each original inline curve. No new animation loop, geometry measurement, timer or touch-input delay is added.

The Instagram paint-window guard, visible 20 px blur, reflections, looping, snap destinations and drag geometry remain intact. Direct input, media playback, network retries and autoplay holds retain their established clocks.

## Validation

- Node 24 runtime build, pinned custom Swiper build/check, and complete verification: 854 passed, no failures, 3 skipped. Changed source JavaScript passes formatting. Generated outputs match the source.
- Home and Location passed at widths 440 and 768 in WebKit and 1440 in Chromium. All 12 Home and 7 Location disclosures were tapped, checked for visible content and original 300/400 ms animation, then closed with the keyboard. Navigation opens and closes at the original 639 ms responsive duration for the tested 956 px height; the content panel model retains 799 ms.
- Both Services/Treatments sections on both pages share matching wrapper/image curves and durations. Frame samples during an arrow advance show no backward step; subsequent next/previous moves preserve the curves. Responsive duration follows each component's measured width.
- Each phone-sized page received 80 rapid Instagram next/previous pointerdown/click pairs. Both settled, all visible cards retained the original 20 px blur, and the paint window stayed bounded at 12 glass panels. No main-window JavaScript errors were recorded.
- Fade assertions preserve the original feed/card curves and 300 ms duration. Location's native video overlay retains its original linear curve; loading opacity/visibility settle at 450 ms. Unit coverage also verifies video poster cleanup when the fade clock differs from content.

Physical iPhone Safari and the user's preferred feel remain the acceptance checks. Browser automation cannot reproduce the device's GPU/memory limits.

## Release procedure

Parent: `d77c487a2e049a9340a39e8d9d59a62905fe52aa`. Staging rollback: `c403998c1a4f1de2a6ec43430bcc7bfbcc7d7fd6`.

Build and verify the runtime and custom Swiper from this source. Check immutable CDN assets against the generated inventory, then replace all four site-code references together. Publish only to `dentalbarns.webflow.io`, with an empty custom-domain list. Physical iPhone Safari remains the acceptance check for rendering stability and the user's preferred feel.
