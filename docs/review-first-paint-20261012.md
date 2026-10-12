# Review card text expansion on initialization

The homepage's native CMS review cards reserved their final height already, but
their initial CSS clipped body text to six lines. The lazy controller then fitted
the preview to every whole line available in the reserved grid row. In Susie
Boggie's desktop card, that changed the visible text from six to twelve lines.

Use CSS `round(down, ...)` to apply the controller's existing cutoff from first
paint: `floor((available height - .5px) / line height)`. The `1lh` interval follows
the actual line height across fonts and responsive sizes. Browsers without this
CSS function retain the existing native overflow clip, without the six-line cap.
The JavaScript's measured inner preview and ellipsis remain unchanged.

The native Home CSS embed is authoritative:

- Site: `677cf86cf9952f978d94d80c`
- Page: `677cf86df9952f978d94d8a9`
- Embed: `17bdc95b-c17e-fdcb-d19e-537a72251777`
- Repository mirror: `src/styles/tdb-review-cards-native-states.css`

Only the `.tdb-review-cards_text` clip rule and its comment changed in that embed.
The existing card dimensions, CMS content, runtime pins, consent policy, lazy
loading, entry motion, navigation, and review drawer were retained. The repository
mirror has older arrow-state rules which are not in the current native embed;
they were not copied back into Webflow.

## Verification

Published to `dentalbarns.webflow.io` at `2026-10-12T17:30:46.070Z`.
The production domain publication timestamps stayed at 1 October.

In the staging browser at 1363px width, Susie's card was 721.9375px tall and its
text row was 293.046875px tall, both before and after initialization. The new
computed CSS cutoff was already present before a runtime preview existed; it
allowed twelve whole lines. The controller then fitted twelve lines into the
same row. The old CSS allowed only six. Published HTML and Webflow readback both
contained the new rule; the old outer six-line cutoff was absent. Desktop visual
inspection passed. Mobile devices and older browsers were not directly tested.

Rollback: restore the previous `.tdb-review-cards_text` rule from the parent
commit into that embed and publish staging only.
