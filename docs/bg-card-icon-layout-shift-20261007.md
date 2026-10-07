# Background card icon space — 7 October 2026

Native Webflow class `benefit_icon` (style
`79ee1e72-cfba-aa4d-569b-c4e9c0bd64e0`) had width 3rem and object-fit
scale-down, with no height or aspect ratio. Added `aspect-ratio: 1 / 1`
at the main breakpoint, inherited responsively.

Home uses it for the Tranquil / Convenient / Discreet icons in Discover Our
Countryside Location, and the Exceptional / Bespoke / Wellness icons in
Crafting an Exceptional Dental Experience. All six assets are square SVGs.
The location SVG viewBoxes are 0 0 48 48; the fingerprint is 0 0 192 192;
the loaded diamond and lotus both report square intrinsic dimensions.

Before the fix, at 1363px viewport, the unloaded location icons measured
44.75px wide but only 19.59375px high. Width alone did not reserve their final
square space. The shared native aspect ratio reserves it without extra
JavaScript, head CSS, changed widths, lazy-loading changes or animation changes.

Published to Webflow staging only. This follows the native USP barn icon fix.
