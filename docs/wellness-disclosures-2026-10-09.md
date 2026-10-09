# Wellness native disclosures

Scope: Home's Why Trust / Wellness section only, Webflow page 677cf86df9952f978d94d8a9.

David deliberately uses immediate answer height changes, with opacity/transform
reveals, to avoid animating document layout. Preserve that choice. Existing
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
  padding, plus 20px bottom padding. Five separate animated spacers are removed.
- Each trigger is keyboard focusable, role button, aria-expanded, and linked to
  its answer through aria-controls. Answers have hidden/inert closed states.
- Five native images reference the existing shared tdb-chevron.svg; invert
  renders them white. Old icon component wrappers and inline drawings are gone.
- Five decorative barn windows retain their shared artwork and now have empty
  alt text. Vimeo, poster, other text blocks and empty sticky layout column
  remain unchanged.

TDBDisclosure 1.1.0 extends the already inline shared foundation, adding opt-in
mount/refresh controllers. It has no measurements, polling, resize work or new
network request. Native hidden changes layout once; only child opacity and
transform animate. Independent answers and rapid toggle reversal are preserved.
Chevron CSS remains the same shared 300ms ease rotation as the navbar. Reveal
keyframes are shared with the navbar, preserving its existing durations/easing.
Wellness consumes existing global reveal variables (300ms fade/400ms lift).

Source and minified outputs are versioned together. Only the foundation
script/style blocks in current site head are replaced; all other head/footer
changes are retained. Publish only to the Webflow staging subdomain.

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

The initial source push was held by automatic approval review. David explicitly
approved pushing the tested wellness-disclosures branch to the existing
TheDentalBarns/tdb-webflow-runtime GitHub repository on 2026-10-09.
