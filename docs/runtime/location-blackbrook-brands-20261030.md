# Location Blackbrook showcase and shared brand marquee

30 October 2026. Staging only. Runtime pins remain `83fe5389fe815eb86484b8663984d57cbcb13820`. Final content publish task: `6b6eed1b-7e3e-4442-8bb8-1e013af2f4ab`.

## Native ownership

Location Blackbrook now uses Home's Shared showcase carousel (`5e5b55f7-9a7f-d930-e0b9-f598c4c91772`) with its Light variant (`e1399f25-064c-5442-699e-599a1560515e`). Designer owns all three CMS rows, copy, geometry, colours and button visibility. Shared external carousel, readiness, masks and motion remain the behaviour owners. The existing page-break loader now recognises native treatment banners on secondary pages as well as Home, so the same shared vertical parallax applies.

The Blackbrook Retailers collection (`678a9501e48e15ea9e303a51`) owns images, names, descriptions, URLs and descending Sorting. All eight published images are WebP. Ranks 8 through 1 are wedding venue, LB's Coffee Shop, Primrose Flower Boutique, The Art of Wellness, Charlotte Christopher Photography, Caroline Bailey Bridal, Muse — The Studio, The Ladies Lounge. Studio 9 and Perfect Day Flowers are archived; the unconfirmed laser clinic is excluded. Caroline remains by user direction. Changes must be queued for the next site publish; saving the CMS form alone retains a draft change.

The business action is Discover partner, with the canonical globe and a specific accessible name. Native conditional visibility excludes the business action on Home and excludes the treatment action on Location. Home's original masked-arrow element was restored with explicit user permission, returning its original count. Home remains 1,133 native elements and 126 in the showcase; Location's eight-item showcase is 150.

The shared Details component (`ea1d8dcd-9447-09ff-7336-7571a932f7b6`), Native Details variant (`dd06bce4-6d0a-f859-3985-75b4c4d14e42`), owns the caption repair. Existing `.tdb-treatment-slide` now clips horizontal and vertical overflow so an inactive narrow row cannot leak its fixed-width heading over the active heading. Text inherits the variant colour: black on Location, white on Home. Existing shared caption emphasis uses opacity, preserving this colour. This correction adds no elements, runtime workaround, custom embed or IX2 binding.

## Brand marquee and optional details

The cleaned Home definition `7970b7c2-f041-964c-3da5-86b5c377f3db` is now named **Brand marquee**. Home and Location consume it. The older eager definition `abd36c7c-55aa-ac3f-edd0-cc4a4068eefc` is retained as **Legacy — Brand marquee** for its thirteen remaining consumers.

Location instance `1b38098a-ee02-e72e-67ad-d0cc8e266df9` retains the existing cream/sand appearance through Base; Home remains Dark. Both retain the existing twenty lifestyle logos and random shuffle. The existing boolean is renamed **Show partner details** (`4c8dfecd-e615-5884-76ec-07a39ee0b0d0`), rather than introducing a second component. Its native conditional binding controls the empty `.tdb-partner-stage` mount, with Keep in HTML when hidden unchecked. Off therefore excludes the mount from published HTML. The existing runtime's no-mount path centres/pauses logos without creating cards, scheduling pop-out preparation, or fetching pop-out content/modules. On retains the existing intent loading and CMS-derived Cloudflare feed. No new runtime is required for this toggle.

Location's initial marquee descendants reduce 290 to 46: twenty eager content sources are removed, saving 244 elements. Total Location changes 1,560 after the showcase migration to 1,316 after the marquee migration; the pre-showcase baseline was 1,548. No Home element is added.

## Verification and delivery cost

Desktop staging verifies the requested eight-item order in native HTML, black Location captions without the previous overlapping heading, white Home captions, correct partner links, shared masked actions and working lazy brand details/close. Build parity passed; the runtime suite passed 842 with three skipped. Subsequent caption clipping, naming, visibility and sorting changes are native-only. A focused fixture confirmed logo-only mode makes zero pop-out fetch/module/watch calls and creates no pop-out DOM. Physical Android/mobile verification was not performed in this pass.

Scoped initial delivery includes HTML, both native stylesheets and foundation/start/UI assets. Location changes 470,786 to 468,269 raw bytes, or 91,732 to 90,277 locally gzipped. Home changes 457,911 to 468,176 raw bytes, or 87,850 to 88,479 locally gzipped: native shared variants increase exported CSS despite unchanged Home DOM. Location HTML alone changes 186,164 to 172,360 raw bytes. These figures cover the full showcase-plus-marquee pass, not just the caption fix, and exclude other existing scripts, fonts, providers and images. No overall speed improvement is claimed. The marquee moves detail HTML and imagery from initial delivery to the established deferred module/feed phase; those bytes still exist when requested.

Four perspectives: startup removes eager brand detail sources while preserving Home DOM; in-page behaviour uses the existing shared carousel/motion; readiness retains native slideshow content and the existing lazy-card preparation; maintenance uses one main definition plus a visibility toggle. Native CSS export growth remains a separate optimization consideration.

## Remaining issues disclosed

The shared marquee has a pre-existing Designer/CMS category discrepancy. Its retained filter value is `a8209d5ad39fffe8c9db17d0df46105e`, which publishes the correct twenty lifestyle logos, but Designer labels it Clinical and renders an empty list. Bodum's unchanged CMS record also displays Clinical. Selecting the current Non-clinical choice writes `aca42530d0242f30c5c10eaa83c5afd9` and still produces an empty Designer preview. That trial was undone and the original filter verified restored; it was not published. Repairing the native category data and dependent consumers remains outstanding. No JS/CSS patch conceals this mismatch, and the migration is not described as full Designer parity.

An existing shared pop-out can also extend above a short viewport when its logo sits mid-screen. The current position calculation places the card above its anchor without viewport clamping. Content loads and closes correctly, but that position is a separate shared behaviour issue, not fixed by this native migration.

## Rollback

The retained Legacy marquee can replace Location's new instance before FAQ using the saved native backup and original instance values. The old Blackbrook definition also remains in the component library; restore its former position and CMS settings from `blackbrook-work/before-native.json` if necessary. To reverse only the caption repair, remove the two overflow declarations from Native Details; doing so restores the overlap defect. Content order and newly approved partners are independent user changes and should not be silently reverted. Any runtime rollback must coordinate all four pins and preserve unrelated concurrent map changes; a native-only rollback does not need a JS pin change.

Evidence is in the workspace `blackbrook-work` directory: before/final HTML, CMS/image sources, `final-cost-and-order.json`, `scoped-delivery-cost.json`, build/test logs, the logo-only fixture and `blackbrook-caption-fixed.png`. Private upload credentials are not committed.
