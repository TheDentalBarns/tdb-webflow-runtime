# Vimeo controls after declined consent

The functionality gate correctly prevents Vimeo assets from loading after an
essential-only choice. It also deferred the CSS that makes decorative hero
content transparent to pointer hit testing. In a browser, the content layer
therefore received clicks at the visible Play button instead of the control.

This release keeps the consent boundary and adds two targeted corrections:

- Place `dist/tdb-vimeo-critical.css` inside the existing early
  `style[data-tdb-critical-base]` in Webflow's site head. These pointer rules
  preserve interactive links/forms and allow hero control clicks before Vimeo
  CSS is available. They add no network request.
- Repin only the shared `tdb-consent.js` to v0.6.1. Its delegated denied-consent
  handler recognises the loading indicator, circular backplate and a stale
  pause surface, as well as Play. Permitted clicks retain the existing player
  handling, and a consent request retains the selected video for acceptance.

Validation: 26 Vimeo/consent tests and 20 owner-quote gate tests passed. Browser
checks against the staging markup with the candidate JS/CSS applied confirmed
that the real Play button and loading-indicator position reopen the native
banner after decline, including repeated decline and retry. No Vimeo assets
were fetched while consent remained rejected. No browser script errors were
reported in that check.

Rollback: restore the previous shared-consent pin
`4be6b841e19891d9dca5d0e8b41c11f2b13b3c2c` and remove exactly the critical
pointer-rule block. Do not overwrite the complete current head: the async UI CSS
trial, early logo preload and other site work are independent of this fix.

## Follow-up: keep the play pulse before consent

The prior click fix restored pointer access but left the pulse selectors inside
the consent-gated player stylesheet. Include the existing idle/playing/loading
pulse rules in the critical CSS too. They reuse the shared UI pulse keyframes
and retain the same 2.4-second opacity animation. This covers hero and content
videos without fetching the Vimeo controller, player CSS or Vimeo itself.
The pinned player CSS retains matching rules for compatibility; no loader or
shared consent pin needs changing for this CSS-only follow-up.

Deploy by replacing only the marked Vimeo block within the current
`style[data-tdb-critical-base]` with the rebuilt critical CSS. Roll back this
follow-up by restoring that block from commit
`1d859948eb2f5daee81e6f44e9536caec05573af`; preserve the click fix.
