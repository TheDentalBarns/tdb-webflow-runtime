# Native consent startup v4.0.0

The existing CookieScript-compatible consent interface now controls native Webflow markup. It no longer injects a banner stylesheet or HTML after the immediate runtime has downloaded.

## Ownership

| Concern | Source |
| --- | --- |
| Layout, typography, colours, responsive sizing, hover and open states | Webflow component **Cookie Consent**, group **Privacy**; class prefix `tdb-consent-` |
| Authoring records | `src/consent/banner.html`, `src/consent/banner.designer.css` |
| Persistence, focus, consent API/events and close choreography | `src/consent/banner.js` |
| Shared navigation/banner scroll lock | `src/shared/scroll-lock.js` (`TDBScrollLock` v1.0.0) |
| Print, focus-visible and browser/compositing support | `src/styles/tdb-deferred-ui.css`, compiled into `dist/tdb-ui.css` |
| Early deferred startup | `dist/tdb-consent-startup.min.js` |

The Designer component ID is `06d85720-61d9-0314-2b7d-1202f52dd706`. One instance is placed directly inside Body on every existing page/template (56, including Home). The placement manifest is `consent-native-rollout.json`. Include this component when creating a new blank page; cloned pages already contain it.

The HTML import converted buttons to links. Both controls were replaced with native Designer DOM elements tagged `button`, with `type=button`, the original IDs, labels and style classes. Do not re-import them as Webflow link buttons. The surface and text need distinct combo names (`is-consent-surface-open`, `is-consent-text-open`); the backdrop uses `is-consent-open`.

## Startup and motion

A parser-discovered script in the site head loads the startup artifact with `defer`, ahead of the other deferred site controllers. It includes the existing shared scroll-lock implementation and the consent controller. The unchanged navbar loader retains its guarded copy as a fallback; both consumers use one global lock with independent owner releases. The banner does not wait for the full motion runtime or the immediate runtime batch.

Designer transitions preserve the 420 ms panel/backdrop motion and 350 ms text entrance after 70 ms. Panel/backdrop use the existing `--tdb-peek-duration` and `--tdb-peek-ease` tokens with the original fallbacks. The five-keyframe text exit remains in the controller; close completion, focus restoration and consent notifications remain at 470 ms. No independent reduced-motion opt-out was introduced during the full-motion review phase.

The later immediate runtime still loads the existing TDBConsent bridge and other independent modules. Its old CookieScript fetch is replaced by the already available native API. The footer runtime base pin is preserved.

## Compatibility

Preserved: CookieScriptConsent name, 30-day lifetime, legacy decision formats, category order, public methods/callbacks, event order, dataLayer update, saved-choice suppression, footer settings reopening, internal scrolling, background/key scroll blocking, focus trap and focus return. Banner HTML is hidden in the initial CSS and made inert when closed. Native buttons use their normal Enter/Space activation without a duplicate key listener.

Build: `npm ci --prefix tools/runtime-build --ignore-scripts --no-audit --no-fund`, then `node tools/build-consent.cjs`. Rebuild shared UI with `python tools/build-ui.py --global-only`. Contract checks use jsdom 26.1.0: set `TDB_JSDOM` to that module's path and run `node tests/consent-native.test.cjs`. The checks exercise behaviour; jsdom does not verify visual layout or actual touch physics.

This branch composes the deployed immediate runtime from `bd727015e0ced7493eb0760d0606ecad086cad56` with the deployed UI sources from `3f3184c4dc9fd50de1d168c7ef3c50f2a0a0110c`. Shared scroll lock comes from navbar release `221fa9a62782f4670345c2c23cc21d19227bd0b2`. The original injected controller was CookieScript `ea97057833ca7cce42f5a2e7d042720847ff773a`, v3.0.1. Other deployed module pins remain independent.

Publish to the Webflow staging subdomain only during review. This restructuring removes the late request/injection chain; it does not itself establish a measured LCP improvement.
