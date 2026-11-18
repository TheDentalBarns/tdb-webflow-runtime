# Consent choices when browser storage is unavailable

Release 2.1.19 fixes a consent startup failure that can leave the journey map
showing only its native “The Dental Barns · Lichfield” placeholder. This is a
reproduced failure mode consistent with the reported in-app-browser symptom,
not a confirmed diagnosis from a physical Gmail or Instagram browser.

Previously the native banner wrote a cookie, then immediately reread it to
answer every permission check. A browser silently dropping the write made
either explicit choice appear undecided. A throwing cookie getter could also
abort foundation startup. The journey loader consequently never started.

The banner now retains the explicit choice in memory if the existing cookie
persistence fails, and continues safely if access is denied. Successful writes
return to live cookie reads, preserving cross-tab updates and cookie deletion.
The current choice overrides a stale readable cookie when permission is
withdrawn. Returned categories are copied, so callers cannot mutate the choice.
The shared saved-choice parser returns undecided when reading storage fails.

Both Accept all and Essential only still release the local runtime after the
banner finishes closing. The journey map works with either choice. Vimeo and
analytics retain their separate category checks. Withdrawing targeting after the
Brevo tracker has started retains its existing page reload, so the map returns
under Essential only but an entered journey is reset. No permission is inferred
before a choice, no third-party setting is relaxed, and no alternative storage
or tracking mechanism is added. A new document asks again if no choice could be
persisted.

`tests/consent-storage.test.cjs` covers discarded writes, denied reads/writes,
Accept/Essential-only/withdrawal, stale accepted cookies, immutable returned
state, later cross-tab changes and a fresh document. It runs against source, the installed foundation
bundle and the compatibility consent bundle. Existing journey tests cover map
and routing under essential-only permission.

Published to staging at 11:06 UTC on 18 November using commit
`0d9eeefe08096d002261734431de9f082f57c45c`. All 86 declared CDN assets match Git;
all four install references use the same commit. Build, Swiper, generated parity
and formatting pass. The suite has 1,275 tests: 1,272 passes, three existing skips
and zero failures. Twelve storage cases cover source and both built entry paths.

At 390×844, saved Essential only loaded the map and calculated a journey from
Lichfield (10 minutes / 4.6 miles in that test). No Vimeo frame or console error
was present. The Home campaign still settled at viewport top zero with an 844px
panel, dark navbar and poster fallback under Essential only. The prior full
consent check also loaded the map; withdrawing targeting confirmed the existing
Brevo reload and map restart. Production publication timestamps remain
14 November at 15:29 UTC.

No physical Gmail or Instagram browser was available. Restricted cookie access
is covered by deterministic regressions, and the mobile layout by the browser;
neither establishes that every in-app browser restriction has been reproduced.
