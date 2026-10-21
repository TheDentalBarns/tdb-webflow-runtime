/* Native layout and presentation state. Uses the existing shared phone classifier. */
window.TDBParallaxPresentation ||= (() => {
  const e = new Set(),
    t = new WeakMap(),
    r = matchMedia('(max-width:767px) and (orientation:portrait)'),
    n = matchMedia('(orientation:landscape)'),
    i = matchMedia('(min-width:992px)'),
    a = (e) =>
      e?.classList.contains('tdb-service-parallax') || e?.hasAttribute('data-tdb-treatment');
  function s(e, r) {
    let n = t.get(e);
    (n ||
      ((n = {
        slides: [],
        rows: [],
        layers: new WeakMap(),
        groups: new Map(),
        current: new Set(),
      }),
      t.set(e, n)),
      r && (n.swiper = r));
    const i = Array.from(n.swiper?.slides || e.querySelectorAll('.swiper-slide'));
    return (
      (i.length === n.slides.length && i.every((e, t) => e === n.slides[t])) ||
        ((n.slides = i),
        n.groups.clear(),
        (n.rows = i.map((e) => {
          let t = n.layers.get(e);
          t ||
            ((t = {
              blur: e.querySelector('.tdb-treatment-blur'),
              copies: Array.from(e.querySelectorAll('[data-tdb-service-copy]')),
            }),
            n.layers.set(e, t));
          for (const [e, r] of [
            ['moving', 'is-moving'],
            ['entry', 'is-entry-pending'],
          ])
            void 0 !== n[e] && t.copies.forEach((t) => t.classList.toggle(r, n[e]));
          const r = e.getAttribute('data-swiper-slide-index') ?? e;
          return (
            n.groups.has(r) || n.groups.set(r, []),
            t.blur && n.groups.get(r).push(t.blur),
            t
          );
        })),
        (n.current = new Set(
          n.rows.map((e) => e.blur).filter((e) => e?.classList.contains('is-current')),
        ))),
      n
    );
  }
  function o(e, t, r, n) {
    const i = s(e);
    i[t] !== n &&
      ((i[t] = n), i.rows.forEach((e) => e.copies.forEach((e) => e.classList.toggle(r, n))));
  }
  const l = matchMedia('(pointer: coarse)');
  function c(e) {
    const t = n.matches && document.documentElement.classList.contains('tdb-phone-landscape');
    (e
      .querySelectorAll(
        '.tdb-service-content,.tdb-service-heading-row,.tdb-service-title,.tdb-service-copy,.tdb-service-link-source,.tdb-service-controls,.tdb-service-buttons,.tdb-service-cta',
      )
      .forEach((e) => e.classList.toggle('is-phone-landscape', t)),
      (e.dataset.tdbServiceLayout = t
        ? 'phone-landscape'
        : r.matches
          ? 'portrait'
          : i.matches
            ? 'desktop'
            : 'tablet'));
  }
  function u() {
    e.forEach((t) => {
      t.isConnected ? c(t) : e.delete(t);
    });
  }
  function p() {
    document.querySelectorAll('.tdb-service-parallax,[data-tdb-treatment]').forEach((t) => {
      (e.add(t), c(t));
    });
  }
  return (
    'loading' === document.readyState
      ? document.addEventListener('DOMContentLoaded', p, {
          once: !0,
        })
      : p(),
    l.addEventListener('change', u),
    window.addEventListener('resize', u, {
      passive: !0,
    }),
    window.addEventListener('orientationchange', u),
    screen.orientation?.addEventListener('change', u),
    r.addEventListener('change', u),
    n.addEventListener('change', u),
    i.addEventListener('change', u),
    {
      prepare: function (t) {
        a(t) &&
          (e.add(t),
          c(t),
          t
            .querySelectorAll(
              '.tdb-service-controls,.tdb-service-cta,.tdb-treatment-controls,.tdb-treatment-cta',
            )
            .forEach((e) => e.classList.add('is-ready')));
      },
      bind: function (r, n) {
        if (!a(r)) return;
        const i = () => {
          if (r.hasAttribute('data-tdb-treatment')) {
            const e = s(r, n),
              t = n.slides[n.activeIndex],
              i = t?.getAttribute('data-swiper-slide-index') ?? t,
              a = new Set(e.groups.get(i) || []);
            return (
              e.current.forEach((e) => {
                a.has(e) || e.classList.remove('is-current');
              }),
              a.forEach((t) => {
                e.current.has(t) || t.classList.add('is-current');
              }),
              void (e.current = a)
            );
          }
          const e = n.slides[n.activeIndex]?.getAttribute('data-swiper-slide-index');
          n.slides.forEach((t, r) =>
            t
              .querySelector('.tdb-service-card,.tdb-treatment-blur')
              ?.classList.toggle(
                'is-current',
                null == e ? r === n.activeIndex : t.getAttribute('data-swiper-slide-index') === e,
              ),
          );
        };
        (c(r),
          i(),
          n.on('slideChange loopFix resize update', i),
          n.on('beforeDestroy', () => {
            (e.delete(r),
              t.delete(r),
              n.off('slideChange loopFix resize update', i),
              r
                .querySelectorAll(
                  '.tdb-service-controls,.tdb-service-cta,.tdb-treatment-controls,.tdb-treatment-cta',
                )
                .forEach((e) => e.classList.remove('is-ready')));
          }));
      },
      setMoving: function (e, t) {
        if (e.hasAttribute('data-tdb-treatment')) return o(e, 'moving', 'is-moving', t);
        a(e) &&
          e
            .querySelectorAll('[data-tdb-service-copy]')
            .forEach((e) => e.classList.toggle('is-moving', t));
      },
      setEntry: function (e, t) {
        if (e.hasAttribute('data-tdb-treatment')) return o(e, 'entry', 'is-entry-pending', t);
        a(e) &&
          e
            .querySelectorAll('[data-tdb-service-copy]')
            .forEach((e) => e.classList.toggle('is-entry-pending', t));
      },
    }
  );
})();

