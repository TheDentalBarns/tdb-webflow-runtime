const TDBImmediateModuleRoot = new URL(document.currentScript.dataset.tdbRuntimeBase || "./", document.currentScript.src);

// Prepare existing native/CMS markup at the same early stage as before.
window.TDBParallax?.refresh();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.TDBParallax?.refresh(), {once: true});
}

(() => {
    "use strict";
    function e(url, attribute, ready) {
        const existing = document.querySelector(`script[${attribute}]`);
        if (existing && (!ready || ready())) return Promise.resolve(existing);
        return new Promise((resolve, reject) => {
            const script = existing || document.createElement('script');
            let settled = false;
            const finish = error => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                script.removeEventListener('load', loaded);
                script.removeEventListener('error', failed);
                if (error) reject(error); else resolve(script);
            };
            const loaded = () => finish();
            const failed = () => finish(new Error('TDB script failed: ' + url));
            // Optional or blocked hosts must not leave startup promises pending
            // forever. A late response can still initialise its own module.
            const timer = setTimeout(() => finish(new Error('TDB script timed out: ' + url)), 20000);
            script.addEventListener('load', loaded, { once: true });
            script.addEventListener('error', failed, { once: true });
            if (!existing) {
                script.src = url;
                script.type = 'text/javascript';
                script.charset = 'UTF-8';
                script.async = true;
                script.setAttribute(attribute, 'true');
                document.head.appendChild(script);
            }
        });
    }
    const t = e("https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@v0.3.0/dist/tdb-consent.js", "data-tdb-consent-js", () => Boolean(window.TDBConsent)).catch(e => {
        throw console.error("TDB Consent failed to load"), e;
    }), n = e("https://cdn.jsdelivr.net/gh/TheDentalBarns/CookieScript@798b41dc10895752a232d631cf7e5232c3598673/tdb-cookie-consent.min.js", "data-cookie-script-js", () => Boolean(window.CookieScript?.instance)), r = Promise.resolve(null), i = e("https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-attribution@6fa2423188ddccf9ef354132d3c1a303245e17a5/dist/tdb-attribution.min.js", "data-tdb-attribution-js", () => Boolean(window.TDBAttribution)), a = e("https://cdn.jsdelivr.net/npm/@finsweet/attributes-scrolldisable@1.6.2/scrolldisable.js", "data-scrolldisable-js");
    const o = e(new URL("tdb-footer-runtime.min.js", TDBImmediateModuleRoot).href, "data-tdb-footer-runtime-js", () => Boolean(window.TDBFooterRuntime)), l = Promise.allSettled([ t, n, r, o ]);
    l.then(() => {
        window.__TDB_PRIORITY_READY__ = !0, window.dispatchEvent(new Event("tdb:priority-ready"));
    });
    const d = Promise.allSettled([ t, n, r, i, a, o ]);
    window.TDBImmediateRuntimeBatch = Object.freeze({
        version: "0.11.3",
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

