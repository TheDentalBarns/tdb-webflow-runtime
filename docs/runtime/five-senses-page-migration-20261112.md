# Five Senses standalone page — 12 November 2026

The [Five Senses Experience page](https://dentalbarns.webflow.io/five-senses-experience) now follows the current Dental Cost Calculator and Smile Gallery framework. Its experience section is the same shared Supporting CTA definition and dark variant used by First Visit and Nervous Patient Care.

## Native structure and ownership

Page `6aaafc00c9c28643c83637b8` now has a page wrapper, current Global Styles and transparent Navbar New, one semantic main, and the current shared Footer. Main contains the Resource hero and availability, the experience CTA, the existing belief/VIP strip, current booking background, Brand marquee, current countryside background and awards. The review boundary is around the hero; a hidden native feed configuration enables the shared review widget and drawer.

The experience uses “The art of feeling at ease”, “Every sense, considered”, the treatment-chair/headphones image and the existing Five Senses launcher. The instance link points to `/five-senses-experience`, replacing the reference instance's obsolete test URL. The belief strip's VIP link is corrected to `#VIP`. Both backgrounds use Service scroll media; the location's icons are the current tranquil, parking and discreet artwork.

Current component definitions include:

| Component | Definition |
| --- | --- |
| Resource page hero | `f9e1a59a-a134-eba5-e39c-da0cabd135da` |
| Resource availability | `e508917e-9b8a-04b9-5abe-16d96711be45` |
| Supporting CTA | `4893a05d-5e2e-8d3f-2721-eb585ca97082` |
| Brand marquee | `7970b7c2-f041-964c-3da5-86b5c377f3db` |
| Shared awards | `4c110b36-e067-748c-2cf9-153bf498a1c4` |
| Shared Footer | `4c8e5b24-0116-2a8d-4190-53cdd4860ef5` |

Nine retired page elements were removed: the old masthead, availability embed, introduction, separate launch section, mini footer, marquee, awards, footer and transparent-nav style embed. Both page head and footer custom-code blocks are empty. The compatibility stylesheet, bespoke standalone CSS, legacy Instagram bootstrap, separately pinned availability script and branding DOM rewrite are gone. The compatibility manifest now records native/shared ownership and generates no legacy feature snippet for this page. The final page-level tree has 17 nodes, including 12 component instances and no HtmlEmbed elements.

## Shared accessibility correction

The rendered sweep found that the marquee changed CMS list items into buttons while retaining their parent `role="list"`. Marquee 0.15.5 now changes the container to `role="group"` in the same initializer that installs the button roles, and remembers/restores its authored role during teardown. Original list items and noninteractive hidden clones keep the existing lifecycle. The native shared Brand marquee track has the accessible name “Partner brands”. Webflow's published CMS list roles remain valid before enhancement. No page-specific repair script or layout change was added.

## Release

All four shared install references use `006779da40a5c0c56f1e6c021d8af76aad9a740f`. The release contains the latest Smile Gallery work through `ada10c8ae288108ceda60bd1ed7c531588e7a0d1`, merged without replacing history, and the fetched main branch is already included. All 80 declared release payloads were fetched from jsDelivr and matched their committed bytes.

Only `dentalbarns.webflow.io` was published, with no custom domains selected. Final publication task: `7a4c81c5-d41d-4e2f-bfcc-8893bf3eb59f`.

## Verification

- Node 24.22.1: complete release build and patched Swiper check passed. Final `npm run verify`: 1,112 tests, 1,109 passed, three skipped, zero failed. The added regression covers valid marquee group/button ownership, clone exclusion, restoration of list/listitem semantics and remounting.
- Prettier passed for the repository source/tool scope using the CLI with `--end-of-line auto`; whitespace checks passed.
- Headless Chrome at 1440×900 and 390×900: navigation and Escape, live availability refresh, review content/filter open-close, VIP open-close and value preservation without submission, partner details and footer passed. No page errors, duplicate first-party script requests, broken visible image requests or horizontal overflow were found.
- Five Senses loads on demand, cancels and reopens, starts successfully, toggles all five controls, supports all-off/all-on, and restores scroll position and trigger focus on close at both widths.
- Fresh Essential only and Accept all choices both allow the experience. Neither the runtime nor experience modules load before a choice; the experience modules remain unloaded until activation. Saved choices start correctly on reload. No-JavaScript layout retains the hero, experience and footer geometry without overflow.
- Final desktop and mobile axe checks reported no violations in the tested ARIA, button-name, link-name, duplicate-id-aria and image-alt rules. Some rules returned incomplete/manual-review results. This is not a full accessibility certification or physical-device Safari test.
- Published source contains one H1, one main, one first-party script entry, one release SHA and no broken ARIA references or retired standalone hooks. Both page custom-code blocks read back empty.
- Shared regression on Home, Dental Cost Calculator and First Visit passed: the interactive brand strips use group/button semantics, partner details open and close, teardown restores native list/listitem roles and removes clones, and remount succeeds without page errors. Home's separate logo-only awards strip remains distinct from its partner-details strip.

## IX2 and page weight

There are zero `data-w-id` markers in source and hydrated markup, down from four. Resolving the 188 site-wide IX2 events against this page finds no matching targets; the live IX2 store has zero instances and zero event-state entries. Webflow still downloads the site-wide IX2-bearing bundle, so this is page-level retirement rather than removal of the engine from the whole site.

Captured HTML decreases from 119,086 to 104,789 raw bytes, and from 24,785 to 18,847 locally gzipped bytes. Source element count decreases from 923 to 779. These are source-size observations, not measured loading-time or Lighthouse improvements.

## Evidence and rollback

Before/after native readbacks, exact custom-code backups, HTML, browser reports, screenshots and CDN hashes are saved privately under `five-senses-migration-20261112` in the task workspace. Full site settings, HTML and CMS snapshots are not committed to this repository.

To roll back only the marquee release, restore all four shared install references to `ada10c8ae288108ceda60bd1ed7c531588e7a0d1` and publish staging only. Native page migration and the shared track label are independent of that release. A full page rollback requires its saved native tree and exact former page code. Revert repository changes with ordinary commits; do not rewrite history or reintroduce page-specific asset pins into the current setup.
