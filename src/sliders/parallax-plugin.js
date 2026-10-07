/* TDB parallax carousel plugin v1.0.1. Native Services spacing; existing choreography. */
(() => {
'use strict';
if(window.TDBParallaxPlugin)return;
const e = ".highlight-swiper_component", t = ".parallax-swiper_component", n = "data-tdb-slider-observed", i = "data-tdb-slider-init", r = "(min-width:768px)", s = "(max-width:767px) and (orientation:portrait)", a = "(prefers-reduced-motion:reduce)", o = "data-tdb-slider-first-view", l = new Map, d = new WeakSet;
function m(e) {
        return e?.querySelector?.(".swiper") || null;
    }
function f(e) {
        const t = m(e);
        return "true" === e?.getAttribute?.(i) || Boolean(t?.swiper);
    }
function h(e, t) {
        e.setAttribute(i, "true"), e.dataset.tdbSliderType = t;
    }
function w(e, n) {
        if (e.hasAttribute('data-tdb-treatment')) {
            const gap = parseFloat(getComputedStyle(e).columnGap);
            return Number.isFinite(gap) ? gap : n;
        }
        if (e.classList.contains('tdb-service-parallax') || e.hasAttribute('data-tdb-treatment')) {
            const slide = e.querySelector('.tdb-service-slide,.tdb-treatment-slide');
            if (!slide) return n;
            // Designer reserves the real slide margin before JS. Swiper must
            // measure that same margin, including breakpoint changes: its old
            // inline pixels would otherwise mask the new native CSS value.
            // Clear/read/restore synchronously, before Swiper updates geometry.
            const value = slide.style.getPropertyValue('margin-right');
            const priority = slide.style.getPropertyPriority('margin-right');
            slide.style.removeProperty('margin-right');
            let gap;
            try { gap = parseFloat(getComputedStyle(slide).marginRight); }
            finally { if (value) slide.style.setProperty('margin-right', value, priority); }
            return Number.isFinite(gap) ? gap : n;
        }
        if (!matchMedia("(min-width:992px)").matches) return n;
        const i = "677cf86df9952f978d94d8a9" === document.documentElement.dataset.wfPage && e.matches(".section_smile-gallery [data-tdb-smile-slider]");
        if (!e.matches(t) && !i) return n;
        const r = parseFloat(getComputedStyle(e).columnGap);
        return Number.isFinite(r) ? r : n;
    }
function g(e, t, n) {
        const i = () => {
            const i = w(e, n());
            t.params.spaceBetween = i, t.originalParams.spaceBetween = i;
        };
        t.on("beforeResize breakpoint", i), t.on("beforeDestroy", () => t.off("beforeResize breakpoint", i));
    }
function y(e) {
        return window.TDBMotion.duration(e.clientWidth);
    }
function S(...args){return window.TDBSwiper.watchDuration(...args);}
function k(swiper){return window.TDBSwiper.bindSwiper(swiper);}

function c(root) {
        const e = location.pathname.replace(/\/+$/, "") || "/";
        return root?.classList.contains("tdb-service-parallax") || "/" === e || "/location" === e;
    }
function u(root) {
        return c(root) && matchMedia(r).matches;
    }
function p(root) {
        return c(root) && matchMedia(s).matches && !window.TDBMotion.reduced.matches;
    }
function E(e) {
        return window.TDBTreatmentParallax?.matches(e) || "677cf86df9952f978d94d8a9" === document.documentElement.dataset.wfPage && e.matches("#All-treatments .tdb-banner-parallax");
    }
function x(e) {
        return E(e) && matchMedia("(max-width:767px)").matches ? .02 * window.innerWidth : 0;
    }
function A(e) {
        if (!e || f(e)) return;
        const t = m(e);
        if (!t || "function" != typeof window.Swiper) return;
        // Native margins reserve the Designer layout before initialisation.
        // Swiper's auto-width measurement includes CSS margins, then adds
        // spaceBetween itself. Release the native margin when it takes over.
        if (e.hasAttribute('data-tdb-treatment'))
            t.querySelectorAll('.tdb-treatment-slide').forEach(slide => slide.classList.add('is-runtime'));
        const n = e.hasAttribute("data-tdb-banner-parallax"), i = n && (E(e) || !window.TDBMotion.reduced.matches), o = u(e) || i && matchMedia(r).matches, l = p(e) || i && matchMedia(s).matches, d = o || l || n, c = window.TDBParallax?.prepare(e, t), b = window.TDBSwiper.create(t, {
            init: !n,
            slidesPerView: 1,
            initialSlide: c?.initialIndex || 0,
            observer: !1,
            observeParents: !1,
            centeredSlides: !0,
            watchSlidesProgress: !0,
            autoplay: !d && {
                delay: 4500,
                disableOnInteraction: !1
            },
            grabCursor: !0,
            loop: !n || t.querySelectorAll(".swiper-slide").length > 1,
            loopPreventsSlide: !1,
            preventInteractionOnTransition: !1,
            loopAdditionalSlides: 1,
            slideToClickedSlide: !0,
            parallax: !0,
            speed: y(t),
            effect: "slide",
            keyboard: {
                enabled: !0
            },
            spaceBetween: w(e, x(e)),
            resistanceRatio: 0,
            touchReleaseOnEdges: !0,
            followFinger: !0,
            navigation: {
                nextEl: e.querySelector(".swiper-btn-next"),
                prevEl: e.querySelector(".swiper-btn-prev"),
                disabledClass: "is-disabled"
            },
            pagination: {
                el: e.querySelector(".swiper-pagination"),
                bulletActiveClass: "is-active",
                bulletClass: "swiper-bullet",
                bulletElement: "button",
                clickable: !0
            },
            breakpoints: {
                ...n ? {
                    992: {
                        slidesPerView: "auto",
                        centeredSlides: !1,
                        touchRatio: 1
                    }
                } : {},
                768: {
                    slidesPerView: 1,
                    centeredSlides: !0,
                    touchRatio: 1
                },
                0: {
                    slidesPerView: E(e) ? "auto" : 1,
                    centeredSlides: !E(e),
                    touchRatio: 1
                }
            }
        }, {bind:false});
        n && (!function(e, t, n) {
            const i = matchMedia("(min-width:992px)"), r = n.slideTo;
            let s = [], a = null;
            const o = () => {
                s.forEach(e => e.cancel()), s = [];
            }, l = (e, t) => e.getAttribute("data-swiper-slide-index") ?? String(t);
            function d(e) {
                const n = [ ...t.querySelectorAll(":scope > .swiper-wrapper > .swiper-slide") ], i = n[e];
                return i ? (a = l(i, e), n.forEach((e, t) => (e.toggleAttribute("data-tdb-banner-wide", l(e, t) === a), e.classList.contains("tdb-treatment-slide") && (e.classList.toggle("is-wide", l(e, t) === a), e.classList.toggle("is-narrow", l(e, t) !== a)))), 
                n) : n;
            }
            n.on("beforeInit", () => d(n.params.initialSlide || 0)), n.slideTo = function(e = 0, t = this.params.speed, n = !0, c, u) {
                if (!i.matches) return r.call(this, e, t, n, c, u);
                const p = Math.max(0, Number(e)), m = this.slides[p];
                if (!m || this.animating && this.params.preventInteractionOnTransition || !this.enabled && !c && !u) return r.call(this, e, t, n, c, u);
                if (this.animating && p === this.activeIndex && t > 0) return r.call(this, e, t, n, c, u);
                if (c && 0 === t && l(m, p) === a) return r.call(this, e, t, n, c, u);
                const f = [ ...this.slides ], h = f.map(e => e.getBoundingClientRect().width);
                o(), d(p), this.updateSlides();
                const b = f.map(e => e.getBoundingClientRect().width);
                if (this.initialized && t > 0) {
                    const e = getComputedStyle(this.wrapperEl).transitionTimingFunction.match(/^[a-z-]+\([^)]*\)|^[a-z-]+/)?.[0] || "ease";
                    s = f.flatMap((n, i) => Math.abs(h[i] - b[i]) < .1 ? [] : [ n.animate([ {
                        width: h[i] + "px"
                    }, {
                        width: b[i] + "px"
                    } ], {
                        duration: t,
                        easing: e,
                        fill: "both"
                    }) ]);
                    const n = s;
                    Promise.all(n.map(e => e.finished.catch(() => {}))).then(() => {
                        s === n && o();
                    });
                }
                return r.call(this, e, t, n, c, u);
            };
            const c = () => {
                o(), n.initialized && d(n.activeIndex);
            };
            n.on("beforeResize", c), i.addEventListener("change", c), n.on("beforeDestroy", () => {
                o(), i.removeEventListener("change", c), n.off("beforeResize", c), n.slideTo = r, 
                t.querySelectorAll("[data-tdb-banner-wide]").forEach(e => e.removeAttribute("data-tdb-banner-wide"));
            });
        }(0, t, b), b.init()), k(b), g(e, b, () => x(e)), S(e, t, b), c?.bind(b), window.TDBParallax?.bind(e, b);
        const v = window.TDBMotion.carousel.nextDelay, A = new WeakMap, L = new Set;
        let T = null, M = !1, P = !1;
        b.on("beforeLoopFix", () => {
            P = !0;
        }), b.on("loopFix", () => {
            P = !1;
        });
        let C = (o || l) && !c?.skipEntry;
        function q(e, t) {
            e && (function(e) {
                return e ? (A.has(e) || A.set(e, Array.from(e.querySelectorAll("[data-fade-slide],[data-tdb-service-copy]"))), 
                A.get(e)) : [];
            }(e).forEach(e => e.classList.toggle("is-visible", t)), t ? L.add(e) : L.delete(e));
        }
        function I() {
            b.slides.forEach(e => q(e, !1));
        }
        function F() {
            T && (clearTimeout(T), T = null);
        }
        function R(t) {
            e.classList.toggle("is-moving", t), window.TDBParallax?.setMoving(e, t), c?.setBusy(t);
        }
        function B(e) {
            F(), T = setTimeout(() => {
                if (T = null, b.destroyed || b.animating || M) return;
                const e = b.slides[b.activeIndex], t = e?.getAttribute("data-swiper-slide-index");
                b.slides.forEach(n => q(n, n === e || null !== t && n.getAttribute("data-swiper-slide-index") === t));
            }, e);
        }
        function z(t = window.TDBMotion.carousel.nextDelay) {
            C && (C = !1, setTimeout(() => { e.classList.remove("tdb-entry-pending"); window.TDBParallax?.setEntry(e, false); }, t));
        }
        if (e.classList.toggle("tdb-entry-pending", C), window.TDBParallax?.setEntry(e, C), b.slides.forEach(e => q(e, !1)), 
        q(b.slides[b.activeIndex], !0), R(!1), b.on("touchStart", () => {
            M = !1, F();
        }), b.on("sliderMove", () => {
            M || (M = !0, F(), R(!0), I());
        }), b.on("slideChangeTransitionStart", () => {
            P || (F(), R(!0), I());
        }), b.on("slideChangeTransitionEnd", () => {
            if (P) return;
            M = !1;
            const e = "prev" === (b.swipeDirection || "next") ? window.TDBMotion.carousel.previousDelay : v;
            B(e), z(e), R(!1);
        }), b.on("touchEnd", () => {
            M = !1, b.animating || (R(!1), B(window.TDBMotion.carousel.settleDelay));
        }), b.on("slideResetTransitionEnd", () => {
            P || (M = !1, R(!1), B(window.TDBMotion.carousel.settleDelay), z(window.TDBMotion.carousel.settleDelay));
        }), h(e, "parallax"), l && C) return b.autoplay?.stop(), void b.slideNext();
        if (o && C) {
            const t = e.querySelector(".swiper-btn-next"), n = () => {
                C && (C = !1, e.classList.remove("tdb-entry-pending"), window.TDBParallax?.setEntry(e, false), R(!1), B(v));
            }, i = () => {
                !b.destroyed && C && (c?.skipEntry ? n() : (b.update(), b.params.loop && "function" == typeof b.loopFix && b.loopFix(), 
                b.slideNext(b.params.speed, !0), setTimeout(() => {
                    !C || b.destroyed || b.animating || t?.dispatchEvent(new MouseEvent("click", {
                        bubbles: !0,
                        cancelable: !0
                    }));
                }, window.TDBMotion.carousel.entryRetry), setTimeout(n, b.params.speed + v + window.TDBMotion.carousel.entryFallback)));
            };
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setTimeout(i, window.TDBMotion.carousel.entryStart));
            });
        }
    }
function P(e) {
        const n = e.target.closest?.(".swiper-btn-prev,.swiper-btn-next");
        if (!n || !n.closest(t)) return;
        const i = n.closest(".swiper-buttons-wrapper");
        i?.querySelectorAll(".swiper-btn-prev,.swiper-btn-next").forEach(e => {
            e.classList.toggle("is-selected", e === n);
        });
    }
const plugin=Object.freeze({version:'1.1.0',selector:t,
 beforeObserve(root){if(u(root)||p(root))root.classList.add('tdb-entry-pending');},
 mount(root){A(root);return m(root)?.swiper;},
 refresh(root=document){window.TDBParallax?.refresh(root);window.TDBSwiper.refresh('parallax',root);}
});
window.TDBParallaxPlugin=plugin;
window.TDBSwiper.register('parallax',plugin);
document.addEventListener('click',P);
})();
