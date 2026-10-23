/* Preserve initial ordering before sliders mount. */
(() => {
  const path = window.location.pathname.toLowerCase();
  const map = {
    'composite-bonding': '.cb-priority',
    invisalign: '.invisalign-priority',
    veneers: '.veneers-priority',
  };
  const selector = Object.entries(map).find(([slug]) => path.includes(slug))?.[1];
  if (!selector) {
    document.documentElement.classList.remove('tdb-smile-sorting');
    return;
  }
  document
    .querySelectorAll('.gallery17_component .highlight-swiper_component')
    .forEach((component) => {
      const wrapper = component.querySelector('.swiper-wrapper');
      if (!wrapper) return;
      const slides = Array.from(wrapper.children);
      slides.sort((a, b) => {
        const aText = a.querySelector(selector)?.textContent.trim() || '';
        const bText = b.querySelector(selector)?.textContent.trim() || '';
        const ap = aText !== '' && !Number.isNaN(Number(aText)) ? Number(aText) : 999999;
        const bp = bText !== '' && !Number.isNaN(Number(bText)) ? Number(bText) : 999999;
        return ap - bp;
      });
      slides.forEach((slide) => wrapper.appendChild(slide));
    });
  document.documentElement.classList.remove('tdb-smile-sorting');
})();

