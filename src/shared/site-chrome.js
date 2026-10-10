/* Shared site chrome v1.0.0. Independently owned hiding of nav/banner/VIP bars. */
(() => {
  'use strict';
  if (window.TDBSiteChrome) return;
  const owners = new Set();
  let animations = [];
  function hide() {
    const css = getComputedStyle(document.documentElement);
    const clock = css.getPropertyValue('--tdb-peek-duration').trim();
    const duration = /^\d*\.?\d+(ms|s)$/.test(clock) ? parseFloat(clock) * (clock.endsWith('ms') ? 1 : 1000) : 420;
    const easing = css.getPropertyValue('--tdb-peek-ease').trim() || 'cubic-bezier(.4,0,.2,1)';
    const nav = document.querySelector('.navbar10_component');
    // Measure every starting pose before starting any animation.
    const poses = [...document.querySelectorAll('.navbar10_component,.navbar-bg_layer,.tdb-announcement,#tdb-elfsight-timer-shell,#tdb-vip-drawer')].map(node => {
      const rect = node.getBoundingClientRect();
      const height = node === nav ? Math.max(rect.height, ...[...node.querySelectorAll('.w-nav-overlay,.navbar10_menu[data-nav-menu-open],.navbar10_dropdown-list.w--open')].filter(n => n.getClientRects().length).map(n => n.getBoundingClientRect().bottom - rect.top)) : rect.height;
      return {node, from: getComputedStyle(node).transform, y: node.id === 'tdb-vip-drawer' ? height : -Math.max(height, rect.bottom)};
    });
    animations = poses.filter(pose => pose.node.animate).map(({node, from, y}) => node.animate(
      [{transform: from}, {transform: `translateY(${y}px)`}],
      {duration: window.TDBMotion.reduced.matches ? 0 : duration, easing, fill: 'forwards'}));
    if (document.querySelector('#tdb-vip-drawer.is-open,#tdb-vip-drawer.is-peeking')) window.TDBVIPDrawer?.close?.();
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
      animations.forEach(animation => animation.cancel()); animations = [];
    };
  }
  window.TDBSiteChrome = Object.freeze({version: '1.0.0', acquire, settleBackground});
})();
