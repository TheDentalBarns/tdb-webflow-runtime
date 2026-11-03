# Partner marquee rapid-navigation correction

Baseline: `ce7381fad208f2b5986731b729437d51aa34586b`.

The user reported the partner tooltip and moving brand temporarily losing sync
during rapid clicks, then catching up. Reproduced on staging Location with a
15-click burst: tooltip content passed Chapter Organics/Bodum while the marquee
passed RAK Ceramics, before both finally settled on DASH Water.

Swiper advances from its requested destination. The marquee instead selected
the shortest path from its still-moving visual position. Once rapid requests
put that position more than half a loop behind, the logos could reverse and
take a different route to the same destination.

The existing centre calculation now selects the route from its previous
destination while the open card is moving. Animation still begins at the
current rendered position, with the same shared duration and easing. No new
DOM, CSS, dependencies, Webflow embeds, touch handlers or animation loops.
The preceding map, badge and Safari touch protections are retained.

Validation:

- Regression covers 99 uninterrupted forward/reverse requests across multiple
  complete loops. It fails with the previous source and passes with this fix.
- Full build and checks: 878 tests, 875 pass, 3 existing skips, zero failures.
- Browser preview compares the content and logo actually nearest the centre,
  rather than only their destination attributes. Bursts of 15, 15, 18 reverse,
  and 26 forward clicks kept the same visible brand in both components.
- This browser check does not substitute for physical iPhone Safari testing.
