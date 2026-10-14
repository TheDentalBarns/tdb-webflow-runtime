# USP launcher native buttons — 14 October 2026

## Report and limits

David reported that the first USP tap on iPhone Safari and Chrome can flash, apparently reload, require a second tap, and sometimes jump to the top.

The exact iPhone flash was not reproduced. Desktop first-open worked before the change. Inspection confirmed all five authored launchers were navigation links with href="#" and type="button"; type does not change an anchor into a button. Before the consent-released runtime installs its handler, an anchor retains its fragment navigation default. This is a confirmed navigation hazard, not proof of the complete iPhone report's root cause.

## Change

In Home's Footer — Home (lazy USP), replace only the five launchers with DOM elements tagged button and type="button". Keep tdb-usp_launch, launch indices 0–4, accessible names and initial ARIA states. Move every existing icon, pulse and spinner child into its replacement, preserving their IDs. No runtime, asset pins, consent timing, drawer content, motion or shared scroll-lock changes.

Webflow's WHTML importer normalizes button markup to Link and span markup to Span; both attempts were removed before publication. Final elements were created using data_element_builder type DOM, then set_tag button. The final snapshot contains exactly five native buttons.

## Verification

- Published raw HTML: five button[type="button"][data-tdb-usp-launch], no href on any launcher; 2,306 total elements before and after.
- External script URLs unchanged.
- Current baseline loader suite: 14 passing checks.
- Desktop browser, cold drawer: first click showed busy feedback and opened Tranquil Location without another click.
- URL remained https://dentalbarns.webflow.io/ and scrollY remained 22527 through opening and closing.
- Closing released scroll lock and returned focus to Discover Tranquil Location.
- Enter on the fifth button opened Personalised Care; closing returned focus to that button and kept scrollY 22527.
- The first button retained its exact 44.75px square bounding box and x/y position, font, colours, border, padding and alignment.
- An actual iPhone retest is still required to confirm whether the separate flash/reload symptom is resolved.

## Publication

Staging only: 2026-10-14T17:55:49.829Z.
Publish task: ffe00151-7de1-4abd-92df-8fcaec74a56c.
All production domains still show 2026-10-01T10:10:45.669Z.

## Rollback

before.json records the original five Link controls, complete child trees and original link setting. after.json records the five replacement DOM button IDs. To revert, recreate the original Link controls with the recorded classes/attributes and link mode=url/to=# immediately before the matching new buttons, move the existing three direct children back into each Link, remove the then-empty native buttons, and publish staging only. Do not duplicate the child artwork or alter the preserved runtime pins.
