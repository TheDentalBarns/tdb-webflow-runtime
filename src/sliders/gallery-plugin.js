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
