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