/* Preserved from deployed gallery e2c1929; sorting is bundled before registration. */
(() => {
  'use strict';
  if (window.TDBSmileCards) return;
  const e = new Map(),
    t = new URL('./', document.currentScript?.src || location.href);
  let i;
  const n = ['price', 'duration', 'clinician'];
  window.TDBSmileCards = Object.freeze({
    version: '4.1.4',
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
      let revealPending = true;
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
      function hover(owner) {
        if (owner === M) return;
        M = owner;
        K();
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
              hover(
                B.matches &&
                  (e.target.closest('.tdb-smile-summary-ready') || shared?.overSummary(e))
                  ? null
                  : t,
              );
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
              hover(shared.overSummary(e) ? null : P(e.target));
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
        revealPending = e === null;
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
              // A tap also settles Swiper. Keep visible labels steady unless
              // the carousel moved or a previous reveal was interrupted.
              if (!e && !y && !revealPending) return;
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

/* Owned by tdb-gallery.js. CMS supplies the total; the shared ticker supplies motion. */
function createGalleryExploreCount() {
  const records = new Map(),
    base = document.currentScript?.src;
  let observer,
    tickerFlight,
    listening = false;
  const format = (value) => value.toLocaleString('en-GB');
  function write(record) {
    const { slot, text } = record;
    if (slot.children.length === 1) slot.firstElementChild.textContent = text;
    else slot.textContent = text;
  }
  function syncListening() {
    const pending = [...records.values()].some((record) => !record.played);
    if (pending === listening) return;
    listening = pending;
    document[pending ? 'addEventListener' : 'removeEventListener'](
      'visibilitychange',
      onVisibility,
    );
  }
  function complete(record) {
    record.played = true;
    observer?.unobserve(record.link);
    syncListening();
  }
  function tickerReady() {
    if (window.TDBNativeTicker) return Promise.resolve();
    return (tickerFlight ||= Promise.resolve()
      .then(() =>
        window.TDBModules.load(new URL('tdb-ticker.js', base), {
          ready: () => Boolean(window.TDBNativeTicker),
        }),
      )
      .catch((error) => {
        tickerFlight = null;
        throw error;
      }));
  }
  async function play(record) {
    if (record.played || record.loading || !record.visible || document.hidden) return;
    if (!record.count || window.TDBMotion?.reduced.matches) {
      complete(record);
      return;
    }
    record.loading = true;
    try {
      await tickerReady();
      if (records.get(record.link) !== record || !record.link.isConnected) return;
      if (!record.visible || document.hidden) return;
      record.ticker = window.TDBNativeTicker.mount(record.slot, {
        valueClass: 'tdb-gallery-count-value',
        incomingClass: 'tdb-gallery-count-value',
      });
      // Keep the true total in native HTML; understate only for this single transition.
      record.ticker.update(format(Math.max(0, record.count - 1)), 1, false);
      record.ticker.update(record.text);
      complete(record);
    } catch (_) {
      if (records.get(record.link) === record) {
        record.ticker?.destroy();
        record.ticker = null;
        write(record);
        complete(record);
      }
    } finally {
      record.loading = false;
    }
  }
  function onVisibility() {
    if (document.hidden) records.forEach((record) => record.ticker?.settle());
    else records.forEach(play);
  }
  function prune() {
    for (const [link, record] of records) {
      if (link.isConnected && record.slot.isConnected && link.contains(record.slot)) continue;
      observer?.unobserve(link);
      record.ticker?.destroy();
      link.removeAttribute('data-count-prepared');
      records.delete(link);
    }
    if (!records.size) {
      observer?.disconnect();
      observer = null;
    }
    syncListening();
  }
  function refresh() {
    prune();
    const source = document.querySelector('[data-tdb-gallery-count-source]');
    const feedTotal = document
      .querySelector('[data-tdb-smile-total]')
      ?.getAttribute('data-tdb-smile-total');
    const native = source?.querySelector('.w-dyn-items, .w-dyn-empty');
    if (!native && !/^\d+$/.test(feedTotal || '')) return;
    const count = native
      ? [...source.querySelectorAll('[data-tdb-gallery-count-item]')].filter(
          (item) => !item.closest('.swiper-slide-duplicate'),
        ).length
      : Number(feedTotal);
    if (!Number.isSafeInteger(count)) return;
    const text = format(count),
      noun = count === 1 ? 'smile transformation' : 'smile transformations';
    for (const link of document.querySelectorAll('[data-tdb-gallery-ticker-link]')) {
      const slot = link.querySelector('[data-tdb-gallery-count-slot]');
      if (!slot) continue;
      const label = link.querySelector('[data-tdb-gallery-count-noun]');
      if (label) label.textContent = noun;
      link.setAttribute('aria-label', `Explore ${text} ${noun}`);
      let record = records.get(link);
      if (record) {
        if (record.count !== count) {
          record.count = count;
          record.text = text;
          if (record.ticker) record.ticker.update(text, 1, false);
          else write(record);
        }
        continue;
      }
      // Historical pages still running the standalone loader retain their owner.
      if (link.dataset.countPrepared) continue;
      record = {
        link,
        slot,
        count,
        text,
        visible: false,
        played: false,
        loading: false,
        ticker: null,
      };
      records.set(link, record);
      link.dataset.countPrepared = 'true';
      write(record);
      if ('IntersectionObserver' in window) {
        observer ||= new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              const record = records.get(entry.target);
              if (!record) continue;
              record.visible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
              if (!record.visible) record.ticker?.settle();
              play(record);
            }
          },
          { threshold: 0.25 },
        );
        observer.observe(link);
      } else {
        record.visible = true;
        play(record);
      }
    }
    syncListening();
  }
  return Object.freeze({ refresh, prune });
}

/* Preserved from deployed gallery e2c1929; sorting is bundled before registration. */
(() => {
  'use strict';
  if (window.TDBGallery) return;
  const exploreCount = createGalleryExploreCount();
  const e = 'data-tdb-slider-init',
    t = 'data-tdb-slider-first-view',
    i = new Map(),
    n = new WeakSet(),
    mounted = new Map();
  function r(e) {
    return e?.querySelector?.('.swiper') || null;
  }
  function a(t) {
    const i = r(t);
    return 'true' === t?.getAttribute?.(e) || Boolean(i?.swiper);
  }
  function s(t, i) {
    (t.setAttribute(e, 'true'), (t.dataset.tdbSliderType = i));
  }
  function o(e, t) {
    if (e.hasAttribute('data-tdb-ig-native')) return window.TDBSwiper.nativeGap(e, t);
    if (e.classList.contains('tdb-smile-carousel'))
      return window.TDBSwiper.nativeGap(e, t, '.swiper-slide.smile');
    if (!matchMedia('(min-width:992px)').matches) return t;
    const i = e.matches('.section_smile-gallery [data-tdb-smile-slider]');
    return e.matches('.parallax-swiper_component') || i ? window.TDBSwiper.nativeGap(e, t) : t;
  }
  function l(e) {
    return window.TDBMotion.duration(e.clientWidth);
  }
  function d(e) {
    return window.innerWidth < 768 &&
      (e.hasAttribute('data-tdb-smile-slider') ||
        e.querySelector('a[href^="/treatments/"]') ||
        '677cfbe37aba5fbbc2154c24' === document.documentElement.getAttribute('data-wf-page'))
      ? 0.02 * window.innerWidth
      : window.innerWidth <= 768
        ? 0.05 * window.innerWidth
        : 20;
  }
  function c(e) {
    if (!e || a(e)) return;
    const t = r(e),
      n = e.querySelector('.swiper-count');
    if (!t || 'function' != typeof window.Swiper) return;
    const c = e.classList.contains('tdb-smile-carousel') || e.hasAttribute('data-tdb-ig-native'),
      u = t.querySelectorAll('.swiper-wrapper > .swiper-slide:not(.swiper-slide-duplicate)').length,
      p = window.TDBSwiper.create(
        t,
        {
          slidesPerView: 3,
          observer: !c,
          observeParents: !c,
          watchSlidesProgress: !0,
          spaceBetween: o(e, d(e)),
          grabCursor: !0,
          slideToClickedSlide: !0,
          rewind: !1,
          loop: u > 1,
          loopAdditionalSlides: 1,
          loopPreventsSlide: !1,
          speed: l({
            clientWidth: window.innerWidth,
          }),
          autoplay: !1,
          preventInteractionOnTransition: !1,
          preloadImages: !1,
          lazy: {
            loadOnTransitionStart: !1,
            loadPrevNext: !1,
          },
          keyboard: {
            enabled: !0,
          },
          navigation: {
            nextEl: e.querySelector('.swiper-btn-next'),
            prevEl: e.querySelector('.swiper-btn-prev'),
            disabledClass: 'is-disabled',
          },
          pagination: {
            el: e.querySelector('.swiper-pagination'),
            bulletActiveClass: 'is-active',
            bulletClass: 'swiper-bullet',
            bulletElement: 'button',
            clickable: !0,
          },
          breakpoints: {
            768: {
              slidesPerView: 1,
              touchRatio: 1,
            },
            0: {
              slidesPerView: 1,
              touchRatio: 1,
            },
          },
        },
        {
          bind: !1,
        },
      );
    mounted.set(e, p);
    p.on('beforeDestroy', () => mounted.delete(e));
    function b() {
      n && (n.textContent = `${p.realIndex + 1} of ${u}`);
    }
    var w;
    ((e.hasAttribute('data-tdb-ig-native') ||
      e.classList.contains('tdb-smile-carousel') ||
      e.matches('.section_smile-gallery [data-tdb-smile-slider]')) &&
      (function (e, t, i) {
        const n = () => {
            const n = o(e, i());
            ((t.params.spaceBetween = n), (t.originalParams.spaceBetween = n));
          },
          r = e.hasAttribute('data-tdb-ig-native') ? 'beforeResize' : 'beforeResize breakpoint';
        (t.on(r, n), t.on('beforeDestroy', () => t.off(r, n)));
      })(e, p, () => d(e)),
      (w = p),
      window.TDBSwiper.bindSwiper(w),
      (function (...e) {
        window.TDBSwiper.watchDuration(...e);
      })(e, t, p, '--tdb-carousel-duration', () => window.innerWidth),
      n && (b(), p.on('slideChange', b)),
      p.params.loop &&
        (!e.matches('[data-tdb-smile-slider],[data-tdb-ig-native]') &&
          (function (e, t) {
            const i = new WeakMap(),
              n = new Map(),
              r = new MutationObserver((e) => {
                e.forEach((e) => {
                  const t = n.get(e.target);
                  if (!t) return;
                  const i = e.target.getAttribute(e.attributeName);
                  t.forEach((t) => {
                    null === i
                      ? t.removeAttribute(e.attributeName)
                      : t.getAttribute(e.attributeName) !== i && t.setAttribute(e.attributeName, i);
                  });
                });
              });
            function a() {
              (r.disconnect(), n.clear());
              const e = new Map();
              (t.slides.forEach((t) => {
                t.classList.contains('swiper-slide-duplicate') ||
                  e.set(t.getAttribute('data-swiper-slide-index'), t);
              }),
                t.slides.forEach((t) => {
                  if (!t.classList.contains('swiper-slide-duplicate')) return;
                  const r = e.get(t.getAttribute('data-swiper-slide-index'));
                  if (!r) return;
                  i.set(t, r);
                  const a = r.querySelectorAll('*');
                  t.querySelectorAll('*').forEach((e, t) => {
                    const r = a[t];
                    r && (i.set(e, r), n.has(r) || n.set(r, []), n.get(r).push(e));
                  });
                }),
                e.forEach((e) =>
                  r.observe(e, {
                    subtree: !0,
                    attributes: !0,
                    attributeFilter: ['style', 'class', 'aria-expanded'],
                  }),
                ));
            }
            function s(e) {
              const n = i.get(e.target);
              if (!n || !e.target.closest('.swiper-slide-duplicate')) return;
              if ('click' === e.type && !t.allowClick)
                return (e.preventDefault(), void e.stopImmediatePropagation());
              const r = new MouseEvent(e.type, {
                bubbles: !0,
                cancelable: !0,
                view: window,
                clientX: e.clientX,
                clientY: e.clientY,
                screenX: e.screenX,
                screenY: e.screenY,
                button: e.button,
                buttons: e.buttons,
                detail: e.detail,
                ctrlKey: e.ctrlKey,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                metaKey: e.metaKey,
                relatedTarget: i.get(e.relatedTarget) || e.relatedTarget,
              });
              (e.stopImmediatePropagation(),
                'click' === e.type && e.preventDefault(),
                n.dispatchEvent(r));
            }
            const o = ['mouseover', 'mouseout', 'click'];
            (o.forEach((t) => e.addEventListener(t, s, !0)),
              a(),
              t.on('breakpoint', a),
              t.on('beforeDestroy', () => {
                (r.disconnect(),
                  n.clear(),
                  o.forEach((t) => e.removeEventListener(t, s, !0)),
                  t.off('breakpoint', a));
              }));
          })(e, p),
        p.on('slideChangeTransitionEnd', () => p.loopFix())),
      s(e, 'highlight'),
      i.get(e)?.bind(p));
  }
  const u = Object.freeze({
    version: '1.2.4',
    selector: '.highlight-swiper_component',
    beforeObserve: function (e) {
      if ((window.TDBSmileCards?.prepare(e), n.has(e) || i.has(e))) return;
      const a = r(e);
      if (!a) return;
      let s = null,
        o = null,
        l = !1;
      function d(r, a = !1) {
        l ||
          ((l = !0),
          o?.destroy(),
          a || (s?.off('touchStart slideChange', c), s?.off('beforeDestroy', u)),
          i.delete(e),
          n.add(e),
          e.setAttribute(t, r));
      }
      const c = () => d('skipped-interaction'),
        u = () => d('skipped-destroyed', !0);
      function p() {
        if (!s || l) return !1;
        if (s.destroyed) return (d('skipped-destroyed'), !1);
        if (e.contains(document.activeElement) || 0 !== s.realIndex || s.animating)
          return (c(), !1);
        const t = a.getBoundingClientRect();
        return (
          !(
            t.width <= 0 ||
            t.height <= 0 ||
            t.bottom <= 0 ||
            t.right <= 0 ||
            t.top >= innerHeight ||
            t.left >= innerWidth
          ) &&
          (('visible' === getComputedStyle(a).visibility &&
            !a.closest('[hidden],[inert],[aria-hidden="true"]')) ||
            (d('skipped-hidden'), !1))
        );
      }
      (i.set(e, {
        cancel: () => d('skipped-detached'),
        bind(e) {
          if (!l) {
            if (((s = e), s.slides.length < 2)) return d('skipped-unavailable');
            (s.on('touchStart slideChange', c), s.on('beforeDestroy', u), o.arm());
          }
        },
      }),
        e.setAttribute(t, 'pending'),
        (o = window.TDBSwiper.firstView(e, {
          target: a,
          armed: !1,
          ready: p,
          cancel: (e) => d('skipped-' + e),
          enter() {
            if ((s.update(), p())) {
              if (s.slides.length < 2 || s.isLocked || !s.enabled) return d('skipped-unavailable');
              (d('advanced'), s.slideNext(s.params.speed, !0));
            }
          },
        })));
    },
    mount(e) {
      const t = window.TDBSmileCards?.prepare(e);
      c(e);
      const i = r(e)?.swiper;
      return (
        i &&
          e.matches('[data-tdb-smile-slider],[data-tdb-ig-native]') &&
          window.TDBCarouselVisibility.bind(i, {
            overflowViewport: !0,
          }),
        t?.bind(i),
        i
      );
    },
    // Release a failed or destroyed consumer's first-view observer before remount.
    resetFirstView(e) {
      i.get(e)?.cancel();
      n.delete(e);
      e.removeAttribute(t);
    },
    prune() {
      for (const [root, swiper] of mounted) {
        if (root.isConnected) continue;
        if (!swiper.destroyed) swiper.destroy(true, true);
        mounted.delete(root);
      }
      exploreCount.prune();
      (i.forEach((e, t) => {
        document.documentElement.contains(t) || e.cancel();
      }),
        window.TDBSmileCards?.prune());
    },
    refresh(e = document) {
      exploreCount.refresh();
      window.TDBSwiper.refresh('gallery', e);
    },
  });
  ((window.TDBGallery = u), window.TDBSwiper.register('gallery', u));
})();
