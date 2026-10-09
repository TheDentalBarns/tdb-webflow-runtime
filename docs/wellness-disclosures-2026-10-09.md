# Wellness native disclosures

Scope: Home's Why Trust / Wellness section only, Webflow page 677cf86df9952f978d94d8a9.

David deliberately uses immediate answer height changes, with opacity/transform
reveals, to avoid animating the full answer height. The deliberate 20px gap
animation provides a softer finish for the divider. Preserve both choices. Existing
centred layout moved the Sight trigger up 62.5px at 1440x900 and 76.4px at
390x844. Both first openings occurred without growing the section itself.

Designer changes:
- Wellness wrapper adds is-wellness: flex-start, clamp(2rem,18vh,12rem) top
  padding, 3rem bottom padding. Existing 100vh minimum remains; answer content
  can grow the section. Exceptional and Bespoke remain centred.
- Five question rows use tdb-disclosure-trigger, preserving geometry/white
  dividers and the first-row border exception. The old faq3_question class is
  removed from these five, so their class-targeted IX2 actions cannot bind.
- Five faq3_accordion wrappers add is-disclosure with width:100%, preserving
  full-width hit areas and dividers when hidden answers leave normal layout.
- Answers use tdb-disclosure-panel: existing .5 opacity, overflow and right
  padding. Answers have no extra bottom padding; the existing row wrapper
  animates its bottom padding 0–20px over 300ms outQuart, driven by the question's
  aria-expanded state. This restores the original divider movement on opening
  and closing without separate spacer nodes. The gap remains outside the hidden
  answer, so it can complete its closing motion after the answer disappears.
- Each trigger is keyboard focusable, role button, aria-expanded, and linked to
  its answer through aria-controls. Answers are authored display:none in Designer,
  with inert and aria-expanded=false in exported markup. An explicit expanded
  sibling selector reveals the answer. Runtime also manages hidden/inert.
  Webflow omitted the custom hidden attribute on export, causing a load flash
  before the controller initialized; the native CSS default fixes first paint.
- Five native images reference the existing shared tdb-chevron.svg; invert
  renders them white. Old icon component wrappers and inline drawings are gone.
- Five decorative barn windows retain their shared artwork and now have empty
  alt text. Vimeo, poster, other text blocks and empty sticky layout column
  remain unchanged.

TDBDisclosure 1.1.0 extends the already inline shared foundation, adding opt-in
mount/refresh controllers. It has no measurements, polling, resize work or new
network request. Native hidden changes answer height once; child opacity and
transform animate alongside the controlled 20px gap. The gap involves layout
work, matching the original interaction. Independent answers and rapid toggle
reversal are preserved.
Chevron CSS remains the same shared 300ms ease rotation as the navbar. Reveal
keyframes are shared with the navbar, preserving its existing durations/easing.
Wellness consumes existing global reveal variables (300ms fade/400ms lift).
Disclosure CSS v1.1.2 adds the explicit open display rule to the v1.1.1 opt-in
data-tdb-disclosure-item gap rules; JavaScript stays at v1.1.0. The original
outQuart polynomial is sampled at the same precision
as the navbar curves, with a cubic-bezier fallback. Closed padding is authored
as 0px in Designer; shared CSS controls open spacing and both transitions.

Source and minified outputs are versioned together. Only the foundation
script/style blocks in current site head are replaced; all other head/footer
changes are retained. Publish only to the Webflow staging subdomain.
On the gap restoration, the current foundation receives only the new CSS rules.
Explanatory comments in existing named TDB style blocks were removed to keep
the site head under Webflow's 50,000-character limit; their rules are unchanged.

Concurrent Navbar v1.1.0 source from commit 1de9548 is preserved, including
its mobile opaque-surface blur-idle fix. Shared reveal keyframe names are the
only navbar animation change in this work; native timings/easing are retained.

Staging verification, 2026-10-09:
- Chromium at 1440x900, 390x844 and 820x1180: all five clicked questions had
  0px document-position drift throughout opening; answer heights were constant
  from their first open frame through the reveal.
- Closed rows fill their available widths (585px, 351px and 319.8px), with no
  horizontal overflow. All five shared SVGs loaded and rotate over 300ms.
- Enter, Space, pointer activation, 20 rapid toggles, independent open states,
  hidden/inert closing and no IX2 inline panel mutations passed.
- Navbar Services opens and rotates its chevron at all three sizes; mobile
  menu opens, shared reveal animations run, and no page errors were observed.
- Five automated disclosure/navbar tests passed; git diff --check passed.
- Staging publication only. Production custom domains were not selected.

Restored-gap verification, 2026-10-09:
- Chromium at 1440x900 and 390x844: padding transitions 0 → 20 → 0px;
  intermediate closing frames show the divider easing upward while the answer
  height is already zero. Open answer height stays constant during the reveal.
- Clicked-question position drift remains 0px throughout opening and closing.
- Rapid open/close/open reversal settles at the correct 20px open gap.
- Both viewports retain full-width rows; no extra spacer elements or page errors.
- Existing five disclosure/navbar unit tests and diff whitespace check pass.

Collapsed-first-paint verification, 2026-10-09:
- Desktop and mobile with JavaScript disabled, after render-blocking CSS loads:
  all five panels have display:none and zero height; triggers export
  aria-expanded=false, panels export inert, and wrapper gaps start at zero.
- Native published CSS explicitly contains display:none on tdb-disclosure-panel.
- With JavaScript enabled, opening/closing, the 20px gap, zero trigger drift
  and rapid reversal checks still pass on desktop and mobile.
- Durable site rule rules/full-motion-design-review.md now records the deliberate
  spacing finish and the requirement to author collapsed first-paint states.
- David explicitly approved synchronizing the restored-gap and first-paint
  follow-up fixes to the same GitHub repository at 15:04 BST on 2026-10-09.

The initial source push was held by automatic approval review. David explicitly
approved pushing the tested wellness-disclosures branch to the existing
TheDentalBarns/tdb-webflow-runtime GitHub repository on 2026-10-09.
