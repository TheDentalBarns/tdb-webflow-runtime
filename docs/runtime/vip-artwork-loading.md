# VIP drawer artwork loading

The VIP Drawer Form component keeps its five native Image elements and their shared Webflow barn SVG. The `tdb-vip-barns` row starts with the native combo class `is-vip-artwork-pending`, which sets `display: none`. All five images retain `loading="lazy"`; hiding this row prevents the closed fixed drawer from making them eligible for the initial image fetch.

The unified VIP controller removes this class on first opening, before preparing motion. Initialization and the scroll-triggered handle peek leave it in place. Once released, the row remains present through closing and subsequent openings, preserving the existing native layout and animation. Other barn artwork on the page retains normal proximity-based lazy loading.

Deploy the native combo class and controller together to staging. Rolling the controller back also requires removing the combo class from the component row, otherwise its decorative artwork remains hidden. No new asset, startup request or independent script is introduced.
