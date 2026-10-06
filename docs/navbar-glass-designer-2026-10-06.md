# Shared desktop/mobile navbar glass

Built from the active staging pin `8fb72cf07dfa6cd48e14522d9ee6a7df78a69391`, not the older main branch.

Designer owns the reusable glass geometry at all widths, its transparent default, filter and background transitions, and native frosted/solid combo classes. The `TDB Navbar` variable collection owns Bar glass (84% cream) and Menu glass (75% cream). The existing brand cream is the solid surface. The native classes retain saturation 150% and blur 20px. Clear, frosted and solid classes can be inspected in Designer without running the controller.

`nav-surfaces.js` maps the existing state signals to those classes. It adds no scroll listener or layout measurements, does not control links or toggle ARIA, and avoids unchanged class writes. Desktop uses clear/frosted/solid header surfaces and the mobile detail fade clock. Tablet (768–991px) keeps its prior appearance. Mobile clear-cycle, solid opening and frosted closing keyframes are retained, with colors bound to native variables instead of duplicated literals. The mobile top opening still fills the navbar wrapper while its glass stays clear.

The existing navbar scroll controller, clear-cycle controller, native Webflow controls, desktop panel controller, image warmup, loading gate, dimming backdrop, focus handling, and height-based timing calculations are unchanged. Only the navbar loader URL needs repinning: it resolves the enhanced bundle relative to its immutable directory. Other runtime pins stay unchanged.

Validation: `node --test tests/nav-surfaces.test.cjs`, bundle syntax, build, diff checks; staging browser checks are recorded separately. No performance gain is claimed. This is an ownership and visual alignment change, not a performance tier implementation.

Rollback: restore the previous navbar loader pin and the saved native navbar style snapshot together. Preserve unrelated global custom code when replacing the one loader URL. The new unused combo classes and variable collection may remain for inspection until cleanup.
