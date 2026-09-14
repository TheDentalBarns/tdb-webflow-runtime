# Slider CDN delivery — 2026-09-14

The approved staging slider runtime v0.5.0 is promoted byte-for-byte from the inline Webflow footer into its source and CDN artifact paths. Infinite loops, counters, rapid inputs, clone card interactions and first-view advancement are unchanged.

Subsequent release commits pin the footer loader to this artifact and the immediate loader to the new footer. Webflow staging must use full immutable commit SHAs. Custom domains remain on their previously published release.
