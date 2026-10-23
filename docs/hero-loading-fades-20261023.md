# Restore compact hero loading fades

The native control consolidation kept the spinner's opacity states but omitted
the old loading wrapper's transitions. It therefore appeared and disappeared
instantly, losing the overlap with the returning play/pause icon.

The compact loading pseudo-element now uses the original timings:

- Loading, awaiting consent, and buffering: 120 ms delay, then 120 ms opacity
  fade-in with `ease`.
- Leaving those states: 450 ms opacity fade-out with `ease`, allowing the
  play/pause glyph to return while the ring fades.
- Play/pause remains immediate, as explicitly specified by the former hero CSS.
- The existing 100 ms delay / 200 ms initial control entrance is retained.

The non-buffering rules live in the early global UI CSS so cancelling a consent
prompt fades the spinner even when the Vimeo bundle has never been loaded.
Buffering uses the same timings in the consent-gated Vimeo stylesheet.

Validation: browser comparison against the original native controls at four
state transitions (loading to playing, loading to paused, cancelled consent,
and buffering). The old and new opacity traces match, with both glyph and
spinner visible during the exit. The 20 Vimeo/consent tests pass. Both changed
CSS artifacts match their readable sources. No DOM or native geometry changes;
the restored mobile `100svh` and pulse/ring border-box alignment are retained.

## Keep rotation through fade-out

The loading animation now remains defined while idle and uses a paused play
state. Loading and buffering resume that same animation. A small foundation
handler keeps it running during the ring's opacity transition and releases
the override on transition end or cancellation. This preserves its rotation
through the 450 ms exit, then pauses it once invisible. The handler is available
before video consent and adds no elements, timers, or mutation observers.

Validation: all six browser scenarios passed: loading to play, loading to pause,
buffering, rapid re-entry, cancellation before the reveal delay, and cancelled
consent without the Vimeo stylesheet. Measured transforms keep changing during
the visible fade and remain stable once opacity reaches zero. The 21 focused
Vimeo/consent tests and full artifact preservation check pass.
