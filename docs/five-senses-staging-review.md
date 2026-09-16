# Surgery proof — staging review, 16 September 2026

Page: https://dentalbarns.webflow.io/five-senses-test

Runtime pin: `04e98df0b92f2a5b53d42b2ab978b1d9681c0a83`.

Branch: `codex/five-senses-surgery-20260916`.

Published to the Webflow subdomain only. All four production domain publish timestamps remained `2026-09-12T19:20:19.204Z`. Shared site head and footer custom-code contents compare byte-for-byte equal to the pre-build copies. The new page is excluded from the sitemap and has a noindex directive.

## Verified

- Hosted photographic assets, CSS, JavaScript and both audio tracks return HTTP 200 with appropriate content types and cross-origin access.
- Corrected Webflow's native class registration, then inspected the styled desktop and 390 × 844 mobile entry pages.
- Five sense circles span the desktop's 3vw gutters and remain fully visible in the 390px iframe viewport. The original 3:4 framing is contained without extending the image.
- Inspected the warm state, clinical material state and combined visual OFF state. The latter removes the plant, headphones and bottle and shows the clinical flooring, cabinet, chair and sharps bin.
- Captured the mobile transition in progress: the new brown chair and wooden cabinetry are inside the expanding soft mask while the old blue headrest and clinical counter remain outside it. Both states occupy the same composition.
- First Sound activation reaches a running AudioContext and removes BEGIN. The conventional/calm toggle changes state. Close during a transition removes the dialog and returns focus. Reopening starts Sound uninitiated again.
- Arrow keys move focus between sense controls; Escape closes the dialog; opener focus and document overflow are restored.
- Unit checks passed for visible/pending state separation, rapid-input coalescing, cancellation, and close during audio decode preventing late source starts.
- The test browser reports WebGL unavailable, so live browser rendering exercised Canvas 2D, including its feathered destination-in mask. Separately, both unchanged staging GLSL shaders compiled and linked successfully in a local GLES context through EGL 1.5.

## Review limits

The 390px check uses a real iframe layout viewport, not a physical phone. A physical Safari/iOS/Android pass, real-device GPU performance, reduced-motion system-setting exercise, and final assistive technology review remain before production. This is a photographic and interaction proof with synthesized original audio; final retouching and approved sound masters remain part of production asset work.

No Reception or Lounge scene has been built.

