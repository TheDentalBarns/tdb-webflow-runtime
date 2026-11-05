/* Physical phone orientation avoids triggering when the portrait keyboard opens. */
(() => {
  const touch = matchMedia('(pointer: coarse)');
  const landscape = matchMedia('(orientation: landscape)');
  function update() {
    const shortSide = Math.min(screen.width, screen.height);
    const type = screen.orientation?.type;
    const rotated = type
      ? type.startsWith('landscape')
      : typeof window.orientation === 'number'
        ? Math.abs(window.orientation) === 90
        : landscape.matches;
    const active = touch.matches && shortSide > 0 && shortSide <= 600 && rotated;
    if (active && !document.querySelector('style[data-tdb-phone-landscape-css]')) {
      const style = document.createElement('style');
      style.setAttribute('data-tdb-phone-landscape-css', '');
      style.textContent =
        'html.tdb-phone-landscape #tdb-elfsight-timer-shell,\nhtml.tdb-phone-landscape #tdb-vip-drawer:not(.is-open):not(.is-closing),\nhtml.tdb-phone-landscape:not(:has(.navbar10_component .w--open,.navbar10_component [data-nav-menu-open])) :is(.navbar10_component,.navbar-bg_layer) {\n  display: none !important;\n}';
      document.head.append(style);
    }
    document.documentElement.classList.toggle('tdb-phone-landscape', active);
  }
  update();
  touch.addEventListener('change', update);
  landscape.addEventListener('change', update);
  screen.orientation?.addEventListener('change', update);
  window.addEventListener('orientationchange', update);
  window.addEventListener('resize', update, { passive: true });
})();

/* TDBNavbarState v1.0.0. One change observer shared by the basic/enhanced nav.
 * Native Webflow remains the source of truth; consumers select their state.
 */
