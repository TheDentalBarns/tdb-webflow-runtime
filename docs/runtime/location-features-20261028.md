# Location setting and access

The Location benefits and aerial video are now a native `Location — Setting and access` component, converted from the existing section without a wrapper. It contains the existing shared `Vimeo Video Player`. Contact currently uses a different contact/map section; this component has not been inserted there.

## Ownership and maintenance

- Designer owns the section/grid, copy, decorative masks, square video frame, native buttons and poster crop. The three existing icon holders use the canonical tranquil, parking and discreet SVGs; their PNG children and two forced line breaks were removed. Each holder's native `::before` renders the symbol at 60% of the holder size; `::after` draws the fine arched surround. This retains the smaller framed appearance after David flagged its loss in the initial mask conversion. Neither pseudo-element adds a DOM node or needs JavaScript. The icons render before JavaScript and in Designer.
- Shared Vimeo uses native play/pause buttons with labels and shared mask artwork, retaining the existing circular holders, 20px blur and pulse. Its inline play/pause/spinner SVG trees are removed. The controller transfers focus only between its own focused controls when playback swaps them; it does not steal focus from other page content.
- `tdb-video-feedback.css`, bundled in the existing shared UI, owns loading feedback before consent and while the Vimeo dependency is arriving. It uses the existing central motion clock and spin animation. `tdb-vimeo-ui.css` retains playback states and focus presentation; `vimeo.js` retains consent, first-input replay, cancellation and suspension.
- The section's `data-tdb-video-poster-parallax` hook registers only `.vimeo-player__placeholder` with the existing `TDBMotion.pageBreaks` owner. Its iframe, controls and horizontal geometry do not move. The shared player's native **Poster parallax** variant reserves 4vh extra image height, centred at -2vh, for the existing bounded -2vh/+2vh motion. Other instances retain Base and their current crops. No extra scroll listener or scheduler was added.
- The Location film title is now “Location and free parking at The Dental Barns”. Its saved poster and the original uploaded film's poster are both 720 × 720; no sharper existing source was found. A higher-resolution original is still needed for a real quality improvement; no upscale was substituted.
- Content poster, iframe and button fade durations consume `--tdb-motion-pace` once. Native layout and artwork are not recreated by runtime code. Home receives no new element.

The shared play and pause artwork are Webflow assets `6ae0c5c81332cf18d9261ca0` and `6ae0c5c877076aee400c6838`; spinner remains `6ad9b3739924db6726de4586`. The shared Vimeo definition has 18 instances. Its existing IX2 entrance remains outside this scoped cleanup; this change does not claim the entire page is free of legacy interactions.

## Location mobile hero correction

The shared Hero — Vimeo has different film inputs on Home and Location. Home's mobile film is portrait; Location supplies the landscape film `1047445489` at both breakpoints. Location had inherited the mobile portrait iframe minimums (58vh width / 178vw height). Once playback removed the full-frame poster, the landscape film fitted inside that portrait iframe and exposed the overlay above and below the film. This was reproduced in a 390 × 844 browser viewport; the user reported Android Chrome.

Only Location's `location-centred-heading` native variant now overrides `.vimeo-bg__iframe.mobile` at Tablet and below with landscape cover minimums: 178vh width / 58vw height. Home retains its portrait sizing. No JS compensation, new element or page custom-code rule is involved.

## Acceptance and rollback

