# Shared motion profile

Edit `config/motion.json`, rebuild, and deploy the JS and CSS from the same commit. Each motion family has two settings:

- `pace`: duration multiplier. `1` preserves the current timings; `1.25` makes linked motion take 25% longer; `1.5` makes it take 50% longer. Supported range: 0.5–2.
- `character`: named easing palette. `current` preserves each original curve. `soft` supplies gentler travel, panel, release, fade and control curves.

The top-level `pace` and `character` control content movement: carousels (including Instagram, Smiles, Services/Treatments and reviews), drawers, tickers and related travel. Staging retains `1.25` / `soft`, the slower content movement approved after the 31 October trial.

`families.navigation`, `families.accordion` and `families.fade` are independent settings in the same file. Each currently uses `pace: 1` and `character: "current"`, restoring its pre-trial durations and original curves. Changing content pace does not change those families. Fades include standalone opacity transitions, feed reveals and video poster/loading exits; carousel travel and drawer movement remain on the content clock. Navigation owns its internal reveal and control animation. Accordions own their reveal, chevron and spacing animation.

To restore all pre-trial timing, set the top-level profile to `1` / `current`; retain the three independent family settings. Future palettes can be added under `characters` and selected by name. Keep linear spinners and progress linear. This is a staging design trial, not a production rollout.

## Responsive timing and scope

The existing horizontal width and vertical height formulas run first, including their current breakpoints and clamps. Each family's pace is applied afterwards so the desktop cap cannot prevent slower motion. Closing cleanup follows that component's animation clock rather than an independent fixed timeout. Media poster cleanup follows the fade clock.

Released stamp-strip movement and marquee motion use scaled elapsed time, retaining their travel path and limits. Direct dragging still tracks the finger. Marquee cruise speed follows the same time scale. The custom Swiper adapter gives the track and its compensating parallax images the same travel curve; different curves can create a brief apparent reversal. Touch release temporarily uses the release curve on both and restores travel on settlement. Teardown restores their original inline curves.

Pace is a visual motion control, not a multiplier for every timer on the site. Countdown dates, video/audio playback, network retries, input sampling, gesture thresholds, reading/autoplay hold intervals and progress tied to those intervals stay on real time. Scroll-linked parallax positions and direct scroll input keep their existing geometry and response. Legacy Webflow IX2 interactions and third-party widgets are outside this profile. Five Senses ambient scene/media timelines retain their own clocks; its UI reveals use the profile.

## Ownership and build

- `src/shared/motion-profile.js` is installed once by the existing startup bundle. It exposes immutable `TDBMotionProfile`, and sets the matching root CSS tokens once so early JS and deferred CSS agree. It adds no request, observer, layout read or animation loop.
- `TDBMotion` and `TDBPanelMotion` remain the content entry points for horizontal/vertical timing. `TDBMotionProfile.forFamily(name)` and `TDBPanelMotion.forFamily(name)` supply immutable family views. Modules retain their old standalone fallback when the profile is absent; missing family settings inherit content for compatibility.
- Authored runtime CSS uses `--tdb-motion-pace` for content, `--tdb-fade-pace` for standalone fades, and role easing variables with original-value fallbacks. Generated navigation and disclosure scopes override the inherited content tokens with their independent family settings. Runtime-measured duration variables are already scaled; only their fallback is multiplied.
- `src/styles/tdb-native-motion.css` is a narrow timing-only projection of the audited Webflow styles. It contains durations, delays and easing only. Designer retains layout, artwork, animation names, states and breakpoints. The profile layer owns published timing overrides; it does not change the Designer canvas's timing values.
- When native Designer transition declarations are added or changed, audit both Home and Location. Regenerate the projection with `node tools/runtime-build/native-motion.cjs <shared-css-file> <home-css-file> <location-css-file>` in the provenance inventory order, then review the diff and browser timing parity. Do not regenerate it during an ordinary seasonal pace change.
- `npm run build` generates the matching CSS and JS; `npm run build:swiper` rebuilds the adapter when its source changes. `npm run verify` checks generated parity and regressions. Use Node 24.

Deploy all four runtime references in site custom code together: foundation preload, UI stylesheet, noscript UI stylesheet, and startup script. Use an immutable commit SHA and publish to Webflow staging first. Retain the previous SHA for rollback.

## Visual review for a new profile

Check arrows and swipe release for Services/treatments; stamp dragging, coast and limits; drawer opening/closing and text; navigation and disclosures; review/owner quote fades; hero loading-to-play and spinner fade-out; countdown digit rolls; marquee cruise and release. Check phone, tablet and desktop, including physical Safari and Android. A timing profile is not a fix for Safari rendering flashes.
