/* TDBScrollLock v1.0.0. Shared, independently releasable scroll-lock owners.
 * No body positioning or scroll reset: keep the document and navbar geometry.
 * Touch/wheel containment allows nested scrollers and prevents edge chaining.
 */
(() => {
  'use strict';
  if (window.TDBScrollLock) return;
  const owners = new Map();
  const html = document.documentElement;
  let previousLenis, touch = null, style;
  function roots() {
    return [...owners.values()].flatMap(options =>
      typeof options.allow === 'function' ? options.allow() : options.allow || []).filter(Boolean);
  }
  function canScroll(target, dx, dy) {
    const allowed = roots();
    const horizontal = Math.abs(dx) > Math.abs(dy);
    const delta = horizontal ? dx : dy;
    if (!delta) return true;
    let node = target instanceof Element ? target : target?.parentElement;
    for (; node && allowed.some(root => root === node || root.contains(node)); node = node.parentElement) {
      const css = getComputedStyle(node);
      if (!/(auto|scroll|overlay)/.test(horizontal ? css.overflowX : css.overflowY)) continue;
      const position = horizontal ? node.scrollLeft : node.scrollTop;
      const extent = horizontal ? node.scrollWidth - node.clientWidth : node.scrollHeight - node.clientHeight;
      if (extent > 1 && (delta < 0 ? position > 0 : position < extent - 1)) return true;
    }
    return false;
  }
  function wheel(event) {
    if (!event.ctrlKey && !canScroll(event.target, event.deltaX, event.deltaY)) event.preventDefault();
  }
  function start(event) {
    touch = event.touches.length === 1 ? [event.touches[0].clientX, event.touches[0].clientY] : null;
  }
  function move(event) {
    if (!touch || event.touches.length !== 1) return;
    const point = event.touches[0];
    const dx = touch[0] - point.clientX, dy = touch[1] - point.clientY;
    touch = [point.clientX, point.clientY];
    if (!canScroll(event.target, dx, dy)) event.preventDefault();
  }
  function lock() {
    if (!style) {
      style = document.createElement('style');
      style.dataset.tdbScrollLock = '';
      style.textContent = 'html.tdb-scroll-locked,html.tdb-scroll-locked body{overflow:hidden!important;overscroll-behavior:none}html.tdb-scroll-locked body{padding-right:var(--tdb-scroll-lock-padding)!important}';
      document.head.append(style);
    }
    const gap = Math.max(0, innerWidth - html.clientWidth);
    const padding = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
    html.style.setProperty('--tdb-scroll-lock-padding', `${padding + gap}px`);
    previousLenis = document.body.getAttribute('data-lenis-prevent');
    document.body.setAttribute('data-lenis-prevent', '');
    html.classList.add('tdb-scroll-locked');
    document.addEventListener('wheel', wheel, { capture: true, passive: false });
    document.addEventListener('touchstart', start, { capture: true, passive: true });
    document.addEventListener('touchmove', move, { capture: true, passive: false });
  }
  function unlock() {
    html.classList.remove('tdb-scroll-locked');
    html.style.removeProperty('--tdb-scroll-lock-padding');
    if (document.body.getAttribute('data-lenis-prevent') === '') {
      if (previousLenis === null) document.body.removeAttribute('data-lenis-prevent');
      else document.body.setAttribute('data-lenis-prevent', previousLenis);
    }
    document.removeEventListener('wheel', wheel, true);
    document.removeEventListener('touchstart', start, true);
    document.removeEventListener('touchmove', move, true);
    touch = null;
  }
  function acquire(options = {}) {
    const token = {};
    if (!owners.size) lock();
    owners.set(token, options);
    return () => {
      if (owners.delete(token) && !owners.size) unlock();
    };
  }
  window.TDBScrollLock = Object.freeze({ version: '1.0.0', acquire,
    get active() { return owners.size > 0; }
  });
})();
