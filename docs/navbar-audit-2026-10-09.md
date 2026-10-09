# Navbar audit — 9 October 2026

The migrated navbar is in good shape. Shared icons, CSS-driven feedback and
native Webflow input/focus behaviour are a sound foundation. The largest
remaining opportunities are menu-image delivery and simplifying the older
enhancement controller. No new optimisation was deployed during this audit.

The previously authorised temporary comparison/diagnostic cleanup was completed
and published to the Webflow staging subdomain only. Production domains were
not published. The approved native navbar behaviour remains in place.

## Scope and evidence

Audited the published Home navbar, fresh site head/footer, Home page head,
loaded runtime assets, published IX2 definitions, and the user's two Android
measurement captures. Desktop interaction checks used the real staging page.
Two input/breakpoint edge cases were reproduced in DOM fixtures running the
actual enhancement bundle. These fixtures do not simulate browser painting.

This is a component audit, not a complete accessibility or site-wide dependency
audit. No fresh Android visual test, mobile emulation, frame-rate trace or CPU
benchmark was available. Downloaded asset byte counts are raw file sizes, not
measurements of a visitor's cached or compressed network transfer.

Runtime snapshot:

| Part | Audited version | Responsibility |
| --- | --- | --- |
| Inline navbar foundation | 1.1.0 | IX2 target retirement, CSS feedback state, mobile blur retirement |
| Shared disclosure | 1.1.0 in live head | Reusable expanded-state observation and shared chevron behaviour |
| Navbar loader | 1.0.0, pin `8dda1ef4d208309ee6715f4a122a2ee0196aa131` | Basic navigation before consent and safe enhancement handoff |
| Navbar enhancement | 1.4.4, same pin | Scroll visibility, surfaces, mobile text motion, desktop panels and image warming |
| Finsweet scroll-disable | 1.6.2 | Mobile navbar scroll locking |
| Webflow native navbar/dropdown | Published Webflow modules | Input, focus, ARIA, native main-menu overlay and slide |

The current footer runtime at `39648a92ae514e7a05bba9e90a469f58b6b20986`
does **not** contain a second active `tdb-nav-clear-cycle` implementation.
Older source files in the repository should not be mistaken for live duplication.
Shared disclosure is being developed elsewhere; future edits must use fresh
head/footer reads and preserve concurrent changes.

## What is working well

- One navbar root, 165 descendants and 34 links; no duplicated inline SVG paths.
  Four small mask embeds use the shared chevron/arrow assets and current colour.
- Migrated hamburger, chevron, dropdown-content and spacer feedback no longer
  depends on the old IX2 event bindings. Other components still use IX2.
- Webflow's native keyboard/focus behaviour is retained. Desktop checks passed
  for Services/Discover switching, ArrowDown navigation, Escape focus return,
  closing-panel inertness and scroll-lock release.
- The basic navigation remains available before consent. The loader waits for
  open menus to close before handing over to the full enhancement.
- Scroll handling is passive and coalesced with requestAnimationFrame. Cached
  state avoids repeated transform/class writes. The enhancement has no interval
  and no continuously running JavaScript animation loop when idle.
- Desktop animation reversal/cancellation and breakpoint cleanup are handled.
- Shared disclosure is already available to other components without requiring
  them to load the navbar enhancement.
- The 992px menu-collapse boundary and 768px mobile surface/scroll boundary
  express different existing behaviours. They should not be merged casually.

## 1. Correct menu-image delivery first

The two desktop menus contain 11 CMS photos: five in Services and six in
Discover. After consent and window load, an idle prewarm changes all of them
from lazy to eager, sets low fetch priority and decodes them in batches of two.
All 11 had loaded before either dropdown was opened in the desktop audit.

Their selected original files total **706,300 bytes**, approximately 706KB.
These photos were not reused by other image elements on the audited homepage.
Low fetch priority reduces competition; it does not remove the download or
decode work.

Six images have responsive alternatives but declare `sizes="100vw"`. At the
measured 1363px desktop viewport their visible cards were approximately
286px wide. Five images have no responsive alternatives at all; two of those
originals are 3840px and 3000px wide. The five non-responsive files account for
566,704 bytes of the total.

Recommended sequence:

1. Set `sizes` to reflect the actual responsive card layout and add appropriate
   responsive variants for the five missing sets. Retain high-density choices.
2. Check both menus at representative desktop widths and device-pixel ratios.
3. Then decide whether to warm only the relevant menu on hover/focus or another
   clear indication of intent, while protecting the approved first-open feel.

For context, the six existing 500px variants total 72,614 fewer bytes than
their originals. They are plausible choices for the measured DPR1 cards, not
a prescribed resolution for all displays. Additional savings from the five
missing variant sets have not been measured.

