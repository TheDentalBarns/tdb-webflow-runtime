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
/* Price sections use the same disclosure and navbar controllers. Opening a
 * treatment owns focus only while that category is visible and expanded. */
(() => {
  function start() {
    const sections = [...document.querySelectorAll('[data-tdb-price-section]')];
    if (!sections.length) return;
    let active = null;
    let anchor = null;
    let approaching = false;
    let waitingForScroll = false;
    let frame = 0;
    const eligible = (section) => {
      if (
        !(
          section === anchor &&
          section.querySelector(':scope > [data-tdb-disclosure-trigger][aria-expanded="true"]')
        ) &&
        ![...section.querySelectorAll('[data-tdb-price-trigger][aria-expanded="true"]')].some(
          (trigger) => !trigger.closest('[hidden],[inert]'),
        )
      )
        return false;
      const rect = section.getBoundingClientRect();
      const visible = rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
      if (section === anchor && visible) approaching = false;
      return visible || (section === anchor && approaching);
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
    function sync() {
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
        !approaching ||
        (event.type === 'keydown' &&
          !['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape'].includes(
            event.key,
          ))
      )
        return;
      approaching = false;
      sync();
    }
    for (const type of ['pointerdown', 'touchstart', 'wheel', 'keydown'])
      document.addEventListener(type, interruptAnchor, { capture: true, passive: true });
    document.addEventListener('tdb:disclosure-change', (event) => {
      if (!event.target.closest('[data-tdb-price-section]')) return;
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
      sync();
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
