/* Smile Gallery presentation v4.1.0. Native Designer structure; shared ticker and motion. */
(() => {
  'use strict';
  if (window.TDBSmileCards) return;
  const roots = new Map();
  const base = new URL('./', document.currentScript?.src || location.href);
  let tickerFlight;
  function tickerReady() {
    if (!tickerFlight) {
      tickerFlight = window.TDBModules.load(new URL('tdb-ticker.js', base), { ready: () => Boolean(window.TDBNativeTicker) });
      tickerFlight.catch(() => { tickerFlight = null; });
    }
    return tickerFlight;
  }
  const valueKeys = ['price', 'duration', 'clinician'];
  const values = slide => valueKeys.map(key => slide?.querySelector('[data-tdb-smile-source-fact="' + key + '"] .tdb-smile-source-value')?.textContent.trim() || '');

  function prepare(root) {
    if (!root.matches('[data-tdb-smile-slider]') || !root.querySelector('[data-tdb-smile-presentation]')) return null;
    if (roots.has(root)) return roots.get(root);
    const track = root.querySelector('.swiper-wrapper');
    const presentation = root.querySelector('[data-tdb-smile-presentation]');
    const current = presentation.querySelector('.tdb-smile-counter-current');
    const totalNode = presentation.querySelector('.tdb-smile-counter-total');
    const label = presentation.querySelector('.tdb-smile-counter-label');
    const facts = presentation.querySelector('.tdb-smile-static-facts');
    const viewports = [...facts.querySelectorAll('.tdb-smile-fact-ticker')];
    const slots = viewports.map(node => node.querySelector('.tdb-smile-fact-slot'));
    const template = presentation.querySelector('[data-tdb-smile-ticker-template]');
    const motion = window.TDBMotion;
    let slides = [], originals = [], swiper = null, showTimer = 0, moving = false;
    let revealed = false, disposed = false, countTicker = null, totalTicker = null, tickerFailed = false, factTickers = [], revision = 0;
    const listeners = [];
    const desktop = matchMedia('(min-width:992px)');
    const clean = text => text.trim().replace(/\s+/g, ' ');
    const cancelShow = () => { clearTimeout(showTimer); showTimer = 0; };
    const cancelTickers = () => { countTicker?.settle(); totalTicker?.settle(); factTickers.forEach(ticker => ticker.settle()); };
    let openCard = null, pointerKind = 'mouse', gesture = null;
    const cardOf = node => node?.closest?.('.tdb-smile-card');
    const activeCard = card => {
      const slide = card?.closest('.swiper-slide');
      if (!slide || !root.contains(card)) return false;
      const logical = slide.hasAttribute('data-swiper-slide-index') ? Number(slide.getAttribute('data-swiper-slide-index')) : originals.indexOf(slide);
      return logical === (swiper ? swiper.realIndex : 0);
    };
    function syncReveal() {
      if (openCard && (!openCard.isConnected || !activeCard(openCard))) openCard = null;
      slides.forEach(slide => {
        const logical = slide.hasAttribute('data-swiper-slide-index') ? Number(slide.getAttribute('data-swiper-slide-index')) : originals.indexOf(slide);
        const active = logical === (swiper ? swiper.realIndex : 0);
        const card = slide.querySelector('.tdb-smile-card');
        // Apply to the real card and loop copies using logical slide identity.
        const open = Boolean(openCard && active);
        card?.setAttribute('aria-expanded', String(open));
        const details = slide.querySelector('.tdb-smile-details');
        details?.classList.toggle('is-open', open);
        details?.setAttribute('aria-hidden', String(!open));
        slide.querySelector('.tdb-smile-overlay')?.classList.toggle('is-open', open);
        slide.querySelectorAll('.tdb-smile-image-label').forEach(node => node.classList.toggle('is-expanded', open));
        slide.classList.toggle('is-muted', Boolean(swiper && !active));
      });
    }
    function closeDetails() { openCard = null; syncReveal(); }
    const onOver = event => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      const card = cardOf(event.target);
      if (!activeCard(card) || moving) return;
      openCard = desktop.matches && event.target.closest('.tdb-smile-summary-ready') ? null : card;
      syncReveal();
    };
    const onOut = event => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      const card = cardOf(event.target);
      if (card && !card.contains(event.relatedTarget)) closeDetails();
    };
    const onDown = event => { pointerKind = event.pointerType || 'mouse'; gesture = {x:event.clientX,y:event.clientY,moved:false}; };
    const onMove = event => { if (gesture && Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>8) gesture.moved = true; };
    const onClick = event => {
      const card = cardOf(event.target);
      if (!card || !['', '#'].includes(card.getAttribute('href') || '')) return;
      event.preventDefault();
      if (!activeCard(card) || swiper?.allowClick === false || (event.detail !== 0 && gesture?.moved) || moving) return;
      if (pointerKind !== 'mouse' || event.detail === 0) {
        openCard = openCard ? null : card; syncReveal();
      }
    };
    const onFocus = event => { const card = cardOf(event.target); if (activeCard(card) && card.matches(':focus-visible')) { openCard = card; syncReveal(); } };
    const onBlur = event => { if (!cardOf(event.target)?.contains(event.relatedTarget)) closeDetails(); };
    const onKey = event => {
      if (event.key === 'Escape') closeDetails();
      if (event.key === ' ' && activeCard(cardOf(event.target)) && !moving) { event.preventDefault(); openCard = openCard ? null : cardOf(event.target); syncReveal(); }
    };
    const outside = event => { if (!root.contains(event.target)) closeDetails(); };
    const revealEvents = {pointerover:onOver,pointerout:onOut,pointerdown:onDown,pointermove:onMove,pointercancel:closeDetails,click:onClick,focusin:onFocus,focusout:onBlur,keydown:onKey};
    Object.entries(revealEvents).forEach(([event,handler]) => root.addEventListener(event,handler));
    document.addEventListener('pointerdown', outside);
    desktop.addEventListener('change', closeDetails);
    function showText(index, fast = false) {
      slides.forEach((slide, order) => {
        const logical = slide.hasAttribute('data-swiper-slide-index') ? Number(slide.getAttribute('data-swiper-slide-index')) : order;
        slide.querySelectorAll('[data-fade-slide]').forEach(node => {
          node.classList.toggle('is-moving', fast);
          node.classList.toggle('is-visible', index === logical);
        });
      });
    }
    function update() {
      if (disposed) return;
      const index = swiper && !swiper.destroyed ? swiper.realIndex : 0;
      const direction = swiper && swiper.activeIndex < swiper.previousIndex ? -1 : 1;
      const total = String(originals.length).padStart(2, '0');
      // Keep Designer's initial value until the shared ticker can animate it.
      if (totalTicker) totalTicker.update(total);
      else if (tickerFailed) totalNode.textContent = total;
      label.textContent = 'Smile ' + (index + 1) + ' of ' + originals.length;
      const count = String(index + 1).padStart(2, '0');
      if (countTicker) countTicker.update(count, direction, Boolean(swiper));
      else current.textContent = count;
      const active = swiper && !swiper.destroyed ? swiper.slides[swiper.activeIndex] : originals[index];
      const data = values(active);
      data.forEach((text, column) => {
        if (factTickers[column]) factTickers[column].update(text, direction, revealed);
        else slots[column].textContent = text;
      });
      facts.setAttribute('aria-label', 'Treatment summary: ' + data.join(', '));
      syncReveal();
    }
    function reveal(delay) {
      cancelShow(); moving = false; showText(null);
      const draw = () => {
        showTimer = 0;
        if (!swiper || swiper.destroyed || disposed || !root.isConnected) return;
        showText(swiper.realIndex);
        revealed = true;
        viewports.forEach(node => node.classList.add('is-ready'));
      };
      if (motion.reduced.matches) draw(); else showTimer = setTimeout(draw, delay);
    }
    function hide() {
      cancelShow(); moving = true; closeDetails();
      showText(motion.reduced.matches ? swiper.realIndex : null, !motion.reduced.matches);
    }
    function refresh() {
      slides = [...track.children].filter(node => node.matches('.swiper-slide'));
      originals = slides.filter(node => !node.classList.contains('swiper-slide-duplicate'));
      update();
      if (swiper && !moving && !showTimer && !swiper.animating) {
        if (revealed) showText(swiper.realIndex);
        else if (root.getAttribute('data-tdb-slider-first-view') !== 'pending') reveal(motion.carousel.nextDelay);
      }
    }
    function unbind() {
      listeners.splice(0).forEach(([event, handler]) => swiper?.off(event, handler));
      cancelShow(); cancelTickers(); swiper = null; moving = false;
    }
    function bind(instance) {
      if (instance === swiper || !instance || instance.destroyed) return;
      unbind(); swiper = instance;
      const on = (event, handler) => { listeners.push([event, handler]); swiper.on(event, handler); };
      on('slideChange', () => { closeDetails(); update(); });
      on('touchStart', cancelShow);
      on('sliderMove', () => { if (!moving) hide(); });
      on('slideChangeTransitionStart', hide);
      on('slideChangeTransitionEnd', () => { update(); reveal(swiper.swipeDirection === 'prev' ? motion.carousel.previousDelay : motion.carousel.nextDelay); });
      on('touchEnd', () => { if (!swiper.animating) reveal(motion.carousel.settleDelay); });
      on('beforeDestroy', () => {
        // Swiper iterates this listener array directly. Removing listeners here
        // would skip the shared adapter's following teardown callback.
        cancelShow(); cancelTickers(); listeners.length = 0;
        swiper = null; moving = false; closeDetails(); showText(0);
      });
      refresh(); showText(revealed ? swiper.realIndex : null);
    }
    const observer = new MutationObserver(() => {
      if (!root.isConnected) return api.destroy();
      refresh();
    });
    // Child-list changes cover loop copies and CMS reorder; no subtree/style
    // observer or ResizeObserver is needed for stationary card layout.
    observer.observe(track, { childList: true });
    observer.observe(root, { attributes: true, attributeFilter: ['data-tdb-slider-first-view'] });
    const api = Object.freeze({bind,refresh,destroy() {
      if (disposed) return;
      disposed = true; revision++; unbind(); observer.disconnect();
      Object.entries(revealEvents).forEach(([event,handler]) => root.removeEventListener(event,handler));
      document.removeEventListener('pointerdown', outside);
      desktop.removeEventListener('change', closeDetails);
      closeDetails();
      countTicker?.destroy(); totalTicker?.destroy(); factTickers.forEach(ticker => ticker.destroy());
      showText(0); viewports.forEach(node => node.classList.add('is-ready')); roots.delete(root);
    }});
    roots.set(root, api); root.setAttribute('data-tdb-smile-card-design', '4.1');
    refresh();
    const token = revision;
    tickerReady().then(() => {
      if (disposed || token !== revision) return;
      countTicker = window.TDBNativeTicker.mount(current, {template,valueClass:'tdb-smile-counter-value',incomingClass:'tdb-smile-counter-value'});
      totalTicker = window.TDBNativeTicker.mount(totalNode, {template,valueClass:'tdb-smile-counter-value',incomingClass:'tdb-smile-counter-value'});
      factTickers = slots.map((slot, column) => window.TDBNativeTicker.mount(slot, {template,valueClass:'tdb-smile-fact-value',incomingClass:'tdb-smile-fact-value',normalize:text=>column<2?clean(text).toUpperCase():clean(text)}));
      update();
    }).catch(() => {
      // Keep the total accurate if the optional ticker cannot be downloaded.
      if (disposed || token !== revision) return;
      tickerFailed = true; update();
    });
    return api;
  }
  window.TDBSmileCards = Object.freeze({version:'4.1.0',prepare,prune(){roots.forEach((api,root)=>{if(!root.isConnected)api.destroy();});}});
})();

/* TDB gallery carousel plugin v1.1.1. Native Smile Gallery; existing highlight behaviour. */
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
        // Native IG has static cards and a stationary interactive frame.
        // Designer's root gap stays readable after Swiper writes slide margins.
        if (e.hasAttribute('data-tdb-ig-native')) {
            const gap = parseFloat(getComputedStyle(e).columnGap);
            return Number.isFinite(gap) ? gap : n;
        }
        if (e.classList.contains('tdb-smile-carousel')) {
            const slide = e.querySelector('.swiper-slide.smile');
            if (!slide) return n;
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
const beforeObserve=function(e) {
            window.TDBSmileCards?.prepare(e);
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
const plugin=Object.freeze({version:'1.1.1',selector:e,beforeObserve,
 mount(root){const presentation=window.TDBSmileCards?.prepare(root);v(root);const swiper=m(root)?.swiper;presentation?.bind(swiper);return swiper;},
 prune(){l.forEach((state,root)=>{if(!document.documentElement.contains(root))state.cancel();});window.TDBSmileCards?.prune();},
 refresh(root=document){window.TDBSwiper.refresh('gallery',root);}
});
window.TDBGallery=plugin;
window.TDBSwiper.register('gallery',plugin);
})();
