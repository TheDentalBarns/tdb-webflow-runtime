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
