# Desktop dropdown surfaces — 6 October 2026

Base: active staging navbar loader pin `336d76648a3395fad41dd5bec9749b3554f14c34` (not the older main branch).

Native Designer adds four combo classes under `navbar10_dropdown-list`:
- `is-dropdown-clear`: transparent, no backdrop filter.
- `is-dropdown-frosted`: TDB Navbar Bar glass variable (84% cream), saturation 150%, blur 20px. The initial 75% menu token was changed in Designer after comparison with the strip; mobile's menu remains 75%.
- `is-dropdown-solid`: brand cream, saturation 150%, blur 20px.
- `is-dropdown-solid-clear`: brand cream, no backdrop filter, matching mobile clear-cycle behavior.

The initial surface release added these classes without changing layout, controls or tablet/mobile styles. The later opacity correction changed only the dropdown frosted token. Runtime applies these classes only while a desktop dropdown is live and removes them on closure/unmount.

The scroll controller exposes its existing clear/frosted context read-only, avoiding a second scroll watcher and avoiding hover/open classes being mistaken for scrolling. The panel controller reads computed native endpoints and uses the existing detail duration and mobile surface easing. Current computed surface values are captured before cancellation, so interrupted movement reverses continuously. Native target state remains until the closing movement completes. Background color is removed from the old inline appearance hold; geometry remains held exactly as before. Navbar strip logic and mobile motion are unchanged.

Deploy only the navbar loader's immutable URL, preserving all other current site code and module pins. Rollback restores that one URL to the base pin; the unused native classes are inert.

Verification: native state and shared peek tests pass (8 tests). Browser verification uses the real staging Webflow navigation, first with local runtime and matching native state fixtures, then with the published native classes and immutable runtime. Coverage: both dropdowns; top/scrolled; transparent Home and Transparent Dark Contact; interruption/switching; Enter, Escape and outside click; 1024/1280/1440/1920 widths; resize to mobile with surface/lock cleanup. Contact has `transparent-nav="true"`; this run did not cover a true Base/solid-nav page.

The final 84% comparison sampled opening and closing at 1440×900. Strip and dropdown colours matched on every sampled frame: 84%→100% on opening and 100%→84% on closing, with the same start time, 521ms surface duration and cubic-bezier(0.4,0,0.2,1). Panel reveal remained 620ms. These are viewport-specific measured timings, not replacement constants.
