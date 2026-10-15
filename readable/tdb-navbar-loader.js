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
    document.documentElement.classList.toggle(
      'tdb-phone-landscape',
      touch.matches && shortSide > 0 && shortSide <= 600 && rotated,
    );
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
    function i(e) {
      (!(e = Boolean(e)) && r.contains(document.activeElement) && t.focus({ preventScroll: !0 }),
        (r.hidden = !e),
        (r.inert = !e),
        r.setAttribute('aria-hidden', String(!e)),
        t.setAttribute('aria-expanded', String(e)),
        r.classList.toggle('is-open', e),
        t.closest('[data-tdb-disclosure-item]')?.classList.toggle('is-open', e),
        t.querySelector('[data-tdb-chevron]')?.classList.toggle('is-open', e));
    }
    (t.setAttribute('aria-controls', n(r)), r.setAttribute('aria-labelledby', n(t)));
    const d = (e) => {
        e.defaultPrevented ||
          'true' === t.getAttribute('aria-disabled') ||
          (e.preventDefault(),
          t
            .closest('[data-tdb-disclosure-item]')
            ?.setAttribute('data-tdb-disclosure-interacted', ''),
          i('true' !== t.getAttribute('aria-expanded')));
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
  ((window.TDBDisclosure = Object.freeze({
    version: '1.2.1',
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
  })),
    'loading' === document.readyState
      ? document.addEventListener('DOMContentLoaded', () => r(), { once: !0 })
      : r());
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
