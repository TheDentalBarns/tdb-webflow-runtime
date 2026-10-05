/* Shared width-aware carousel duration binding; bundled with our custom Swiper. */
function watchDuration(e, t, n, i = "--tdb-parallax-duration", r = () => t.clientWidth) {
        let s = 0, a = null;
        const o = matchMedia("(min-width:992px)");
        function l() {
            if (n.destroyed || null === a || n.animating) return;
            const t = a;
            a = null, n.params.speed = t, n.originalParams.speed = t, e.style.setProperty(i, t + "ms");
        }
        function d() {
            s || (s = requestAnimationFrame(() => {
                s = 0, a = window.TDBMotion.duration(r()), l();
            }));
        }
        const c = new ResizeObserver(d);
        c.observe(t), o.addEventListener("change", d), window.addEventListener("resize", d, {
            passive: !0
        }), n.on("slideChangeTransitionEnd", l), e.style.setProperty(i, n.params.speed + "ms"), 
        n.on("beforeDestroy", () => {
            c.disconnect(), o.removeEventListener("change", d), window.removeEventListener("resize", d), 
            s && cancelAnimationFrame(s), n.off("slideChangeTransitionEnd", l), e.style.removeProperty(i);
        });
    }