The change follows the [architecture and engineering standard](https://chatgpt.com/space/page_c22eaec26d7c819197df9524f243acbd): native geometry, shared component-owned behaviour, accurate fallback artwork, and disclosure of Designer/runtime boundaries. Verify native masks, loading and consent, keyboard play/pause/focus, poster-only vertical motion, desktop/mobile geometry, hero playback after poster removal and scroll/resume, and Home/shared consumers before completion.

Private before/after native trees, global install code, browser evidence and logs are saved outside the repository under `location-features-evidence`. Runtime rollback restores all four previous install pins to `6623aa6f837afabee6a609dcbf0ba20c44f815c9` and publishes staging only. Restore shared Vimeo from the uninstantiated `Archive — Vimeo before shared masks 2026-10-27` definition (`bcdb34a1-0ac4-15a6-916d-1a6eeb23c67d`) if reverting its structure; restore the original native style values alongside it. Revert the Location hero variant minimums independently if required. The new section can be unlinked in place without adding a wrapper.

Startup cost adds no controller or head script. Native mask CSS/assets and early loading-state selectors have a delivery cost; removed image/SVG nodes are not by themselves a performance claim. Browser measurements and final combined HTML/CSS/JS costs are recorded below after staging publication. No new TBT or physical Android benchmark is claimed.

## Staging verification, 28 October 2026

Staging uses runtime [`fc3501fadb6751bf4f37a74ae78e822602a936f1`](https://github.com/TheDentalBarns/tdb-webflow-runtime/commit/fc3501fadb6751bf4f37a74ae78e822602a936f1). All four install pins agree; the startup entrypoint, foundation and four changed built assets match their local bytes on jsDelivr. Publication targeted the Webflow subdomain with no custom domains.

- Build parity and custom Swiper build pass. Full suite: 786 passed, three skipped, zero failures. An initial strict floating-point marquee assertion failed by about 1e-14; the focused marquee rerun and full rerun passed. Direct Prettier checking leaves the existing unrelated warning in `src/reviews/native/loader.js`; changed source files pass. The npm format command's single-quote glob handling also fails under this Windows shell, so it is not reported as clean.
- Location's initial HTML has 1,530 elements, down from 1,543. The changed section goes from 51 to 38, and its player from 20 to 12. Home remains at 1,133. No new Home element or head patch was introduced.
- Desktop and 390px checks confirm the smaller shared masks and arched surrounds, native square frame, title, loading spinner, keyboard play/pause and focus transfer. With essential-only consent the first press opens consent and leaves the iframe source empty; acceptance replays the request. The player reached loaded/started and subsequently returned to its paused/ended state.
- Poster translation changed from -0.33px to +8.29px across the checked desktop scroll positions; iframe and control translation remained `none`. The 4vh oversized poster stays clipped by the native frame. First Visit's five players retain Base crops and shared masked buttons; a representative player passed keyboard play/pause and focus transfer without poster parallax. Static checks on Contact, About, main VIP, VIP Posh, Smiles, Sanctuary, Awards, West End and Five Senses found no content-player consumers.
- The Location hero was checked at 390×844 after poster removal and scroll-away/return, and at 844×390. Its visible film fills the frame. Home retains its portrait mobile film and native portrait minimums. Browser viewport checks do not certify physical Android Chrome address-bar or orientation behaviour; no new phone performance benchmark is claimed.

Controlled byte measurements compare the saved previous staging HTML/CSS and runtime `6623aa6f` with this release. Gzip uses the same local Node implementation for both sides; it is not a CDN transfer measurement.

| Affected delivery | Raw change | Controlled gzip change |
| --- | ---: | ---: |
| Location HTML | -1,942 B | -853 B |
| Location native CSS | +3,740 B | +429 B |
| Home HTML | +140 B | +2 B |
| Home native CSS | +1,317 B | +191 B |
| Shared deferred runtime JS | +134 B | +37 B |
| Shared UI CSS | +681 B | +62 B |
| Vimeo CSS | +282 B | +57 B |
| Vimeo JS | +246 B | +96 B |

The affected Location HTML/CSS/JS total is +3,141 raw bytes / -172 controlled gzip bytes before artwork transfer. SVG masks replace three PNG requests and inline control SVGs; shared cache state determines their transfer cost. The new play/pause assets total 1,160 raw bytes. Foundation/startup are unchanged. Existing IX2 entrance and the 720px poster remain explicit follow-up limitations, not hidden runtime fixes.
