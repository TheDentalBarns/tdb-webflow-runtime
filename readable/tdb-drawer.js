/* TDBScrollLock v1.0.4. Shared, independently releasable scroll-lock owners.
 * No body positioning or scroll reset: keep the document and navbar geometry.
 * Touch/wheel containment allows nested scrollers and prevents edge chaining.
 */
(() => {
  'use strict';
  if (window.TDBScrollLock) return;
  const owners = new Map();
  const html = document.documentElement;
  let previousLenis,
    touch = null;
  function roots() {
    return [...owners.values()]
      .flatMap((options) =>
        typeof options.allow === 'function' ? options.allow() : options.allow || [],
      )
      .filter(Boolean);
  }
  function canScroll(target, dx, dy) {
    const allowed = roots();
    const horizontal = Math.abs(dx) > Math.abs(dy);
    const delta = horizontal ? dx : dy;
    if (!delta) return true;
    let node = target instanceof Element ? target : target?.parentElement;
    for (
      ;
      node && allowed.some((root) => root === node || root.contains(node));
      node = node.parentElement
    ) {
      const css = getComputedStyle(node);
      if (!/(auto|scroll|overlay)/.test(horizontal ? css.overflowX : css.overflowY)) continue;
      const position = horizontal ? node.scrollLeft : node.scrollTop;
      const extent = horizontal
        ? node.scrollWidth - node.clientWidth
        : node.scrollHeight - node.clientHeight;
      if (extent > 1 && (delta < 0 ? position > 0 : position < extent - 1)) return true;
    }
    return false;
  }
  function wheel(event) {
    if (!event.ctrlKey && !canScroll(event.target, event.deltaX, event.deltaY))
      event.preventDefault();
  }
  function start(event) {
    touch =
      event.touches.length === 1 ? [event.touches[0].clientX, event.touches[0].clientY] : null;
  }
  function move(event) {
    if (!touch || event.touches.length !== 1) return;
    const point = event.touches[0];
    const dx = touch[0] - point.clientX,
      dy = touch[1] - point.clientY;
    touch = [point.clientX, point.clientY];
    if (!canScroll(event.target, dx, dy)) event.preventDefault();
  }
  function lock() {
    // Measure the unlocked page before lock writes.
    const gap = Math.max(0, innerWidth - html.clientWidth);
    const padding = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
    if (!document.querySelector('style[data-tdb-scroll-lock-css]')) {
      const style = document.createElement('style');
      style.setAttribute('data-tdb-scroll-lock-css', '');
      style.textContent =
        'html.tdb-scroll-locked {\n  overflow: hidden !important;\n  overscroll-behavior: none;\n}\nhtml.tdb-scroll-locked body {\n  padding-right: var(--tdb-scroll-lock-padding) !important;\n}';
      document.head.append(style);
    }
    previousLenis = document.body.getAttribute('data-lenis-prevent');
    html.style.setProperty('--tdb-scroll-lock-padding', `${padding + gap}px`);
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
  window.TDBScrollLock = Object.freeze({
    version: '1.0.4',
    acquire,
    get active() {
      return owners.size > 0;
    },
  });
})();

/* Shared site chrome v1.1.0. Independently owned, reversible nav/banner/VIP motion. */
(() => {
  'use strict';
  if (window.TDBSiteChrome) return;
  const owners = new Set();
  let animations = [];
  function timing() {
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
    const nodes = [
      ...document.querySelectorAll(
        '.navbar10_component,.navbar-bg_layer,.tdb-announcement,#tdb-elfsight-timer-shell,#tdb-vip-drawer',
      ),
    ];
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
        y: node.id === 'tdb-vip-drawer' ? height : -Math.max(height, rect.bottom),
      };
    });
    animations = poses
      .filter((pose) => pose.node.animate)
      .map(({ node, from, y }) => ({
        node,
        animation: node.animate(
          [{ transform: from }, { transform: `translateY(${y}px)` }],
          timing(),
        ),
      }));
    animations.forEach(({ animation }) => animation.finished.catch(() => {}));
    if (document.querySelector('#tdb-vip-drawer.is-open,#tdb-vip-drawer.is-peeking'))
      window.TDBVIPDrawer?.close?.();
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
    if (!owners.size) hide();
    owners.add(owner);
    return () => {
      if (!owners.delete(owner) || owners.size) return;
      show();
    };
  }
  window.TDBSiteChrome = Object.freeze({ version: '1.1.0', acquire, settleBackground });
})();

