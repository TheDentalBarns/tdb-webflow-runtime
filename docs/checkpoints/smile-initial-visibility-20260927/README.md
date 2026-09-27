# Smile initial visibility v3.2

Deployed to dentalbarns.webflow.io only on 27 September 2026.

These are the exact shared Webflow `data-tdb-smile-card-design` style/script blocks. The early CMS values are hidden in head CSS; setup no longer adds the visible class. Text remains hidden through Swiper binding and appears after its first transition or deliberate skip settles. Pagination stays visible and retains its directional ticker. Price/time/doctor retain the existing hidden start. No padding or sizing changes.

Desktop browser validation captured title, treatment list, description, Before/After labels and three value slots at opacity 0 before initialization, with 01 and 11 pagination at opacity 1. After the first-view advance the active title, treatments and facts reached opacity 1 and the counter read 02 / 11. Before/After labels return to 0.7 and preserve their existing expanded-card hover behaviour. JavaScript syntax check passed.

For deployment or rollback merge only the named smile blocks into freshly-read site head/footer; preserve unrelated edits and keep each block below Webflow's 50,000 character limit. Do not add these as a second script; the live implementation is inline. This checkpoint does not change runtime asset pins.
