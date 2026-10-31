# Elegant motion staging trial — 31 October 2026

The user requested a more luxurious, elegant pace on staging. Select `pace: 1.25` and `character: "soft"` in `config/motion.json`, the single tuning source for the linked motion. Rebuild matching startup JavaScript and CSS; do not add page-specific timing overrides.

Linked transitions take 25% longer, with the existing soft palette supplying travel, panel, release, fade and control curves. Mobile carousel travel becomes 500 ms instead of 400 ms. At a 1440 px viewport it is 980 ms; at the tested 956 px viewport height, navigation uses the shared 799 ms panel duration. Short opacity fades become 375 ms. Location's loading-exit opacity and visibility delay both become 562.5 ms.

## Carousel connection

Browser validation exposed an additional gap: arrow-driven Swiper track movement still used its component/default easing. The shared adapter now applies the selected travel palette once when it binds. The `current` palette leaves native/inline easing untouched. Gesture release keeps its separate easing role, restores the selected travel curve on settlement or arrow interruption, and teardown restores the original inline curve. Deferred instances without a prepared wrapper remain safe.

This adds no animation loop, layout measurement or delay to touch input. Snap targets, looping, drag geometry, scroll locks, image preparation, the Instagram paint window, visible 20 px blur and reflections retain their existing behaviour. Media playback, network timing and gesture thresholds keep their own clocks.

## Validation before publication

- Node 24 runtime build and pinned custom Swiper build/check. Complete verification: 851 passed, 0 failed, 3 skipped. Changed JavaScript passes formatting; generated outputs match source.
- Added shared-adapter regression coverage for current-profile preservation, selected travel and release curves, settlement, arrow interruption, unchanged destination/duration and teardown restoration.
- Home and Location passed at widths 440 and 768 in WebKit, and 1440 in Chromium. CSS and JavaScript report the same 1.25/soft profile. Native navigation and the shared panel controller agree on duration.
- Actual menu/dropdown opening and closing finish cleanly. Carousel arrow movement uses the selected travel curve and the responsive duration; fades use the selected fade curve.
- Each phone run delivered 80 rapid next/previous pointerdown/click pairs. Both pages settled with all visible cards present, original blur and 12 enabled glass panels. No main-window JavaScript errors were recorded.

Physical iPhone Safari and the user's aesthetic review remain the acceptance checks for this staging trial.

## Release

Base and rollback: `c403998c1a4f1de2a6ec43430bcc7bfbcc7d7fd6` (`pace: 1`, `character: "current"`). Verify the immutable release assets, preserve exact head/footer backups outside git, and replace the four runtime references together. Publish only the Webflow staging subdomain; production custom domains are excluded.