/* Shared carousel input v1.0.0. Adapters retain their navigation decisions. */
(() => {
  'use strict';
  if (window.TDBCarouselControls) return;
  const editable = 'input,textarea,select,[contenteditable="true"]';
  function bind({ root, previous, next, navigate, enabled = () => true, signal }) {
    for (const [button, direction] of [
      [previous, -1],
      [next, 1],
    ]) {
      if (!button) continue;
      button.setAttribute('role', 'button');
      button.tabIndex = 0;
      const activate = (event) => {
        if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
        // Native buttons already dispatch their own keyboard click.
        if (event.type === 'keydown' && button.tagName === 'BUTTON') return;
        event.preventDefault();
        if (
          enabled() &&
          !button.matches(':disabled,[aria-disabled="true"]') &&
          !button.closest('[inert]')
        )
          navigate(direction);
      };
      button.addEventListener('click', activate, { signal });
      button.addEventListener('keydown', activate, { signal });
    }
    root.addEventListener(
      'keydown',
      (event) => {
        if (
          event.defaultPrevented ||
          !enabled() ||
          event.target.closest(editable) ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          !['ArrowLeft', 'ArrowRight'].includes(event.key)
        )
          return;
        event.preventDefault();
        navigate(event.key === 'ArrowLeft' ? -1 : 1);
      },
      { signal },
    );
  }
  window.TDBCarouselControls = Object.freeze({ version: '1.0.0', bind });
})();

