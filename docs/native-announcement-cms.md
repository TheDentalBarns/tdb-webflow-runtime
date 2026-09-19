# Native banner staging pilot v1.2.0

CMS collection: Banner Settings (6aae66a4a90480deba7364b1).
Edit Active banner (slug active), then publish to the intended domain.
Use the calendar date fields with their separate 24-hour UK time fields.
The runtime converts Europe/London time with GMT/BST and rejects nonexistent spring-forward times.
Staging pilot: Smile Design Friday 25 September 2026 09:00 UK; Signature Tuesday 22 September 09:30 UK.
These are user-requested pilot dates, not verified booking-system availability.

Display: context above; date, waitlist action or countdown and upward arrow below.
Signature /services/fast-track stays static. Other pages rotate two messages every 8 seconds.
Pause has a separate 44px tap target and stops click propagation.
Hover/focus, hidden pages, slider focus and open drawers pause rotation.
The original 6rem shell, scroll thresholds, consent gate, VIP routing and numeric motion remain.
The button uses Webflow's existing padding-global class.

CMS delivery:
Home has native hidden CMS text bindings. Webflow's current tool surface cannot create live CMS
bindings inside shared components. Other pages read /banner-settings/active after consent,
using only inert data-banner-field nodes. No scripts from that response are executed or inserted.
The settings template is noindex and its CMS items are excluded from the sitemap.
No API token, extra library, font or external settings service is used.
A failed/timed-out settings read falls back to the waitlist/availability copy.
Preview query ?banner-preview=countdown on staging uses the preview CMS item.
Blank/expired release dates show waitlist; expired Signature slots show availability fallback.
The fetch is absent on pages with embedded settings, otherwise one per page load after consent.

Visibility fixes:
Initial scroll state applies synchronously; shell remains unpainted until UI CSS is ready.
Native shell responds to tdb-slider-focus / tdb-sg-chrome-away / tdb-sg-locked.

Verification: verify-banner.cjs and verify-banner-cms.cjs; staging scroll, slider, CMS date,
pause and drawer checks. Old vendor countdown: 1,673,497 bytes raw / 461,460 local gzip.
Platform loader: 44,147 raw /14,737 gzip, still potentially shared by other widgets.
