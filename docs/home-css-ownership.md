# Homepage CSS ownership consolidation

This release removes repeated global style overrides while preserving the effective homepage runtime, including its page-level pin overrides. Deploy to the Webflow staging subdomain only.

| Owner | Rules / behavior |
| --- | --- |
| Designer | Body cream background, native masks, priority/data-source hiding, quote initial opacity and visible/static variants |
| Critical head | Canvas background, existing font smoothing/appearance reset, exact responsive root font scale, treatment sorting startup guard |
| Existing navbar loader | Native disclosure and navbar state CSS, unchanged Disclosure 1.2.0 / Navbar Native 1.1.1, phone orientation policy |
| Existing shared UI CSS | Arrow/link/pressed states, announcement states, reveal variables, rich-text formatting, DD fallback and empty quote-section guard |
| Existing footer runtime | Shared arrow selection API and delegated feedback; navigation remains owned by each carousel |
| Existing partner module | Partner-specific control CSS and shared selection API; preserve the deployed card warm-up fix |
| Existing VIP module | Small shell integration rules installed before the drawer initializes |
| Existing Five Senses loader | Transparent backdrop and existing audio styling; install shell CSS synchronously on first open |

The homepage's own critical head code, parser-time DD/page-break restoration, consent startup, gallery/motion/review pins, form attribution pin and submission behavior remain in place. The two native quote base classes change opacity from 1 to 0; their existing visible/static combinations and script-failure fallbacks remain available.

## Release baseline

The published homepage overrides the global footer and partner pins with `996e193a99b2f2f8a1ef43b80e064802ae0708b1`. Preserve that revision's VIP scrolling, partner warm-up and home anchor settlement. Global navbar enhancement stays at `7f4230b6dd376820e4d524b5df49694f8501c84d`; the bundled scroll lock uses the same 1.0.2 implementation already supplied by the unchanged consent startup. Announcement stays at `bd1bde66f6624d7c653eb6e29afb3f3c6acfaeb7`. Five Senses controller and feature CSS stay at `c847ee9841b79a6749c39eb482d0c91c23f38ec0`.

Repin the existing UI CSS, navbar loader, footer runtime base, partner module and homepage Five Senses loader. Update the homepage's runtime/partner overrides as well as the global defaults. Do not replace the page's other reliability pins. No additional script or stylesheet request is introduced.

## Validation

Run with jsdom 26.1.0 available on `NODE_PATH`:

```sh
node --test tests/home-css-ownership.test.cjs tests/home-snags.test.cjs tests/vip-panel-motion.test.cjs tests/navbar-runtime.test.cjs tests/five-senses-entry.test.cjs
```

28 targeted checks cover independent arrow pairs, disabled/inert controls, keyboard disclosure, focus return, native navigation and consent handoff, scroll-lock ownership, viewport changes, measured close motion, rapid reversal, anchor settlement and cancellable/direct Five Senses entry. The navbar fixture completes DOMContentLoaded because the loader now contains the parser-lifecycle foundation.

The cleanup reduces global inline CSS from 21 style blocks / 13,702 bytes to one 605-byte block. This is an HTML/ownership reduction, not a measured claim about real-device loading time. Keep the homepage's own initial layout and hidden-state CSS in the head. Vimeo permission-state styling remains in the existing shared UI bundle because it is needed before the permission-gated player controller.

## Rollback

Restore the saved global head/footer and homepage footer; restore `tdb-team-quotes_content` and `tdb-team-quotes_byline` base opacity to 1; publish only the staging subdomain. The original and replacement custom code and exact pin map are saved in the task's rollback archive. Reverting the GitHub branch alone does not change immutable CDN pins.
