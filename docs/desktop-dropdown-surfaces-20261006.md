# Desktop dropdown surfaces — 6 October 2026

Base: active staging navbar loader pin `336d76648a3395fad41dd5bec9749b3554f14c34` (not the older main branch).

Native Designer adds four combo classes under `navbar10_dropdown-list`:
- `is-dropdown-clear`: transparent, no backdrop filter.
- `is-dropdown-frosted`: existing TDB Navbar Menu glass variable (75% cream), saturation 150%, blur 20px.
- `is-dropdown-solid`: brand cream, saturation 150%, blur 20px.
- `is-dropdown-solid-clear`: brand cream, no backdrop filter, matching mobile clear-cycle behavior.

No existing class properties, layout, navbar controls, or tablet/mobile styles are edited. Runtime applies these classes only while a desktop dropdown is live and removes them on closure/unmount.

The scroll controller exposes its existing clear/frosted context read-only, avoiding a second scroll watcher and avoiding hover/open classes being mistaken for scrolling. The panel controller reads computed native endpoints and uses the existing detail duration and mobile surface easing. Current computed surface values are captured before cancellation, so interrupted movement reverses continuously. Native target state remains until the closing movement completes. Background color is removed from the old inline appearance hold; geometry remains held exactly as before. Navbar strip logic and mobile motion are unchanged.

Deploy only the navbar loader's immutable URL, preserving all other current site code and module pins. Rollback restores that one URL to the base pin; the unused native classes are inert.

Verification: native state and shared peek tests pass (8 tests). Browser verification uses the real staging Webflow navigation, first with local runtime and matching native state fixtures, then with the published native classes and immutable runtime. Coverage: both dropdowns; top/scrolled; transparent home and solid contact page; interruption/switching; Enter, Escape and outside click; 1024/1280/1440/1920 widths; resize to mobile with surface/lock cleanup. Results recorded after deployment.
