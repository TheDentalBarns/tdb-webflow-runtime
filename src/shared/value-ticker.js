/* Fixed-slot ticker used by legacy IG, First Impressions and review previews.
 * Kept inside their demand-loaded bundles: no additional network prerequisite.
 * Native CMS tickers retain their authored-node restoration contract separately.
 */
function tdbValueTicker(viewport, { valueClass, reduced, label = false } = {}) {
  let value = null,
    animations = [],
    revision = 0;
  const item = (text) => {
    const node = document.createElement('span');
    node.className = valueClass;
    node.textContent = text;
    node.setAttribute('aria-hidden', 'true');
    return node;
  };
  const stop = () => {
    revision++;
    animations.forEach((animation) => {
      animation.onfinish = null;
      animation.cancel();
    });
    animations = [];
    if (value !== null) viewport.replaceChildren(item(value));
  };
  return {
    stop,
    update(text, direction = 1, animate = true) {
      if (value === text) return;
      const previous = value;
      stop();
      value = text;
      if (label) viewport.setAttribute('aria-label', text);
      const incoming = item(text);
      if (previous === null || !animate || reduced?.matches || !viewport.animate) {
        viewport.replaceChildren(incoming);
        return;
      }
      const outgoing = item(previous),
        token = revision;
      viewport.replaceChildren(outgoing, incoming);
      const timing = {
        duration: window.TDBMotionProfile?.time(400) ?? 400,
        easing: window.TDBMotionProfile?.easing('control', 'ease-in-out') || 'ease-in-out',
        fill: 'both',
      };
      try {
        animations.push(
          outgoing.animate(
            [
              { transform: 'translateY(0)' },
              { transform: 'translateY(' + -direction * 100 + '%)' },
            ],
            timing,
          ),
        );
        animations.push(
          incoming.animate(
            [{ transform: 'translateY(' + direction * 100 + '%)' }, { transform: 'translateY(0)' }],
            timing,
          ),
        );
        animations[1].onfinish = () => {
          if (token !== revision) return;
          stop();
        };
      } catch (_) {
        stop();
      }
    },
  };
}
