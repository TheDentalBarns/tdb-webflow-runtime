# Home seasonal hero — staging pilot

Webflow site `677cf86cf9952f978d94d80c`; Home page `6af752b08255837b44bbd82c`.
Native component: **Home — Seasonal hero** (`122b3699-c696-6015-dfe2-a8a0c73136e5`).
Home instance: `0aea8c9d-e128-5eab-dda9-c6a949f9fe7a`.

## Editing

- **Show campaign** enables the second hero and right-hand section navigation.
  Turning it off omits both from the published HTML, restores the normal first
  hero behavior and adds no empty scroll space. Publish to staging to preview.
- **Campaign image**, **Image description**, **Eyebrow**, **Campaign heading**,
  **Supporting text**, **CTA label**, **CTA destination** and **Campaign section
  label** are native instance properties. Copy and CTA work without JavaScript.
- **Use campaign video** defaults off. Set **Campaign Vimeo ID** before enabling
  it. The same image is the video poster; video uses the existing shared Vimeo
  consent, pause and lazy loading behavior. Its play button belongs to its own
  video shell. No new Vimeo player or custom playback implementation is added.

The initial image is the existing digital smile-planning WebP asset
`697a0c20536733e7ff791d25` (116,092 bytes before responsive image selection).
The campaign CTA points to `/treatments/dental-implants`.

## Ownership and motion

Designer owns the native sticky opening wrapper, ordinary-flow second panel,
image/poster, copy, buttons, styles and responsive layout. The existing shared
Hero — Vimeo instance and its assets stay intact inside the opening wrapper.
The new heading is an H2; this does not introduce another H1.

`TDBMotion.campaignHero` owns only scroll-driven copy translation/opacity, the
two About Us style markers, focus exclusion for covered content, and bounded
gesture snapping between the two heroes. It uses the shared frame scheduler,
motion policy/timing and Lenis scroll owner. The first background does not
parallax. Campaign copy is ordinary document content and scrolls with its image.
Released wheel/touch gestures settle onto a hero; scrolling below the campaign,
keyboard navigation, restoration and scroll-locked menus/dialogs stay free.

The existing navbar owner keeps the menu fixed over the complete hero stack.
Other pages, including About, retain their existing navigation behavior.
Normal Home page-break parallax excludes this stack while enabled and resumes
when its campaign panel is omitted. Runtime teardown restores authored styles,
ARIA state and inert state and removes gesture/timer/frame ownership.

No new inline head CSS or page-level custom code is required. No analytics,
form, content feed or production-domain settings are changed. The campaign
loads the existing shared motion module only when the native campaign exists;
there is no continuous animation loop when the visitor stops scrolling.

## Release and rollback

Runtime release 2.1.0 is based on the actual deployed immutable release
`55f76b394bf4aedfaba35ced87bf12631c07a70c`, not unshipped main-branch changes.
All first-party site script/style/preload references move together to the
same new commit. This pilot is published only to `dentalbarns.webflow.io`.

The immediate content rollback is **Show campaign = off** and staging publish.
The original single hero and normal runtime behavior then return. For a full
runtime rollback, also restore the preceding SHA in the global head/footer
release URLs and publish staging. Local before-code backups were captured.

Validation: `npm run verify` (build preservation checks and complete test suite),
including source and bundle coverage for logo movement/fading, unmodified
media/panel styles, reverse scroll, markers, gesture snapping, locks, lifecycle,
teardown and the off state. Browser checks cover desktop, tablet, phone and
landscape, native anchors, normal lower-page scrolling and staging publication.
The campaign-off native output was published and verified to omit panel and
rail while retaining the original hero before restoring the enabled pilot.
