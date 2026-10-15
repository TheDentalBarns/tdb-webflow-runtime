(() => {
  'use strict';
  if (window.TDBPartnerCard) return;
  const t = new Map();
  function r(t) {
    const r = t.getAttribute('data-item-id');
    if (r) return 'item:' + r;
    const e = t.querySelector('.logo_image')?.getAttribute('src');
    return e ? new URL(e, location.href).pathname : '';
  }
  window.TDBPartnerCard = Object.freeze({
    version: '1.0.0',
    async prepare(e, a) {
      const i = e.getAttribute('data-tdb-partner-source-url') || '/partner-content',
        n = await (function (e) {
          const a = new URL(e, location.href);
          if (a.origin !== location.origin)
            return Promise.reject(Error('Partner source must be same-origin'));
          if (!t.has(a.href)) {
            const e = (async () => {
              const t = new AbortController(),
                e = setTimeout(() => t.abort(), 15e3);
              try {
                const e = await fetch(a, { credentials: 'same-origin', signal: t.signal });
                if (!e.ok) throw Error('Partner content unavailable');
                const i = new DOMParser().parseFromString(await e.text(), 'text/html'),
                  n = new Map();
                for (const t of i.querySelectorAll(
                  '[data-tdb-partner-records] .tdb-partner-logo',
                )) {
                  const e = t.querySelector('.tdb-partner-source'),
                    a = r(t);
                  if (a && e && !e.hidden && !e.classList.contains('w-condition-invisible')) {
                    if (n.has(a)) throw Error('Duplicate partner identity');
                    n.set(a, document.importNode(e, !0));
                  }
                }
                if (!n.size) throw Error('Partner content empty');
                return n;
              } finally {
                clearTimeout(e);
              }
            })().catch((r) => {
              throw (t.delete(a.href), r);
            });
            t.set(a.href, e);
          }
          return t.get(a.href);
        })(i),
        o = a.map((e) => {
          const a = n.get(r(e));
          if (!a?.querySelector('.tooltip2_card-wrapper'))
            throw (t.delete(new URL(i, location.href).href), Error('Partner record unavailable'));
          return a.cloneNode(!0);
        }),
        d = document.createElement('template');
      d.innerHTML =
        '<div aria-hidden="true" class="tdb-partner-overlay"></div><img alt="" class="tdb-partner-spotlight" loading="lazy"/><div aria-hidden="true" aria-label="Partner details" class="tdb-partner-tooltip" role="region"><div class="tdb-partner-backdrop"></div><div aria-hidden="true" class="tdb-partner-tint"></div><div class="tdb-partner-content"><div class="tdb-partner-header"><a aria-label="Close partner details" class="carousel-arrow tdb-service-arrow tdb-partner-close w-button" href="#" role="button" tabindex="0" type="button"><img alt="" aria-hidden="true" class="tdb-partner-icon" height="16" loading="lazy" src="https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/6ac903f5a05e10347d13d4a5_tdb-close.svg" width="16"/></a></div><div class="tdb-partner-swiper"><div class="tdb-partner-slides"></div></div><div class="tdb-partner-footer"><div class="tdb-partner-visit-slot"><a class="tdb-service-discover w-inline-block" data-tdb-partner-visit="" href="#"><div>Visit partner</div><div class="icon-embed-xxsmall w-embed"><img alt="" aria-hidden="true" class="tdb-partner-icon" height="16" loading="lazy" src="https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/6ac9040240c896d539d1903d_tdb-globe.svg" width="16"/></div></a></div><div class="tdb-partner-controls"><a aria-label="Previous partner" class="carousel-arrow tdb-service-arrow tdb-partner-prev w-button" href="#" role="button" tabindex="0" type="button"><span class="tdb-partner-prev-icon"><img alt="" aria-hidden="true" class="tdb-partner-icon" height="16" loading="lazy" src="https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/6ac8c5037ecf8cf1ab74a93a_tdb-arrow.svg" width="16"/></span></a><a aria-label="Next partner" class="carousel-arrow tdb-service-arrow tdb-partner-next w-button" href="#" role="button" tabindex="0" type="button"><img alt="" aria-hidden="true" class="tdb-partner-icon" height="16" loading="lazy" src="https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/6ac8c5037ecf8cf1ab74a93a_tdb-arrow.svg" width="16"/></a></div></div></div></div>';
      for (const t of d.content.children) t.setAttribute('data-tdb-partner-surface', '');
      return { fragment: d.content, sources: o };
    },
  });
})();
