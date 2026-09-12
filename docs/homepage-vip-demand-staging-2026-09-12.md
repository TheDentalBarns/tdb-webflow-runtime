# Homepage VIP drawer demand preparation

Homepage Webflow page ID: `677cf86df9952f978d94d8a9`.

The homepage previously downloaded and initialised the drawer on `tdb:priority-ready`, even without interaction. The deferred UI CSS also brought its hidden form into layout. This pass leaves the homepage drawer at `display:none` until preparation and replaces automatic runtime loading with first actual scroll, VIP link hover/focus/pointerdown, explicit click/Enter/Space, VIP hash or restored scroll position. Other pages retain priority-ready preparation and VIP runtime pin `432ab3ab12553c9bbff97123453272ebde1ad6da`.

The small loader records direction during download and hands off the first eligible peek. The runtime preserves the original 120px upward / 140px downward / 50vh top-exclusion thresholds and native VIP form proximity suppression. A retained click opens once; persistent network failure on that click scrolls to the existing native VIP form. Preparation establishes hidden starting geometry before enabling transitions. No form submission is used for verification.

CSS remains consolidated in `tdb-ui.css`. On the homepage the seven drawer variables move from html to the drawer; other pages retain their original root values. The readiness custom property is registered non-inheriting, with initial value 0; consumers still check html for value 1. Browsers without @property support retain the prior inherited marker and work as before. Existing CSS parsing/download remains; no specific TBT reduction is promised.

Assets:
- UI and homepage-only VIP runtime: `5f162a629a8ee7f5c8a1e79dc5206429c22961cf`.
- Footer v1.4.0: `8b96b2cb5aa58bdef1d078002a88f4503bc49396`.
- Immediate v0.8.4-homepage-vip-demand pins that footer.

Webflow changes: update site UI and immediate immutable pins and manifest; append the following guard to homepage head only:

```html
<style data-tdb-homepage-vip-demand>
html[data-wf-page="677cf86df9952f978d94d8a9"] #tdb-vip-drawer:not([data-tdb-vip-prepared]) {
  display: none !important;
}
</style>
```

Validation: 31 Node/JSDOM checks pass against source and minified builds, including the existing 17 forms/slider recovery tests. New cases cover no-demand loading, cold clicks on desktop/mobile, keyboard intent, scroll handover, top boundary, nearby native form, reversed direction, restored scroll, desktop VIP hash, landing-page legacy loading and retry/fallback. Browser verification and GTmetrix measurements follow staging publication; simulated tests do not measure rendering or real network latency.

Rollback: restore global UI pin `87f6c34ef90d66430dd443246c41d9f82d94a3d9`; immediate pin `3d392f3a5bc4e1ab0ed775171aa9e0868d47d954` (footer `0cc87ff5e83d802a9cdffc27b757c071001af96e`); remove only the homepage style block marked `data-tdb-homepage-vip-demand`; publish staging only. Keep the existing tooltip consolidation and forms/slider recovery changes.

Production publication is not authorised by this pass.
