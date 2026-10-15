/* Preserved from deployed gallery e2c1929; sorting is bundled before registration. */
(() => {
  'use strict';
  if (window.TDBSmileCards) return;
  const e = new Map(),
    t = new URL('./', document.currentScript?.src || location.href);
  let i;
  const n = ['price', 'duration', 'clinician'];
  window.TDBSmileCards = Object.freeze({
    version: '4.1.2',
    prepare: function (r) {
      if (
        !r.matches('[data-tdb-smile-slider]') ||
        !r.querySelector('[data-tdb-smile-presentation]')
      )
        return null;
      if (e.has(r)) return e.get(r);
      const a = r.querySelector('.swiper-wrapper'),
        s = r.querySelector('[data-tdb-smile-presentation]'),
        o = s.querySelector('.tdb-smile-counter-current'),
        l = s.querySelector('.tdb-smile-counter-total'),
        d = s.querySelector('.tdb-smile-counter-label'),
        c = s.querySelector('.tdb-smile-static-facts'),
        u = [...c.querySelectorAll('.tdb-smile-fact-ticker')],
        p = u.map((e) => e.querySelector('.tdb-smile-fact-slot')),
        b = s.querySelector('[data-tdb-smile-ticker-template]'),
        w = window.TDBMotion,
        shared = window.TDBSmileFeed?.presentation(r);
      let m = [],
        f = [],
        h = null,
        g = 0,
        y = !1,
        v = !1,
        S = !1,
        T = null,
        x = null,
        E = !1,
        D = [],
        C = 0;
      const A = [];
      let k = null;
      const B = matchMedia('(min-width:992px)'),
        q = (e) => e.trim().replace(/\s+/g, ' '),
        L = () => {
          (clearTimeout(g), (g = 0));
        },
        I = () => {
          (T?.settle(), x?.settle(), D.forEach((e) => e.settle()));
        };
      let M = null,
        N = 'mouse',
        O = null;
      const P = (e) => e?.closest?.('.tdb-smile-card'),
        W = (e) => {
          const t = e?.closest('.swiper-slide');
          if (!t || !r.contains(e)) return !1;
          return (
            (t.hasAttribute('data-swiper-slide-index')
              ? Number(t.getAttribute('data-swiper-slide-index'))
              : f.indexOf(t)) === (h ? h.realIndex : 0)
          );
        };
      function K() {
        (!M || (M.isConnected && W(M)) || (M = null),
          m.forEach((e) => {
            const t =
                (e.hasAttribute('data-swiper-slide-index')
                  ? Number(e.getAttribute('data-swiper-slide-index'))
                  : f.indexOf(e)) === (h ? h.realIndex : 0),
              i = e.querySelector('.tdb-smile-card'),
              n = Boolean(M && t);
            i?.setAttribute('aria-expanded', String(n));
            const r = e.querySelector('.tdb-smile-details');
            (r?.classList.toggle('is-open', n),
              r?.setAttribute('aria-hidden', String(!n)),
              e.querySelector('.tdb-smile-overlay')?.classList.toggle('is-open', n),
              e
                .querySelectorAll('.tdb-smile-image-label')
                .forEach((e) => e.classList.toggle('is-expanded', n)),
              e.classList.toggle('is-muted', Boolean(h && !t)));
          }));
        shared?.open(Boolean(M));
      }
      function j() {
        ((M = null), K());
      }
      const z = (e) => {
          r.contains(e.target) || j();
        },
        R = {
          pointerover: (e) => {
            if (e.pointerType && 'mouse' !== e.pointerType) return;
            const t = P(e.target);
            W(t) &&
              !y &&
              ((M =
                B.matches &&
                (e.target.closest('.tdb-smile-summary-ready') || shared?.overSummary(e))
                  ? null
                  : t),
              K());
          },
          pointerout: (e) => {
            if (e.pointerType && 'mouse' !== e.pointerType) return;
            const t = P(e.target);
            t && !t.contains(e.relatedTarget) && j();
          },
          pointerdown: (e) => {
            ((N = e.pointerType || 'mouse'),
              (O = {
                x: e.clientX,
                y: e.clientY,
                moved: !1,
              }));
          },
          pointermove: (e) => {
            O && Math.hypot(e.clientX - O.x, e.clientY - O.y) > 8 && (O.moved = !0);
            if (
              shared &&
              B.matches &&
              (!e.pointerType || e.pointerType === 'mouse') &&
              !y &&
              W(P(e.target))
            ) {
              M = shared.overSummary(e) ? null : P(e.target);
              K();
            }
          },
          pointercancel: j,
          click: (e) => {
            const t = P(e.target);
            t &&
              ['', '#'].includes(t.getAttribute('href') || '') &&
              (e.preventDefault(),
              !W(t) ||
                !1 === h?.allowClick ||
                (0 !== e.detail && O?.moved) ||
                y ||
                ('mouse' === N && 0 !== e.detail) ||
                ((M = M ? null : t), K()));
          },
          focusin: (e) => {
            const t = P(e.target);
            W(t) && t.matches(':focus-visible') && ((M = t), K());
          },
          focusout: (e) => {
            P(e.target)?.contains(e.relatedTarget) || j();
          },
          keydown: (e) => {
            ('Escape' === e.key && j(),
              ' ' === e.key &&
                W(P(e.target)) &&
                !y &&
                (e.preventDefault(), (M = M ? null : P(e.target)), K()));
          },
        };
      function V(e, t = !1) {
        shared?.fade(e !== null, t);
        m.forEach((i, n) => {
          const r = i.hasAttribute('data-swiper-slide-index')
            ? Number(i.getAttribute('data-swiper-slide-index'))
            : n;
          i.querySelectorAll('[data-fade-slide]').forEach((i) => {
            (i.classList.toggle('is-moving', t), i.classList.toggle('is-visible', e === r));
          });
        });
      }
      function X() {
        if (S) return;
        const e = h && !h.destroyed ? h.realIndex : 0,
          t = h && h.activeIndex < h.previousIndex ? -1 : 1,
          i = String(f.length).padStart(2, '0');
        (x ? x.update(i) : E && (l.textContent = i),
          (d.textContent = 'Smile ' + (e + 1) + ' of ' + f.length));
        const r = String(e + 1).padStart(2, '0');
        T ? T.update(r, t, Boolean(h)) : (o.textContent = r);
        const a = h && !h.destroyed ? h.slides[h.activeIndex] : f[e],
          s =
            ((u = a),
            shared?.facts(e) ||
              n.map((e) => {
                const t = u?.querySelector('[data-tdb-smile-source-fact="' + e + '"]');
                return (t?.querySelector('.tdb-smile-source-value') || t)?.textContent.trim() || '';
              }));
        var u;
        shared?.update(e);
        (s.forEach((e, i) => {
          D[i] ? D[i].update(e, t, v) : (p[i].textContent = e);
        }),
          c.setAttribute('aria-label', 'Treatment summary: ' + s.join(', ')),
          K());
      }
      function Y(e) {
        (L(), (y = !1), V(null));
        const t = () => {
          ((g = 0),
            h &&
              !h.destroyed &&
              !S &&
              r.isConnected &&
              (V(h.realIndex), (v = !0), u.forEach((e) => e.classList.add('is-ready'))));
        };
        w.reduced.matches ? t() : (g = setTimeout(t, e));
      }
      function G() {
        (L(), (y = !0), j(), V(w.reduced.matches ? h.realIndex : null, !w.reduced.matches));
      }
      function _() {
        ((m = [...a.children].filter((e) => e.matches('.swiper-slide'))),
          (f = m.filter((e) => !e.classList.contains('swiper-slide-duplicate'))),
          X(),
          !h ||
            y ||
            g ||
            h.animating ||
            (v
              ? V(h.realIndex)
              : 'pending' !== r.getAttribute('data-tdb-slider-first-view') &&
                Y(w.carousel.nextDelay)));
      }
      function F() {
        (k?.(),
          (k = null),
          A.splice(0).forEach(([e, t]) => h?.off(e, t)),
          L(),
          I(),
          (h = null),
          (y = !1));
      }
      (Object.entries(R).forEach(([e, t]) => r.addEventListener(e, t)),
        document.addEventListener('pointerdown', z),
        B.addEventListener('change', j));
      const U = new MutationObserver(() => {
        if (!r.isConnected) return $.destroy();
        _();
      });
      (U.observe(a, {
        childList: !0,
      }),
        U.observe(r, {
          attributes: !0,
          attributeFilter: ['data-tdb-slider-first-view'],
        }));
      const $ = Object.freeze({
        bind: function (e) {
          if (e === h || !e || e.destroyed) return;
          (F(), (h = e));
          let t = h.realIndex;
          const i = (e, t) => {
            (A.push([e, t]), h.on(e, t));
          };
          (i('slideChange', () => {
            (j(), X());
          }),
            i('touchStart', L),
            i('sliderMove', () => {
              y || G();
            }),
            i('slideChangeTransitionStart', G),
            (k = window.TDBSwiper.onSettled(h, () => {
              const e = h.realIndex !== t;
              ((t = h.realIndex),
                X(),
                Y(
                  e
                    ? 'prev' === h.swipeDirection
                      ? w.carousel.previousDelay
                      : w.carousel.nextDelay
                    : w.carousel.settleDelay,
                ));
            })),
            i('beforeDestroy', () => {
              (L(), I(), (A.length = 0), (k = null), (h = null), (y = !1), j(), V(0));
            }),
            _(),
            V(v ? h.realIndex : null));
        },
        refresh: _,
        destroy() {
          S ||
            ((S = !0),
            C++,
            F(),
            U.disconnect(),
            Object.entries(R).forEach(([e, t]) => r.removeEventListener(e, t)),
            document.removeEventListener('pointerdown', z),
            B.removeEventListener('change', j),
            j(),
            T?.destroy(),
            x?.destroy(),
            D.forEach((e) => e.destroy()),
            V(0),
            u.forEach((e) => e.classList.add('is-ready')),
            e.delete(r));
        },
      });
      (e.set(r, $), r.setAttribute('data-tdb-smile-card-design', '4.1'), _());
      const H = C;
      return (
        (i ||
          ((i = window.TDBModules.load(new URL('tdb-ticker.js', t), {
            ready: () => Boolean(window.TDBNativeTicker),
          })),
          i.catch(() => {
            i = null;
          })),
        i)
          .then(() => {
            S ||
              H !== C ||
              ((T = window.TDBNativeTicker.mount(o, {
                template: b,
                valueClass: 'tdb-smile-counter-value',
                incomingClass: 'tdb-smile-counter-value',
              })),
              (x = window.TDBNativeTicker.mount(l, {
                template: b,
                valueClass: 'tdb-smile-counter-value',
                incomingClass: 'tdb-smile-counter-value',
              })),
              (D = p.map((e, t) =>
                window.TDBNativeTicker.mount(e, {
                  template: b,
                  valueClass: 'tdb-smile-fact-value',
                  incomingClass: 'tdb-smile-fact-value',
                  normalize: (e) => (t < 2 ? q(e).toUpperCase() : q(e)),
                }),
              )),
              X());
          })
          .catch(() => {
            S || H !== C || ((E = !0), X());
          }),
        $
      );
    },
    prune() {
      e.forEach((e, t) => {
        t.isConnected || e.destroy();
      });
    },
  });
})();
