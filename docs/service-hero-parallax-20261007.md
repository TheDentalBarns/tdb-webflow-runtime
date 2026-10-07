# Service hero migration

Services CMS template 6785071ede094cc233e0c72b, main-image wrapper
2814f9e2-9ed7-69c1-9bfe-2f9c3318870e. The shared page-break controller
now owns its main image transform and the image/gradient opacity. CMS Main
Image binding, inherited alt text, eager priority, logo and content remain native.

Attributes on the wrapper:
- data-tdb-page-break="service-hero"
- data-tdb-parallax-progress="image"
- data-tdb-parallax-from="0vh"
- data-tdb-parallax-to="2vh"
- data-tdb-parallax-fade-start="0.6"
- data-tdb-parallax-fade-end="0.8"

The image has data-tdb-page-break-image and data-tdb-parallax-fade. Its sibling
gradient also has data-tdb-parallax-fade. Fade is an optional channel in the same
scheduler; other page breaks/footer retain their movement-only behavior.

Movement spans the whole passage instead of the old 65–100% delay. First visible
position is retained and user scroll consumes its initial correction. No startup
tween or perpetual frame loop. Memory 1.2.1 restores both channels on reload.

Fade progress uses the stationary wrapper top and the image height, selected by
`data-tdb-parallax-progress="image"`. This preserves 60–80% timing independently
of native responsive wrapper padding/min-heights. It never reads translated
image top, avoiding transform feedback. Other wrappers retain their own progress.

Native class tdb-service-parallax-image replaces header138_image, with the same
80vh height/cover/50% 25% object position, now top -2vh to cover positive travel. Phone height remains 66vh at <=479px. A native min-height of calc(100% + 2vh)
provides sufficient crop if responsive wrapper padding makes 66vh too short;
that slightly increases the image height (and fade passage) where necessary.
Native tdb-service-parallax-gradient replaces Service Hero Gradient with the same
70vh height, stacking and gradient. This prevents old a-65 selector writes to
both channels without runtime style/class surgery. Original image ID remains.

Services Hero 2 (a-65) has a second legacy event target
c51b919f-c81c-f5bc-880a-0457b046b4ec. Its origin has not yet been resolved: do not
delete the global definition until that target and remaining old selector use
have been checked. Treatment Hero Animation remains a separate future migration.

Rollback: restore original image and gradient classes, remove wrapper/image/
gradient controller attributes, and restore the prior runtime and inline memory.

Validation: service browser fixtures at 1440x900, 834x1112, 667x375 and 390x844
cover first-scroll movement, idle stability, fade midpoint, image/gradient sync,
crop coverage, reload retention, revisit and teardown. Existing page-break browser
checks and 31 page-break-memory/DD unit checks pass. CMS binding re-read confirms
Services Main Image and inherited alt text retained. Staging only.
