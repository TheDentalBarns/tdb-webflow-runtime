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

Staging verification and physical-device limits are recorded after publication.
