# UI CSS consolidation

**Historical rollout note — superseded.** For current Home ownership, read the [architecture standard](https://chatgpt.com/space/page_c22eaec26d7c819197df9524f243acbd) and [25 October review](runtime/home-structure-review-20261025.md). The current UI composition is `GLOBAL_SOURCES` in `tools/build-ui.py`. Navbar enhancement styles are composed into the deferred navbar controller from `tdb-navbar-state.css` and `tdb-navbar-desktop.css`; shared early control states remain in `tdb-navbar-control-states.css`. The obsolete `tdb-mobile-navbar.css` source was removed on 25 October. Do not apply the blocking-navbar rollout below to the current release.

The remainder records the earlier migration for historical reference.

This pass combines four previously tested stylesheets into one file:

- `tdb-elfsight-timer.css`
- `tdb-vimeo-ui.css`
- `tdb-runtime-ui.css`
- `tdb-deferred-ui.css`

The consolidated file is:

- `dist/tdb-ui.css`

## Kept separate

- `tdb-mobile-navbar.css`
- all inline first-paint Vimeo CSS
- the smile-gallery pre-sort guard
- the VIP drawer hidden guard
- typography and core navbar base rules

## Load order

The consolidated bundle preserves the existing order:

1. Elfsight timer
2. Vimeo interaction states
3. shared runtime UI
4. deferred UI, Lenis, CookieScript and VIP drawer

## Rollout

Remove the four old stylesheet links and replace them with one asynchronous stylesheet link:

```html
<link
  rel="stylesheet"
  href="IMMUTABLE_COMMIT_URL/dist/tdb-ui.css"
  media="print"
  onload="this.onload=null;this.media='all'"
>
<noscript>
  <link rel="stylesheet" href="IMMUTABLE_COMMIT_URL/dist/tdb-ui.css">
</noscript>
```

Keep the navbar stylesheet blocking for this test.

## Test

- Vimeo play, pause, loading and placeholder states
- Elfsight timer visibility and mobile navbar interaction
- VIP drawer peeking, opening, closing and form presentation
- CookieScript presentation and stacking
- sliders, fade-slide states and pagination dots
- submit button disabled/enabled styling
- Lenis smooth scrolling
- no flash or permanent hidden state

Confirm the four old CSS requests are replaced with one `tdb-ui.css` request.
