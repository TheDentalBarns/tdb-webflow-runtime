# Forms and slider loader recovery — staging

The deployed footer runtime disconnected forms and slider triggers before their
downloads completed. An explicit script request error also left its failed node
in the document. Later attempts could therefore be unavailable or wait forever
for an event on an already-failed script.

## Change

- Footer runtime `1.3.1`; slider loader diagnostics `0.2.1`.
- Only forms, the custom Swiper dependency and the slider runtime opt into
  recovery. Other loaders retain their current behaviour.
- Remove only the failed script created by the opted-in load call.
- Retry an explicit script request error once after 250 ms. Share one in-flight
  promise for each asset, including during this retry delay.
- Keep the existing intent, proximity and discovery triggers until success.
  After both attempts fail, a later user intent or proximity transition can
  start another bounded attempt. There is no recurring automatic retry loop.
- Retain successfully loaded dependencies. Do not retry a script merely because
  execution throws or a timer expires: replaying a partially executed runtime
  could duplicate effects.
- Consume rejections at event/observer entry points while preserving a rejected
  promise for callers of `TDBSliderLoader.load()`.

## Preserved behaviour

The forms, Swiper and slider runtime URLs stay unchanged. Forms still use the
600 px proximity margin, excluding `#vip-drawer-form` from proximity loading,
and respond to focus, pointer, keyboard, submit and VIP-link intent. Slider
assets still use the 800 px proximity margin and pointer/keyboard intent.
Global UI and Swiper remain parallel dependencies ahead of the slider runtime.
No feature CSS is added by the loader.

The slider runtime itself is unchanged, preserving its 100 px entry threshold,
autoplay-off behaviour, first-slide advance, text fades and arrow positioning.
VIP drawer logic, navbar behaviour, consent, attribution, Vimeo, Elfsight,
Lenis and smile-gallery sorting are unchanged. The tooltip consolidation is
retained and the rejected jQuery preconnect remains absent.

Keeping triggers connected while a request is pending is intentional. The
in-flight guard prevents duplicate loads; cleanup happens on success. This
avoids disconnect/reconnect loops when an element remains near the viewport.

## Validation

The tests use jsdom with a controlled resource loader; no patient submissions
or external asset requests are made. They simulate successful script loading,
explicit network errors, repeated errors, runtime exceptions, late intent,
proximity transitions and a UI-failure/Swiper-in-flight race.

```sh
cd tools/runtime-tests
npm ci
npm test
TDB_RUNTIME_FILE=../../dist/tdb-footer-runtime.min.js npm test
```

The relative override above is resolved from `tools/runtime-tests`. Use an
absolute `TDB_RUNTIME_FILE` path when running from another directory.

Minify using the existing workflow's Terser compression/mangling options.
The staging artifacts for this change were built with Terser 5.44.0.

## Deployment and rollback

Commit the footer source and generated artifact first. Point an otherwise
unchanged immediate runtime `0.8.3-recovery-footer` at that immutable footer
commit, then commit its generated artifact. Webflow staging loads the new
immediate runtime by immutable commit SHA. Keep all unrelated pins intact.

To roll back, restore the site's immediate runtime URL to
`298f8e02dbf3a0eb59e37a7bda2615f2a4d54685/dist/tdb-immediate-runtime-batch.min.js`
under `https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@` and
restore the manifest's footer SHA to
`c74e7c23a75b2afc10a39a974bfa7ead49b3f0c3`. Publish only the Webflow subdomain.
The previous immediate runtime already selects that previous footer runtime.
Keep the shared tooltip initializer and the rest of the footer unchanged.

This is a reliability fix. It does not claim better clean-run GTmetrix scores.
