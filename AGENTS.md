# Motion during design review

David requested full motion throughout the site on 6 October 2026. Preserve
normal animations even when a device reports `prefers-reduced-motion: reduce`.
This includes drawer movement, slide transitions, fades, filter icon morphs,
loading spinners, pulses, tickers, marquees and native interactions.

Use the shared `TDBMotionPolicy.reduced` / `TDBMotion.reduced` decision rather
than adding component-specific reduced-motion suppression. Preserve existing
timings, manual pause/play controls, consent and lazy-loading behavior. Change
this policy or individual effects when David asks to tune them later.

Publish review work to the Webflow staging subdomain. Do not publish custom
production domains unless requested.
