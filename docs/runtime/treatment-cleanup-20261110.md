# Treatment template cleanup

The horizontal treatment guide keeps the approved spacing, drawer and mobile behaviour. Its former hidden circular centre artwork and redundant pagination are removed from the component. The card enhancer works with the strip's own selection semantics and still accepts older circular markup for rollback.

Native icon mask URLs previously fetched all five small chapter assets during initial page load, including the invisible panels. The shared lazy-icon owner now releases section-level artwork variables at 400px proximity, after the existing consent gate. Matching guards ship in both critical and shared UI CSS; without JavaScript the native artwork remains available. Ticker clones inherit the variables, so changing chapters does not blank or re-observe the artwork. Drawer assets remain demand-loaded with the drawer module.

`config/treatment-template-cleanup.json` records the native Designer changes. The hero frame has an explicit 90% desktop width and cannot shrink before its image loads. Its overlay is anchored at the frame's top-left at 100% width, replacing flex static positioning. Tablet/phone widths remain native overrides. This addresses the image-dependent overlay position flagged in the user's CLS report without changing the final crop or layout.

The treatment template no longer includes `tdb-layouts-owned-0374b764c1.css` from a separate October commit. Four effective mobile sizing/spacing rules move into Designer; the other matching rules were duplicates, equivalent one-column tracks, or overridden by the newer disclosure combo. The empty Transparent Nav Styles instance is removed.

## Retained dependencies

- Native Webflow CSS, jQuery and Webflow's own runtime remain required for the existing native controls and CMS markup.
- Published treatment pages had no matching active IX2 event targets in the six-page audit. Webflow still includes site-wide IX2 configuration in its bundle and exports a dormant pricing-description `data-w-id`. This is not a claim that IX2 has been removed site-wide; global removal needs a separate audit of the other pages that still use those interactions.
- The shared Global Styles embed remains baseline utility/reset CSS, including focus guards, rich-text edge margins and visibility helpers. The small head styles are first-paint guards. They are not duplicated feature scripts.
- CMS drawer text retains its existing inline paragraph/list spacing. Navbar, partner controls and VIP integrations still inject their source-owned CSS through the unified runtime. These are explicit remaining cleanup items, not separate legacy JavaScript installations.
- Older circular guide code and compatibility outputs remain in the repository for historical consumers/rollback; the treatment strip loads the bar controller.

Full Webflow settings, native snapshots, rendered HTML and metric reports are private evidence outside the repository. Deploy only an immutable release commit to staging, with all four installation references updated together.

## Verification

A controlled delayed-image reproduction using the published hero markup and native CSS measured the reported overlay shift: 288px horizontally, with a layout-shift entry of 0.151875. The corrected native frame/overlay properties kept identical geometry before and after the image loaded, with CLS 0 and no shift entries. Fresh GTmetrix desktop runs happened to record CLS 0 before the correction as well, so those fast-load runs alone did not reproduce the race.

The complete build and verification suite passed: 1,043 tests passed and 3 existing tests skipped. The equivalent Prettier check passed using native PowerShell glob quoting; the npm script's POSIX single-quoted globs are not portable through Windows cmd. Checkout CRLFs were normalized for that check without changing unrelated source content.
