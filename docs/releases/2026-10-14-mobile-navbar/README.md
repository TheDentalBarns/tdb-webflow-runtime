# Mobile navbar handoff — 2026-10-14

Staging only: https://dentalbarns.webflow.io/

## Cause and fix
- Basic mode sets Webflow duration to zero. Webflow consequently opens the menu inside its original header frame instead of moving it into the full-width overlay. The frame's relative positioning made the menu 351px wide in a 390px viewport.
- Designer: `.navbar10_container.is-nav-bar-frame`, medium breakpoint, add `position: static`. The navbar now supplies the containing block in basic mode. The desktop frame remains relative. Existing padding and child styles remain authored in Designer.
- Closing a basic-mode menu creates Webflow's Tram controller. It caches the computed inherited transition `none`. Later it builds `none,transform 600ms ...`, an invalid transition list, so the menu retains `transition: none` despite the duration being restored.
- Loader v2.0.3 discards only the closed menu's Tram controller through its public destroy API and clears its inline transition after successful installation. The next Webflow interaction reads the enhanced stylesheet afresh. No new timer, movement implementation, or easing.
- Loader pin: 1704f013937b3ebb406a6fed6f2338788fe4ded1/dist/tdb-navbar-loader.js (7382 characters).
- Enhancement, runtime, consent and Vimeo pins unchanged.

## Verification
- 19 navbar reliability/handoff tests passed, zero skipped; includes the current published Webflow Tram source and a basic-close -> enhanced-open regression.
- Workflow: https://github.com/TheDentalBarns/tdb-webflow-runtime/actions/runs/38572856453
- Staging at 390x844: basic menu x=0, width=390. Close, upgrade, reopen: native transform changes smoothly toward zero over its existing 600ms duration; text fades to opacity 1. Close retains the menu until slide completion, then removes the open attribute and hides it.
- Staging at 844x390: basic menu x=0, width=844.
- At 1280x800: frame position remains relative, mobile button display none.
- No production publication.

## Rollback
Restore the previous site footer from site-code-before.json and remove the medium-breakpoint `position` property from `is-nav-bar-frame` (inherit the original relative position). Publish only to the Webflow subdomain.
