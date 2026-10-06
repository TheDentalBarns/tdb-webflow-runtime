# Owner/principal quotes — 6 October 2026

The owner quote carousel uses the existing shared Swiper controller through the
`owner-quotes` plugin. The native Webflow template owns its structure, typography,
colours, responsive spacing, focus outline and opacity transition states. The
module fills/clones that template from the existing CMS feed; it does not build
a replacement layout or inject a stylesheet.

## Ownership

| Part | Owner |
| --- | --- |
| Outer section, stationary quote ornament and generous vertical pacing | Existing native `Testimonial - Standard` component |
| Owner carousel layout and visual states | Native `.tdb-team-quotes*` classes |
| Page selection, metadata parsing, first-view and reveal coordination | `src/team-quotes/team-quotes.js` → `dist/tdb-team-quotes.js` 2.0.0 |
| Swipe, looping, interrupted movement and lifecycle | Registry-selected `TDBSwiper` and the existing custom engine |
| Width-dependent duration, reveal delays and attribution DD effect | Registry-selected `TDBMotion` |
| Counter movement | Registry-selected `TDBNativeTicker` (`tdb-ticker.js`) |
| Quote wording, author, role, tags, page, rank and active status | Team members CMS → Website Quotes |

The existing `Quote Icon` visibility prop selects the native owner carousel.
The `Stars` prop selects the original patient slider fallback, which its existing
review module can still enhance. The original three-slide slider is no longer
rendered in owner placements. Patient behaviour is otherwise unchanged.

The native first-quote/author preview uses the component's existing Quote 1 and
Author 1 props. Published enhancement always uses the Team members CMS feed.
Those preview props are not an alternative CMS selection mechanism.

## Behaviour preserved

- Initial 01, then the existing first-view move to 02 after 20% visibility and
  the shared 120ms entry delay. Its incoming copy is already opaque.
- 400ms copy fade; next/previous/settle delays of 100/140/60ms.
- Existing desktop width-aware duration and 400ms smaller-screen duration.
- Fixed ornament, 300px carousel minimum, and native 7rem/3rem ornament spacing.
- Existing counter placement, width, colour, typography and 400ms ticker motion.
- Swipe, keyboard arrows, looping, rapid reversals and full-motion policy.
- No continuing autoplay is added: the deployed v1.2 owner runtime only performed
  the first-view advance, regardless of the old fallback Webflow slider's settings.
- One selected quote has no visible counter. No relevant quotes hides that owner
  section. The patient review section remains separate.

Dependencies are prepared within 800px or on focus. Existing shared registry
canonicalisation owns their release and deduplicates them with other carousels.
If dependencies fail, the first selected CMS quote remains readable.

Swiper uses the native fractional viewport width, including fluid-rem widths, to
avoid introducing whole-pixel text-width changes. Its resize measurement updates
that geometry before recalculation. No other Swiper plugin is modified.

## CMS coverage verified

24 existing approved quotations were found (10 Keely, 14 David). Nine of the
original brief's 21 requested additions were already entered on 26 September.
All existing wording and metadata are preserved.

| Page | Present | Still needed for three |
| --- | ---: | ---: |
| Home | 3 | 0 |
| First Visit | 3 | 0 |
| Contact | 3 | 0 |
| Location | 3 | 0 |
| Cosmetic Dentistry | 3 | 0 |
| Nervous Patient Care | 3 | 0 |
| Restorative Dentistry | 1 | 2 |
| Hygiene Care | 2 | 1 |
| Signature Assessment | 2 | 1 |
| Smile Design | 1 | 2 |
| Dentist Near Me | 0 | 3 |
| Facial Aesthetics | 0 | 3 |

The remaining 12 require approved wording and attribution. The earlier brief
contains prompts, not approved final quotations. No new statements were invented
or inserted into the approved Website Quotes field.

The existing format remains H3 internal label, blockquote, separate `Tags:`,
`Page:` and `Rank:` paragraphs, and optional `Active: no`. Explicit Page wins;
otherwise only the first recognised routing tag is used. General topic tags do
not distribute quotes across pages. Rank sorts ascending and at most three
distinct active quotes are selected. Existing global deduplication is preserved.

## Verification and release

- Six selection/parser regression tests pass.
- Baseline versus native preview: 1440×900, 1920×1080, 1024×768, 768×1024,
  844×390, 390×844, 375×667 and 320×568. Layout and typography match; browser
  fractional-rem serialisation is allowed a 0.02px margin tolerance.
- Real shared-engine keyboard/loop/rapid reversal/ticker and destroy/remount pass.
- Mobile touch swipe, 0/1/2/3 quote cases, full-motion policy and dependency
  failure fallback are exercised using the built engine and module.
- Staging verification and the final runtime pin are recorded after publication.

Only the owner-quote script pin is changed in site head. Re-read site code before
writing it to preserve concurrent navbar, Services spacing and page-break work.
No shared engine/registry, review module or unrelated runtime pin is republished
from this branch. Publish the Webflow staging subdomain only.

## Restore

Restore the head quote runtime to
`0881f9844f13896277fc7f1af86b50f31bd42645/dist/tdb-team-quotes.js`; make the native
owner root (element `536a6540-55f4-2d70-a6e1-4382a83c2f11`) visibility false;
restore the old slider (`63ba1868-94c4-a7b9-6bcc-74f1cf9b4240`) visibility true.
The component definition is `1990b614-0683-4442-6cbf-edcf6aaeaa52`.
The global pinned v1 script suffices; the retired duplicate component loader
is unnecessary. Publish staging only. Existing CMS content needs no restore.
