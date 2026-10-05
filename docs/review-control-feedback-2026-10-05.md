# Review opening control feedback

The native Review Summary now consumes the shared control effects in `tdb-ui.css`.
The existing circle outline and native arrow direction remain; the arrow no longer rotates on opening. A separate cream fill uses
the same 2.4s alternating opacity pulse as Vimeo. The pulse stops while opening or
open and resumes when the drawer closes.

An explicit opening request sets `data-tdb-loading` on the card. Shared CSS hides
only the arrow content and shows the spinner immediately on every activation. The
same arc artwork and 1s rotation as Vimeo are used; this SVG rotates through CSS
only while loading. It has no continuously running hidden SVG animation. The spinner stays visible until the drawer opening completes, including when the
drawer is already prepared. There is no artificial wait before opening. Errors/cancellation restore the control, and later activation
can retry. Repeated clicks while waiting keep one opening request.

The small review loader now also catches activation before the introduction module
finishes downloading. It enables the card after the existing consent-decision gate,
including keyboard activation, and transfers the request without replay at mount.
No new module, external request, Webflow interaction or tracking permission is added.

## Designer changes

Review Summary component `50534c54-e1ae-0ff8-0bc0-38fd7b938d5a`, inside the existing
`review-summary_arrow` node `1bb6a0f2-1460-1b13-a555-c3c9a9d24fba`:

- Pulse `cdde6caa-b376-6f6e-99b9-11f330b6d361`: `tdb-control-pulse`,
  `data-tdb-pulse=true`, decorative. Absolute full-size circle, brand orange-1 fill,
  opacity 0 and no pointer events as native defaults.
- Content wrapper `f5136c76-5a13-aedf-f662-bb2d17986d9d`: `tdb-control-content`,
  `data-tdb-loading-content`, decorative. Relative centred flex; contains the
  unchanged Arrow component instance `3d7ca069-d85e-3dea-67fc-a9e8d3666fb8`.
- Loading artwork `e0ebb4a9-7a6a-2ef6-04f4-164e2cdb4fab`: HtmlEmbed with the SVG arc
  (currentColor), `tdb-control-loading`, `data-tdb-loading-indicator`, decorative.
  Absolute full size, native opacity 0/visibility hidden/no pointer events.

Circle instance `7820f837-eb5c-0c1a-26e4-c5acb08c665b` is unchanged. Card dimensions,
text, CMS bindings, arrow rotation and drawer/filter behaviour are unchanged. All
new classes are reusable; no layout/colour styles are injected by JavaScript.

Publish scope remains the Webflow staging subdomain. Move only the shared UI CSS
and Home review-loader pins after incorporating the latest drawer release. The
drawer release preserved for this change is `547debc007e7e25c1388460ab29c022e80844e95`.
Other site script pins remain independent.

`tests/review-control-feedback.browser.cjs` covers ready, slow, early keyboard tap,
failure/retry and withdrawal/regrant using real loader/introduction/CSS and delayed
dependency doubles. It checks immediate spinner feedback when ready, no control movement,
one opening under repeated activation, and pulse/spinner cleanup. Existing review
loader preparation tests also pass. Check the native published page separately.

Rollback: return the CSS and Home loader references to their previous releases;
move the unchanged Arrow instance back into `review-summary_arrow` and remove the
three new decorative nodes. Do not replace the whole head/footer or roll back any
independent drawer fixes.

## Filter close loading handoff

Selected reviews finish rendering before the loading spinner fades out. Its rotation
continues throughout the 120ms shared fade-out so it cannot snap back to its starting
angle while visible. The stationary X then uses the shared 350ms fade-in; only after
that completes may the existing drawer reverse, X-to-filter morph and floating-button
fade proceed. Selection remains locked through this handoff. Cancellation clears
owned fades and invalidates the pending close; reduced motion skips their duration.
The selected-count badge is not part of either fade.
