/* TDB gallery carousel plugin v1.2.2. Native Smile Gallery; existing highlight behaviour. */
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
        if (e.hasAttribute('data-tdb-ig-native')) return window.TDBSwiper.nativeGap(e, n);
        if (e.classList.contains('tdb-smile-carousel')) return window.TDBSwiper.nativeGap(e, n, '.swiper-slide.smile');
        if (!matchMedia("(min-width:992px)").matches) return n;
        const i = "677cf86df9952f978d94d8a9" === document.documentElement.dataset.wfPage && e.matches(".section_smile-gallery [data-tdb-smile-slider]");
        if (!e.matches(t) && !i) return n;
        return window.TDBSwiper.nativeGap(e, n);
    }
function g(e, t, n) {
        const i = () => {
            const i = w(e, n());
            t.params.spaceBetween = i, t.originalParams.spaceBetween = i;
        };
        const events = e.hasAttribute('data-tdb-ig-native') ? "beforeResize" : "beforeResize breakpoint";
        t.on(events, i), t.on("beforeDestroy", () => t.off(events, i));
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
        // These native feeds finish authoring their cards before mount. Swiper's
        // ResizeObserver and our breakpoint hook own geometry; observing every
        // ancestor/slide mutation also reacts to captions, clones and tickers.
        // Older interactive galleries retain their mutation compatibility.
        const native = e.classList.contains('tdb-smile-carousel') || e.hasAttribute('data-tdb-ig-native');
        const i = t.querySelectorAll(".swiper-wrapper > .swiper-slide:not(.swiper-slide-duplicate)").length, r = window.TDBSwiper.create(t, {
            slidesPerView: 3,
            observer: !native,
            observeParents: !native,
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
        (e.hasAttribute('data-tdb-ig-native') || e.classList.contains('tdb-smile-carousel') || e.matches(".section_smile-gallery [data-tdb-smile-slider]") && "677cf86df9952f978d94d8a9" === document.documentElement.dataset.wfPage) && g(e, r, () => b(e)),
        k(r), S(e, t, r, "--tdb-carousel-duration", () => window.innerWidth), n && (s(), r.on("slideChange", s)),
        r.params.loop && (!e.matches('[data-tdb-smile-slider],[data-tdb-ig-native]') && !function(e, t) {
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
const beforeObserve = function(root) {
    window.TDBSmileCards?.prepare(root);
    if (d.has(root) || l.has(root)) return;
    const viewport = m(root);
    if (!viewport) return;
    let swiper = null, entry = null, done = false;
    function finish(status, fromSwiper = false) {
        if (done) return;
        done = true; entry?.destroy();
        if (!fromSwiper) {
            swiper?.off('touchStart slideChange', interaction);
            swiper?.off('beforeDestroy', destroyed);
        }
        l.delete(root); d.add(root); root.setAttribute(o, status);
    }
    const interaction = () => finish('skipped-interaction');
    const destroyed = () => finish('skipped-destroyed', true);
    function ready() {
        if (!swiper || done) return false;
        if (swiper.destroyed) { finish('skipped-destroyed'); return false; }
        if (root.contains(document.activeElement) || swiper.realIndex !== 0 || swiper.animating) { interaction(); return false; }
        const rect = viewport.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0 || rect.bottom <= 0 || rect.right <= 0 || rect.top >= innerHeight || rect.left >= innerWidth) return false;
        if (getComputedStyle(viewport).visibility !== 'visible' || viewport.closest('[hidden],[inert],[aria-hidden="true"]')) { finish('skipped-hidden'); return false; }
        return true;
    }
    l.set(root, {
        cancel: () => finish('skipped-detached'),
        bind(instance) {
            if (done) return;
            swiper = instance;
            if (swiper.slides.length < 2) return finish('skipped-unavailable');
            swiper.on('touchStart slideChange', interaction);
            swiper.on('beforeDestroy', destroyed); entry.arm();
        }
    });
    root.setAttribute(o, 'pending');
    entry = window.TDBSwiper.firstView(root, {
        target: viewport, armed: false, ready,
        cancel: reason => finish('skipped-' + reason),
        enter() {
            swiper.update();
            if (!ready()) return;
            if (swiper.slides.length < 2 || swiper.isLocked || !swiper.enabled) return finish('skipped-unavailable');
            finish('advanced'); swiper.slideNext(swiper.params.speed, true);
        }
    });
};
const plugin=Object.freeze({version:'1.2.2',selector:e,beforeObserve,
 mount(root){const presentation=window.TDBSmileCards?.prepare(root);v(root);const swiper=m(root)?.swiper;if(swiper && root.matches('[data-tdb-smile-slider],[data-tdb-ig-native]'))window.TDBCarouselVisibility.bind(swiper,{overflowViewport:true});presentation?.bind(swiper);return swiper;},
 prune(){l.forEach((state,root)=>{if(!document.documentElement.contains(root))state.cancel();});window.TDBSmileCards?.prune();},
 refresh(root=document){window.TDBSwiper.refresh('gallery',root);}
});
window.TDBGallery=plugin;
window.TDBSwiper.register('gallery',plugin);
})();