/* Early CTA destinations, browser-Back pose and intent queue. Preserve before lazy motion. */
(() => {
  const e = window.TDBParallaxPresentation;
  window.TDBParallaxControls ||= (() => {
    const t = new WeakMap(),
      r = window.location.pathname.replace(/\/+$/, '') || '/',
      n = '/' === r || '/location' === r,
      i = (e) =>
        n ||
        e.classList.contains('tdb-service-parallax') ||
        e.hasAttribute('data-tdb-banner-parallax');
    return {
      prepare: function (n, a = n.querySelector(':scope > .swiper')) {
        if (!i(n) || !a) return null;
        if (t.has(n)) return t.get(n);
        const s =
          n.hasAttribute('data-tdb-treatment') || n.classList.contains('tdb-service-parallax');
        !(function (e) {
          if (!i(e)) return;
          const t = matchMedia('(max-width:767px) and (orientation:portrait)').matches;
          s ||
            (document.documentElement.classList.toggle('tdb-slider-next', t),
            document.documentElement.classList.toggle(
              'tdb-slider-desktop',
              matchMedia('(min-width:768px)').matches,
            ));
          const r = e.querySelector(':scope > .swiper'),
            n = e.querySelector(':scope > .swiper_functions-btm.hide');
          (!s && t && r && n && !e.hasAttribute('data-tdb-banner-parallax') && r.appendChild(n),
            e.querySelectorAll('.swiper-btn-prev,.swiper-btn-next').forEach((e) => {
              ((e.tabIndex = 0),
                e.setAttribute('role', 'button'),
                e.setAttribute(
                  'aria-label',
                  e.matches('.swiper-btn-prev') ? 'Previous slide' : 'Next slide',
                ));
            }));
        })(n);
        const o = (function (e, n) {
          if (!i(e)) return null;
          const a = Array.from(
              n.querySelectorAll(
                ':scope > .swiper-wrapper > .swiper-slide:not(.swiper-slide-duplicate)',
              ),
            ),
            o = a.map((e) => {
              const t = e.querySelector(
                '.service-card-button-wrap a[href],a.tdb-treatment-source[href]',
              );
              return (
                t && {
                  href: t.getAttribute('href'),
                  target: t.getAttribute('target'),
                  rel: t.getAttribute('rel'),
                  label: t.textContent.replace(/\s+/g, ' ').trim(),
                  title:
                    e
                      .querySelector('.service-card-mobile-title,.tdb-treatment-title')
                      ?.textContent.trim() || '',
                }
              );
            }),
            d = n.querySelector('.service-card-button-wrap a[href],a.tdb-treatment-source[href]');
          if (!d) return null;
          const l =
              r + ':' + [...document.querySelectorAll('.parallax-swiper_component')].indexOf(e),
            c =
              'back_forward' === performance.getEntriesByType?.('navigation')[0]?.type
                ? history.state?.tdbParallax?.[l]
                : null,
            u = c?.href
              ? Number.isInteger(c.index) && o[c.index]?.href === c.href
                ? c.index
                : o.findIndex((e) => e?.href === c.href)
              : -1,
            p = u >= 0 ? u : 0,
            m = u >= 0;
          p &&
            (n.style.setProperty('--tdb-parallax-initial-index', String(p)),
            e.classList.contains('tdb-service-parallax') &&
              n
                .querySelector(':scope > .swiper-wrapper')
                ?.classList.add('tdb-parallax-initial-pose'));
          const b =
              e.querySelector(':scope > .tdb-service-cta,:scope > .tdb-treatment-cta') ||
              e
                .closest('[data-tdb-treatment-layout]')
                ?.querySelector(':scope > .tdb-treatment-cta'),
            h = b?.querySelector('[data-tdb-parallax-cta]');
          if (s && !h) return null;
          const v = h || d.cloneNode(!0);
          (h ||
            (v.removeAttribute('aria-hidden'),
            v.removeAttribute('tabindex'),
            v.removeAttribute('data-fade-slide'),
            v.classList.remove('fade', 'animate'),
            v.setAttribute('data-tdb-parallax-cta', ''),
            [v, ...v.querySelectorAll('[id]')].forEach((e) => e.removeAttribute('id'))),
            m && c.held && v.classList.add('is-touch-held', 'is-touch-input'));
          const f = b || document.createElement('div');
          (b || (f.className = 'tdb-parallax-cta-layer'),
            b ||
              ('/location' === window.location.pathname.replace(/\/$/, '') &&
                f.classList.add('is-location'),
              f.appendChild(v)));
          const w = [];
          (a.forEach((e, t) => {
            (e.setAttribute('data-tdb-parallax-cta-index', String(t)),
              s ||
                e.querySelectorAll('.showcase-content_btm a.button').forEach((e) => {
                  (w.push({
                    node: e,
                    parent: e.parentNode,
                    next: e.nextSibling,
                  }),
                    e.remove());
                }));
          }),
            b || (e.classList.add('has-static-parallax-cta'), e.appendChild(f)));
          let g = null,
            y = !1,
            x = !1,
            L = null,
            E = null,
            A = !1,
            S = null,
            B = !1,
            q = m && Boolean(c.held),
            C = !1,
            D = 0,
            T = !1;
          function M() {
            const e = history.state;
            if (null != e && ('object' != typeof e || Array.isArray(e))) return;
            const t = g?.slides[g.activeIndex],
              r = t ? Number(t.getAttribute('data-tdb-parallax-cta-index')) : p,
              n = o[r];
            if (n?.href)
              try {
                history.replaceState(
                  {
                    ...e,
                    tdbParallax: {
                      ...e?.tdbParallax,
                      [l]: {
                        index: r,
                        href: n.href,
                        held: v.classList.contains('is-touch-held'),
                      },
                    },
                  },
                  '',
                );
              } catch (e) {}
          }
          function k() {
            v.classList.contains('is-touch-held') && (v.classList.remove('is-touch-held'), M());
          }
          function _() {
            ((T = !1), (S = null), (B = !1), (C = !1));
          }
          function P() {
            (M(), _());
          }
          function R() {
            y ||
              'true' === v.getAttribute('aria-disabled') ||
              ((q = !0), v.classList.add('is-touch-input', 'is-touch-held'));
          }
          function I(t) {
            const r = t.touches[0];
            ((S = r
              ? {
                  x: r.clientX,
                  y: r.clientY,
                  inComponent: e.contains(t.target),
                }
              : null),
              (D = window.scrollY),
              (T = !1),
              (C = !1),
              S?.inComponent && (A = !0),
              v.contains(t.target) && R());
          }
          function N(e) {
            const t = e.touches[0];
            if (!S || !t) return;
            const r = Math.abs(t.clientX - S.x),
              n = Math.abs(t.clientY - S.y);
            (Math.max(r, n) > 8 && S.inComponent && ((C = !0), k()),
              n > 8 && n > r && ((T = !0), z()));
          }
          function j(e) {
            e.deltaY && ((D = window.scrollY), (T = !0));
          }
          function z() {
            !T || Math.abs(window.scrollY - D) < 2 || ((T = !1), k());
          }
          function O(t) {
            ((C = !1),
              e.contains(t.target) && (A = !0),
              (B = v.contains(t.target) && !y && 'true' !== v.getAttribute('aria-disabled')),
              'touch' === t.pointerType || 'pen' === t.pointerType
                ? B && R()
                : ((q = !1), v.classList.remove('is-touch-input'), k()));
          }
          function F() {
            B = !1;
          }
          function W() {
            (B && k(), (B = !1));
          }
          function Y() {
            ((q = !1), v.classList.remove('is-touch-input'), k());
          }
          function $() {
            const t = g?.slides[g.activeIndex] || a[p],
              r = t?.getAttribute('data-tdb-parallax-cta-index'),
              n = null == r ? null : o[Number(r)];
            if (
              (!h && e.hasAttribute('data-tdb-banner-parallax') && (v.hidden = !n?.href), !n?.href)
            )
              return (
                v.removeAttribute('href'),
                v.setAttribute('aria-disabled', 'true'),
                void (v.tabIndex = -1)
              );
            v.setAttribute('href', n.href);
            for (const e of ['target', 'rel'])
              n[e] ? v.setAttribute(e, n[e]) : v.removeAttribute(e);
            !h &&
              v.firstElementChild &&
              v.firstElementChild.textContent !== n.label &&
              (v.firstElementChild.textContent = n.label);
            const i = h ? (v.firstElementChild?.textContent || v.textContent).trim() : n.label;
            (v.setAttribute('aria-label', n.title ? `${i}: ${n.title}` : i),
              y ? v.setAttribute('aria-disabled', 'true') : v.removeAttribute('aria-disabled'),
              (v.tabIndex = y ? -1 : 0));
          }
          function U(e) {
            e.defaultPrevented || y || C || 'true' === v.getAttribute('aria-disabled')
              ? (e.preventDefault(), k())
              : ((q || 'touch' === e.pointerType || e.sourceCapabilities?.firesTouchEvents) && R(),
                M());
          }
          function V() {
            L &&
              !E &&
              window.TDBSliderLoader &&
              !x &&
              (E = window.TDBSliderLoader.load(e)
                .then(() => {
                  if (x || !e.isConnected) return;
                  if ((window.TDBSwiper?.mount('parallax', e), !g))
                    throw new Error('Parallax controls did not bind');
                  const t = L;
                  ((L = null),
                    e.querySelectorAll('.swiper-btn-prev,.swiper-btn-next').forEach((e) => {
                      e.classList.toggle(
                        'is-selected',
                        e.matches('prev' === t ? '.swiper-btn-prev' : '.swiper-btn-next'),
                      );
                    }),
                    'prev' === t ? g.slidePrev() : 'next' === t && g.slideNext());
                })
                .catch(() => {
                  L = null;
                })
                .finally(() => {
                  ((E = null), e.removeAttribute('aria-busy'));
                }));
          }
          function X(t) {
            const r = t.target.closest?.('.swiper-btn-prev,.swiper-btn-next');
            r &&
              ('keydown' !== t.type || ['Enter', ' '].includes(t.key)) &&
              (k(),
              (A = !0),
              g ||
                (t.preventDefault(),
                t.stopPropagation(),
                (A = !0),
                (L = r.matches('.swiper-btn-prev') ? 'prev' : 'next'),
                e.setAttribute('aria-busy', 'true'),
                V()));
          }
          function H() {
            ((x = !0),
              t.delete(e),
              g?.off('slideChange', K),
              g?.off('sliderFirstMove', k),
              v.removeEventListener('click', U),
              v.removeEventListener('pointerenter', G),
              v.removeEventListener('pointerleave', G),
              document.removeEventListener('pointerdown', O, !0),
              document.removeEventListener('pointerup', F, !0),
              document.removeEventListener('touchstart', I, !0),
              document.removeEventListener('touchmove', N, !0),
              document.removeEventListener('keydown', Y, !0),
              v.removeEventListener('pointercancel', W),
              e.removeEventListener('click', X, !0),
              e.removeEventListener('keydown', X, !0),
              window.removeEventListener('tdb:slider-loader-ready', V),
              window.removeEventListener('scroll', z),
              window.removeEventListener('wheel', j),
              window.removeEventListener('pagehide', P),
              window.removeEventListener('pageshow', _),
              !b && (f.remove(), e.classList.remove('has-static-parallax-cta')),
              b?.classList.remove('is-ready'),
              n.style.removeProperty('--tdb-parallax-initial-index'),
              a.forEach((e) => e.removeAttribute('data-tdb-parallax-cta-index')),
              w
                .slice()
                .reverse()
                .forEach(({ node: e, parent: t, next: r }) => {
                  t.insertBefore(e, r?.parentNode === t ? r : null);
                }));
          }
          function G(e) {
            h &&
              'mouse' === e.pointerType &&
              v.classList.toggle(
                'is-hovered',
                'pointerenter' === e.type && 'true' !== v.getAttribute('aria-disabled'),
              );
          }
          (v.addEventListener('click', U),
            document.addEventListener('pointerdown', O, {
              capture: !0,
              passive: !0,
            }),
            document.addEventListener('pointerup', F, {
              capture: !0,
              passive: !0,
            }),
            document.addEventListener('touchstart', I, {
              capture: !0,
              passive: !0,
            }),
            document.addEventListener('touchmove', N, {
              capture: !0,
              passive: !0,
            }),
            document.addEventListener('keydown', Y, !0),
            v.addEventListener('pointercancel', W),
            e.addEventListener('click', X, !0),
            e.addEventListener('keydown', X, !0),
            window.addEventListener('tdb:slider-loader-ready', V),
            window.addEventListener('scroll', z, {
              passive: !0,
            }),
            window.addEventListener('wheel', j, {
              passive: !0,
            }),
            window.addEventListener('pagehide', P),
            window.addEventListener('pageshow', _),
            $(),
            h && (v.addEventListener('pointerenter', G), v.addEventListener('pointerleave', G)));
          let J = v.getAttribute('href') ? p : -1;
          function K() {
            const e = g?.slides[g.activeIndex],
              t = Number(e?.getAttribute('data-tdb-parallax-cta-index'));
            (t !== J && k(), (J = t), $());
          }
          return {
            initialIndex: p,
            get skipEntry() {
              return m || A;
            },
            bind(e) {
              g !== e &&
                ((g = e),
                n
                  .querySelector(':scope > .swiper-wrapper')
                  ?.classList.remove('tdb-parallax-initial-pose'),
                g.on('slideChange', K),
                g.on('sliderFirstMove', k),
                g.on('beforeDestroy', H),
                $());
            },
            setBusy(e) {
              ((y = e), $());
            },
          };
        })(n, a);
        return (o && (t.set(n, o), e.prepare(n)), o);
      },
    };
  })();
})();

