const TDBImmediateModuleRoot = new URL("./", document.currentScript.src);

// Prepare existing native/CMS markup at the same early stage as before.
window.TDBParallax?.refresh();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.TDBParallax?.refresh(), {once: true});
}

(() => {
    "use strict";
    function e(e, t, n) {
        const r = document.querySelector(`script[${t}]`);
        return r ? !n || n() ? Promise.resolve(r) : new Promise((e, t) => {
            r.addEventListener("load", () => e(r), {
                once: !0
            }), r.addEventListener("error", t, {
                once: !0
            });
        }) : new Promise((n, r) => {
            const i = document.createElement("script");
            i.src = e, i.type = "text/javascript", i.charset = "UTF-8", i.async = !0, i.setAttribute(t, "true"), 
            i.onload = () => n(i), i.onerror = r, document.head.appendChild(i);
        });
    }
    const t = e("https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@v0.3.0/dist/tdb-consent.js", "data-tdb-consent-js", () => Boolean(window.TDBConsent)).catch(e => {
        throw console.error("TDB Consent failed to load"), e;
    }), n = e("https://cdn.jsdelivr.net/gh/TheDentalBarns/CookieScript@798b41dc10895752a232d631cf7e5232c3598673/tdb-cookie-consent.min.js", "data-cookie-script-js", () => Boolean(window.CookieScript?.instance)), r = Promise.resolve(null), i = e("https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-attribution@afee7b723073c1d3965b5a10eb29e225b7ef55c1/dist/tdb-attribution.min.js", "data-tdb-attribution-js", () => Boolean(window.TDBAttribution)), a = e("https://cdn.jsdelivr.net/npm/@finsweet/attributes-scrolldisable@1.6.2/scrolldisable.js", "data-scrolldisable-js");
    const o = e(new URL("tdb-footer-runtime.min.js", TDBImmediateModuleRoot).href, "data-tdb-footer-runtime-js", () => Boolean(window.TDBFooterRuntime)), l = Promise.allSettled([ t, n, r, i, o ]);
    l.then(() => {
        window.__TDB_PRIORITY_READY__ = !0, window.dispatchEvent(new Event("tdb:priority-ready"));
    });
    const d = Promise.allSettled([ t, n, r, i, a, o ]);
    window.TDBImmediateRuntimeBatch = Object.freeze({
        version: "0.10.1",
        priorityReady: l,
        ready: d,
        status: () => ({
            priorityReady: Boolean(window.__TDB_PRIORITY_READY__),
            consent: Boolean(window.TDBConsent),
            cookieScript: Boolean(window.CookieScript?.instance),
            cookieVersion: window.CookieScript?.instance?.version || null,
            attribution: Boolean(window.TDBAttribution),
            attributionVersion: window.TDBAttribution?.version || null,
            logoMarquee: Boolean(window.TDBLogoMarquee),
            footerRuntime: Boolean(window.TDBFooterRuntime),
            vipDrawerLoader: Boolean(window.TDBVIPDrawerLoader),
            vipDrawer: Boolean(window.TDBVIPDrawer)
        })
    });
})();
