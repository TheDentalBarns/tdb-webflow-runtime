# Shared motion profile

Edit `config/motion.json`, rebuild, and deploy the JS and CSS from the same commit. Two settings provide the normal tuning surface:

- `pace`: duration multiplier. `1` preserves the current timings; `1.25` makes linked motion take 25% longer; `1.5` makes it take 50% longer. Supported range: 0.5–2.
- `character`: named easing palette. `current` preserves each original curve. `soft` supplies gentler travel, panel, release, fade and control curves.

The initial consolidated release used `pace: 1` and `character: "current"`. The staging trial requested on 31 October 2026 selects `pace: 1.25` and `character: "soft"`: linked transitions take 25% longer, with smoother starts and settling. This is a staging design trial, not a production rollout. Future palettes can be added under `characters` and selected by name. Use role curves for travel, panels, release, fades and controls; keep linear spinners and progress linear.

## Responsive timing and scope

The existing horizontal width and vertical height formulas run first, including their current breakpoints and clamps. Pace is applied afterwards so the desktop cap cannot prevent slower motion. Shared fades, text choreography, tickers, drawers, navigation, disclosure controls, loaders, and carousel transitions use the same profile. Closing cleanup follows the scaled animation rather than an independent fixed timeout.

Released stamp-strip movement and marquee motion use scaled elapsed time, retaining their travel path and limits. Direct dragging still tracks the finger. Marquee cruise speed follows the same time scale. The custom Swiper adapter reads the shared travel easing.

Pace is a visual motion control, not a multiplier for every timer on the site. Countdown dates, video/audio playback, network retries, input sampling, gesture thresholds, reading/autoplay hold intervals and progress tied to those intervals stay on real time. Scroll-linked parallax positions and direct scroll input keep their existing geometry and response. Legacy Webflow IX2 interactions and third-party widgets are outside this profile. Five Senses ambient scene/media timelines retain their own clocks; its UI reveals use the profile.

## Ownership and build

- `src/shared/motion-profile.js` is installed once by the existing startup bundle. It exposes immutable `TDBMotionProfile`, and sets the matching root CSS tokens once so early JS and deferred CSS agree. It adds no request, observer, layout read or animation loop.
- `TDBMotion` and `TDBPanelMotion` remain the entry points for horizontal/vertical timing. Modules retain their old standalone fallback when the profile is absent.
- Authored runtime CSS uses `--tdb-motion-pace` and role easing variables with original-value fallbacks. Runtime-measured duration variables are already scaled; only their fallback is multiplied.
- `src/styles/tdb-native-motion.css` is a narrow timing-only projection of the audited Webflow styles. It contains durations, delays and easing only. Designer retains layout, artwork, animation names, states and breakpoints. The profile layer owns published timing overrides; it does not change the Designer canvas's timing values.
- When native Designer transition declarations are added or changed, audit both Home and Location. Regenerate the projection with `node tools/runtime-build/native-motion.cjs <shared-css-file> <home-css-file> <location-css-file>` in the provenance inventory order, then review the diff and browser timing parity. Do not regenerate it during an ordinary seasonal pace change.
- `npm run build` generates the matching CSS and JS; `npm run build:swiper` rebuilds the adapter when its source changes. `npm run verify` checks generated parity and regressions. Use Node 24.

Deploy all four runtime references in site custom code together: foundation preload, UI stylesheet, noscript UI stylesheet, and startup script. Use an immutable commit SHA and publish to Webflow staging first. Retain the previous SHA for rollback.

## Visual review for a new profile

Check arrows and swipe release for Services/treatments; stamp dragging, coast and limits; drawer opening/closing and text; navigation and disclosures; review/owner quote fades; hero loading-to-play and spinner fade-out; countdown digit rolls; marquee cruise and release. Check phone, tablet and desktop, including physical Safari and Android. A timing profile is not a fix for Safari rendering flashes.
