/* TDB review loader v3.11.0. Based on the deployed v3.10.0 release (3217122).
 * Home experiment: the empty mount point opts into first-open HTML/CSS loading.
 * Visible summaries/cards retain their existing permission and proximity gates.
 */
(() => {
    "use strict";
    if (window.TDBReviewLoader) return;
    const e = document.currentScript, t = new URL(e.dataset?.tdbReviewBase || "./", e.src), n = new Map, i = [ "CookieScriptLoaded", "CookieScriptCurrentState", "CookieScriptAccept", "CookieScriptAcceptAll", "CookieScriptAcceptSelection", "CookieScriptReject", "CookieScriptClose" ], r = window.TDBReviewOptions || {};
    let o, a, s, d = new AbortController;
    const lazyHost = document.querySelector('[data-tdb-review-lazy]');
    const lazyBase = new URL(e.dataset?.tdbReviewLazyBase || './', e.src);
    async function ensureDrawer(signal) {
        if (!lazyHost || l()) return;
        w(signal);
        // Shared registry deduplicates both requests and permits retries after failure.
        // Neither request is made by scrolling, focus, hover or pointer-down.
        await Promise.all([
            window.TDBModules.load(new URL('tdb-review-drawer.css', lazyBase), {
                type: 'style', attribute: 'data-tdb-review-drawer-css'
            }),
            window.TDBModules.load(new URL('tdb-review-drawer-template.js', lazyBase), {
                ready: () => typeof window.TDBReviewDrawerTemplate?.mount === 'function'
            })
        ]);
        w(signal);
        // Attach only after CSS is ready. Concurrent open requests share one shell.
        if (!l()) window.TDBReviewDrawerTemplate.mount(lazyHost);
    }
    function c() {
        if (r.permission) return Boolean(r.permission());
        try {
            const e = window.CookieScript?.instance?.currentState?.();
            if ([ "accept", "reject", "close" ].includes(String(e?.action).toLowerCase())) return !0;
            const t = document.cookie.split(";").map(e => e.trim()).find(e => e.startsWith("CookieScriptConsent=")), n = t && JSON.parse(decodeURIComponent(t.slice(t.indexOf("=") + 1)));
            return [ "accept", "reject", "close" ].includes(String(n?.action || n?.a).toLowerCase());
        } catch {
            return !1;
        }
    }
    const w = e => {
        if (e?.aborted || !c()) throw new DOMException("Cancelled", "AbortError");
    }, l = () => document.querySelector("[data-tdb-reviews]"), u = e => e.matches("[data-tdb-review-introduction]") ? "introduction" : e.matches("[data-tdb-review-cards]") ? "cards" : "quotes";
    function v(e, t) {
        e.matches("[data-tdb-review-introduction],[data-tdb-review-quotes],[data-tdb-review-cards]") && e.querySelectorAll("[data-tdb-review-trigger],[data-tdb-quote-action],[data-tdb-cards-open]").forEach(e => {
            e.setAttribute("aria-disabled", String(!t)), e.setAttribute("tabindex", t ? "0" : "-1"), 
            t || (e.removeAttribute("aria-busy"), e.removeAttribute("data-tdb-loading"));
        });
    }
    async function b(e, n, i = !1) {
        w(n), await window.TDBModules.load(new URL("tdb-motion.js", t)), w(n);
        const r = [ "tdb-ticker.js", "tdb-review-cms.js" ];
        if (e && r.push("quotes" === e ? "tdb-review-quote-adapter.min.js" : `tdb-review-${e}.js`), 
        "quotes" === e && r.push("tdb-quote-carousel.js"), "cards" === e && r.push("tdb-slider-focus.js", "tdb-rendered-progress.js"), 
        i && (l() || lazyHost) && r.push("tdb-drawer.js", "tdb-filters.js", "tdb-reviews.js"), await Promise.all(r.map(e => window.TDBModules.load(new URL(e, t), "tdb-quote-carousel.js" === e ? {
            ready: () => !!window.TDBQuoteCarousel
        } : "tdb-rendered-progress.js" === e ? {
            ready: () => !!window.TDBRenderedProgress
        } : {}))), w(n), (i && (l() || lazyHost) || "quotes" === e || "cards" === e) && (await window.TDBModules.load(new URL("tdb-swiper-8.4.7.min.js", t), {
            attribute: "data-swiper-js",
            ready: () => "function" == typeof window.Swiper && "function" == typeof window.TDBSwiper?.create
        }), w(n)), window.TDBSwiper) for (const [e, t] of [ [ "review-drawer", window.TDBReviews ], [ "review-cards", window.TDBReviewCards ], [ "review-testimonials", window.TDBReviewQuotes ] ]) t && window.TDBSwiper.register(e, t);
    }
    async function p({signal: e = d.signal, kind: t = null, drawer: i = null === t} = {}) {
        if (w(e), !n.size && !l() && !lazyHost) throw Error("No review component on this page");
        if (await Promise.all([b(t, e, i), i ? ensureDrawer(e) : null]), w(e), !o) {
            const e = window.TDBReviewCMS.load({
                signal: d.signal
            });
            o = e, e.catch(() => {
                o === e && (o = null);
            });
        }
        const r = await o;
        w(e);
        const s = l();
        return i && s && !a && (a = window.TDBSwiper.mount("review-drawer", s, r)), r;
    }
    function g(e, t) {
        if (lazyHost || !t.visible || t.warming || !c() || !l()) return;
        t.warming = !0;
        const n = () => {
            t.warming = !1, t.visible && e.isConnected && c() && function() {
                if (!c() || !l()) return Promise.resolve();
                if (!s) {
                    const e = b(null, d.signal, !0);
                    s = e, e.catch(() => {
                        s === e && (s = null);
                    });
                }
                return s;
            }().catch(() => {});
        };
        "requestIdleCallback" in window ? requestIdleCallback(n, {
            timeout: 2e3
        }) : setTimeout(n, 250);
    }
    async function f({trigger: e, signal: t = d.signal, reviewId: n = "", onReady: i}) {
        const r = await p({
            signal: t
        });
        if (w(t), !a) throw Error("Native review drawer unavailable");
        const o = e?.closest("[data-tdb-review-introduction]");
        await (r.ensureIdentity?.(o, {
            signal: t
        })), w(t);
        const s = n || window.TDBReviewCMS.resolveIdentity(r.records, o);
        s && await (r.ensure?.([ s ], {
            signal: t
        })), w(t), i?.();
        const c = a;
        await c.open(e, s), t.aborted && (c.destroy(), a === c && (a = null));
    }
    async function m(e) {
        if ("keydown" === e.type && ![ "Enter", " " ].includes(e.key)) return;
        const t = e.target.closest?.("[data-tdb-review-trigger],[data-tdb-quote-action],[data-tdb-cards-open]"), i = t?.closest("[data-tdb-review-introduction],[data-tdb-review-quotes],[data-tdb-review-cards]"), r = n.get(i);
        if (!t || !r || r.instance || !c()) return;
        if (e.preventDefault(), e.stopImmediatePropagation(), "true" === t.getAttribute("aria-busy")) return;
        r.near = !0, y();
        const o = d.signal, a = i.querySelector("[data-tdb-review-status]");
        a && (a.textContent = ""), await window.TDBModules.withBusy(t, () => f({
            trigger: t,
            signal: o,
            reviewId: t.closest("[data-review-id]")?.dataset.reviewId || ""
        }), {
            signal: o,
            onError() {
                a && (a.textContent = "The reviews could not load. Please try again.");
            }
        });
    }
    function y() {
        if (c()) for (const [e, t] of n) {
            if (v(e, !0), g(e, t), !e.isConnected && !t.instance) {
                S?.unobserve(e), h?.unobserve(e), n.delete(e);
                continue;
            }
            if (!t.near || t.instance || t.pending) continue;
            const i = d.signal, r = {};
            t.pending = r, (async () => {
                const n = u(e), r = await p({
                    signal: i,
                    kind: n
                });
                w(i), "quotes" === n && await r.fetchRecords(r.featured, {
                    signal: i
                }), "introduction" === n && await (r.ensureIdentity?.(e, {
                    signal: i
                })), w(i), e.querySelectorAll("[data-tdb-review-count]").forEach(e => e.setAttribute("data-tdb-review-count", String(r.total))), 
                e.querySelectorAll("[data-tdb-review-rating]").forEach(e => e.setAttribute("data-tdb-review-rating", r.average.toFixed(2)));
                const o = {
                    prepare: async ({signal: e} = {}) => (w(i), w(e), r),
                    openReviews: f,
                    closeReviews: () => {
                        a?.destroy(), a = null;
                    }
                };
                t.instance = "introduction" === n ? window.TDBReviewIntroduction.mount(e, o) : "cards" === n ? window.TDBSwiper.mount("review-cards", e, r, o) : window.TDBSwiper.mount("review-testimonials", e, r, o);
            })().catch(t => {
                i.aborted || (e.dataset.tdbReviewError = t.message, console.warn("TDB review component:", t.message));
            }).finally(() => {
                t.pending === r && (t.pending = null);
            });
        } else {
            d.signal.aborted || d.abort(), d = new AbortController, o = null, s = null, a?.destroy(), 
            a = null;
            for (const [e, t] of n) t.instance?.destroy(), t.instance = null, t.pending = null, 
            v(e, !1);
        }
    }
    const S = "IntersectionObserver" in window ? new IntersectionObserver(e => {
        e.forEach(e => {
            const t = n.get(e.target);
            t && (t.near = e.isIntersecting);
        }), y();
    }, {
        rootMargin: "700px 0px"
    }) : null, h = !lazyHost && "IntersectionObserver" in window ? new IntersectionObserver(e => {
        e.forEach(e => {
            const t = n.get(e.target);
            t && (t.visible = e.isIntersecting, g(e.target, t));
        });
    }, {
        threshold: 0
    }) : null;
    function C() {
        [ ...document.querySelectorAll("[data-tdb-review-introduction],[data-tdb-review-cards],[data-tdb-review-quotes]") ].forEach(e => {
            if (n.has(e)) return;
            const t = {
                near: !S,
                visible: !h,
                warming: !1,
                instance: null,
                pending: null
            };
            n.set(e, t), S?.observe(e), h?.observe(e);
            for (const n of [ "pointerover", "focusin", "pointerdown" ]) e.addEventListener(n, e => {
                t.near = !0, y(), !lazyHost && e.target.closest?.("[data-tdb-review-trigger]") && c() && p().catch(() => {});
            }, {
                passive: !0
            });
        }), y();
    }
    for (const e of i) window.addEventListener(e, y), document.addEventListener(e, y);
    r.subscribe?.(y), window.addEventListener("online", y), window.addEventListener("pageshow", y), 
    document.addEventListener("click", m, !0), document.addEventListener("keydown", m, !0), 
    window.TDBReviewLoader = Object.freeze({
        version: "3.11.0",
        prepare: p,
        open: f,
        refresh: C,
        status: () => ({
            allowed: c(),
            prepared: !!a,
            instances: [ ...n.values() ].filter(e => e.instance).length
        })
    }), "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", C, {
        once: !0
    }) : C();
})();
