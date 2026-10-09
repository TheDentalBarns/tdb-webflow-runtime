# Consent selector reflow — 9 October 2026

Base shared CSS release: `d3014987b2371e6945369c63940663b763a8d33e`.
Reported footer runtime: `39648a92ae514e7a05bba9e90a469f58b6b20986` (1.6.3).

Chrome tracing reproduced `pageshow` → `tdbReadPagePosition` → `scrollY`.
The old `[class*='cookiescript'] *` selector made a class mutation on `html`
invalidate its document subtree. In one mobile 4x-CPU trace the resulting read
forced 152.55 ms of style recalculation across 2,630 elements and 5.57 ms of
layout. The scroll reader was flushing pending work rather than creating all
of that work itself.

Replace the three class-substring selectors with
`:is(.cookiescript_pre_header, .cookiescript_header_actions)`, preserving their
specificity, descendant coverage and declarations. Keep the legacy ID rules:
the current in-house consent component still uses those IDs. Its root and
outer animation classes do not match either the previous or new selectors.

Only canonical `src/styles/tdb-deferred-ui.css` changes behavior. Rebuild with
`python tools/build-ui.py --global-only`; both generated shared UI files are
committed. No footer JavaScript or animation timing changes are needed.

## Validation

- Six existing footer geometry/demand-loading tests passed during diagnosis.
- Browser selector comparison: both versions matched the same 10 elements.
- Checked consent computed styles were identical on mobile and desktop.
- Alternating original/narrowed CSS on the same settled page, six root-class
  mutation + scroll-read measurements per variant, at 4x CPU throttling:
  mobile median 118.5 → 3.5 ms; desktop median 130.8 → 3.7 ms.
- A separate page-load trace with narrowed CSS restyled 120 elements in the
  reported call, taking 20.30 ms plus 1.53 ms layout. No global CookieScript
  selector invalidations remained. Load timings vary; these are local test
  results, not a promised field-metric or Lighthouse score improvement.

Update both shared UI URLs (normal and noscript) in Webflow site head, retaining
all surrounding code and independent release pins. Publish staging only.
Rollback: restore the two shared UI URLs to the base CSS SHA above.
