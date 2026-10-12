# Consent text heights in Designer

David requested removal of the consent-only embedded fonts and a fixed text
reservation in Designer. This supersedes the earlier font-subset approach.

## Runtime and head

- Consent startup 4.0.6 removes the FontFaceSet check/load/decode wait. A fresh
  visitor's banner opens even if webfonts are unavailable indefinitely.
- Remove the `data-tdb-consent-fonts` style block and its preceding comment
  from the global head. Delete the obsolete font subset assets/build helper.
- Keep the two existing full-site Sweet Sans font preloads and calibrated
  local fallback declarations. The four native consent text classes use the
  existing primary font variable, shared with the rest of the site.
- Preserve consent categories, cookie persistence, focus trap/return, shared
  scroll locking, reveal/exit timing, and the synchronized cream surface clip.

## Native Designer styles

| Class | Breakpoint | Property | Value |
| --- | --- | --- | --- |
| tdb-consent-scroll, title, description, button | main | font-family | primary font variable |
| tdb-consent-title | main | height | calc(1.3em + 20px) |
| tdb-consent-title | tiny | height | calc(2.6em + 20px) |
| tdb-consent-description | main | height | 8.4em |
| tdb-consent-description | small | height | 7em |
| tdb-consent-description | tiny | height | 11.2em |
| tdb-consent-description | main | overflow-x / overflow-y | hidden / auto |

The heading reserves one line at wider breakpoints and two on portrait
mobile, plus its existing padding. Body copy reserves six, five or eight
lines respectively (100.8px, 84px, 134.4px at the existing 12px font size).
The fixed areas do not change height when the full site fonts replace the
fallback. Unusually enlarged or future longer body copy remains scrollable
inside its text area rather than overlapping the consent buttons.

Font glyph-advance checks covered widths 320, 360, 375, 390, 414, 430, 479,
480, 600, 767, 768, 991, 1363 and 1920px using the existing fluid root size,
padding, font weights and letter spacing. Native consent contract tests pass,
including a never-resolving font load, fresh/saved/legacy choices, cookie
categories, event order, focus, shared locks and rapid reopening.

Only the consent startup URL changes; all other runtime pins, custom-code
blocks, hero motion, and full-site font preloads remain unchanged. Staging only.

Rollback: revert this release's runtime change, restore the prior font block
and native font families from the preceding release, and remove the new
height/overflow declarations. Do not roll back unrelated staging work.
