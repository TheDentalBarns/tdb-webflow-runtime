# Treatment guide Cinema — staging v2.1.31

The treatment template keeps its five CMS titles, summaries and full chapter drawers. Phones retain a 40lvh image; desktop uses up to 60lvh, retaining at least 25rem for the content and controls on shorter screens. The lower area blends from black to the existing #222 charcoal. The shared native ticker displays only the current number at the top right. The five bottom numbers remain padded across the width. The underline fills continuously with vertical scroll, and each chapter changes at the next fifth of the track. Number clicks animate the line to the selected chapter using the shared motion clock.

Designer owns the 500lvh track, sticky 100lvh stage, responsive image/content proportions, native crop layers, typography and control placement. Each chapter now has its own natural title and blurb rows; only the CTA position stays fixed. The CTA sits 2rem higher than the previous trial, creating more space above the chapter numbers. Desktop has the existing 7rem section gap below the progress line (1.5rem within the stage plus 5.5rem after the track); mobile adds 4.5rem after the track for a total 6rem gap, in addition to safe-area/browser-bar clearance. Short-screen copy can scroll independently and resets to the heading on a new chapter. Existing Sweet Sans Pro and the site's standard text/button styles are retained. The small caps use the same .875rem/.0875rem brand treatment, with 55% cream for the softer hierarchy.

Horizontal images match the existing Treatments/Services carousel: a native 140% image crop with 30% compensating horizontal parallax, sharing the same duration and travel curve as the moving crop. A single native image strip keeps every crop in place during interrupted transitions. Images are predecoded at the existing proximity/intent gate; a jump retains the previous photo until every crossed image can paint. The loader awaits the same shared slider UI stylesheet used by Services/Treatments before Cinema mounts. Adjacent crops use the existing 20px tdb-treatment-blur layer and the exact shared --tdb-parallax-duration and control-easing settings; the current crop clears gradually. The strip samples its rendered transform before retargeting. Width changes cancel stale pixel animation matrices and restore the current native crop. The entrance image parallax remains independent on its parent and locks at the section pin. Images and headings travel; summaries use the shared copy fades; the existing CTA artwork tickers. The retired Scroll/Skip and total-count nodes and their unused trial styles have been removed.

The shared site-chrome controller moves all navigation/banner/VIP bars away as soon as the image enters the viewport and holds them away through the complete section and its final spacing. The module leaves wheel/touch scrolling native and does no idle animation work. Native Webflow tabs and details remain the fallback. Five optional image fields in Treatment Guide Summaries populate the native slots through the existing Treatments reference. Empty CMS image layers leave the Designer fallback photographs underneath visible. No CMS copy or draft status changes.

## Release and rollback

- Base runtime: `0d9eeefe08096d002261734431de9f082f57c45c` (2.1.19).
- Staging branch: `codex/treatment-cinema-20261118`.
- Native component: `5a45f055-97a1-453d-701b-d71c77ed23ec`.
- Rollback component (original structure; shared legacy styles must also be restored): `b2f4a1b3-8de9-3b64-bcde-a1d648f3d86d`.
- Exact original component tree, template bindings and site head/footer are preserved in the task's `before.json`. The release's Designer manifest records the changed native styles, added nodes and restoration actions.
- Restore the native classes, move each original details node back to its original teaser, move the original Tabs wrapper back to its original layout, remove only the inserted Cinema elements, remove `data-tdb-guide-cinema`, restore the old guide art to `display: block` and arrows to `display: flex` using the rollback manifest’s `styleActions`, and restore the four site runtime references to the base commit. Publish only the Webflow subdomain. Retain the backup component and uploaded assets for easy retry.

Do not publish custom domains as part of this trial. Do not replace or reset the repository branch for rollback.

To restore only the previous 40/60 trial, use `config/treatment-guide-cinema-flow-rollback.json`: restore its styles, move the five images back to the vertical parallax parent, remove the added photo crops and desktop spacer, then restore its four b76cccbc runtime references and publish staging only.

## Desktop width and ownership cleanup — 2.1.29

Desktop uses the existing `min(94vw, 90rem)` container for the photograph, text, CTA and number/progress strip. Image gutters are the native 2rem carousel gap. Two decorative native previews keep a blurred image visible at either end of the five-chapter sequence. Below 992px the image remains full width with no inter-image gap, and the accepted mobile text/control insets are retained.

