# Treatment guide Cinema — staging v2.1.24

The treatment template keeps its five CMS titles, summaries and full chapter drawers. Phones retain a 40lvh image; desktop uses up to 60lvh, retaining at least 25rem for the content and controls on shorter screens. The lower area blends from black to the existing #222 charcoal. The shared native ticker displays only the current number at the top right. The five bottom numbers remain padded across the width. The underline fills continuously with vertical scroll, and each chapter changes at the next fifth of the track. Number clicks animate the line to the selected chapter using the shared motion clock.

Designer owns the 500lvh track, sticky 100lvh stage, responsive image/content proportions, native crop layers, typography and control placement. Each chapter now has its own natural title and blurb rows; only the CTA position stays fixed. The CTA sits 2rem higher than the previous trial, creating more space above the chapter numbers. Desktop has the existing 7rem section gap below the progress line (1.5rem within the stage plus 5.5rem after the track); mobile retains its safe-area spacing. Short-screen copy can scroll independently and resets to the heading on a new chapter. Existing Sweet Sans Pro and the site's standard text/button styles are retained.

Horizontal images match the existing Treatments/Services carousel: a native 140% image crop with 30% compensating horizontal parallax, sharing the same duration and travel curve as the moving crop. Adjacent departing crops use the existing 20px tdb-treatment-blur layer; the current crop is clear. Interrupted transitions sample their rendered transforms before retargeting. The entrance image parallax remains independent on its parent and locks at the section pin. Images and headings travel; summaries use the shared copy fades; the existing CTA artwork tickers. Scroll/Skip remain hidden.

The module leaves wheel/touch scrolling native and does no idle animation work. Native Webflow tabs and details remain the fallback. Existing chapter-body images populate their native slots; missing photos use managed clinic images, including EMS AIRFLOW for hygiene technology. No CMS copy or draft status changes.

## Release and rollback

- Base runtime: `0d9eeefe08096d002261734431de9f082f57c45c` (2.1.19).
- Staging branch: `codex/treatment-cinema-20261118`.
- Native component: `5a45f055-97a1-453d-701b-d71c77ed23ec`.
- Rollback component (original structure; shared legacy styles must also be restored): `b2f4a1b3-8de9-3b64-bcde-a1d648f3d86d`.
- Exact original component tree, template bindings and site head/footer are preserved in the task's `before.json`. The release's Designer manifest records the changed native styles, added nodes and restoration actions.
- Restore the native classes, move each original details node back to its original teaser, move the original Tabs wrapper back to its original layout, remove only the inserted Cinema elements, remove `data-tdb-guide-cinema`, restore the old guide art to `display: block` and arrows to `display: flex` using the rollback manifest’s `styleActions`, and restore the four site runtime references to the base commit. Publish only the Webflow subdomain. Retain the backup component and uploaded assets for easy retry.

Do not publish custom domains as part of this trial. Do not replace or reset the repository branch for rollback.

To restore only the previous 40/60 trial, use `config/treatment-guide-cinema-flow-rollback.json`: restore its styles, move the five images back to the vertical parallax parent, remove the added photo crops and desktop spacer, then restore its four b76cccbc runtime references and publish staging only.
