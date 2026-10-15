// Both pageshow listeners run in the same dispatch. Reuse that event's snapshot
// after the announcement changes visibility, instead of forcing a second read.
// A new event (including a bfcache restore) always measures the current position.
const TDBPageShowPositions = new WeakMap();
function tdbReadPagePosition(event) {
  if (event && TDBPageShowPositions.has(event)) return TDBPageShowPositions.get(event);
  const root = document.documentElement;
  const position = {
    y: window.scrollY ?? root.scrollTop ?? 0,
    height: innerHeight || root.clientHeight || 0,
  };
  if (event) TDBPageShowPositions.set(event, position);
  return position;
}
