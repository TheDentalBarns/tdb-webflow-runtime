# Post-fonts footer startup trial

Staging only. Replace the two global footer static script tags for consent and the navbar loader with one inline loader. Keep their existing immutable URLs and scripts unchanged. The loader waits for DOMContentLoaded, document.fonts.ready, an animation frame and a 50ms timer, then appends both classic scripts with async=false so consent executes first. A missing Font Loading API or animation-frame API falls back cleanly; a rejected font promise also releases startup.

The inline tag retains the consent tag's registry and base-URL data attributes while the HTML parses. Home's existing page footer can therefore update its pins. At release, copy those current attributes to the actual consent script and restore its data-cookie-script-js/data-tdb-consent-js markers. The inline tag does not carry those two runtime markers, so consumers find the actual external script. No page custom code, head code, CSS, feature pins or consent policy changed.

Source: src/startup/post-fonts-footer.js. Embed it inside the former consent tag, removing src/defer and its two runtime markers, and adding data-tdb-post-fonts-loader. Remove the old navbar script tag. This source is inline; it is not a newly requested asset.

Rollback: restore the saved global footer from TDB-Footer-Startup-Rollback-2026-10-14.zip and publish to the Webflow subdomain only. The complete prior configuration is saved privately, not copied into this repository.

Validation: an offline DOM integration check held requests until the font/frame/timer gates, verified ordered async=false scripts, one consent marker, preserved all configuration attributes and Home's final Instagram pins, and covered absent font/frame APIs and duplicate scheduling. Published HTML contains one inline loader and no static external tag for either startup script. Live desktop Services navigation opens/closes and cookie settings opens. No site warning/error appeared during these checks. These are not real-device iPhone checks.

Staging publish: d80ee955-a680-410b-bdf3-464853fffdc4.

GTmetrix London Chrome, 4G (9/5 Mbps, 125ms), video and the same request user agent: the baseline had first paint/LCP 1575ms, TBT 616ms, TTFB 559ms and CLS 0. The trial had first paint/LCP 1336ms, TBT 244ms, TTFB 454ms and CLS 0. Trial stylesheet UI ended at 1085ms, jQuery at 1191ms and both initial fonts by 1412ms. Consent and navbar requests began together at 2145ms, after first paint and font completion. Their body sizes and URLs are unchanged. This confirms the requested sequencing; the single-run score changes do not isolate a causal performance gain because server response and run-to-run timing varied.
