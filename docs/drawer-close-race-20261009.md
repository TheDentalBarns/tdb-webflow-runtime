# Shared drawer repeated-dismiss fix

David reported a pop when clicking the patient review again while its drawer
was closing. The underlying page stays inert during closure; the backdrop can
receive that click. `open()` already rejects non-closed states, but `close()`
previously accepted repeated calls while closing. Each call cancelled the
in-flight animation and restarted from `translate(0)`, producing a jump.

Drawer 1.0.2 ignores a repeated animated close while already closing. Immediate
teardown can still interrupt the exit, and calls the consumer `onClose` only once.
Animation durations, easing, scroll locking, inert state, focus restoration,
and reopening after the exit completes are preserved.

Regression tests reproduce the old restart and duplicate callback, then pass
against the fix. They exercise repeated backdrop/Escape/API dismissal, attempted
reopening during closure, completion/reopening and immediate teardown.

Release is based on carousel dependency tree 9b2210cc0a63213ab39ca8a0b57dbab19f96e775.
Only `src/shared/drawer.js` and its distribution change runtime behaviour. Update
the existing `data-tdb-carousel-base` pin via a fresh, narrowly patched site head;
keep the motion registry URL and all other head content. Publish staging only.

## Opening interrupted by closing

Drawer 1.0.3 also fixes the separate snap when dismissing during entrance. It
reverses the active panel and backdrop animations at their current timeline
positions, retaining their easing and progress. No computed-style/layout read
or new animation is needed. At time zero it finishes at the closed boundary,
avoiding Web Animations auto-rewind. The revision guard prevents the old open
continuation from marking the reversed drawer open. Full open/close timings and
repeated-close protection remain unchanged.

Five focused tests cover repeated close, teardown, partial opening, an already
finished backdrop during entrance, and closing before the first frame. The
three new cases failed against 1.0.2 before this correction. Tests use controlled
animation promises; no browser visual verification is claimed.
