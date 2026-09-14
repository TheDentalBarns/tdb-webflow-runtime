# Load feature styles with their modules

The global UI bundle still contained the entire VIP drawer and content-video playback styling, while the newly separated slider stylesheet was requested globally. This release keeps early UI in the shared sheet and requests feature CSS with its owning loader.

- VIP CSS: first real scroll or VIP intent on Home; existing priority-ready behavior on other pages. CSS and shared UI must be ready before the drawer is prepared, while script preloading can run in parallel. A first click is retained and opens once after loading.
- Slider CSS: existing 800px proximity or pointer/keyboard intent. Slider initialization still waits for shared UI, slider CSS and Swiper.
- Content-video CSS: requested only when the Vimeo controller finds a content player. The controller waits for this sheet on content-player pages. Home's hero/ambient-only path does not wait for the footer or content-video CSS.
- Feature URLs inherit the same immutable release as the shared UI link. Links are inserted after shared UI and retry in their original cascade positions. Readiness markers do not inherit into descendants.
- Hero initial styling and shared nav/VIP/Elfsight focus easing remain in their existing locations. Existing slide/card motion and Vimeo playback code are unchanged.

Caption first-frame fix: Designer's mobile opacity/20px offset did not cover larger widths, and the removed height guard had allowed the expanded layout before IX2 initialization. Set opacity 0 and the 20px offset on the native base class. Inline the small `src/styles/tdb-card-first-frame.css` guard in the critical head; it stops matching as soon as IX2 writes opacity, so AUTO height expansion remains available. Do not put a permanent height 0 on the native base class.

Validation: 30 loader/bootstrap tests covering dormant startup, first-click retention, CSS-before-JS ordering, errors/recovery, unchanged forms loading and hero independence. Parsed CSS declaration and first-frame guard checks are recorded with the staging release. Live publication and browser evidence are saved separately.

Rollback: restore the saved before-head and before-footer blocks together, remove only the newly added opacity/transform properties at the main breakpoint of `layout423_card-content-bottom` (retain existing mobile overrides), and republish staging only.
