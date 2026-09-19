# Native announcement staging v1.1.0

Webflow CMS: Banner Settings (6aae66a4a90480deba7364b1).
Edit Active banner (slug active), then publish to the intended domain.
Smile release time: date/time with timezone. Blank or expired shows the waitlist.
Next Signature slot: optional date/time, formatted in Europe/London with DST.
Past slots automatically fall back to Signature availability text.
Other fields control countdown heading, waitlist action, Signature heading/availability.
Shared Footer contains a hidden Collection List and inert CMS embed; no client API or extra request.
Preview item is used only on dentalbarns.webflow.io when ?banner-preview=countdown is present.
Preview dates are examples, not booking availability. Set future dates in preview to retest later.

Signature Assessment /services/fast-track displays only Signature.
Other existing banner pages retain both offers in two eight-second message states.
Messages pause on hover/focus, when hidden, or using the pause control.
Existing 6rem height, consent choice requirement, scroll thresholds, VIP routing are retained.
Uses tdb-slider-focus / tdb-sg-chrome-away / tdb-sg-locked shared classes to hide with existing sliders.
Shell stays unpainted until deferred UI CSS and the original entry delay are ready.
Footer controller applies its initial scroll state synchronously to avoid first-paint flicker.
No real release date or next appointment is invented for Active banner.

Measured gzip (same local gzip implementation): old Elfsight countdown 461460 bytes, platform14737.
Native module 3849 bytes; footer net increase3197 bytes. Other Elfsight widgets can still need the platform.
Verification: verify-banner.cjs plus staging desktop scroll, slider, CMS preview and drawer checks.