(() => {
  'use strict';
  if (window.TDBNavbarState) return;
  const instances = new WeakMap();
  function forNav(nav) {
    if (instances.has(nav)) return instances.get(nav);
    const subscriptions = new Set();
    const phone = matchMedia('(max-width:767px)');
    const desktop = matchMedia('(min-width:992px)');
    function sync() {
      for (const item of subscriptions) {
        const value = item.read();
        if (item.ready && Object.is(value, item.value)) continue;
        const previous = item.value;
        item.ready = true;
        item.value = value;
        item.render(value, previous);
      }
    }
    const observer = new MutationObserver(sync);
    observer.observe(nav, {
      subtree: true,
      attributes: true,
      attributeFilter: [
        'class',
        'aria-expanded',
        'data-nav-menu-open',
        'data-tdb-desktop-dropdown',
        'data-tdb-nav-floating-visible',
      ],
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    phone.addEventListener('change', sync);
    desktop.addEventListener('change', sync);
    const api = Object.freeze({
      phone,
      desktop,
      refresh: sync,
      watch(read, render) {
        const item = { read, render, ready: false };
        subscriptions.add(item);
        const value = read();
        item.value = value;
        item.ready = true;
        render(value, undefined);
        return () => subscriptions.delete(item);
      },
    });
    instances.set(nav, api);
    return api;
  }
  function whenReady(start) {
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  }
  window.TDBNavbarState = Object.freeze({ version: '1.1.0', forNav, whenReady });
})();

/* Disclosure initial state is authored in Designer. Only user toggles enable motion. */
(() => {
  'use strict';
  if (window.TDBDisclosure) return;
  const e = new WeakMap();
  let t = 0;
  function n(e) {
    if (!e.id || document.getElementById(e.id) !== e) {
      let n;
      do {
        n = 'tdb-disclosure-' + ++t;
      } while (document.getElementById(n));
      e.id = n;
    }
    return e.id;
  }
  function a(t) {
    if (e.has(t)) return e.get(t);
    const a = t.nextElementSibling,
      r = a?.hasAttribute('data-tdb-disclosure-panel')
        ? a
        : document.getElementById(t.getAttribute('aria-controls'));
    if (!r?.hasAttribute('data-tdb-disclosure-panel')) return null;
    function i(e, keepAnchor = false) {
      const before = keepAnchor ? t.getBoundingClientRect() : null;
      (!(e = Boolean(e)) && r.contains(document.activeElement) && t.focus({ preventScroll: !0 }),
        (r.hidden = !e),
        (r.inert = !e),
        r.setAttribute('aria-hidden', String(!e)),
        t.setAttribute('aria-expanded', String(e)),
        t.classList.toggle('is-open', e),
        r.classList.toggle('is-open', e),
        t.closest('[data-tdb-disclosure-item]')?.classList.toggle('is-open', e),
        t.querySelector('[data-tdb-chevron]')?.classList.toggle('is-open', e));
      // Sticky price headers return to normal flow when their panel closes.
      // Correct that layout displacement before notifying the chrome owner, so
      // the resulting scroll is not counted as a new navigation gesture.
      if (before?.height > 0) {
        const delta = t.getBoundingClientRect().top - before.top;
        if (Math.abs(delta) > 0.5) {
          const top = Math.max(0, window.scrollY + delta);
          if (window.lenis?.scrollTo) window.lenis.scrollTo(top, { immediate: true, force: true });
          else window.scrollTo({ top, behavior: 'instant' });
        }
      }
      t.dispatchEvent(new CustomEvent('tdb:disclosure-change', { bubbles: true }));
    }
    (t.setAttribute('aria-controls', n(r)), r.setAttribute('aria-labelledby', n(t)));
    const d = (e) => {
        e.defaultPrevented ||
          'true' === t.getAttribute('aria-disabled') ||
          (e.preventDefault(),
          t
            .closest('[data-tdb-disclosure-item]')
            ?.setAttribute('data-tdb-disclosure-interacted', ''),
          i('true' !== t.getAttribute('aria-expanded'), true));
      },
      o = 'BUTTON' === t.tagName,
      s = (e) => {
        !o && ['Enter', ' '].includes(e.key) && (e.repeat ? e.preventDefault() : d(e));
      };
    (t.addEventListener('click', d),
      o || t.addEventListener('keydown', s),
      i('true' === t.getAttribute('aria-expanded')));
    const c = Object.freeze({
      set: i,
      destroy() {
        (t.removeEventListener('click', d), t.removeEventListener('keydown', s), e.delete(t));
      },
    });
    return (e.set(t, c), c);
  }
  function r(e = document) {
    (e.matches?.('[data-tdb-disclosure-trigger]') && a(e),
      e.querySelectorAll('[data-tdb-disclosure-trigger]').forEach(a));
  }
  // Reveal the native target before Webflow/the browser handles the anchor scroll.
  function openHash(hash) {
    let id;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }
    if (!id) return;
    const target = document.getElementById(id)?.closest('[data-tdb-price-section]');
    if (!target) return;
    const trigger = target.querySelector(':scope > [data-tdb-disclosure-trigger]');
    if (trigger && trigger.getAttribute('aria-expanded') !== 'true') a(trigger)?.set(true);
    target.dispatchEvent(new CustomEvent('tdb:price-anchor', { bubbles: true }));
  }
  document.addEventListener(
    'click',
    (event) => {
      if (
        event.defaultPrevented ||
        event.button > 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = event.target.closest?.('a[href]');
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self'))
        return;
      const url = new URL(link.href, location.href);
      if (
        url.origin === location.origin &&
        url.pathname === location.pathname &&
        url.search === location.search
      )
        openHash(url.hash);
    },
    true,
  );
  window.addEventListener('hashchange', () => openHash(location.hash));
  function start() {
    r();
    openHash(location.hash);
  }
  ((window.TDBDisclosure = Object.freeze({
    version: '1.2.4',
    observe: function (e, t, n = () => 'true' === e.getAttribute('aria-expanded')) {
      let a;
      function r() {
        const e = Boolean(n());
        e !== a && ((a = e), t(e));
      }
      const i = new MutationObserver(r);
      return (
        i.observe(e, { attributes: !0, attributeFilter: ['aria-expanded', 'class'] }),
        r(),
        () => i.disconnect()
      );
    },
    mount: a,
    refresh: r,
    openHash,
  })),
    'loading' === document.readyState
      ? document.addEventListener('DOMContentLoaded', start, { once: !0 })
      : start());
})();
/* Mirror native Webflow state without motion or an extra observer. */
(() => {
  'use strict';
  if (window.TDBNavbarNative) return;
  function start() {
    document.querySelectorAll('[data-tdb-navbar-native]').forEach((nav) => {
      const state = window.TDBNavbarState.forNav(nav);
      nav.querySelectorAll('.navbar10_dropdown-toggle,.navbar10_menu-button').forEach((control) => {
        state.watch(
          () => control.classList.contains('w--open'),
          (expanded) => {
            control.setAttribute('data-tdb-expanded', String(expanded));
            const spacer = control.closest('.navbar10_menu-dropdown')?.nextElementSibling;
            if (spacer?.matches('.accordion-spacer'))
              spacer.setAttribute('data-tdb-expanded', String(expanded));
          },
        );
      });
    });
  }
  window.TDBNavbarNative = Object.freeze({ version: '2.0.0' });
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

/* Native sticky category and treatment headers share the disclosure/navbar
 * controllers. An approaching open treatment pushes its category out of view. */
(() => {
  function start() {
    const sections = [...document.querySelectorAll('[data-tdb-price-section]')];
    if (!sections.length) return;
    const navbar = document.querySelector('.navbar10_component');
    const categories = new Map(
      sections.map((section) => [
        section,
        {
          heading: section.querySelector(':scope > [data-tdb-disclosure-trigger]'),
          treatments: [...section.querySelectorAll('[data-tdb-price-trigger]')],
          closing: null,
        },
      ]),
    );
    let active = null;
    let anchor = null;
    let approaching = false;
    let waitingForScroll = false;
    let frame = 0;
    function pushCategoryHeadings(returningHeading) {
      // Read all geometry before writing. Native sticky positioning owns the
      // pin; this collision offset only makes room for an expanded treatment.
      const positions = [...categories.values()].map((category) => {
        const { heading, treatments } = category;
        let push = 0;
        if (heading?.getAttribute('aria-expanded') === 'true') {
          const height = heading.getBoundingClientRect().height;
          for (const trigger of treatments) {
            if (
              (trigger.getAttribute('aria-expanded') !== 'true' && trigger !== category.closing) ||
              trigger.closest('[hidden],[inert]')
            )
              continue;
            const item = trigger.closest('[data-tdb-disclosure-item]');
            if (!item) continue;
            const rect = item.getBoundingClientRect();
            if (trigger === category.closing && (rect.top >= height || rect.bottom <= 0))
              category.closing = null;
            push = Math.min(
              push,
              -Math.min(height, Math.max(0, height - rect.top), Math.max(0, rect.bottom)),
            );
          }
        }
        return { heading, value: `${Math.round(push * 100) / 100}px` };
      });
      for (const { heading, value } of positions) {
        if (heading && heading.style.getPropertyValue('--tdb-price-category-push') !== value) {
          if (
            heading === returningHeading &&
            parseFloat(value) >
              (parseFloat(heading.style.getPropertyValue('--tdb-price-category-push')) || 0)
          )
            heading.setAttribute('data-tdb-price-returning', '');
          heading.style.setProperty('--tdb-price-category-push', value);
        }
      }
    }
    function clearCategoryReturns() {
      for (const { heading } of categories.values())
        heading?.removeAttribute('data-tdb-price-returning');
    }
    for (const { heading } of categories.values())
      heading?.addEventListener('transitionend', (event) => {
        if (event.target === heading && event.propertyName === 'transform')
          heading.removeAttribute('data-tdb-price-returning');
      });
    const eligible = (section) => {
      const { heading, treatments } = categories.get(section);
      const categoryOpen = heading?.getAttribute('aria-expanded') === 'true';
      const treatmentOpen = treatments.some(
        (trigger) =>
          trigger.getAttribute('aria-expanded') === 'true' && !trigger.closest('[hidden],[inert]'),
      );
      if (!categoryOpen && !treatmentOpen) return false;
      const rect = section.getBoundingClientRect();
      const visible = rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
      if (section === anchor && visible) approaching = false;
      const categoryAtChrome = categoryOpen && rect.top <= (navbar?.offsetHeight || 0);
      return (
        (visible && (treatmentOpen || categoryAtChrome || section === anchor)) ||
        (section === anchor && approaching)
      );
    };
    function release() {
      if (!active) return;
      active = null;
      anchor = null;
      approaching = false;
      waitingForScroll = false;
      window.TDBNavScroll?.release({ respectDirection: true });
      document.documentElement.classList.remove('tdb-slider-focus');
    }
    function sync(returningHeading) {
      pushCategoryHeadings(returningHeading);
      const next = (anchor && eligible(anchor) && anchor) || sections.find(eligible);
      if (
        !waitingForScroll &&
        next === active &&
        (!next || document.documentElement.classList.contains('tdb-slider-focus'))
      )
        return;
      if (!next) return waitingForScroll ? undefined : release();
      active = next;
      waitingForScroll = false;
      // The shared focus class moves the handle away without discarding its
      // scroll pose. Only close a fully open form; a peek must survive release.
      if (document.querySelector('#tdb-vip-drawer.is-open')) window.TDBVIPDrawer?.close?.();
      window.TDBNavScroll?.focus(release, () => !!active && eligible(active));
      document.documentElement.classList.add('tdb-slider-focus');
    }
    function schedule() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        sync();
      });
    }
    document.addEventListener('tdb:price-anchor', (event) => {
      if (!sections.includes(event.target)) return;
      anchor = event.target;
      approaching = true;
      sync();
    });
    // Native anchor scrolling owns movement/history/focus. A fresh gesture can
    // interrupt that journey; never leave an offscreen destination holding chrome.
    function interruptAnchor(event) {
      if (
        event.type === 'keydown' &&
        !['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape'].includes(
          event.key,
        )
      )
        return;
      // A click-driven return can ease into place; a fresh scroll gesture must
      // immediately resume the existing geometry-driven sticky handover.
      clearCategoryReturns();
      if (!approaching) return;
      approaching = false;
      sync();
    }
    for (const type of ['pointerdown', 'touchstart', 'wheel', 'keydown'])
      document.addEventListener(type, interruptAnchor, { capture: true, passive: true });
    document.addEventListener('tdb:disclosure-change', (event) => {
      const category = categories.get(event.target.closest('[data-tdb-price-section]'));
      if (!category) return;
      let returningHeading = null;
      category.heading?.removeAttribute('data-tdb-price-returning');
      if (event.target.hasAttribute('data-tdb-price-trigger')) {
        if (
          event.target.getAttribute('aria-expanded') === 'true' &&
          category.closing &&
          category.closing !== event.target
        )
          returningHeading = category.heading;
        // Closing is not scroll intent. Keep the row the user just pressed
        // uncovered until it naturally clears the sticky category's band.
        category.closing =
          event.target.getAttribute('aria-expanded') === 'false' &&
          parseFloat(category.heading?.style.getPropertyValue('--tdb-price-category-push')) < 0
            ? event.target
            : null;
      } else if (category.heading?.getAttribute('aria-expanded') !== 'true')
        category.closing = null;
      if (active && !sections.some(eligible)) {
        // Closing changes layout, not scroll intent. Leave every chrome surface
        // parked and restart the shared navigation distance counters. Observer
        // callbacks caused by the collapse must not reveal them either.
        waitingForScroll = true;
        window.TDBNavScroll?.focus(
          release,
          () => !waitingForScroll && !!active && eligible(active),
        );
        return;
      }
      sync(returningHeading);
    });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(sync);
      sections.forEach((section) => observer.observe(section));
    }
    // An observer may enter at the exact edge (zero visible area) and then
    // emit nothing as the section moves further in. Recheck on scroll in
    // either direction; closed categories never need a geometry read.
    window.addEventListener(
      'scroll',
      () => {
        if (waitingForScroll && !window.TDBNavScroll) return release();
        schedule();
      },
      { passive: true },
    );
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('pagehide', () => {
      cancelAnimationFrame(frame);
      frame = 0;
      clearCategoryReturns();
      release();
    });
    // The first disclosure pass may have opened a deep link before this owner
    // was listening. Replay only the current hash after all listeners exist.
    window.TDBDisclosure?.openHash(location.hash);
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

/* Native mobile-menu lock, available before consent and through enhancement. */
window.TDBNavbarState.whenReady(() => {
  'use strict';
  const nav = document.querySelector('[data-tdb-navbar-native]');
  if (!nav || nav.hasAttribute('data-tdb-nav-scroll-lock')) return;
  const state = window.TDBNavbarState.forNav(nav);
  const button = nav.querySelector('.w-nav-button');
  const menu = nav.querySelector('.w-nav-menu');
  if (!button || !menu) return;
  let release = null,
    suspended = false;
  nav.setAttribute('data-tdb-nav-scroll-lock', '');
  function sync() {
    const open =
      !suspended &&
      !state.desktop.matches &&
      (button.classList.contains('w--open') || menu.hasAttribute('data-nav-menu-open'));
    if (open && !release)
      release = window.TDBScrollLock?.acquire({
        allow: () => [menu, nav.querySelector('.w-nav-overlay')],
      });
    else if (!open && release) {
      release();
      release = null;
    }
  }
  state.watch(
    () =>
      [
        state.desktop.matches,
        button.classList.contains('w--open'),
        menu.hasAttribute('data-nav-menu-open'),
      ].join('|'),
    sync,
  );
  // The head consent bundle normally precedes this deferred footer bundle.
  // Recover an already-open menu if the shared owner arrives late.
  if (!window.TDBScrollLock)
    document
      .querySelector('script[data-tdb-consent-js]')
      ?.addEventListener('load', sync, { once: true });
  addEventListener('pagehide', () => {
    suspended = true;
    sync();
  });
  addEventListener('pageshow', () => {
    suspended = false;
    sync();
  });
});

/* Essential native navigation. Consent/runtime own eligibility and downloads. */
window.TDBNavbarState.whenReady(() => {
  'use strict';
  const nav = document.querySelector('.navbar10_component');
  if (!nav || window.TDBNavbarLoader || window.TDBNavbar) return;
  // Install the basic-menu lock before any open state can be applied.
  if (!document.querySelector('style[data-tdb-basic-nav-lock]')) {
    const lockStyle = document.createElement('style');
    lockStyle.setAttribute('data-tdb-basic-nav-lock', '');
    lockStyle.textContent = 'html[data-tdb-nav-basic-open]{overflow:hidden}';
    document.head.append(lockStyle);
  }
  const state = window.TDBNavbarState.forNav(nav);
  const html = document.documentElement;
  const duration = nav.getAttribute('data-duration');
  const transparent = nav.getAttribute('transparent-nav') === 'true';
  const surfaces = [
    ...nav.querySelectorAll('#nav-button-link,.navbar10_logo-link,.navbar10_link,.menu-icon5'),
    nav,
  ].map((node) => [node, node.classList.contains('is-trans')]);
  let installer,
    schedule,
    stopWatching,
    requested = false,
    queued = false,
    ready = false,
    open = false;
  const isOpen = () =>
    Boolean(
      nav.querySelector('.w-nav-button.w--open,.w-dropdown-toggle.w--open,[data-nav-menu-open]'),
    );
  function setDuration(value) {
    nav.setAttribute('data-duration', String(value));
    const config = window.jQuery?.data(nav, '.w-nav')?.config;
    if (config) config.duration = Number(value);
  }
  function sync() {
    if (ready) return;
    const next = isOpen();
    if (next !== open) {
      open = next;
      html.toggleAttribute('data-tdb-nav-basic-open', open);
      if (transparent)
        surfaces.forEach(([node, original]) => node.classList.toggle('is-trans', open || original));
    }
    if (open || !requested || !installer || queued) return;
    queued = true;
    Promise.resolve()
      .then(() =>
        schedule(() => {
          // A user can open the native menu while an idle callback is waiting.
          if (ready || isOpen()) return;
          setDuration(duration || 500);
          installer();
          // Basic-mode closes create a Tram controller whose inherited transition
          // is "none". Reusing it produces an invalid "none, transform ..." list.
          // Reset only this closed menu so its next use reads the enhanced styles.
          const menu = nav.querySelector('.w-nav-menu');
          if (menu && typeof window.tram === 'function') {
            window.tram(menu).destroy();
            menu.style.removeProperty('transition');
          }
          ready = true;
          stopRetrying();
          stopWatching?.();
          html.removeAttribute('data-tdb-nav-basic-open');
          nav.removeAttribute('data-tdb-nav-basic');
          nav.setAttribute('data-tdb-nav-enhanced', '');
        }),
      )
      .catch((error) => {
        if (!ready) {
          setDuration(0);
          nav.addEventListener('pointerdown', retry, { passive: true });
          nav.addEventListener('focusin', retry);
          window.addEventListener('online', retry);
        }
        console.warn('TDB navbar: retaining native navigation.', error);
      })
      .finally(() => {
        queued = false;
      });
  }
  function retry() {
    sync();
  }
  function stopRetrying() {
    nav.removeEventListener('pointerdown', retry);
    nav.removeEventListener('focusin', retry);
    window.removeEventListener('online', retry);
  }
  nav.querySelectorAll('.navbar10_blog-item-image').forEach((image) => {
    image.sizes = '(max-width: 479px) 100vw, (max-width: 991px) 50vw, 22vw';
  });
  nav.setAttribute('data-tdb-nav-basic', '');
  setDuration(0);
  (window.Webflow ||= []).push(() => {
    if (!ready) setDuration(0);
  });
  stopWatching = state.watch(isOpen, sync);
  window.TDBNavbarLoader = Object.freeze({
    version: '2.0.3',
    prepare: () => window.TDBRuntime?.enhanceNavbar?.() || Promise.resolve(false),
    register(callback) {
      if (!ready) {
        installer = callback;
        sync();
      }
    },
    activate(background) {
      if (ready) return;
      schedule = background;
      requested = true;
      sync();
    },
    status: () => ({
      ready,
      registered: Boolean(installer),
      waitingForClose: requested && !ready,
      decided: Boolean(window.TDBConsent?.allows()),
    }),
  });
  window.dispatchEvent(new Event('tdb:navbar-ready'));
});
