/* Shared site chrome v1.1.0. Independently owned, reversible nav/banner/VIP motion. */
(() => {
  'use strict';
  if (window.TDBSiteChrome) return;
  const selector =
    '.navbar10_component,.navbar-bg_layer,.tdb-announcement,#tdb-elfsight-timer-shell,#tdb-vip-drawer';
  const owners = new Set();
  let animations = [],
    arrivals = null,
    sizes = null;
  function timing() {
    const profile = window.TDBMotionProfile?.forFamily?.('navigation') || window.TDBMotionProfile;
    if (profile)
      return {
        duration: window.TDBMotion.reduced.matches ? 0 : profile.time(420),
        easing: profile.easing('panel', 'cubic-bezier(.4,0,.2,1)'),
        fill: 'both',
      };
    const css = getComputedStyle(document.documentElement);
    const clock = css.getPropertyValue('--tdb-peek-duration').trim();
    const duration = /^\d*\.?\d+(ms|s)$/.test(clock)
      ? parseFloat(clock) * (clock.endsWith('ms') ? 1 : 1000)
      : 420;
    const easing = css.getPropertyValue('--tdb-peek-ease').trim() || 'cubic-bezier(.4,0,.2,1)';
    return { duration: window.TDBMotion.reduced.matches ? 0 : duration, easing, fill: 'both' };
  }
  function cancel() {
    animations.forEach(({ animation }) => animation.cancel());
    animations = [];
  }
  function hide() {
    const nodes = [...document.querySelectorAll(selector)];
    // A new owner can interrupt the return motion. Capture the visible poses,
    // then measure the native layout without our previous animation applied.
    const from = new Map(nodes.map((node) => [node, getComputedStyle(node).transform]));
    cancel();
    const nav = document.querySelector('.navbar10_component');
    // Measure every starting pose before starting any animation.
    const poses = nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      const height =
        node === nav
          ? Math.max(
              rect.height,
              ...[
                ...node.querySelectorAll(
                  '.w-nav-overlay,.navbar10_menu[data-nav-menu-open],.navbar10_dropdown-list.w--open',
                ),
              ]
                .filter((n) => n.getClientRects().length)
                .map((n) => n.getBoundingClientRect().bottom - rect.top),
            )
          : rect.height;
      return {
        node,
        from: from.get(node),
        height,
        y: node.id === 'tdb-vip-drawer' ? height : -Math.max(height, rect.bottom),
      };
    });
    animations = poses
      .filter((pose) => pose.node.animate)
      .map(({ node, from, y, height }) => ({
        node,
        y,
        height,
        animation: node.animate(
          [{ transform: from }, { transform: `translateY(${y}px)` }],
          timing(),
        ),
      }));
    animations.forEach(({ animation }) => animation.finished.catch(() => {}));
    if (document.querySelector('#tdb-vip-drawer.is-open,#tdb-vip-drawer.is-peeking'))
      window.TDBVIPDrawer?.close?.();
  }
  function resizeHidden() {
    if (!owners.size) return;
    const changes = animations.flatMap((entry) => {
      const { node } = entry;
      if (!node.isConnected) return [];
      const from = getComputedStyle(node).transform,
        matrix = from.match(/matrix(3d)?\(([^)]+)\)/),
        shift = matrix
          ? Number(matrix[2].split(',')[matrix[1] ? 13 : 5])
          : parseFloat(from.match(/translateY\(([^)]+)/)?.[1]) || 0,
        rect = node.getBoundingClientRect(),
        height = node.matches('.navbar10_component')
          ? Math.max(
              rect.height,
              ...[
                ...node.querySelectorAll(
                  '.w-nav-overlay,.navbar10_menu[data-nav-menu-open],.navbar10_dropdown-list.w--open',
                ),
              ]
                .filter((n) => n.getClientRects().length)
                .map((n) => n.getBoundingClientRect().bottom - rect.top),
            )
          : rect.height,
        y = node.id === 'tdb-vip-drawer' ? height : -Math.max(height, rect.bottom - shift);
      return Math.abs(y - entry.y) > 0.5 ? [{ entry, from, y, height }] : [];
    });
    for (const { entry, from, y, height } of changes) {
      // An empty lazy shell gains height after its contents arrive. Park it
      // before paint; a bar already moving continues from its visible pose.
      const moving = entry.height > 0 && entry.animation.playState === 'running';
      entry.animation.cancel();
      const transform = `translateY(${y}px)`;
      entry.animation = entry.node.animate(
        [{ transform: moving ? from : transform }, { transform }],
        { ...timing(), ...(moving ? {} : { duration: 0 }) },
      );
      entry.animation.finished.catch(() => {});
      entry.y = y;
      entry.height = height;
    }
  }
  function parkArrivals() {
    if (!owners.size) return;
    const known = new Set(animations.map(({ node }) => node));
    // Lazy banners may mount after an owner has moved the existing chrome away.
    // Reserve their hidden pose before first paint, then share the normal return.
    const poses = [...document.querySelectorAll(selector)]
      .filter((node) => !known.has(node) && node.animate)
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          node,
          height: rect.height,
          y: node.id === 'tdb-vip-drawer' ? rect.height : -Math.max(rect.height, rect.bottom),
        };
      });
    for (const { node, y, height } of poses) {
      const transform = `translateY(${y}px)`;
      const animation = node.animate([{ transform }, { transform }], { ...timing(), duration: 0 });
      animation.finished.catch(() => {});
      animations.push({ node, animation, y, height });
      sizes?.observe(node);
    }
    resizeHidden();
  }
  function show() {
    const poses = animations.map(({ node }) => ({ node, from: getComputedStyle(node).transform }));
    cancel();
    // settleBackground may have closed a menu while chrome was hidden. Return
    // to that current native pose, rather than reversing to the stale open menu.
    const targets = poses.map((pose) => ({ ...pose, to: getComputedStyle(pose.node).transform }));
    const returning = targets.map(({ node, from, to }) => ({
      node,
      animation: node.animate([{ transform: from }, { transform: to }], timing()),
    }));
    animations = returning;
    Promise.allSettled(returning.map(({ animation }) => animation.finished)).then(() => {
      if (animations === returning && !owners.size) cancel();
    });
  }
  function settleBackground() {
    window.TDBVIPDrawer?.reset?.();
    document.querySelector('.navbar10_menu-button[aria-expanded="true"]')?.click();
    document
      .querySelectorAll('.navbar10_dropdown-toggle[aria-expanded="true"]')
      .forEach((node) => node.click());
  }
  function acquire() {
    const owner = {};
    if (!owners.size) {
      hide();
      if (typeof ResizeObserver === 'function') {
        sizes = new ResizeObserver(resizeHidden);
        animations.forEach(({ node }) => sizes.observe(node));
      }
      arrivals = new MutationObserver(parkArrivals);
      arrivals.observe(document.documentElement, { childList: true, subtree: true });
    }
    owners.add(owner);
    return () => {
      if (!owners.delete(owner) || owners.size) return;
      arrivals.disconnect();
      arrivals = null;
      sizes?.disconnect();
      sizes = null;
      show();
    };
  }
  window.TDBSiteChrome = Object.freeze({ version: '1.1.0', acquire, settleBackground });
})();
