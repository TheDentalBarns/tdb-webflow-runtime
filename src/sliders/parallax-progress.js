/* Per-component progress geometry; loaded with the full parallax plugin. */
window.TDBParallaxProgress ||= (() => {
  const e = '.tdb-service-parallax,[data-tdb-treatment]',
    selector =
      e +
      ',.section_gallery14 .parallax-swiper_component:not(.tdb-banner-parallax),#All-treatments .tdb-banner-parallax',
    t = new Map();
  function r(r) {
    const n = r.querySelector(':scope > .swiper'),
      i = n?.querySelector(':scope > .swiper-wrapper');
    if (!i) return !1;
    const a = t.get(r);
    if (a?.wrapper === i && (!a.swiper || a.swiper === n.swiper)) {
      a.bind(n.swiper);
      return !0;
    }
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
      y = 1,
      swiper = null;
    const x = window.TDBRenderedProgress.observe({
      track: i,
      // Inner image parallax changes pixels, not the slide boxes sampled below.
      // Both native sliders share this rule; track/slide/copy changes still wake
      // progress, including treatment width transitions and detail reveals.
      relevantMutation: (record) =>
        !(
          r.matches(e) &&
          record.type === 'attributes' &&
          record.attributeName === 'style' &&
          record.target.matches('img.showcase_image')
        ),
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
        // Reconcile structural changes before sampling rendered geometry. The
        // progress and details controllers then share each rectangle once.
        details?.sync(h);
        const boxes = details ? new Map() : null;
        const rect = (node) => {
          if (!boxes) return node.getBoundingClientRect();
          if (!boxes.has(node)) boxes.set(node, node.getBoundingClientRect());
          return boxes.get(node);
        };
        const t = rect(n),
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
            r = rect(t.node),
            n = r.left + (s ? 0 : r.width / 2) - u;
          n < 0 ? ((p = n), (L = t.value), (A = e + 1)) : ((x = n), (E = t.value), (S = e));
        }
        const B = p === -1 / 0 ? E : x === 1 / 0 ? L : L + ((E - L + v) % v) * (-p / (x - p)),
          q = Math.min(g, stampWidth || Math.round((g * y) / v) / y),
          C = ((B % v) + v) % v,
          D = v <= 1 ? 0 : C <= v - 1 ? (C * (g - q)) / (v - 1) : g - q + (C - v + 1) * q,
          T = Math.round(D * y) / y;
        const detailFrame = details?.measure(h, rect);
        // Stamp alignment reads its scroll bounds; do it before progress/detail
        // style writes. Detail painting consumes the already measured snapshot.
        stamps?.paint(C, T, g);
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
        details?.paint(h, detailFrame);
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
        if (p) return;
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
      if (p) return;
      stamps?.invalidate?.();
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
    function beforeDestroy() {
      dispose(true);
    }
    function bind(candidate) {
      if (p || !candidate || candidate.destroyed || candidate === swiper) return;
      swiper = candidate;
      swiper.on('beforeDestroy', beforeDestroy);
      ticker?.sync();
      S();
    }
    function dispose(fromSwiper = false) {
      if (p) return;
      p = true;
      if (!fromSwiper) swiper?.off('beforeDestroy', beforeDestroy);
      E.disconnect();
      B.disconnect();
      x.destroy();
      stamps?.dispose(fromSwiper);
      details?.dispose();
      ticker?.dispose(fromSwiper);
      document.removeEventListener('visibilitychange', A);
      window.removeEventListener('resize', S);
      if (s) d.classList.remove('is-ready');
      else d.remove();
      t.delete(r);
    }
    return (
      B.observe(n),
      window.addEventListener('resize', S, {
        passive: !0,
      }),
      S(),
      t.set(r, {
        wrapper: i,
        get swiper() {
          return swiper;
        },
        bind,
        dispose,
      }),
      bind(n.swiper),
      L(),
      !0
    );
  }
  return {
    bind(root, swiper) {
      if (!root.matches(selector) || !window.TDBRenderedProgress) return;
      if (t.get(root)?.swiper && t.get(root).swiper !== swiper) t.get(root).dispose();
      if (r(root)) t.get(root).bind(swiper);
    },
    prune() {
      for (const [root, controller] of t) if (!root.isConnected) controller.dispose();
    },
    refresh: function (t = document) {
      (t instanceof Element && t.matches(selector) && r(t),
        t.querySelectorAll?.(selector).forEach(r));
    },
  };
})();
