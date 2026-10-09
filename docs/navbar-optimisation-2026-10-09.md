# Navbar optimisation following the 9 October audit

This release preserves the current native foundation and shared disclosure
head code. The live shared disclosure CSS had changed since the audit, so it
was deliberately not rebuilt from the repository's older source snapshot.
Production domains must not be published as part of this release.

## Runtime changes

- Navbar enhancement 1.5.0 and loader 1.1.0 use one navbar state observer for
  the basic/enhanced handoff, translucency, open/closing state, clear cycles,
  surfaces and desktop dropdowns. Native Webflow remains the state owner.
- Mobile text exit follows native closing state, including Escape, outside
  clicks and links. Reopening cancels the previous exit. Existing keyframes,
  timing, easing and the deliberate accordion spacer remain unchanged.
- Hover handlers are installed at every initial viewport size and gated by
  the current media query. Phone-to-desktop resizing now enables the treatment.
- A shared TDBScrollLock acquire/release API supplies the native mobile menu
  before consent and through enhancement. It retains locking until native
  closing completes, allows nested scrolling, blocks wheel/touch edge chaining,
  supports independent owners, and releases on pagehide/breakpoint changes.
  It does not reposition the body or write the document's scroll position.
- Desktop panel geometry and surface animation remain unchanged. Repeated
  computed-style reads are consolidated and bar height is read before writes.
- The eleven-photo idle warm-up is removed. Desktop pointer/focus intent warms
  only the chosen menu. Other images retain native lazy loading.
- The loader corrects menu image slot sizes before menus open or warm:
  100vw on narrow phones, 50vw through tablet, 22vw on desktop. These are
  conservative bounds for the existing one/two/three-column layouts. Browser
  device-pixel-ratio selection is retained. Authored CMS bindings are unchanged.
- Static enhancement rules are maintained in two CSS source files and included
  in the existing bundle at build time, adding no stylesheet request.
- Immediate runtime 0.11.6 no longer loads Finsweet scroll-disable for a navbar
  claimed by the native lock. A small consumer check retains the existing
  library if another authored consumer exists or the navbar loader fails.
  The independent footer-runtime base pin is preserved.

The consumer crawl inspected 15 accessible published pages, including reviews,
calculator, five senses, smile gallery, privacy and careers. Its observed
consumers were all the shared native navbar. Thirteen other requests failed at
the network tunnel; this is why removing every possible legacy fallback was
not justified. Native layout/markup are not altered by the runtime changes.

## Build and validation

Build with Node and terser: `node tools/build-navbar.cjs`.
Run the meaningful DOM fixtures with jsdom: `node --test tests/navbar-runtime.test.cjs`.

Ten checks pass: consent-pending locking; lock ownership and nested wheel/touch
boundaries; safe consent handoff; closing-state exit and rapid reversal; clear
cycle with keyboard-driven state; viewport hover transitions; image slots and
intent warming; desktop reversals and cleanup; Finsweet legacy fallback; and
pagehide/pageshow lock lifecycle. These are state/DOM tests, not an Android or
iOS browser paint/performance measurement. Real staging checks follow release.

Release commit: `221fa9a62782f4670345c2c23cc21d19227bd0b2`.
Staging-only publication: `8b95a7d6-eeee-4cbd-8091-2645d929b920`.
All three CDN files were fetched and matched the local build byte-for-byte
before updating the two footer pins and their comments. A fresh footer read
was merged and verified; the independent footer-runtime base and site head
were unchanged by this release.

The live 1363px desktop check confirmed all eleven menu photos initially
remained lazy, incomplete and without a currentSrc. Opening Services loaded
only its five photos and selected their existing 500px variants; all six
Discover photos remained unloaded until that menu was opened. The Finsweet
script was absent. Services/Discover switching, ArrowDown focus to About Us,
Escape return to Discover, outside-backdrop dismissal and final scroll-lock
release all passed on the published page. An open Services screenshot was
visually inspected. Physical Android/iOS verification remains a device check.

Build sizes (raw / local gzip): loader 7,233 / 2,674 bytes; enhancement
21,647 / 5,826 bytes. The former loader/enhancement were 3,101 / 1,356 and
23,014 / 6,214. Finsweet's 9,461 / 3,971 bytes are avoided on the migrated nav
path. The shared primitives increase the immediate loader; the combined
navigation dependencies decrease. No assertion about measured frame rate is
made.

## IX2 authoring cleanup completed

David removed the ten old navbar IX2 bindings in Designer and published them
to staging at 15:53 UTC on 9 October. The published IX2 configuration contains
199 events, none targeting the navbar root or its Services/Discover dropdowns;
all ten audited event IDs are absent. The three elements also have no authored
data-w-id attributes in the published HTML.

Native foundation 1.1.1 removes the exact-ID set and detachment loop. It retains
native state observation, spacer/hamburger state and the mobile blur lifecycle.
Deployment replaces only the navbar IIFE in a fresh site-head read. The live
TDBDisclosure 1.2.0 prefix and all CSS are preserved byte-for-byte, because the
repository's combined build still includes an older shared-disclosure source.
Do not replace the whole live foundation block with that combined build.

## Responsive image authoring still outstanding

The Image setting reads expose no responsive settings for the two CMS image
templates. Both attempts to set native `sizes` returned internal errors;
fresh attribute reads confirmed neither changed. The runtime slot correction
is active independently of this limitation.

The five missing responsive image sets remain outstanding. Asset metadata reads
returned 429. Attempts to read conventional existing 500px variant URLs were
not successful (403), so none was assumed to exist or inserted into srcset.
Automatic approval review rejected a re-upload of the original image because
it would duplicate an asset without proving variant generation. That action
was not retried or bypassed. No CMS images or assets were changed.

The 15:53 UTC published HTML still has five Discover images without srcset.
The other six menu images retain their variants, and the runtime slot correction
remains active. No CMS originals or bindings were changed by the IX2 cleanup.
