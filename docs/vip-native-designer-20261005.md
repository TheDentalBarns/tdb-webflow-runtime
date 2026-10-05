# VIP native Designer migration

The VIP shell, form controls, typography, colours, responsive geometry and arrow
states now live in Webflow's Footer / VIP Drawer Form components. The arrow uses
the existing Circle and Arrow component definitions used by Review Summary.

The shared UI pulse runs while the drawer peeks, until its first opening in the
current page visit. It is disabled for reduced motion. Only the inner arrow
rotates; the circle and pulse remain stationary. Native transitions preserve
the 420ms peek, 500ms drawer slide and delayed 300ms arrow rotation.

The disabled generated mobile runway is removed with the old stylesheet. The
existing 60vh space before the five barn windows is retained as the native
`tdb-vip-barns` mobile margin; it is visible and editable in Designer.

The loader skips `tdb-vip.css` for markup marked `data-tdb-vip-native="1"`.
Unmigrated markup retains the old pinned CSS fallback. The already loaded shared
UI supplies the pulse; opening VIP does not need to fetch TDBMotion or Swiper.
Home remains demand loaded; other pages retain their earlier preparation path.

Both VIP state-machine sources are copied byte-for-byte from deployed commit
71ff4c4. This preserves the distinct Home/legacy behaviour, nested consent guard,
scroll gesture replay, treatment preselection and mobile keyboard handling.
The focus layer now mirrors drawer and checkbox state onto native style classes
and retains focus trapping, restoration and background inert handling.

Small cross-component guards remain for navbar/banner hiding and the initial
Home demand gate. Form actions, validation, consent and attribution are unchanged.

Only the Webflow staging subdomain is published for this work. Restore snapshots
of the prior component trees, native styles and site/page code are retained
privately; no private custom-code snapshot is stored in this repository.