The browser uses `sizes` as the expected image slot width when selecting from
width-based `srcset` candidates; see [MDN responsive images](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images).

## 2. Consolidate state handling and fix two narrow inconsistencies

The enhancement is 23,014 raw bytes (6,214 with local gzip), including roughly
6.3KB of CSS stored in JavaScript strings. It constructs five MutationObservers
across separate controllers for translucency, open/closing state, clear cycles,
desktop panels and surfaces. This is maintainability debt, not evidence of a
currently expensive idle loop.

Use one consistent open/close state source to feed the existing effects and
shared disclosure API. Keep reusable disclosure and motion primitives separate
from navbar-specific scroll and panel behaviour. Avoid creating a framework or
extra script request solely to rotate a chevron.

Two specific cases were reproduced from the unmodified bundle:

| Case | Current result | Proposed correction |
| --- | --- | --- |
| Start at 448px, then widen to 1363px | Hover translucency handlers were never installed; they are installed only when initial width is at least 768px | Bind once and gate by current media query, or install/remove on breakpoint change |
| Close a mobile menu with Escape | Native closing still works, but the custom text exit animation is not triggered; the same fixture records two text animations for Enter on the menu button and zero for Escape | Drive the effect from the closing state so all supported closing inputs use the same motion |

The desktop panel controller itself responds to breakpoint changes. The first
case is limited to the hover treatment. The second is visual inconsistency,
not a broken Escape action. Verify both in a real browser/device with the fix.

Static CSS could be maintained as CSS while retaining any necessary early
inline feedback. Extracting it adds no automatic performance benefit and may
add a request. The fresh site head was **49,994 of 50,000 characters**, making
consolidation preferable to further inline patches.

## 3. Bring mobile scroll locking under the same ownership

The homepage still loads Finsweet scroll-disable 1.6.2: 9,461 raw bytes, or
3,971 bytes with local gzip. Its only `fs-scrolldisable-element` consumer in
the audited Home markup is the navbar's `smart-nav` root.

Desktop locking is already handled by the enhancement. Mobile locking still
depends on Finsweet. Its code also handles scrollable descendants, scrollbar
compensation and iOS touch boundaries, so deleting the loader alone is unsafe.

Move the required lock/unlock behaviour into an appropriate shared controller,
preserving menu scrolling, page position, touch behaviour and coexistence with
other overlays. Check every page for other consumers before retiring the
site-wide dependency. A central shared scroll-lock manager has not been
established by this audit.

## 4. Retire dormant IX2 authoring and the temporary migration bridge

Ten old navbar event bindings remain in the published IX2 configuration:
`e-298`, `e-299`, and `e-588` through `e-595`. Their event objects total roughly
6.8KB raw. The foundation detaches the three exact target handles while HTML is
parsed, preventing those old events from acting on the migrated navbar.

Remove these specific obsolete bindings in the authored project, verify the
result, then remove the ID-detachment bridge. Some associated action lists
(`a`, `a-2` through `a-6`) have other legacy target callers and must not be
deleted indiscriminately. `a-76` and `a-77` had no other event callers in the
audited published configuration.

This removes migration scaffolding; it does not remove the entire IX2 engine.
Webflow's native navbar/dropdown code and jQuery also remain dependencies.

## 5. Measure before changing the main animation geometry

Desktop panel transitions interleave style writes with computed-style and
geometry reads. Grouping reads before writes is worth examining during the
controller cleanup. An explicit `offsetHeight` flush also exists during the
mobile absolute/fixed scroll handoff; it is not executed on every scroll tick
and appears deliberate. Do not remove it without checking transition flashes.

Animating height/padding still requires layout whether authored through CSS
or the Web Animations API. A transform/clip redesign could change behaviour;
there is no measured frame-time problem here to justify it as the first task.
See [Chrome's forced-reflow guidance](https://developer.chrome.com/docs/performance/insights/forced-reflow).

The user's Android captures show the same fully open geometry in IX2 and
current modes: all four measured gaps are zero at a shared edge of 83.21875
CSS pixels (249.65625 physical pixels at DPR3). Current mode retires the blur
correctly. These observations do not establish the visual seam's root cause.
David subsequently approved the current staging result. Preserve the current
geometry and avoid adding another pixel overlap.

## Recommended next work

Start with responsive image sizing, then consolidate state handling and fix
the two narrow input/breakpoint cases. Fold mobile scroll locking into that
work after a site-wide consumer check. Retire obsolete IX2 authoring and its
bridge as a separately verifiable step. Measure animation performance before
attempting a geometry rewrite. Preserve current timings, easing, consent
behaviour, native keyboard/focus semantics and the approved motion policy.
