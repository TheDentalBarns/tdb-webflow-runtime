/* TDB gallery carousel plugin v1.0.0. Existing highlight/smile gallery behaviour. */
(() => {
'use strict';
if(window.TDBGallery)return;
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

function b(e) {
        return window.innerWidth < 768 && (e.hasAttribute("data-tdb-smile-slider") || e.querySelector('a[href^="/treatments/"]') || "677cfbe37aba5fbbc2154c24" === document.documentElement.getAttribute("data-wf-page")) ? .02 * window.innerWidth : window.innerWidth <= 768 ? .05 * window.innerWidth : 20;
    }
function v(e) {
        if (!e || f(e)) return;
        const t = m(e), n = e.querySelector(".swiper-count");
        if (!t || "function" != typeof window.Swiper) return;
        const i = t.querySelectorAll(".swiper-wrapper > .swiper-slide:not(.swiper-slide-duplicate)").length, r = window.TDBSwiper.create(t, {
            slidesPerView: 3,
            observer: !0,
            observeParents: !0,
            watchSlidesProgress: !0,
            spaceBetween: w(e, b(e)),
            grabCursor: !0,
            slideToClickedSlide: !0,
            rewind: !1,
            loop: i > 1,
            loopAdditionalSlides: 1,
            loopPreventsSlide: !1,
            speed: y({
                clientWidth: window.innerWidth
            }),
            autoplay: !1,
            preventInteractionOnTransition: !1,
            preloadImages: !1,
            lazy: {
                loadOnTransitionStart: !1,
                loadPrevNext: !1
            },
            keyboard: {
                enabled: !0
            },
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
                768: {
                    slidesPerView: 1,
                    touchRatio: 1
                },
                0: {
                    slidesPerView: 1,
                    touchRatio: 1
                }
            }
        }, {bind:false});
        function s() {
            n && (n.textContent = `${r.realIndex + 1} of ${i}`);
        }
        e.matches(".section_smile-gallery [data-tdb-smile-slider]") && "677cf86df9952f978d94d8a9" === document.documentElement.dataset.wfPage && g(e, r, () => b(e)), 
        k(r), S(e, t, r, "--tdb-carousel-duration", () => window.innerWidth), s(), r.on("slideChange", s), 
        r.params.loop && (!function(e, t) {
            const n = new WeakMap, i = new Map, r = new MutationObserver(e => {
                e.forEach(e => {
                    const t = i.get(e.target);
                    if (!t) return;
                    const n = e.target.getAttribute(e.attributeName);
                    t.forEach(t => {
                        null === n ? t.removeAttribute(e.attributeName) : t.getAttribute(e.attributeName) !== n && t.setAttribute(e.attributeName, n);
                    });
                });
            });
            function s() {
                r.disconnect(), i.clear();
                const e = new Map;
                t.slides.forEach(t => {
                    t.classList.contains("swiper-slide-duplicate") || e.set(t.getAttribute("data-swiper-slide-index"), t);
                }), t.slides.forEach(t => {
                    if (!t.classList.contains("swiper-slide-duplicate")) return;
                    const r = e.get(t.getAttribute("data-swiper-slide-index"));
                    if (!r) return;
                    n.set(t, r);
                    const s = r.querySelectorAll("*");
                    t.querySelectorAll("*").forEach((e, t) => {
                        const r = s[t];
                        r && (n.set(e, r), i.has(r) || i.set(r, []), i.get(r).push(e));
                    });
                }), e.forEach(e => r.observe(e, {
                    subtree: !0,
                    attributes: !0,
                    attributeFilter: [ "style", "class", "aria-expanded" ]
                }));
            }
            function a(e) {
                const i = n.get(e.target);
                if (!i || !e.target.closest(".swiper-slide-duplicate")) return;
                if ("click" === e.type && !t.allowClick) return e.preventDefault(), void e.stopImmediatePropagation();
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
                    relatedTarget: n.get(e.relatedTarget) || e.relatedTarget
                });
                e.stopImmediatePropagation(), "click" === e.type && e.preventDefault(), i.dispatchEvent(r);
            }
            const o = [ "mouseover", "mouseout", "click" ];
            o.forEach(t => e.addEventListener(t, a, !0)), s(), t.on("breakpoint", s), t.on("beforeDestroy", () => {
                r.disconnect(), i.clear(), o.forEach(t => e.removeEventListener(t, a, !0)), t.off("breakpoint", s);
            });
        }(e, r), r.on("slideChangeTransitionEnd", () => r.loopFix())), h(e, "highlight"), 
        l.get(e)?.bind(r);
    }