/* Native CMS stamps: independent scrolling, with selection following image progress. */
window.TDBTreatmentStamps ||= (() => {
  const instances = new WeakMap();
  function prepare(root) {
    if (!root.hasAttribute('data-tdb-treatment-postage')) return null;
    if (instances.has(root)) return instances.get(root);
    const layout = root.closest('[data-tdb-treatment-layout]') || root;
    const strip = layout.querySelector('[data-tdb-treatment-stamps]');
    const viewport = strip?.querySelector('.tdb-treatment-controls');
    const links = Array.from(strip?.querySelectorAll('[data-tdb-treatment-stamp]') || []);
    if (!viewport || !links.length) return null;
    const items = links.map((link) => link.closest('.tdb-treatment-card'));
    const track = items[0].parentElement;
    const mobile = matchMedia('(max-width: 767px)');
    let looped = false,
      cycle = 0,
      copies = [],
      allLinks = links;
    let swiper,
      automatic = true,
      offsets = [],
      width = 0,
      drag = null,
      suppressClick = false,
      ignoredClick = null;
    let selected = -1;
    let motionFrame = 0,
      returnOffset = 0,
      returnStarted = 0,
      returnDuration = 500,
      returnIndex = null,
      targetLeft = 0,
      momentum = 0,
      lastFrame = 0,
      momentumElapsed = 0;
    const animations = new Map();
    const opacityBefore = new Map(items.map((item) => [item, item.style.opacity]));
    const transitionBefore = new Map(items.map((item) => [item, item.style.transitionDuration]));
    const states = new WeakMap();
    const on = (type, listener, options) => viewport.addEventListener(type, listener, options);
    links.forEach((link, index) => {
      link.dataset.tdbStampIndex = String(index);
    });
    function configureLoop() {
      const enabled =
        mobile.matches &&
        root.getAttribute('data-tdb-treatment-loop') === 'true' &&
        links.length > 1;
      if (enabled === looped) return;
      stopMotion();
      copies.forEach((node) => {
        animations.get(node)?.cancel();
        animations.delete(node);
        node.remove();
      });
      copies = [];
      looped = enabled;
      if (enabled) {
        const copy = (item) => {
          const node = item.cloneNode(true);
          node.setAttribute('aria-hidden', 'true');
          node.removeAttribute('id');
          node.querySelectorAll('[id]').forEach((child) => child.removeAttribute('id'));
          node.querySelectorAll('a').forEach((link) => (link.tabIndex = -1));
          return node;
        };
        const before = items.map(copy),
          after = items.map(copy);
        track.prepend(...before);
        track.append(...after);
        copies = [...before, ...after];
      }
      allLinks = [...track.querySelectorAll('[data-tdb-treatment-stamp]')];
      selected = -1;
      automatic = true;
      drag = null;
    }
    function normalize() {
      if (!looped || !cycle) return;
      const before = viewport.scrollLeft;
      const after = cycle / 2 + ((((before - cycle / 2) % cycle) + cycle) % cycle);
      if (Math.abs(after - before) < 0.5) return;
      setScroll(before);
    }
    function setScroll(value) {
      // Wrap before assigning scrollLeft, so the browser never clamps a drag
      // at a physical end or interrupts its momentum at a recycled cycle.
      const next =
        looped && cycle
          ? cycle / 2 + ((((value - cycle / 2) % cycle) + cycle) % cycle)
          : Math.max(0, Math.min(value, viewport.scrollWidth - viewport.clientWidth));
      viewport.scrollLeft = next;
      if (drag) drag.left += next - value;
    }
    function stopMotion() {
      if (motionFrame) cancelAnimationFrame(motionFrame);
      motionFrame = 0;
      momentum = 0;
      returnOffset = 0;
      returnIndex = null;
    }
    function resumeAlignment(index = swiper?.realIndex) {
      if (mobile.matches && (!automatic || (returnIndex !== null && returnIndex !== index))) {
        stopMotion();
        returnOffset = null;
        returnIndex = index;
        returnDuration = window.TDBMotion?.reduced?.matches
          ? 0
          : window.TDBMotion?.duration?.(viewport.clientWidth) || 500;
      }
      automatic = true;
    }
    function returnStep(now) {
      motionFrame = 0;
      const elapsed = returnDuration ? Math.min(1, (now - returnStarted) / returnDuration) : 1;
      setScroll(targetLeft + returnOffset * Math.pow(1 - elapsed, 3));
      if (elapsed < 1) motionFrame = requestAnimationFrame(returnStep);
      else returnOffset = 0;
    }
    function align(value) {
      if (!looped)
        value = Math.max(0, Math.min(value, viewport.scrollWidth - viewport.clientWidth));
      targetLeft = value;
      if (returnOffset === null) {
        const difference = viewport.scrollLeft - value;
        returnOffset = cycle
          ? ((((difference + cycle / 2) % cycle) + cycle) % cycle) - cycle / 2
          : difference;
        returnStarted = performance.now();
      }
      if (returnOffset) {
        // Progress sampling and return easing share a single writer. Updating
        // the target must not repaint/cancel the same frame a second time.
        if (!motionFrame) motionFrame = requestAnimationFrame(returnStep);
      } else setScroll(value);
    }
    function coast(now) {
      motionFrame = 0;
      const dt = Math.min(32, Math.max(0, now - lastFrame));
      lastFrame = now;
      momentumElapsed += dt;
      const before = viewport.scrollLeft;
      setScroll(before + momentum * dt);
      if (!looped && viewport.scrollLeft === before) momentum = 0;
      momentum *= Math.exp(-dt / 150);
      if (Math.abs(momentum) > 0.015 && momentumElapsed < 800)
        motionFrame = requestAnimationFrame(coast);
      else momentum = 0;
    }
    function dim(item, active, heading = false) {
      if (!item) return;
      if (states.get(item) === active) return;
      states.set(item, active);
      if (!heading) {
        // Designer owns the opacity transition. Keep one stable target instead
        // of cancelling/replacing a filled animation on every selection.
        item.style.transitionDuration = window.TDBMotion?.reduced?.matches
          ? '0s'
          : transitionBefore.get(item) || '';
        item.style.opacity = active ? '1' : '0.5';
        return;
      }
      const property = heading ? 'color' : 'opacity';
      const current = getComputedStyle(item)[property];
      const target = heading ? (active ? '#ffffff' : 'rgba(255,255,255,0.5)') : active ? 1 : 0.5;
      animations.get(item)?.cancel();
      animations.set(
        item,
        item.animate([{ [property]: current }, { [property]: target }], {
          duration: window.TDBMotion?.reduced?.matches ? 0 : 200,
          fill: 'forwards',
        }),
      );
    }
    function selection() {
      if (!swiper || selected === swiper.realIndex) return;
      selected = swiper.realIndex;
      allLinks.forEach((link) => {
        const active = Number(link.dataset.tdbStampIndex) === selected;
        active ? link.setAttribute('aria-current', 'true') : link.removeAttribute('aria-current');
        dim(link.closest('.tdb-treatment-card'), active);
      });
      Array.from(swiper.slides || []).forEach((slide, index) => {
        const realIndex = Number(slide.getAttribute('data-swiper-slide-index') ?? index);
        dim(slide.querySelector('.tdb-treatment-title'), realIndex === selected, true);
      });
    }
    function bind() {
      const candidate = root.querySelector(':scope > .swiper')?.swiper;
      if (!candidate || candidate === swiper) return;
      swiper = candidate;
      swiper.on('slideChange', change);
      swiper.on('beforeDestroy', dispose);
      selection();
    }
    function change() {
      resumeAlignment();
      selection();
    }
    function measure() {
      configureLoop();
      bind();
      const first = items[0].getBoundingClientRect();
      width = first.width;
      offsets = items.map((item) => item.getBoundingClientRect().left - first.left);
      cycle = looped ? copies[items.length].getBoundingClientRect().left - first.left : 0;
      selection();
      return width;
    }
    function paint(index, markerX, trackWidth) {
      bind();
      if (!automatic || !offsets.length || drag) return;
      const last = links.length - 1;
      if (returnIndex !== null) {
        // Manual browsing hands back to one fixed destination. Following the
        // moving image progress as well would send an already-aligned stamp
        // away and back while the main slide catches up.
        const marker = last ? (returnIndex * (trackWidth - width)) / last : 0;
        align((looped ? cycle : 0) + offsets[returnIndex] - marker);
        if (!motionFrame && !swiper?.animating && Math.abs(index - returnIndex) < 0.001)
          returnIndex = null;
        return;
      }
      if (looped && cycle > 0) {
        const value = ((index % links.length) + links.length) % links.length;
        const lower = Math.floor(value),
          fraction = value - lower;
        const next = lower === last ? cycle : offsets[lower + 1];
        const offset = offsets[lower] + (next - offsets[lower]) * fraction;
        // Across the seam continue forward into the next CMS copy. Recycling
        // a whole cycle is visually identical, including during a native drag.
        const marker = lower === last ? (trackWidth - width) * (1 - fraction) : markerX;
        align(cycle + offset - marker);
        return;
      }
      // The loop's duplicated images cross the seam; stamps remain a finite list.
      const value = Math.min(last, Math.max(0, index));
      const lower = Math.floor(value),
        upper = Math.min(last, lower + 1);
      const offset = offsets[lower] + (offsets[upper] - offsets[lower]) * (value - lower);
      const alignedMarker = index > last ? trackWidth - width : markerX;
      align(offset - alignedMarker);
    }
    function selectStamp(link) {
      if (!link || !viewport.contains(link)) return false;
      bind();
      if (!swiper) {
        window.TDBSwiper?.mount('parallax', root);
        bind();
      }
      if (!swiper) return false; // Keep the native CMS link fallback.
      const index = Number(link.dataset.tdbStampIndex);
      if (!Number.isInteger(index) || index < 0 || index >= links.length) return false;
      resumeAlignment(index);
      if (swiper.params?.loop) swiper.slideToLoop(index);
      else swiper.slideTo(index);
      const progress = root.querySelector('[data-tdb-native-progress]');
      const trackWidth = progress.getBoundingClientRect().width;
      if (swiper.realIndex === index && !swiper.animating) {
        measure();
        paint(
          index,
          links.length < 2 ? 0 : (index * (trackWidth - width)) / (links.length - 1),
          trackWidth,
        );
      }
      return true;
    }
    function choose(event) {
      const link = event.target.closest('[data-tdb-treatment-stamp]');
      if (
        !link ||
        !viewport.contains(link) ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const ignored = ignoredClick;
      ignoredClick = null;
      // Ignore only the follow-up click for a handled touch or drag, never a
      // new tap, a keyboard activation, or a permanently missing click.
      if (
        ignored &&
        event.detail > 0 &&
        performance.now() < ignored.until &&
        (typeof event.pointerId !== 'number' || event.pointerId === ignored.id)
      ) {
        event.preventDefault();
        return;
      }
      if (selectStamp(link)) event.preventDefault();
    }
    function down(event) {
      if (event.button !== 0 || event.isPrimary === false) return;
      stopMotion();
      automatic = false;
      suppressClick = false;
      ignoredClick = null;
      if (mobile.matches || event.pointerType === 'mouse')
        drag = {
          id: event.pointerId,
          type: event.pointerType,
          link: event.target.closest?.('[data-tdb-treatment-stamp]'),
          x: event.clientX,
          y: event.clientY,
          left: viewport.scrollLeft,
          lastX: event.clientX,
          lastTime: performance.now(),
          velocity: 0,
        };
    }
    function move(event) {
      if (!drag || event.pointerId !== drag.id) return;
      const delta = event.clientX - drag.x;
      if (!suppressClick && Math.abs(event.clientY - drag.y) > Math.max(8, Math.abs(delta))) {
        drag = null;
        return;
      }
      if (!suppressClick && Math.abs(delta) > (mobile.matches ? 8 : 4)) {
        suppressClick = true;
        viewport.setPointerCapture(event.pointerId);
      }
      if (suppressClick) {
        const now = performance.now(),
          dt = Math.max(1, now - drag.lastTime);
        const speed = Math.max(-3.5, Math.min(3.5, (drag.lastX - event.clientX) / dt));
        drag.velocity = 0.4 * drag.velocity + 0.6 * speed;
        drag.lastX = event.clientX;
        drag.lastTime = now;
        setScroll(drag.left - delta);
        event.preventDefault();
      }
    }
    function up(event) {
      if (!drag || event.pointerId !== drag.id) return;
      // Touch starts with implicit capture on the image/link. Its release
      // bubbles when the viewport takes capture; the gesture is still active.
      if (event.type === 'lostpointercapture' && event.target !== viewport) return;
      const id = drag.id;
      const tap =
        mobile.matches &&
        drag.type === 'touch' &&
        event.type === 'pointerup' &&
        !suppressClick &&
        Math.abs(event.clientX - drag.x) <= 8 &&
        Math.abs(event.clientY - drag.y) <= 8 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        !event.altKey &&
        drag.link;
      ignoredClick =
        suppressClick && event.type === 'pointerup'
          ? { id: drag.id, until: performance.now() + 500 }
          : null;
      if (
        drag &&
        mobile.matches &&
        suppressClick &&
        event.type === 'pointerup' &&
        performance.now() - drag.lastTime < 100 &&
        !window.TDBMotion?.reduced?.matches
      ) {
        momentum = drag.velocity;
        lastFrame = performance.now();
        momentumElapsed = 0;
        motionFrame = requestAnimationFrame(coast);
      }
      drag = null;
      suppressClick = false;
      // A clean touch release is the activation. Mobile browsers may withhold
      // their later click after scrolling; waiting for it loses the first tap.
      if (tap && selectStamp(tap)) {
        event.preventDefault();
        ignoredClick = { id, until: performance.now() + 500 };
        window.TDBSliderFocus?.resume({ y: window.scrollY, click: { target: tap } });
      }
    }
    function wheel() {
      stopMotion();
      automatic = false;
    }
    function preventDrag(event) {
      event.preventDefault();
    }
    function dispose() {
      stopMotion();
      for (const [type, fn] of listeners) viewport.removeEventListener(type, fn);
      swiper?.off('slideChange', change);
      swiper?.off('beforeDestroy', dispose);
      animations.forEach((animation) => animation.cancel());
      opacityBefore.forEach((opacity, item) => {
        item.style.opacity = opacity;
        item.style.transitionDuration = transitionBefore.get(item);
      });
      copies.forEach((node) => node.remove());
      links.forEach((link) => {
        delete link.dataset.tdbStampIndex;
      });
      instances.delete(root);
    }
    const listeners = [
      ['click', choose],
      ['pointerdown', down],
      ['pointermove', move],
      ['pointerup', up],
      ['pointercancel', up],
      ['lostpointercapture', up],
      ['wheel', wheel],
      ['dragstart', preventDrag],
      ['scroll', normalize],
    ];
    listeners.forEach(([type, fn]) => on(type, fn));
    const controller = { measure, paint, dispose };
    instances.set(root, controller);
    return controller;
  }
  return { version: '1.1.2', prepare };
})();

/* Native CMS text row follows rendered image geometry, including loop/width motion.
 * Designer owns the rows, typography, spacing and automatic content height.
 * This controller only mirrors the existing slider's horizontal motion/state.
 */
window.TDBTreatmentDetails ||= (() => {
  const instances = new WeakMap();
  function prepare(root) {
    if (!root.hasAttribute('data-tdb-treatment-postage')) return null;
    if (instances.has(root)) return instances.get(root);
    const owner = root.closest('[data-tdb-treatment-layout]');
    const viewport = owner?.querySelector('[data-tdb-treatment-details] .tdb-treatment-viewport');
    const track = viewport?.querySelector('.tdb-treatment-wrapper');
    if (!track) return null;
    const originals = [...track.children];
    let sources = [],
      rows = [],
      lastTransform = '',
      disposed = false;
    const colors = new Map();
    function rebuild(slides) {
      if (slides.length === sources.length && slides.every((s, i) => s.node === sources[i])) return;
      sources = slides.map((s) => s.node);
      colors.forEach((a) => a.cancel());
      colors.clear();
      const used = new Set();
      rows = slides.map((slide) => {
        const original = originals[slide.value];
        if (!original) return null;
        const duplicate =
          slide.node.classList.contains('swiper-slide-duplicate') || used.has(original);
        const node = duplicate ? original.cloneNode(true) : original;
        if (!duplicate) used.add(original);
        if (duplicate) {
          node.removeAttribute('id');
          node.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
        }
        node.dataset.tdbDetailIndex = String(slide.value);
        return {
          node,
          title: node.querySelector('.tdb-treatment-title'),
          copy: node.querySelector('[data-tdb-service-copy]'),
          active: null,
        };
      });
      track.replaceChildren(...rows.filter(Boolean).map((r) => r.node));
    }
    function paint(slides) {
      if (disposed || !slides.length) return;
      rebuild(slides);
      const origin = viewport.getBoundingClientRect().left;
      // Batch all layout reads before writes; use rendered (not target) positions.
      const boxes = slides.map((s) => s.node.getBoundingClientRect());
      const states = slides.map((s, i) => {
        const active = s.node.classList.contains('swiper-slide-active');
        const row = rows[i];
        return {
          active,
          copy: s.node.querySelector('[data-tdb-service-copy]'),
          color: row?.title && row.active !== active ? getComputedStyle(row.title).color : null,
        };
      });
      const transform = `translate3d(${boxes[0].left - origin}px,0,0)`;
      if (transform !== lastTransform) track.style.transform = lastTransform = transform;
      rows.forEach((row, i) => {
        if (!row) return;
        const box = boxes[i],
          next = boxes[i + 1];
        const width = Math.round(box.width * 1000) / 1000;
        const gap = Math.round((next ? Math.max(0, next.left - box.right) : 0) * 1000) / 1000;
        if (row.width !== width) row.node.style.width = (row.width = width) + 'px';
        if (row.gap !== gap) row.node.style.marginRight = (row.gap = gap) + 'px';
        for (const state of ['is-visible', 'is-moving', 'is-entry-pending'])
          row.copy?.classList.toggle(state, !!states[i].copy?.classList.contains(state));
        if (row.active !== states[i].active) {
          row.active = states[i].active;
          row.node.inert = !row.active;
          row.node.setAttribute('aria-hidden', String(!row.active));
          if (row.title) {
            colors.get(row.title)?.cancel();
            colors.set(
              row.title,
              row.title.animate(
                [
                  { color: states[i].color },
                  { color: row.active ? '#ffffff' : 'rgba(255,255,255,0.5)' },
                ],
                { duration: window.TDBMotion?.reduced?.matches ? 0 : 200, fill: 'forwards' },
              ),
            );
          }
        }
      });
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      colors.forEach((a) => a.cancel());
      track.style.removeProperty('transform');
      originals.forEach((node) => {
        node.style.removeProperty('width');
        node.style.removeProperty('margin-right');
        node.removeAttribute('data-tdb-detail-index');
        node.removeAttribute('aria-hidden');
        node.inert = false;
        node
          .querySelectorAll('.is-visible,.is-moving,.is-entry-pending')
          .forEach((e) => e.classList.remove('is-visible', 'is-moving', 'is-entry-pending'));
      });
      track.replaceChildren(...originals);
      instances.delete(root);
    }
    const api = { paint, dispose };
    instances.set(root, api);
    return api;
  }
  return { prepare };
})();

/* Native Designer slots; CMS facts come from each rendered treatment item.
 * No feed request or duplicated price table. Only the value spans animate.
 */
window.TDBTreatmentTicker ||= (() => {
  const instances = new WeakMap();
  const base = new URL('./', document.currentScript?.src || location.href);
  function prepare(root) {
    if (!root.hasAttribute('data-tdb-treatment-postage')) return null;
    if (instances.has(root)) return instances.get(root);
    const owner = root.closest('[data-tdb-treatment-layout]') || root;
    const position = root.querySelector('[data-tdb-treatment-position]');
    const current = position?.querySelector('[data-tdb-treatment-current]');
    const total = position?.querySelector('[data-tdb-treatment-total]');
    const price = owner.querySelector('[data-tdb-treatment-price]');
    const duration = owner.querySelector('[data-tdb-treatment-duration]');
    const slots = [current, price, duration];
    if (!slots.some(Boolean)) return null;
    const mobile = matchMedia('(max-width: 767px)');
    let swiper,
      mounted = false,
      disposed = false,
      previous = null,
      loading;
    const tickers = [];
    const clean = (text) =>
      String(text || '')
        .replace(/\s+/g, ' ')
        .trim();
    function paint(animate = true) {
      if (!mounted || !swiper || disposed) return;
      const slides = [...swiper.slides];
      const originals = slides.filter(
        (slide) => !slide.classList.contains('swiper-slide-duplicate'),
      );
      const index = Number(swiper.realIndex) || 0;
      const slide = originals.find(
        (slide, i) => Number(slide.getAttribute('data-swiper-slide-index') ?? i) === index,
      );
      const source = slide?.querySelector('[data-tdb-treatment-price-source]');
      const amount = clean(source?.getAttribute('data-tdb-treatment-price-source'));
      // Webflow's Low Price field renders a number, without a currency symbol.
      const formattedAmount = /^\d+(?:,\d{3})*(?:\.\d+)?$/.test(amount)
        ? new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            maximumFractionDigits: 2,
            minimumFractionDigits: 0,
          }).format(Number(amount.replaceAll(',', '')))
        : amount;
      const time = clean(
        slide
          ?.querySelector('[data-tdb-treatment-duration-source]')
          ?.getAttribute('data-tdb-treatment-duration-source'),
      );
      const values = [
        String(index + 1).padStart(2, '0'),
        formattedAmount
          ? /^from\b/i.test(formattedAmount)
            ? formattedAmount
            : 'From ' + formattedAmount
          : '',
        time,
      ];
      const direction =
        swiper.params?.loop && swiper.swipeDirection
          ? swiper.swipeDirection === 'prev'
            ? -1
            : 1
          : previous === null || index >= previous
            ? 1
            : -1;
      tickers.forEach((ticker, i) =>
        ticker?.update(values[i], direction, animate && mobile.matches && previous !== null),
      );
      if (total) total.textContent = String(originals.length).padStart(2, '0');
      position?.setAttribute('aria-label', `${index + 1} of ${originals.length}`);
      previous = index;
    }
    function mount() {
      if (mounted || disposed || !window.TDBNativeTicker || !window.TDBMotion) return;
      slots.forEach((slot, i) => {
        tickers[i] =
          slot &&
          window.TDBNativeTicker.mount(
            slot,
            i === 0
              ? {}
              : {
                  valueClass: 'tdb-smile-fact-value',
                  incomingClass: 'tdb-smile-fact-value',
                },
          );
      });
      mounted = true;
      paint(false);
    }
    function changed() {
      paint(true);
    }
    function resize() {
      paint(false);
    }
    function sync() {
      if (disposed) return;
      const candidate = root.querySelector(':scope > .swiper')?.swiper;
      if (candidate && candidate !== swiper) {
        swiper?.off('slideChange', changed);
        swiper?.off('beforeDestroy', dispose);
        swiper = candidate;
        previous = null;
        swiper.on('slideChange', changed);
        swiper.on('beforeDestroy', dispose);
        if (mounted) paint(false);
      }
      if (window.TDBNativeTicker) mount();
      else if (!loading && window.TDBModules) {
        loading = window.TDBModules.load(new URL('tdb-ticker.js', base), {
          ready: () => Boolean(window.TDBNativeTicker),
        })
          .then(mount)
          .catch(() => {
            loading = null;
          });
      }
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      swiper?.off('slideChange', changed);
      swiper?.off('beforeDestroy', dispose);
      mobile.removeEventListener('change', resize);
      tickers.forEach((ticker) => ticker?.destroy());
      instances.delete(root);
    }
    mobile.addEventListener('change', resize);
    const api = { sync, dispose };
    instances.set(root, api);
    sync();
    return api;
  }
  return { prepare };
})();

