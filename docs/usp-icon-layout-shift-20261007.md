# USP barn icon layout shift — 7 October 2026

## Reproduced

On staging Home at 1363 x 936, refreshing while viewing Wellness produced:

| Block | Initial height | Loaded height |
| --- | ---: | ---: |
| Why Trust / five barn icons | 1118.75px | 1178.421875px |
| Exceptional | 1140.234375px | 1140.234375px |
| Bespoke | 1115.0625px | 1115.0625px |
| Wellness | 936px | 936px |
| Vimeo background wrapper | 936px | 936px |

Exceptional, Bespoke and Wellness each moved down 59.671875px after initial
layout. The five lazy SVG icons have intrinsic dimensions 65 x 65, but no
initial aspect ratio. Their published CSS specified only width, allowing
their row to start without image height.

## Native Designer fix

Existing combo selector:
`.feature-item_door-image.opaque-75`
Style ID: `0a0365cd-5841-6486-3882-cb0be68a5d07`

Added main-breakpoint `aspect-ratio: 1 / 1`. Existing responsive widths remain:
4rem desktop, 3rem tablet, 3rem tiny via the Opaque-75 override.
All five Home matches use the same square barn SVG.
No extra JS, head CSS, runtime changes, font changes or spacing adjustments.

## Remaining distinction

The section intentionally uses 100vh margins beneath the barn row and the
Exceptional/Bespoke paragraphs, plus 100vh minimum-height wrappers. These
accumulate spacing down the section, but no collapse of those margins or
change of video height was observed in this desktop refresh.
Real-phone viewport/address-bar behaviour is not established by this test.
