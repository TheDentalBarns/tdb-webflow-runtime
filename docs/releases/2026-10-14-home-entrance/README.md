# Home entrance correction

Home page 677cf86df9952f978d94d8a9; staging only.

The essential UI rule disables animations with !important inside unenhanced navigation. It suppressed the Home frame's entrance while the native variant retained opacity:0. Explicitly protect the existing page-owned entrance, matching the Vimeo controls' existing protection. Timing remains 100ms delay and 200ms ease-out.

The poster's forwards-filled entrance was removed on data-vimeo-started, exposing native opacity:0. Add an explicit 1-to-0, 450ms ease playback animation, retaining visibility until completion. Existing playback readiness and 520ms removal stay unchanged. No player, permission, sizing, menu or spinner changes.

Apply head.html as the complete Home head custom code. Roll back with head-before.html. Check early nav before enhancement, poster playback handoff, and pause/resume.
