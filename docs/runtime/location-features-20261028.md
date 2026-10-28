# Location setting and access

The Location benefits and aerial video are now a native `Location — Setting and access` component, converted from the existing section without a wrapper. It contains the existing shared `Vimeo Video Player`. Contact currently uses a different contact/map section; this component has not been inserted there.

## Ownership and maintenance

- Designer owns the section/grid, copy, decorative masks, square video frame, native buttons and poster crop. The three existing icon holders use the canonical tranquil, parking and discreet SVGs; their PNG children and two forced line breaks were removed. The icons render before JavaScript and in Designer.
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
