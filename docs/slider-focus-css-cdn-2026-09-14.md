# Slider focus CSS delivery — 2026-09-14

The slider focus and Elfsight easing block v1.0.1 has moved unchanged from the Webflow global head into the existing shared UI bundle. The dedicated source is src/styles/tdb-slider-focus.css; tools/build-ui.py includes it once after the existing modules. The UI build workflow watches this source.

The original 24,048-byte UI content is preserved exactly. The new bundle is 25,517 bytes. There are no new stylesheet requests, imports or JavaScript changes. The older dist/tdb-slider-ui.css is already embedded in shared UI and should not also be loaded separately.

Staging must switch its main and noscript UI links to this release's immutable commit SHA, then remove the inline style[data-tdb-slider-focus] block. Keep the footer script[data-tdb-slider-focus] behavior controller. Its existing JS is unchanged. Motion remains 420ms cubic-bezier(.4,0,.2,1), and the focused Elfsight banner stays opaque while travelling, becoming hidden after 420ms. Reduced-motion overrides are preserved.

Publish only to the Webflow subdomain. Rollback restores the previous head and UI pin c868196ea7711143c3182090246124a6c79b86b5, plus the old UI SHA in the footer manifest; no branch movement is required.