/* Per-component progress geometry; loaded with the full parallax plugin. */
window.TDBParallaxProgress ||= (() => {
  const e = '.tdb-service-parallax,[data-tdb-treatment]',
    t = new WeakMap();
  function r(r) {
    const n = r.querySelector(':scope > .swiper'),
      i = n?.querySelector(':scope > .swiper-wrapper');
    if (!i) return !1;
    const a = t.get(r);
    if (a?.wrapper === i) return !0;
    a?.dispose();
    const s = r.querySelector(':scope > [data-tdb-native-progress]');
    if (r.matches(e) && (!s || s.children.length < 2)) return !1;
    s || r.querySelector(':scope > .tdb-service-progress')?.remove();
    const o = !!r.closest('#All-treatments'),
      d = s || document.createElement('div'),
      l = s?.firstElementChild || document.createElement('span');
    s || ((d.className = 'tdb-service-progress'), (l.className = 'tdb-service-progress-fill'));
    const c = s?.children[1] || l.cloneNode();
    const stamps = window.TDBTreatmentStamps?.prepare(r);
    const details = window.TDBTreatmentDetails?.prepare(r);
    const ticker = window.TDBTreatmentTicker?.prepare(r);
    let stampWidth = 0;
    (o &&
      !r.hasAttribute('data-tdb-treatment') &&
      [l, c].forEach((e) => e.classList.add('is-treatment')),
      d.setAttribute('aria-hidden', 'true'),
      s || (d.append(l, c), r.append(d)));
    let u = !1,
      p = !1,
      m = null,
      b = null,
      h = [],
      v = 0,
      f = !0,
      w = !0,
      g = 0,
      y = 1;
    const x = window.TDBRenderedProgress.observe({
      track: i,
      paint: function () {
        const e = f;
        if (
          (e &&
            ((h = [...i.children]
              .filter((e) => e.classList.contains('swiper-slide'))
              .map((e, t) => {
                const r = e.getAttribute('data-swiper-slide-index') ?? String(t);
                return {
                  node: e,
                  index: r,
                  value: Number(r),
                };
              })),
            (v = new Set(h.map((e) => e.index)).size),
            (f = !1)),
          !v)
        )
          return (e && d.classList.remove('is-ready'), null);
        const t = n.getBoundingClientRect(),
          a = w
            ? (function (e) {
                if (
                  ((w = !1),
                  (y = window.devicePixelRatio || 1),
                  r.hasAttribute('data-tdb-treatment') ||
                    r.classList.contains('tdb-service-parallax'))
                )
                  return (
                    (g = d.getBoundingClientRect().width),
                    (stampWidth = stamps?.measure() || 0),
                    null
                  );
                const t = r.getBoundingClientRect(),
                  n = e.bottom - t.top - r.clientTop,
                  i = Math.ceil((o ? 0 : e.left) * y) / y,
                  a = Math.floor((o ? document.documentElement.clientWidth : e.right) * y) / y;
                return (
                  (g = Math.max(0, a - i)),
                  {
                    top: n,
                    left: i - t.left - r.clientLeft,
                  }
                );
              })(t)
            : null,
          s = o && (innerWidth < 768 || innerWidth >= 992),
          u = t.left + (s ? 0 : t.width / 2);
        let p = -1 / 0,
          x = 1 / 0,
          L = 0,
          E = 0,
          A = 0,
          S = h.length;
        for (; A < S; ) {
          const e = (A + S) >>> 1,
            t = h[e],
            r = t.node.getBoundingClientRect(),
            n = r.left + (s ? 0 : r.width / 2) - u;
          n < 0 ? ((p = n), (L = t.value), (A = e + 1)) : ((x = n), (E = t.value), (S = e));
        }
        const B = p === -1 / 0 ? E : x === 1 / 0 ? L : L + ((E - L + v) % v) * (-p / (x - p)),
          q = Math.min(g, stampWidth || Math.round((g * y) / v) / y),
          C = ((B % v) + v) % v,
          D = v <= 1 ? 0 : C <= v - 1 ? (C * (g - q)) / (v - 1) : g - q + (C - v + 1) * q,
          T = Math.round(D * y) / y;
        if (
          (a &&
            ((d.style.top = a.top + 'px'),
            (d.style.left = a.left + 'px'),
            (d.style.width = g + 'px')),
          e && d.classList.add('is-ready'),
          q !== b)
        ) {
          for (const e of [l, c]) e.style.width = q + 'px';
          b = q;
        }
        const M = T + ':' + g;
        M !== m &&
          ((l.style.transform = `translateX(${T}px)`),
          (c.style.transform = `translateX(${T - g}px)`),
          (m = M));
        stamps?.paint(C, T, g);
        details?.paint(h, t);
        ticker?.sync();
      },
      enabled: () => u && !p,
      onMutation: (e) => {
        for (const t of e)
          if (
            ('childList' === t.type && t.target === i) ||
            (t.target.parentElement === i &&
              ('data-swiper-slide-index' === t.attributeName ||
                ('class' === t.attributeName &&
                  t.target.classList.contains('swiper-slide') !==
                    h.some((e) => e.node === t.target))))
          ) {
            f = !0;
            break;
          }
      },
    });
    function L() {
      x.schedule();
    }
    const E = new IntersectionObserver(
      (e) => {
        ((u = e.some((e) => e.isIntersecting)), u ? S() : x.pause());
      },
      {
        rootMargin: '100px',
      },
    );
    function A() {
      (x.pause(), document.hidden || S());
    }
    function S() {
      ((w = !0), L());
    }
    (E.observe(n), document.addEventListener('visibilitychange', A));
    const B = new ResizeObserver(S);
    // Font/gutter changes can resize the CMS strip without changing the main
    // image frame. Keep loop distance current before recycling any stamp copies.
    if (stamps) {
      const strip = r
        .closest('[data-tdb-treatment-layout]')
        ?.querySelector('[data-tdb-treatment-stamps]');
      for (const node of strip?.querySelectorAll(
        '.tdb-treatment-controls,.tdb-treatment-wrapper,.tdb-treatment-card:first-child',
      ) || [])
        B.observe(node);
    }
    return (
      B.observe(n),
      window.addEventListener('resize', S, {
        passive: !0,
      }),
      S(),
      t.set(r, {
        wrapper: i,
        dispose() {
          ((p = !0),
            E.disconnect(),
            B.disconnect(),
            x.destroy(),
            stamps?.dispose(),
            details?.dispose(),
            ticker?.dispose(),
            document.removeEventListener('visibilitychange', A),
            window.removeEventListener('resize', S),
            s ? d.classList.remove('is-ready') : d.remove());
        },
      }),
      L(),
      !0
    );
  }
  return {
    refresh: function (t = document) {
      const n =
        e +
        ',.section_gallery14 .parallax-swiper_component:not(.tdb-banner-parallax),#All-treatments .tdb-banner-parallax';
      (t instanceof Element && t.matches(n) && r(t), t.querySelectorAll?.(n).forEach(r));
    },
  };
})();

