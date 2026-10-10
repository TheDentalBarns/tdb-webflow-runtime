/* Shared site chrome v1.1.0. Independently owned, reversible nav/banner/VIP motion. */
(() => {
  'use strict';
  if (window.TDBSiteChrome) return;
  const owners = new Set();
  let animations = [];
  function timing() {
    const css = getComputedStyle(document.documentElement);
    const clock = css.getPropertyValue('--tdb-peek-duration').trim();
    const duration = /^\d*\.?\d+(ms|s)$/.test(clock) ? parseFloat(clock) * (clock.endsWith('ms') ? 1 : 1000) : 420;
    const easing = css.getPropertyValue('--tdb-peek-ease').trim() || 'cubic-bezier(.4,0,.2,1)';
    return {duration: window.TDBMotion.reduced.matches ? 0 : duration, easing, fill: 'both'};
  }
  function cancel() {
    animations.forEach(({animation}) => animation.cancel());
    animations = [];
  }
  function hide() {
    const nodes = [...document.querySelectorAll('.navbar10_component,.navbar-bg_layer,.tdb-announcement,#tdb-elfsight-timer-shell,#tdb-vip-drawer')];
    // A new owner can interrupt the return motion. Capture the visible poses,
    // then measure the native layout without our previous animation applied.
    const from = new Map(nodes.map(node => [node, getComputedStyle(node).transform]));
    cancel();
    const nav = document.querySelector('.navbar10_component');
    // Measure every starting pose before starting any animation.
    const poses = nodes.map(node => {
      const rect = node.getBoundingClientRect();
      const height = node === nav ? Math.max(rect.height, ...[...node.querySelectorAll('.w-nav-overlay,.navbar10_menu[data-nav-menu-open],.navbar10_dropdown-list.w--open')].filter(n => n.getClientRects().length).map(n => n.getBoundingClientRect().bottom - rect.top)) : rect.height;
      return {node, from: from.get(node), y: node.id === 'tdb-vip-drawer' ? height : -Math.max(height, rect.bottom)};
    });
    animations = poses.filter(pose => pose.node.animate).map(({node, from, y}) => ({node, animation: node.animate(
      [{transform: from}, {transform: `translateY(${y}px)`}],
      timing())}));
    animations.forEach(({animation}) => animation.finished.catch(() => {}));
    if (document.querySelector('#tdb-vip-drawer.is-open,#tdb-vip-drawer.is-peeking')) window.TDBVIPDrawer?.close?.();
  }
  function show() {
    const poses = animations.map(({node}) => ({node, from: getComputedStyle(node).transform}));
    cancel();
    // settleBackground may have closed a menu while chrome was hidden. Return
    // to that current native pose, rather than reversing to the stale open menu.
    const targets = poses.map(pose => ({...pose, to: getComputedStyle(pose.node).transform}));
    const returning = targets.map(({node, from, to}) => ({node, animation: node.animate(
      [{transform: from}, {transform: to}], timing())}));
    animations = returning;
    Promise.allSettled(returning.map(({animation}) => animation.finished)).then(() => {
      if (animations === returning && !owners.size) cancel();
    });
  }
  function settleBackground() {
    window.TDBVIPDrawer?.reset?.();
    document.querySelector('.navbar10_menu-button[aria-expanded="true"]')?.click();
    document.querySelectorAll('.navbar10_dropdown-toggle[aria-expanded="true"]').forEach(node => node.click());
  }
  function acquire() {
    const owner = {};
    if (!owners.size) hide();
    owners.add(owner);
    return () => {
      if (!owners.delete(owner) || owners.size) return;
      show();
    };
  }
  window.TDBSiteChrome = Object.freeze({version: '1.1.0', acquire, settleBackground});
})();