`cinema-photos.js` reads native frame offsets and owns readiness and motion. `cinema.js` retains scroll/chapter selection, progress and site-chrome coordination. Both sources are assembled into the existing gated Cinema bundle; there is no additional script request. Width/gap changes cancel stale pixel travel. Number-click progress uses the actual resulting scroll position and ignores subpixel settlement, preserving its animation until a real scroll or another number click retargets it.

The native details fallback now has a Designer-owned reading panel; its external layout override is removed. Existing native typography and the shared card, ticker, motion and drawer modules remain in use. Full component trees and exact site code are private task backups; the repository retains the style/ownership contract and rollback actions.

For the accepted 2.1.28 presentation, use `config/treatment-guide-cinema-desktop-rollback.json`. Run its native restoration steps before either older rollback manifest. Restore all four runtime references together and publish staging only.

## Shared photo exit and treatment order — 2.1.30

The native Cinema media opts into `TDBMotion.pageBreaks` in opacity-only exit mode. Its existing shade supplies the stable native image height; the existing parallax inner receives opacity. The image stays fully visible through every pinned chapter, then fades with the portion of the image leaving the viewport. Reversing restores it. Horizontal travel, adjacent blur and vertical entrance retain their existing owners. No layout, font, duration profile or extra module request changes.

The shared opt-in `data-tdb-parallax-reset-start` restores an opacity-only exit surface whenever its fade progress returns to the fully visible start. This covers chapter-button navigation back from a partially faded exit and responsive re-entry; existing consumers retain their original restoration behavior. Cleanup restores the native opacity and the existing scheduler does no idle work.

The Treatments collection sorts descending by `sorting`. Composite Bonding changes from 6 to 9 and Dental Implants from 0 to 8; Veneers stays 7, making the first three Bonding, Implants, Veneers. Clear Aligners, Invisalign, Teeth Whitening and AIRFLOW retain their fields and relative order. Both existing drafts remain drafts. Only the two sorting fields are changed.

Rollback this pass with `config/treatment-guide-cinema-exit-rollback.json` and the private `before-exit-fade-order.json` backup. It restores the two sorting values, removes the new motion attributes and restores the four 2.1.29 install references together. Publish staging only.

## Native CMS photographs — 2.1.31

Treatment Guide Summaries now has Technology image, Process image, Aftercare image, Questions image and Practice image (five optional Image fields). The existing Treatments reference binds these to five native component image props. Both edge previews share the matching native prop. Seven native fallback images sit beneath the seven optional CMS layers and use the existing crop class. Empty CMS layers contain no source; the existing motion controller ignores those empty layers. Six existing treatment/chapter photos were carried into the new fields, including the AIRFLOW image previously selected in JavaScript. All other fields remain empty and reveal their fallback. The collection template remains excluded from publication.

There is no rich-text image lookup, treatment-name image mapping or JavaScript source copying. CMS/Designer owns the photographs and fallback selection; the existing module decodes and animates whichever native image is present, ignoring empty CMS bindings. CMS image alt text inherits from its asset; fallback underlays are decorative. Motion still waits for every crossed crop and edge preview before travelling. This replaces the initial component-default trial, whose published asset URLs included an invalid storage-bucket prefix. Fresh optional image nodes avoid its retained fallback values; fallback assets themselves remain unchanged.

The shared exit wrapper was recreated with the same native class because Webflow rejected attribute writes to its original empty attribute map. Both original child layers were moved intact before the empty wrapper was removed. Its replacement ID is recorded in the Designer contract; its dimensions and styles are unchanged.

`config/treatment-guide-cinema-cms-images.json` records fields, props and fallback layers. `config/treatment-guide-cinema-cms-rollback.json` restores static image bindings on the seven replacement nodes and removes their underlays without deleting newly added CMS data. Older rollback manifests use the replacement node IDs. Exact pre-change CMS/native/site-code backups remain private in `before-native-cms-images.json`. For a full 2.1.29 rollback, apply both CMS-image and exit/order rollback instructions before restoring all four immutable install references and publishing staging only.
