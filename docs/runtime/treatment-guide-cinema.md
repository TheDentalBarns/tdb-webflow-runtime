# Treatment guide Cinema — staging v2.1.22

The treatment template keeps its five CMS titles, summaries and full chapter drawers. Cinema uses a 40lvh image above a 60lvh black content area. The shared native ticker displays only the current number at the top left; five padded, edge-to-edge chapter numbers sit at the bottom with an animated underline. The CTA stays in a fixed position while its existing artwork tickers. Images and headings travel using TDBMotion; summaries use the shared copy fades. Scroll/Skip are hidden for this revision.

Designer owns the 500lvh track, sticky 100lvh stage, 40/60 grid, native images, text, controls, sizes and typography. Shared CSS subgrid rows reserve the largest eyebrow, heading and blurb across all five chapters. On short screens the text region can scroll while the CTA and chapter numbers remain stationary. The stage reserves the large/small viewport difference and safe area below controls so mobile browser bars do not hide them. Existing Sweet Sans Pro, standard tagline, heading and small text classes are reused. No fonts are added.

The optional Cinema module maps native vertical position to five reading beats, handles numbered and keyboard navigation, and releases site chrome after the track. Image entrance parallax uses Designer-authored 12% overscan and reaches zero exactly at the pin; it remains locked throughout the chapters. The underline follows the shared travel clock and retargets from its rendered position. The module neither blocks wheel events nor prevents vertical touch scrolling. Native Webflow tabs and details remain the fallback. Existing chapter-body images populate their matching native image slots; empty chapters use managed clinic photographs, with EMS AIRFLOW imagery for hygiene technology. No CMS copy or draft status changes.

## Release and rollback

- Base runtime: `0d9eeefe08096d002261734431de9f082f57c45c` (2.1.19).
- Staging branch: `codex/treatment-cinema-20261118`.
- Native component: `5a45f055-97a1-453d-701b-d71c77ed23ec`.
- Untouched rollback component: `b2f4a1b3-8de9-3b64-bcde-a1d648f3d86d`.
- Exact original component tree, template bindings and site head/footer are preserved in the task's `before.json`. The release's Designer manifest records the changed native styles, added nodes and restoration actions.
- Restore the native classes, move each original details node back to its original teaser, move the original Tabs wrapper back to its original layout, remove only the inserted Cinema elements, remove `data-tdb-guide-cinema`, and restore the four site runtime references to the base commit. Publish only the Webflow subdomain. Retain the backup component and uploaded assets for easy retry.

Do not publish custom domains as part of this trial. Do not replace or reset the repository branch for rollback.
