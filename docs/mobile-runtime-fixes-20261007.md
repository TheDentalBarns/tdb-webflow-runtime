# Mobile runtime recovery — 7 October 2026

Release branch: `fix/mobile-scroll-recovery-20261007`, based on deployed shared
registry release `d78269d4192226eafb17754a17aab42105de863b`.

## Changes

- Shared motion 1.19.2 distinguishes coarse-pointer viewport height changes
  from document/element geometry and width changes. ResizeObserver notifications
  schedule measurements instead of unconditionally rebasing every fade.
- Both page effects and DD fades share input-led momentum tracking. Continuing
  scroll events extend the gesture past two seconds; scrollend, navigation and
  visibility lifecycle boundaries prevent stale intent authorising restoration.
- DD interpolation settles toward its last scroll target rather than animating
  an idle toolbar-height change. Nested scroll roots retain their resize logic.
- DD/page-break loaders retry on touch, pointer input and reconnect, with one
  in-flight request. Failed sketch downloads expose static artwork until recovery.
- Slider focus 1.3.1 ignores height-only changes and resets on width/rotation.
- Brevo 1.0.1 treats unavailable/incomplete consent as unknown. Only explicit
  rejection or a complete saved decision without targeting clears cookies and
  reloads an already-started tracker. The tested source is copied into the
  existing `data-tdb-brevo-consent` footer block; it adds no network request.
- Immediate batch 0.11.1 excludes optional attribution from UI priority readiness
  and bounds script waits at 20 seconds. Consent gates inside consumers remain.
- Calculator numbered-header timeline animations are guarded by `@supports`;
  unsupported engines retain their authored static, readable colours.

## Webflow Designer

`tdb-treatment-blur` (style `aa667564-e9b9-8c3b-448f-b5823c004e30`): replace the
transition shorthand with native longhands:

- transition-property: `-webkit-backdrop-filter, backdrop-filter`
- transition-duration: `var(--tdb-parallax-duration, 400ms), var(--tdb-parallax-duration, 400ms)`
- transition-timing-function: `ease, ease`
- transition-delay: `0s, 0s`

Repeat each longhand value for both properties. Webflow's publishing serializer
did not expand singleton lists correctly: it emitted `undefined` for the second
property. The repeated lists publish valid prefixed and standard transitions.

Layout, blur amount, clip-path, progress bars and animation curves are unchanged.

## Deployment boundaries

Update only site-level registry, DD loader, page-break loader, calculator loader
and immediate-batch script URL pins, plus the existing inline Brevo block.
The calculator loader is byte-identical; repinning it serves its guarded CSS
while its calculator JavaScript remains pinned to `1d5919f...`.

Keep `data-tdb-runtime-base` at `cd0ca0b3f525bdf80df853a98ee3306a3a72d541/dist/`.
Keep all other site/page code and pins. Publish the Webflow subdomain only.

Published source: `310b98acf5271a9be342b9cf4283dd53663850a5`.
Final staging publish task: `e64f28ce-d6e4-415a-aff6-27c8e89eaa7b`.
Published CSS: `dentalbarns.webflow.677cf86df9952f978d94d8a9.d8e1a5c3f.opt.min.css`.
The standalone calculator page retains its separate older CSS pin; the follow-up
Safari audit records this as an outstanding shared-DD migration gap.

## Validation

48 tests pass across mobile recovery, shared DD motion, page-break memory,
module identity, Swiper behaviour and parallax progress. Scenarios cover
continuous viewport resizing, 3.5-second momentum, real layout/width changes,
restoration, repeated offline recovery, missing consent, real withdrawal,
blocked attribution and startup timeout. Source/dist parity is checked.

Browser smoke checks complement these deterministic tests. Real iOS Safari and
Android device validation is still required; a desktop browser cannot reproduce
mobile compositor and browser-toolbar behaviour exactly.
