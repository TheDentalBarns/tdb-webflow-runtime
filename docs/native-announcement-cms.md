# Native banner v1.3.0 — staging pilot

Edit Webflow CMS > Banner Settings > Active banner, then publish:
- Signature Assessment title: complete first line, used verbatim, including icon/punctuation.
- Next Signature date + Next Signature UK time: calendar date + HH:mm in Europe/London.
- Signature availability text: lower line when no future slot is set.
- Smile countdown title: first line while the release date is in the future.
- Smile release date + Smile release UK time: deadline, converted for GMT/BST.
- Smile booked title + Smile booked action: first/second lines with a blank or expired deadline.

Pilot examples requested by user: Smile release Fri 25 September 2026 09:00 UK;
Signature appointment Tue 22 September 2026 09:30 UK. Not verified booking-system inventory.

Display: fixed 6rem height, padding-global, matching title/lower-row positions, smaller timer,
stationary circled up-arrow at the right. No pause control.
Two persistent panels travel left at 400ms (matching existing Swiper speed), reordered after
the transition for a continuous leftward loop with no opacity fade and no Swiper dependency.
Messages change every 8 seconds; hover/focus and hidden/overlay states suspend rotation.
Signature /services/fast-track contains one static panel. Other pages contain both.
Reduced motion skips panel/numeral animation.

Existing consent choice, timer-shell scroll thresholds, slider focus classes and VIP action retained.
The shell cannot paint before deferred shared UI CSS arrives; initial scroll state is synchronous.

CMS transport: native hidden data bindings on Home; other pages fetch the published
/banner-settings/active HTML once after consent and parse only inert data-banner-field text.
No API token, external settings service, font or extra runtime dependency.
The template is noindex and items are excluded from the sitemap. Failure/timeout uses fallback copy.
?banner-preview=countdown on staging selects the example preview item.

Collection 6aae66a4a90480deba7364b1; active item 6aae67a1e8b724b14bafae67;
template page 6aae66a5a90480deba7364b7; Home list 5fec2967-95a2-0a53-4153-f83bfe82b919.
Webflow's current headless tools cannot bind live CMS inside shared components. The abandoned
shared-footer list and temporary trials were removed.

Tests: verify-banner.cjs and verify-banner-cms.cjs cover consent, data loading, BST, missing
spring-forward hour, verbatim CMS copy, looping direction, expiry, mobile/desktop drawer routing,
slider hiding and page lifecycle. Browser QA covers published CMS output and panel geometry.

Old vendor countdown measured 1,673,497 raw / 461,460 local-gzip bytes.
Shared platform 44,147 raw /14,737 gzip may remain needed by other Elfsight widgets.


## Clock and slide merge (1.4.0)
Both circular controls use 3rem, matching the shared slider arrows. The decorative cream ring fills clockwise over the same 8-second dwell that schedules the 400ms leftward slide. Hover, focus, hidden shell and page visibility suspend both together, preserving remaining time. Signature-only pages retain a static message without a clock. No separate pause button or extra animation library.


## Integrated arrow progress and manual swipe (1.5.0)
The sole 3rem circle is the right-hand up arrow, with a thin progress ring in the shared orange-3 darker cream. Horizontal pointer dragging moves either way. A completed swipe or keyboard arrow navigation stops automatic rotation for the page visit and hides the progress arc, while the actual appointment countdown continues. Pointer capture and click suppression prevent a swipe from opening VIP; a later deliberate tap still opens it. Vertical scrolling and pinch zoom remain native. Signature-only pages remain static.