/* Shared drawer reading v1.0.0. Native styles own portrait/landscape layout. */
(() => {
  'use strict';
  if (window.TDBDrawerReading) return;
  // Preserve the existing short touch-landscape rule for both reading panes.
  const landscapeQuery = matchMedia(
    '(orientation: landscape) and (max-width: 991px) and (max-height: 500px) and (pointer: coarse)',
  );
  function mount({
    pane,
    footer,
    viewport,
    track,
    nodes,
    slideScroll,
    swiper: currentSwiper,
    active,
    onMode = () => {},
    onRestore = () => {},
    durationRoot,
    durationProperty,
  }) {
    const controller = new AbortController(),
      { signal } = controller;
    const originalHeight = track.style.height;
    let landscape = false,
      anchor = null,
      width = viewport.clientWidth,
      bound = null,
      stopSettled;
    const scroll = () => (landscape ? pane : slideScroll());
    function capture() {
      if (!landscape || anchor || !active()) return;
      const top = pane.scrollTop,
        bottom = Math.max(0, pane.scrollHeight - pane.clientHeight - top);
      anchor = { top, bottom, atFoot: bottom <= footer.offsetHeight };
    }
    function apply() {
      if (!landscape || !anchor) return;
      const max = Math.max(0, pane.scrollHeight - pane.clientHeight);
      pane.scrollTop = Math.max(0, Math.min(max, anchor.atFoot ? max - anchor.bottom : anchor.top));
    }
    function duration() {
      const swiper = currentSwiper();
      if (!swiper || swiper.destroyed || swiper.animating) return;
      const value = window.TDBMotion.reduced.matches ? 0 : window.TDBMotion.duration(innerWidth);
      swiper.params.speed = value;
      swiper.originalParams.speed = value;
      if (durationProperty) durationRoot.style.setProperty(durationProperty, value + 'ms');
    }
    function bind() {
      const swiper = currentSwiper();
      if (swiper === bound) return;
      stopSettled?.();
      bound = swiper;
      stopSettled = swiper ? window.TDBSwiper.onSettled(swiper, duration) : null;
      duration();
    }
    function setMode(enabled = landscapeQuery.matches) {
      if (enabled === landscape) return;
      const offset = scroll()?.scrollTop || 0;
      anchor = null;
      landscape = enabled;
      for (const node of nodes()) node?.classList.toggle('is-phone-landscape', landscape);
      onMode(landscape);
      const swiper = currentSwiper();
      if (swiper) {
        swiper.params.autoHeight = landscape;
        if (!landscape) track.style.height = originalHeight;
        swiper.update();
      }
      pane.scrollTop = 0;
      if (scroll()) scroll().scrollTop = offset;
      onRestore();
      duration();
    }
    function resize() {
      const nextWidth = viewport.clientWidth,
        changed = Math.abs(nextWidth - width) > 0.5;
      width = nextWidth;
      const swiper = currentSwiper();
      duration();
      // Auto-height is output, not a reason to restart the moving slide.
      if (swiper && !swiper.animating && (!landscape || changed)) swiper.update();
      apply();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    landscapeQuery.addEventListener('change', () => setMode(), { signal });
    window.addEventListener('resize', duration, { passive: true, signal });
    return Object.freeze({
      scroll,
      capture,
      apply,
      setMode,
      bind,
      clear() {
        anchor = null;
      },
      get landscape() {
        return landscape;
      },
      destroy() {
        observer.disconnect();
        controller.abort();
        stopSettled?.();
        setMode(false);
        if (durationProperty) durationRoot.style.removeProperty(durationProperty);
      },
    });
  }
  window.TDBDrawerReading = Object.freeze({ version: '1.0.0', mount });
})();

/* TDB shared native drawer v1.2.0. Webflow owns markup and styles. */
(() => {
  'use strict';
  if (window.TDBDrawer) return;
  const instances = new WeakMap();
  let active = null;
  function mount(root, { onOpen, onClose, hideChrome = false } = {}) {
    if (instances.has(root)) return instances.get(root);
    const panel = root.querySelector('[data-tdb-drawer-panel]'),
      backdrop = root.querySelector('[data-tdb-drawer-backdrop]'),
      closeButton = root.querySelector('[data-tdb-drawer-close]');
    if (!panel || !closeButton) throw Error('Native drawer structure missing');
    const ctrl = new AbortController(),
      { signal } = ctrl,
      motion = window.TDBMotion.reduced;
    let state = 'closed',
      trigger,
      saved = [],
      releaseScroll,
      releaseChrome,
      animations = [],
      revision = 0,
      touchPulse = null,
      placement;
    root.hidden = true;
    root.classList.add('is-hidden');
    root.inert = true;
    const stop = () => {
      animations.forEach((a) => a.cancel());
      animations = [];
    };
    const focusables = () =>
      [...panel.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]')].filter(
        (n) => !n.disabled && !n.closest('[hidden],[inert]') && n.getClientRects().length,
      );
    function lift() {
      // A fixed drawer inside Footer still belongs to Footer's stacking context.
      // Give every active drawer the same page-level layer, then restore its native
      // component location after closing so discovery and Designer markup stay intact.
      if (root.parentElement === document.body) return;
      placement = document.createComment('tdb-drawer-return');
      root.before(placement);
      document.body.append(root);
    }
    function restore() {
      if (placement?.parentNode) placement.replaceWith(root);
      placement = null;
    }
    function lock() {
      releaseScroll = window.TDBScrollLock.acquire({ allow: () => [panel] });
      let child = root;
      while (child.parentElement) {
        for (const sibling of child.parentElement.children)
          if (sibling !== child && !['SCRIPT', 'STYLE', 'LINK'].includes(sibling.tagName)) {
            saved.push([sibling, sibling.inert]);
            sibling.inert = true;
          }
        child = child.parentElement;
        if (child === document.body) break;
      }
    }
    function unlock() {
      saved.forEach(([node, value]) => (node.inert = value));
      saved = [];
      releaseScroll?.();
      releaseScroll = null;
      releaseChrome?.();
      releaseChrome = null;
    }
    async function transition(opening) {
      const rev = ++revision;
      if (!opening && animations.length) {
        // Reverse the existing timeline: cancelling would snap to the authored open pose.
        // At the start boundary, reverse()/play() auto-rewind to the end; finish at zero instead.
        animations.forEach((a) => {
          if (a.currentTime == null || a.currentTime === 0) {
            a.playbackRate = -1;
            a.finish();
          } else a.reverse();
        });
        await Promise.allSettled(animations.map((a) => a.finished));
        return rev === revision;
      }
      stop();
      const duration = motion.matches ? 0 : window.TDBMotion.duration(innerWidth);
      const closed = 'translateX(100%)';
      if (duration && panel.animate) {
        animations = [
          panel.animate(
            [
              { transform: opening ? closed : 'translate(0)' },
              { transform: opening ? 'translate(0)' : closed },
            ],
            { duration, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' },
          ),
        ];
        if (backdrop)
          animations.push(
            backdrop.animate([{ opacity: opening ? 0 : 1 }, { opacity: opening ? 1 : 0 }], {
              duration: Math.min(duration, 300),
              fill: 'both',
            }),
          );
        await Promise.allSettled(animations.map((a) => a.finished));
      }
      return rev === revision;
    }
    async function open(source) {
      if (state !== 'closed') return;
      active?.close(true);
      active = api;
      trigger = source;
      state = 'opening';
      lift();
      root.hidden = false;
      root.classList.remove('is-hidden');
      root.inert = false;
      root.setAttribute('aria-hidden', 'false');
      trigger?.setAttribute('aria-expanded', 'true');
      lock();
      try {
        onOpen?.();
        if (hideChrome) releaseChrome = window.TDBSiteChrome.acquire();
      } catch (error) {
        await close(true);
        throw error;
      }
      closeButton.focus({ preventScroll: true });
      if (await transition(true)) {
        stop();
        state = 'open';
      }
    }
    async function close(immediate = false) {
      // A second backdrop/Escape dismiss must not restart the exit from fully open.
      // Immediate teardown may still cancel the exit, without repeating onClose.
      if (state === 'closed' || (state === 'closing' && !immediate)) return;
      if (state !== 'closing') {
        state = 'closing';
        trigger?.setAttribute('aria-expanded', 'false');
        onClose?.();
        if (hideChrome) window.TDBSiteChrome.settleBackground();
      }
      if (immediate) {
        revision++;
        stop();
      } else if (!(await transition(false))) return;
      touchPulse?.cancel();
      touchPulse = null;
      root.hidden = true;
      root.classList.add('is-hidden');
      root.inert = true;
      root.setAttribute('aria-hidden', 'true');
      stop();
      restore();
      unlock();
      state = 'closed';
      if (active === api) active = null;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    }
    // Match the existing VIP/announcement touch pulse without delaying drawer closure.
    function pulseClose(event) {
      if (event.type !== 'click' || event.detail === 0 || motion.matches || !closeButton.animate)
        return;
      if (event.pointerType !== 'touch' && !matchMedia('(hover:none) and (pointer:coarse)').matches)
        return;
      touchPulse?.cancel();
      const cream =
        getComputedStyle(document.documentElement)
          .getPropertyValue('--base-color-brand--orange-1')
          .trim() || '#f9f2e6';
      const animation = closeButton.animate(
        [
          { boxShadow: 'inset 0 0 0 2rem transparent', offset: 0 },
          {
            boxShadow: 'inset 0 0 0 2rem color-mix(in srgb,' + cream + ' 30%,transparent)',
            offset: 0.3,
          },
          { boxShadow: 'inset 0 0 0 2rem transparent', offset: 1 },
        ],
        { duration: 600, easing: 'ease-in-out' },
      );
      touchPulse = animation;
      animation.finished
        .then(() => {
          if (touchPulse === animation) touchPulse = null;
        })
        .catch(() => {});
    }
    const activate = (e) => {
      if (e.type === 'keydown' && !['Enter', ' '].includes(e.key)) return;
      e.preventDefault();
      if (state === 'closed' || state === 'closing') return;
      pulseClose(e);
      close();
    };
    closeButton.addEventListener('click', activate, { signal });
    closeButton.addEventListener('keydown', activate, { signal });
    backdrop?.addEventListener('click', () => close(), { signal });
    root.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
        if (e.key === 'Tab') {
          const list = focusables(),
            first = list[0] || panel,
            last = list.at(-1) || panel;
          if (
            e.shiftKey &&
            (document.activeElement === first || document.activeElement === panel)
          ) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      },
      { signal },
    );
    document.addEventListener(
      'focusin',
      (e) => {
        if (state !== 'closed' && state !== 'closing' && !root.contains(e.target))
          closeButton.focus({ preventScroll: true });
      },
      { signal },
    );
    motion.addEventListener(
      'change',
      () => {
        if (state === 'opening') {
          revision++;
          stop();
          state = 'open';
        } else if (state === 'closing') close(true);
      },
      { signal },
    );
    const api = Object.freeze({
      open,
      close,
      get state() {
        return state;
      },
      destroy() {
        close(true);
        ctrl.abort();
        instances.delete(root);
      },
    });
    instances.set(root, api);
    return api;
  }
  window.TDBDrawer = Object.freeze({ version: '1.2.0', mount });
})();
