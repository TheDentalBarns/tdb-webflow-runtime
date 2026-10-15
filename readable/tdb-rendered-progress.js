/* Shared rendered-position sampler. Preserved v1.0.1. */
(() => {
  'use strict';
  window.TDBRenderedProgress ||
    (window.TDBRenderedProgress = Object.freeze({
      version: '1.0.1',
      observe: function ({ track: e, paint: t, enabled: r = () => !0, onMutation: n }) {
        let i = 0,
          a = !1;
        const s = () => !a && !document.hidden && r();
        function o() {
          (cancelAnimationFrame(i), (i = 0));
        }
        function d() {
          !i && s() && (i = requestAnimationFrame(l));
        }
        function l() {
          if (((i = 0), !s())) return;
          const r = e.getAnimations().some((e) => 'running' === e.playState || e.pending);
          (t(), r && d());
        }
        const c = new MutationObserver((e) => {
          (n?.(e), d());
        });
        c.observe(e, {
          subtree: !0,
          childList: !0,
          attributes: !0,
          attributeFilter: ['style', 'class', 'data-swiper-slide-index'],
        });
        const u = ['transitionrun', 'transitionstart', 'transitionend', 'transitioncancel'];
        return (
          u.forEach((t) =>
            e.addEventListener(t, d, {
              passive: !0,
            }),
          ),
          {
            schedule: d,
            pause: o,
            destroy() {
              ((a = !0), o(), c.disconnect(), u.forEach((t) => e.removeEventListener(t, d)));
            },
          }
        );
      },
    }));
})();
