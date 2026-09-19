# Native announcement staging pilot — 2026-09-19

- Scope: replace Elfsight countdown content only. Retains tdb-elfsight-timer-shell, tdb-elfsight-shell and its existing scroll/nav/overlay controls.
- Footer base: ffb4177d594992c884a2221679e3245b76265a6f (v1.4.13). Only widget construction changes to TDBAnnouncement.mount, plus native module and v1.4.14 identifier.
- Immediate base: 15144e3414803974be24852368fa4b8a12303d9d. Only footer pin and version will change.
- Shared UI remains pinned at 48124a90eddd39bf4ae611d00b9fe80583b98872. Consent, Elfsight platform for other widgets, VIP, Vimeo, forms, sliders, navbar and other pins remain untouched.
- Retains 6rem minimum height and calc(24px + 5%) horizontal padding. Font inherits Sweet Sans Pro x; colours use existing TDB variables.
- Starts after a saved cookie choice or the existing CookieScript decision events; first mount retains 500ms delay.
- Default is current rest state. No future date/recurrence supplied. Set window.TDBAnnouncementConfig before footer loading, or TDBAnnouncement.configure({deadline: 'ISO timestamp with Z or explicit offset', title: 'Release title'}). null clears deadline.
- Timer computes from absolute time, changes only affected digits, pauses while hidden and stops at expiry. Reduced-motion disables number animation.
- Native content is bundled into the existing footer request; standalone minified module is retained as an optional build artifact, NOT an additional deployed script.
- Rollback: restore the Webflow immediate-runtime pin to 15144e3414803974be24852368fa4b8a12303d9d and publish staging. That immutable runtime still loads the original Elfsight banner.
- Automated checks: consent before/after rejection/acceptance and saved rejection, idempotence, expiry/rollover, hidden pause, desktop/mobile click routing, zero module network dependencies.
