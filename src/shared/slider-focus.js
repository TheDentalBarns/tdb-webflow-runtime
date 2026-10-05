/* TDB shared slider focus v1.2.0. Extracted unchanged from the carousel bundle. */
(() => {
    "use strict";
    const e = document.documentElement;
    if (e.dataset.tdbSliderFocusReady) return;
    e.dataset.tdbSliderFocusReady = "1.2.0";
    const t = 'input,textarea,select,[contenteditable="true"]', n = "[data-tdb-sg-overlay],.tdb-sg-filter-dock";
    let i = null, r = null, s = 0, a = 0, o = 0, l = 0;
    const d = () => Math.max(window.scrollY || e.scrollTop || 0, 0);
    function c() {
        if (l = 0, !i || i.controller) return;
        const e = d(), t = e - i.y;
        i.y = e, r?.horizontal ? i.up = i.down = 0 : t > 0 ? (i.up = 0, i.down += t) : t < 0 && (i.down = 0, 
        i.up -= t), (i.up > 120 || i.down > 140 || e <= 40 && t < 0) && L();
    }
    function u() {
        l || (l = requestAnimationFrame(c));
    }
    function p() {
        window.removeEventListener("scroll", u), l && cancelAnimationFrame(l), l = 0;
    }
    const m = e => e?.closest?.(".logo-slider") ? null : e?.closest?.(".highlight-swiper_component,.parallax-swiper_component,.swiper,.w-slider"), f = e => e?.closest?.('[disabled],[aria-disabled="true"],[hidden],[inert]'), h = () => e.classList.contains("tdb-sg-chrome-away") || e.classList.contains("tdb-sg-locked");
    function b() {
        s && cancelAnimationFrame(s), s = 0;
    }
    function w() {
        b(), clearTimeout(a), clearTimeout(o), p(), i?.controller?.release(), e.classList.contains("tdb-slider-focus") && e.classList.remove("tdb-slider-focus"), 
        i?.nav && (i.value ? i.nav.style.setProperty("--tdb-slider-nav-away", i.value, i.priority) : i.nav.style.removeProperty("--tdb-slider-nav-away")), 
        i = null;
    }
    function g() {
        i && !h() && (document.querySelector('.navbar10_menu-button[aria-expanded="true"]')?.click(), 
        document.querySelectorAll('.navbar10_dropdown-toggle[aria-expanded="true"]').forEach(e => e.click()));
    }
    function v(t) {
        if (t && !f(t) && !h()) {
            if (b(), !i) {
                const e = document.querySelector(".navbar10_component");
                if (i = {
                    nav: e,
                    value: e?.style.getPropertyValue("--tdb-slider-nav-away") || "",
                    priority: e?.style.getPropertyPriority("--tdb-slider-nav-away") || ""
                }, e) {
                    const t = e.getBoundingClientRect().top, n = [ e, ...e.querySelectorAll(".w-nav-overlay,.navbar10_menu[data-nav-menu-open],.navbar10_dropdown-list.w--open") ], i = Math.max(e.offsetHeight, ...n.filter(e => e.getClientRects().length && "hidden" !== getComputedStyle(e).visibility).map(e => e.getBoundingClientRect().bottom - t));
                    e.style.setProperty("--tdb-slider-nav-away", i + "px");
                }
                const t = document.getElementById("tdb-vip-drawer");
                t?.matches(".is-open,.is-peeking") && window.TDBVIPDrawer?.close?.(), a = setTimeout(g, 430), 
                o = setTimeout(g, 680);
            }
            i.slider = t, i.controller = window.TDBNavScroll || null, p(), i.controller ? i.controller.focus(L, () => Boolean(r?.horizontal)) : (i.y = d(), 
            i.up = i.down = 0, window.addEventListener("scroll", u, {
                passive: !0
            })), e.classList.contains("tdb-slider-focus") || e.classList.add("tdb-slider-focus");
        }
    }
    function y(e) {
        const t = e?.closest?.(".swiper-btn-prev,.swiper-btn-next,.swiper-bullet,.swiper-pagination-bullet,.w-slider-arrow-left,.w-slider-arrow-right,.w-slider-dot");
        return t && !f(t) ? m(t) : null;
    }
    function E(e) {
        if (r = null, 0 !== e.button || !1 === e.isPrimary || e.target.closest?.(t + "," + n)) return;
        const i = m(e.target);
        i && !f(e.target) && (r = {
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            slider: i,
            horizontal: !1
        }, y(e.target) && v(i));
    }
    function x(e) {
        if (!r || r.id !== e.pointerId) return;
        const t = Math.abs(e.clientX - r.x), n = Math.abs(e.clientY - r.y);
        !r.horizontal && n > 10 && n > t ? r = null : !r.horizontal && t > 8 && t > 1.2 * n && (r.horizontal = !0, 
        v(r.slider));
    }
    document.addEventListener("pointerdown", E, {
        capture: !0,
        passive: !0
    }), document.addEventListener("pointermove", x, {
        capture: !0,
        passive: !0
    });
    const S = e => {
        r?.id === e.pointerId && (r.horizontal && i && v(r.slider), r = null);
    };
    function k(e) {
        if (e.target.closest?.(n + "," + t)) return;
        const i = y(e.target);
        i ? v(i) : !e.target.closest?.('a,button,[role="button"]') && e.target.closest?.(".swiper-slide,.w-slide") && v(m(e.target));
    }
    function A(r) {
        if (r.target.closest?.(t + "," + n)) return;
        if ("Escape" === r.key && i) return void w();
        if (![ "ArrowLeft", "ArrowRight", "Enter", " " ].includes(r.key)) return;
        const s = y(r.target);
        if (s) return void v(s);
        if ("ArrowLeft" !== r.key && "ArrowRight" !== r.key) return;
        const a = m(r.target);
        if (a) return void v(a);
        if (r.target !== document.body && r.target !== e) return;
        const o = [ ...document.querySelectorAll(".swiper") ].find(e => {
            if (!m(e)) return !1;
            const t = e.getBoundingClientRect();
            return t.width > 0 && t.height > 0 && t.top < innerHeight && t.bottom > 0 && t.right > 0 && t.left < innerWidth && !f(e);
        });
        o && v(o);
    }
    function L() {
        s || (s = requestAnimationFrame(() => {
            s = requestAnimationFrame(() => {
                s = 0, w();
            });
        }));
    }
    document.addEventListener("pointerup", S, {
        capture: !0,
        passive: !0
    }), document.addEventListener("pointercancel", S, {
        capture: !0,
        passive: !0
    }), document.addEventListener("click", k, {
        capture: !0,
        passive: !0
    }), document.addEventListener("keydown", A, {
        capture: !0,
        passive: !0
    });
    const T = e => {
        i && e.target.closest?.('.navbar10_component,#tdb-vip-drawer,a[href*="#vip"],[data-tdb-vip-open]') && w();
    };
    document.addEventListener("focusin", T), document.addEventListener("pointerdown", T, {
        capture: !0,
        passive: !0
    }), window.addEventListener("resize", () => {
        r = null, w();
    }, {
        passive: !0
    }), window.addEventListener("pagehide", () => {
        r = null, w();
    }), new MutationObserver(() => {
        i && h() && w();
    }).observe(e, {
        attributes: !0,
        attributeFilter: [ "class" ]
    }), window.TDBSliderFocus = Object.freeze({
        resume(e) {
            if (!e || Math.abs(window.scrollY - e.y) > 8) return;
            const t = (e.click || e.key || e.down)?.target;
            t?.isConnected && (e.down && E(e.down), e.move && x(e.move), e.end && S(e.end), 
            e.click && k(e.click), e.key && A(e.key));
        }
    });
})();
