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
    const nativeTreatmentControls = e.hasAttribute('data-tdb-treatment-postage');
    (e
      .querySelectorAll(
        '.tdb-service-content,.tdb-service-heading-row,.tdb-service-title,.tdb-service-copy,.tdb-service-link-source,.tdb-service-controls,.tdb-service-buttons,.tdb-service-cta',
      )
      .forEach((node) =>
        node.classList.toggle(
          'is-phone-landscape',
          t &&
            !(
              nativeTreatmentControls && node.matches('.tdb-service-controls,.tdb-service-buttons')
            ),
        ),
      ),
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