const beforeObserve=function(e) {
            if (d.has(e) || l.has(e)) return;
            const t = m(e);
            if (!t) return;
            const n = [ "pointerdown", "touchstart", "keydown", "click", "focusin" ];
            let i = null, r = null, s = !1, a = 0, c = 0, u = !1;
            function p() {
                a && cancelAnimationFrame(a), c && clearTimeout(c), a = c = 0;
            }
            function f(t) {
                u || (u = !0, p(), r?.disconnect(), n.forEach(t => e.removeEventListener(t, h, !0)), 
                document.removeEventListener("visibilitychange", w), i?.off("touchStart slideChange", h), 
                i?.off("beforeDestroy", b), l.delete(e), d.add(e), e.setAttribute(o, t));
            }
            function h() {
                f("skipped-interaction");
            }
            function b() {
                f("skipped-destroyed");
            }
            function w() {
                document.hidden ? p() : y();
            }
            function g() {
                return !(u || !i) && (!document.documentElement.contains(e) || i.destroyed ? (f("skipped-detached"), 
                !1) : e.contains(document.activeElement) || 0 !== i.realIndex || i.animating ? (f("skipped-interaction"), 
                !1) : s && !document.hidden);
            }
            function v() {
                if (c = 0, !g()) return;
                const e = t.getBoundingClientRect();
                e.width <= 0 || e.height <= 0 || e.bottom <= 0 || e.right <= 0 || e.top >= window.innerHeight || e.left >= window.innerWidth || ("visible" !== getComputedStyle(t).visibility || t.closest('[hidden], [inert], [aria-hidden="true"]') ? f("skipped-hidden") : (i.update(), 
                g() && (i.slides.length < 2 || i.isLocked || !i.enabled ? f("skipped-unavailable") : (f("advanced"), 
                i.slideNext(i.params.speed, !0)))));
            }
            function y() {
                a || c || !g() || (a = requestAnimationFrame(() => {
                    a = requestAnimationFrame(() => {
                        a = 0, g() && (c = setTimeout(v, window.TDBMotion.carousel.entryStart));
                    });
                }));
            }
            l.set(e, {
                cancel: () => f("skipped-detached"),
                bind(e) {
                    u || (i = e, i.slides.length < 2 ? f("skipped-unavailable") : (i.on("touchStart slideChange", h), 
                    i.on("beforeDestroy", b), y()));
                }
            }), e.setAttribute(o, "pending"), "IntersectionObserver" in window ? (n.forEach(t => e.addEventListener(t, h, {
                capture: !0,
                passive: !0
            })), document.addEventListener("visibilitychange", w), r = new IntersectionObserver(e => {
                e.forEach(e => {
                    s = e.isIntersecting && e.intersectionRatio > 0, s ? y() : p();
                });
            }, {
                rootMargin: "0px",
                threshold: 0
            }), r.observe(t)) : f("skipped-unsupported");
        };
const plugin=Object.freeze({version:'1.0.0',selector:e,beforeObserve,
 mount(root){v(root);return m(root)?.swiper;},
 prune(){l.forEach((state,root)=>{if(!document.documentElement.contains(root))state.cancel();});},
 refresh(root=document){window.TDBSwiper.refresh('gallery',root);}
});
window.TDBGallery=plugin;
window.TDBSwiper.register('gallery',plugin);
})();
