# Home heading font-swap reservation — 7 October 2026

The reported title is “Award-winning Cosmetic Dentistry” in Review Introduction,
above Smile Gallery. Its native font is Sweet Sans Pro x Light (300), falling
back to Verdana with font-display: swap. A fallback line-count change changes
the section height and can shift every subsequent section.

## Ownership and deployment

- Designer retains the heading text, width, type, margins and section spacing.
- Home page head preloads the existing Light and Regular WOFF2 assets with
  crossorigin. No new font assets or JavaScript.
- `src/styles/tdb-home-heading-reserve.css` is inlined in Home head as
  `style[data-tdb-home-heading-reserve]` so the reservation exists at first paint.
- The selector is Home-only and matches one heading. Other component instances
  and the Smile Gallery runtime are untouched.
- Keep the inline block identical to the source file. Do not add an external
  stylesheet request for this small first-paint rule.

## Sizing evidence

Desktop measured heading: 775.828px wide, 33.5697px font, 1.2 line-height,
80.53125px high (two lines). Mobile uses 90vw content, 2rem type and .225rem
tracking. Root size below 480px is 11.9958159px + .0041841004 * viewport width.

The actual Light font glyph advances give COSMETIC DENTISTRY 12.15em and
AWARD-WINNING 9.487em. Including tracking yields mobile line widths of
28.35rem and 21.899rem respectively: wrapping thresholds approximately
435.231px and 324.970px. Reserve two, three or four line boxes accordingly.
Min-height allows longer content/zoom to grow rather than clipping it.
Recheck these content-specific thresholds if the wording, font, tracking,
root scale or container width changes.

The previously measured desktop Swiper initialisation kept card top at
5911.4375px; only width/height rounded by .1875px. That does not establish
Swiper as the cause of a visible upward jump. Mobile gap settings are native:
8rem at tiny, 3rem at small, 2.5rem at medium; no spacing change was made here.

## Verification limits

Source metrics establish the reservation sizes. Desktop live layout can be
checked after staging publish; a real-device cold-load check remains necessary
to confirm the reported mobile jump is eliminated and identify any remaining
shifts from other sections. Preloading reduces the swap window but alone
cannot guarantee no layout shift.

## Font preload fragment

```html
<!-- Start Sweet Sans downloads before headings/body discover their font faces. -->
<link data-tdb-home-font-preload rel="preload" href="https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/682444d6cd79a0899f83eea1_SweetSansProLight.woff2" as="font" type="font/woff2" crossorigin>
<link data-tdb-home-font-preload rel="preload" href="https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/68245761078dfe24e80413ca_SweetSansProRegular.woff2" as="font" type="font/woff2" crossorigin>
```
