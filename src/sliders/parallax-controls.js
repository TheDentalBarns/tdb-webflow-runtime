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
          // The visible CMS stamp is the single title source. Match its native
          // URL rather than depending on collection order or duplicated text.
          const stampTitles = new Map(
            Array.from(
              e
                .closest('[data-tdb-treatment-layout]')
                ?.querySelectorAll('[data-tdb-treatment-stamp][href]') || [],
              (link) => [
                link.getAttribute('href'),
                link.querySelector('.tdb-treatment-title')?.textContent.trim() || '',
              ],
            ),
          );
          const a = Array.from(
              n.querySelectorAll(
                ':scope > .swiper-wrapper > .swiper-slide:not(.swiper-slide-duplicate)',
              ),
            ),
            o = a.map((e) => {
              const t = e.querySelector(
                '.service-card-button-wrap a[href],a[data-tdb-service-link-source][href],a.tdb-treatment-source[href]',
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
                      ?.textContent.trim() ||
                    stampTitles.get(t.getAttribute('href')) ||
                    '',
                }
              );
            }),
            d = n.querySelector(
              '.service-card-button-wrap a[href],a[data-tdb-service-link-source][href],a.tdb-treatment-source[href]',
            );
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
