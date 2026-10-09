# Home Awards shared disclosures

Scope: the seven Awards dropdowns on Home, Webflow page
`677cf86df9952f978d94d8a9`. Staging only: https://dentalbarns.webflow.io/.

Home already used its own native Awards v1.0 controller. This migration replaces
that separate implementation with the shared Wellness/USP disclosure pattern.
The legacy Awards component used elsewhere, FAQ and pricing have not been
migrated. Their existing individual and class-targeted IX2 bindings need an
instance-specific audit before reuse.

## Designer structure

| Part | Authored structure and state |
| --- | --- |
| Item | Existing wrapper: `faq3_accordion is-disclosure`, `data-tdb-disclosure-item`, zero closed bottom padding |
| Trigger | Existing `tdb-home-awards-question`; `data-tdb-disclosure-trigger`, `role=button`, `tabindex=0`, `aria-expanded=false`, `aria-controls` |
| Chevron | Native `tdb-disclosure-chevron is-dark` image; canonical asset `6ac7bbeef3f863de97d242c8`; `data-tdb-chevron`, `aria-hidden=true`, empty alt |
| Panel | Immediate trigger sibling: `tdb-disclosure-panel`, `data-tdb-disclosure-panel`, `role=region`, `aria-labelledby`, `aria-hidden=true`, `hidden`, `inert` |
| Reveal | Existing inner content wrapper: `data-tdb-disclosure-reveal` |

All seven answers are authored closed. The native panel class has `display:none`
before JavaScript, because Webflow omits the custom `hidden` attribute on export.
Shared CSS reveals the adjacent panel when its trigger becomes expanded.
Copy, typography and the surrounding Awards carousel remain in Designer.
The native `is-dark` combo sets `filter:none` on this light background. Wellness
retains the white/inverted presentation of the same shared asset.

The seven embedded chevrons and seven separate spacer elements were removed.
The section no longer carries `data-tdb-awards-native`. Home footer no longer loads
`src/awards/home-awards-native.js` at commit `4104bf5`; that historical source
remains in the repository.

## Motion and state contract

- Answer space appears/disappears immediately; no full-height interpolation or
  measurement loop.
- Inner content fades over 300ms and lifts from -20px over 400ms, using existing
  shared reveal variables. Panel opacity remains .5 as in Wellness.
- The existing shared SVG rotates 180 degrees over 300ms with ease.
- Item bottom padding moves 0–20px over 300ms using the original sampled outQuart
  curve. The gap sits outside the panel, so it can finish closing after the
  answer disappears. This deliberate small spacing animation does affect layout.
- Rows remain independent. Pointer, Enter and Space activation are supported;
  hidden answers are inert. Rapid reversals settle at the current state.

`TDBDisclosure` v1.2.0 prefers the local sibling panel and repairs duplicate IDs
when components are copied. It restores focus to the trigger before hiding a
focused answer and updates `aria-hidden` with `hidden`, `inert` and
`aria-expanded`. Repeated mounting is safe; `refresh(root)` also accepts a trigger
as its root. Existing navbar observation and behaviour are unchanged.

Shared CSS defaults to an open display of `block`. A future layout can explicitly
set `--tdb-disclosure-display:grid` (or another required display type) without
changing the controller. Pricing still needs its own summary-state adapter and
IX2 removal review; that option alone is not a pricing migration.

For subsequent sections, preserve this local trigger/panel structure, author the
collapsed CSS state, remove the audited IX2 hooks/classes, and retain content and
layout classes appropriate to that section. Prefer a native button for a new
trigger; existing role-button triggers need tabindex and keyboard support.
Use the same asset and runtime rather than creating another section controller.

## Deployment

Only the named foundation style/script blocks in a fresh site-head read were
replaced, preserving the other active runtime work. The foundation bundles remain
inline and add no network request. The bundle includes unchanged Navbar v1.1.0.
Lossless CSS minification preserves selector spaces, calc operators and easing
precision; the complete site head is 49,984 characters, below Webflow's 50,000
limit. Further head additions must account for this remaining capacity.

Webflow staging publish task: `ef3e947b-39a0-466a-864a-3ddbbdf23041`.
Chevron contrast follow-up: `ca591b21-febb-4a84-98cc-5b61743fffc0`.
Production custom domains were not selected.

## Verification

Six disclosure/navbar unit tests pass, including copied instances with duplicate
IDs, focus return, independent states, rapid reversals, remounting and preserved
navbar selectors/timings. Designer and published markup confirm seven local
trigger/panel pairs, seven canonical native images, no old embeds/spacers and no
Home-only Awards script.

Published Chromium checks at 1440x900, 390x844 and 820x1180 pass:
- All seven rows support pointer opening/closing, keyboard Enter/Space,
  independent open states and 20 rapid reversals.
- The clicked question has 0px document-position drift during both directions.
  Answer height is constant from the first open frame; closing immediately makes
  answer height zero while the external gap eases back to zero.
- The fade/lift and 0–20px gap run; all seven decorative images load in the dark
  colour needed for the light background. No horizontal overflow or panel inline
  style mutations were observed.
- Existing Wellness disclosures still toggle; mobile/tablet navbar and Services
  dropdown smoke checks pass. Native navbar ARIA updates are awaited until its
  own opening transition finishes. No page errors were observed.

The existing proximity-loaded media above Awards is allowed to settle before
measuring disclosure movement. Its initial loading can change document height;
no Awards layout alignment change was required.

With JavaScript disabled at 1440x900 and 390x844, after render-blocking CSS loads,
all seven panels have `display:none` and zero height. Triggers remain
`aria-expanded=false` and wrapper bottom padding is zero. This confirms the
authored collapsed first-paint state independently of the controller.
