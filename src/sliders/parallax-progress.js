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
                  (r.hasAttribute('data-tdb-treatment') ||
                    r.classList.contains('tdb-service-parallax')))
                )
                  return ((g = d.getBoundingClientRect().width), null);
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
          q = Math.round((g * y) / v) / y,
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