/* Compatibility API retained for existing slider loaders and pinned plugins. */
(() => {
  if (window.TDBParallax) return;
  const presentation = window.TDBParallaxPresentation;
  const controls = window.TDBParallaxControls;
  function refresh(root = document) {
    if (root instanceof Element && root.matches('.parallax-swiper_component'))
      controls.prepare(root);
    root.querySelectorAll?.('.parallax-swiper_component').forEach((node) => controls.prepare(node));
    window.TDBParallaxProgress?.refresh(root);
  }
  window.TDBParallax = Object.freeze({
    version: '1.4.0',
    refresh,
    prepare: controls.prepare,
    bind: presentation.bind,
    setMoving: presentation.setMoving,
    setEntry: presentation.setEntry,
  });
})();

/* Preserved treatment matcher from deployed parallax 2afb6b9. */
(() => {
  'use strict';
  window.TDBTreatmentParallax = Object.freeze({
    version: '1.0.0',
    selector: '[data-tdb-treatment]',
    matches: (e) => !0 === e?.hasAttribute('data-tdb-treatment'),
  });
})();

/* Preserves 2afb6b9 globally and the 996e193 home overflow-viewport behavior. */
(() => {
  'use strict';
  if (window.TDBParallaxPlugin) return;
  const e = '.parallax-swiper_component',
    t = 'data-tdb-slider-init',
    i = '(min-width:768px)',
    a = '(max-width:767px) and (orientation:portrait)';
  (new Map(), new WeakSet());
  function n(e) {
    return e?.querySelector?.('.swiper') || null;
  }
  function r(e) {
    const i = n(e);
    return 'true' === e?.getAttribute?.(t) || Boolean(i?.swiper);
  }
  function s(e, i) {
    (e.setAttribute(t, 'true'), (e.dataset.tdbSliderType = i));
  }
  function o(t, i) {
    if (t.hasAttribute('data-tdb-treatment')) return window.TDBSwiper.nativeGap(t, i);
    if (t.classList.contains('tdb-service-parallax'))
      return window.TDBSwiper.nativeGap(t, i, '.tdb-service-slide,.tdb-treatment-slide');
    if (!matchMedia('(min-width:992px)').matches) return i;
    const a = t.matches('.section_smile-gallery [data-tdb-smile-slider]');
    return t.matches(e) || a ? window.TDBSwiper.nativeGap(t, i) : i;
  }
  function l(e) {
    return window.TDBMotion.duration(e.clientWidth);
  }
  function d(e) {
    return e?.matches('.tdb-service-parallax,[data-tdb-service-parallax]');
  }
  function c(e) {
    return d(e) && matchMedia(i).matches;
  }
  function u(e) {
    return d(e) && matchMedia(a).matches && !window.TDBMotion.reduced.matches;
  }
  function p(e) {
    return (
      window.TDBTreatmentParallax?.matches(e) || e.matches('#All-treatments .tdb-banner-parallax')
    );
  }
  function w(e) {
    return p(e) && matchMedia('(max-width:767px)').matches ? 0.02 * window.innerWidth : 0;
  }
  function b(e) {
    if (!e || r(e)) return;
    const t = n(e);
    if (!t || 'function' != typeof window.Swiper) return;
    e.hasAttribute('data-tdb-treatment') &&
      t.querySelectorAll('.tdb-treatment-slide').forEach((e) => e.classList.add('is-runtime'));
    const d = e.hasAttribute('data-tdb-banner-parallax'),
      b = d && (p(e) || !window.TDBMotion.reduced.matches),
      m = c(e) || (b && matchMedia(i).matches),
      h = u(e) || (b && matchMedia(a).matches),
      f = m || h || d,
      g = window.TDBParallax?.prepare(e, t),
      x = window.TDBSwiper.create(
        t,
        {
          init: !d,
          slidesPerView: 1,
          initialSlide: g?.initialIndex || 0,
          observer: !1,
          observeParents: !1,
          centeredSlides: !0,
          watchSlidesProgress: !0,
          autoplay: !f && {
            delay: 4500,
            disableOnInteraction: !1,
          },
          grabCursor: !0,
          loop: e.hasAttribute('data-tdb-treatment-postage')
            ? e.getAttribute('data-tdb-treatment-loop') === 'true' &&
              t.querySelectorAll('.swiper-slide').length > 1
            : !d || t.querySelectorAll('.swiper-slide').length > 1,
          loopPreventsSlide: !1,
          preventInteractionOnTransition: !1,
          ...(e.hasAttribute('data-tdb-treatment')
            ? {
                loopedSlides: 1,
              }
            : {}),
          loopAdditionalSlides: 1,
          slideToClickedSlide: !0,
          parallax: !0,
          speed: l(t),
          effect: 'slide',
          keyboard: {
            enabled: !0,
          },
          spaceBetween: o(e, w(e)),
          resistanceRatio: 0,
          touchReleaseOnEdges: !0,
          followFinger: !0,
          navigation: {
            nextEl: e.querySelector('.swiper-btn-next'),
            prevEl: e.querySelector('.swiper-btn-prev'),
            disabledClass: 'is-disabled',
          },
          pagination: {
            el: e.querySelector('.swiper-pagination:not([data-tdb-native-progress])'),
            bulletActiveClass: 'is-active',
            bulletClass: 'swiper-bullet',
            bulletElement: 'button',
            clickable: !0,
          },
          breakpoints: {
            ...(d
              ? {
                  992: {
                    slidesPerView: 'auto',
                    ...(e.hasAttribute('data-tdb-treatment')
                      ? {
                          loopedSlides: 3,
                        }
                      : {}),
                    centeredSlides: !1,
                    touchRatio: 1,
                  },
                }
              : {}),
            768: {
              slidesPerView: 1,
              ...(e.hasAttribute('data-tdb-treatment')
                ? {
                    loopedSlides: 1,
                  }
                : {}),
              centeredSlides: !0,
              touchRatio: 1,
            },
            0: {
              slidesPerView: p(e) ? 'auto' : 1,
              ...(e.hasAttribute('data-tdb-treatment')
                ? {
                    loopedSlides: 1,
                  }
                : {}),
              centeredSlides: !p(e),
              touchRatio: 1,
            },
          },
        },
        {
          bind: !1,
        },
      );
    var S;
    (e.hasAttribute('data-tdb-treatment') &&
      x.on('breakpoint', () => {
        if (!x.initialized || !x.params.loop) return;
        const e = t.querySelectorAll('.swiper-slide:not(.swiper-slide-duplicate)').length,
          i = Math.min(e, x.params.loopedSlides + x.params.loopAdditionalSlides);
        if (x.loopedSlides === i) return;
        const a = x.realIndex;
        (x.loopDestroy(),
          x.loopCreate(),
          x.updateSlides(),
          x.slideTo(a + x.loopedSlides, 0, !1, !0));
        window.TDBPageBreaks?.refresh();
      }),
      d &&
        ((function (e, t, i) {
          const a = matchMedia('(min-width:992px)'),
            n = i.slideTo,
            r = t.closest('[data-tdb-treatment]');
          let s = [],
            o = null;
          const l = () => {
              (s.forEach((e) => e.cancel()), (s = []));
            },
            d = (e, t) => e.getAttribute('data-swiper-slide-index') ?? String(t);
          function c(e) {
            const i = [...t.querySelectorAll(':scope > .swiper-wrapper > .swiper-slide')],
              a = i[e];
            return a
              ? ((o = d(a, e)),
                i.forEach(
                  (e, t) => (
                    e.toggleAttribute('data-tdb-banner-wide', d(e, t) === o),
                    e.classList.contains('tdb-treatment-slide') &&
                      (e.classList.toggle('is-wide', d(e, t) === o),
                      e.classList.toggle('is-narrow', d(e, t) !== o))
                  ),
                ),
                i)
              : i;
          }
          (i.on('beforeInit', () => c(i.params.initialSlide || 0)),
            (i.slideTo = function (e = 0, t = this.params.speed, i = !0, u, p) {
              if (!a.matches) return n.call(this, e, t, i, u, p);
              const w = Math.max(0, Number(e)),
                b = this.slides[w];
              if (
                !b ||
                (this.animating && this.params.preventInteractionOnTransition) ||
                (!this.enabled && !u && !p)
              )
                return n.call(this, e, t, i, u, p);
              if (this.animating && w === this.activeIndex && t > 0)
                return n.call(this, e, t, i, u, p);
              if (u && 0 === t && d(b, w) === o) return n.call(this, e, t, i, u, p);
              const m = d(b, w),
                h = new Set(s.map((e) => e.effect?.target)),
                f = [...this.slides].filter(
                  (e) =>
                    !r ||
                    e.hasAttribute('data-tdb-banner-wide') ||
                    e.getAttribute('data-swiper-slide-index') === m ||
                    h.has(e),
                ),
                g = f.map((e) => e.getBoundingClientRect().width);
              (l(), c(w), this.updateSlides());
              const x = f.map((e) => e.getBoundingClientRect().width);
              if (this.initialized && t > 0) {
                const e =
                  getComputedStyle(this.wrapperEl).transitionTimingFunction.match(
                    /^[a-z-]+\([^)]*\)|^[a-z-]+/,
                  )?.[0] || 'ease';
                s = f.flatMap((i, a) =>
                  Math.abs(g[a] - x[a]) < 0.1
                    ? []
                    : [
                        i.animate(
                          [
                            {
                              width: g[a] + 'px',
                            },
                            {
                              width: x[a] + 'px',
                            },
                          ],
                          {
                            duration: t,
                            easing: e,
                            fill: 'both',
                          },
                        ),
                      ],
                );
                const i = s;
                Promise.all(i.map((e) => e.finished.catch(() => {}))).then(() => {
                  s === i && l();
                });
              }
              return n.call(this, e, t, i, u, p);
            }));
          const u = () => {
            (l(), i.initialized && c(i.activeIndex));
          };
          (i.on('beforeResize', u),
            a.addEventListener('change', u),
            i.on('beforeDestroy', () => {
              (l(),
                a.removeEventListener('change', u),
                i.off('beforeResize', u),
                (i.slideTo = n),
                t
                  .querySelectorAll('[data-tdb-banner-wide]')
                  .forEach((e) => e.removeAttribute('data-tdb-banner-wide')));
            }));
        })(0, t, x),
        x.init()),
      (S = x),
      window.TDBSwiper.bindSwiper(S),
      (function (e, t, i) {
        const a = () => {
          const a = o(e, i());
          ((t.params.spaceBetween = a), (t.originalParams.spaceBetween = a));
        };
        (t.on('beforeResize breakpoint', a),
          t.on('beforeDestroy', () => t.off('beforeResize breakpoint', a)));
      })(e, x, () => w(e)),
      (function (...e) {
        window.TDBSwiper.watchDuration(...e);
      })(e, t, x),
      g?.bind(x),
      window.TDBParallax?.bind(e, x),
      (e.hasAttribute('data-tdb-treatment') || e.classList.contains('tdb-service-parallax')) &&
        window.TDBCarouselVisibility.bind(x, {
          overflowViewport: true,
        }));
    const y = window.TDBMotion.carousel.nextDelay,
      T = new WeakMap(),
      v = new Set();
    let D,
      B = null,
      A = !1,
      M = !1,
      E = x.realIndex,
      P = 0,
      L = 0,
      k = 0;
    (x.on('beforeLoopFix', () => {
      M = !0;
    }),
      x.on('loopFix', () => {
        M = !1;
      }));
    let I = (m || h) && !g?.skipEntry;
    function C(e, t) {
      e &&
        ((function (e) {
          return e
            ? (T.has(e) ||
                T.set(
                  e,
                  Array.from(e.querySelectorAll('[data-fade-slide],[data-tdb-service-copy]')),
                ),
              T.get(e))
            : [];
        })(e).forEach((e) => e.classList.toggle('is-visible', t)),
        t ? v.add(e) : v.delete(e));
    }
    function R() {
      x.slides.forEach((e) => C(e, !1));
    }
    function q() {
      B && (clearTimeout(B), (B = null));
    }
    function z(t) {
      (e.classList.toggle('is-moving', t), window.TDBParallax?.setMoving(e, t), g?.setBusy(t));
    }
    function F(e) {
      (q(),
        (B = setTimeout(() => {
          if (((B = null), x.destroyed || x.animating || A)) return;
          const e = x.slides[x.activeIndex],
            t = e?.getAttribute('data-swiper-slide-index');
          x.slides.forEach((i) =>
            C(i, i === e || (null !== t && i.getAttribute('data-swiper-slide-index') === t)),
          );
        }, e)));
    }
    function O() {
      (clearTimeout(L), clearTimeout(k), (L = k = 0));
    }
    if (
      (x.on('beforeDestroy', () => {
        (D?.destroy(),
          O(),
          clearTimeout(P),
          q(),
          e.classList.remove('tdb-entry-pending'),
          window.TDBParallax?.setEntry(e, !1),
          z(!1));
      }),
      e.classList.toggle('tdb-entry-pending', I),
      window.TDBParallax?.setEntry(e, I),
      x.slides.forEach((e) => C(e, !1)),
      C(x.slides[x.activeIndex], !0),
      z(!1),
      x.on('touchStart', () => {
        ((A = !1), q());
      }),
      x.on('sliderMove', () => {
        A || ((A = !0), q(), z(!0), R());
      }),
      x.on('slideChangeTransitionStart', () => {
        M || (q(), z(!0), R());
      }),
      window.TDBSwiper.onSettled(x, () => {
        const t = x.realIndex !== E;
        ((E = x.realIndex), (A = !1));
        const i = t
          ? 'prev' === x.swipeDirection
            ? window.TDBMotion.carousel.previousDelay
            : y
          : window.TDBMotion.carousel.settleDelay;
        (F(i),
          (function (t = window.TDBMotion.carousel.nextDelay) {
            I &&
              ((I = !1),
              O(),
              (P = setTimeout(() => {
                ((P = 0),
                  e.classList.remove('tdb-entry-pending'),
                  window.TDBParallax?.setEntry(e, !1));
              }, t)));
          })(i),
          z(!1));
      }),
      s(e, 'parallax'),
      (!m && !h) || !I)
    )
      return;
    const V = e.querySelector('.swiper-btn-next'),
      W = () => {
        I &&
          ((I = !1),
          O(),
          e.classList.remove('tdb-entry-pending'),
          window.TDBParallax?.setEntry(e, !1),
          z(!1),
          F(y));
      };
    ((D = window.TDBSwiper.firstView(e, {
      target: t,
      observe: !1,
      frames: h ? 0 : 2,
      delay: () => (h ? 0 : window.TDBMotion.carousel.entryStart),
      immediate: h,
      ready: () => (g?.skipEntry ? (W(), !1) : !x.destroyed && I),
      cancel: W,
      enter() {
        if (h) return (x.autoplay?.stop(), void x.slideNext());
        (x.update(),
          x.params.loop && 'function' == typeof x.loopFix && x.loopFix(),
          x.slideNext(x.params.speed, !0),
          (L = setTimeout(() => {
            ((L = 0),
              !I ||
                x.destroyed ||
                x.animating ||
                V?.dispatchEvent(
                  new MouseEvent('click', {
                    bubbles: !0,
                    cancelable: !0,
                  }),
                ));
          }, window.TDBMotion.carousel.entryRetry)),
          (k = setTimeout(W, x.params.speed + y + window.TDBMotion.carousel.entryFallback)));
      },
    })),
      x.on('touchStart slideChange', () => D?.cancel('interaction')));
  }
  const m = Object.freeze({
    version: '1.3.1',
    selector: e,
    beforeObserve(e) {
      window.TDBParallax?.refresh(e);
      (c(e) || u(e)) && e.classList.add('tdb-entry-pending');
    },
    mount(e) {
      b(e);
      window.TDBPageBreaks?.refresh();
      return n(e)?.swiper;
    },
    refresh(e = document) {
      (window.TDBParallax?.refresh(e), window.TDBSwiper.refresh('parallax', e));
    },
  });
  ((window.TDBParallaxPlugin = m), window.TDBSwiper.register('parallax', m));
})();
