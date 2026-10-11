/* First-open native shell + live Webflow CMS records. No prefetch or warm-up.
 * CMS order is independent of the visible marquee's random order: match logos.
 */
(() => {
  'use strict';
  if (window.TDBPartnerCard) return;
  const html = __TDB_PARTNER_CARD_HTML__;
  const records = new Map();
  function key(item) {
    const src = item.querySelector('.logo_image')?.getAttribute('src');
    return src ? new URL(src, location.href).pathname : '';
  }
  function content(address) {
    const url = new URL(address, location.href);
    if (url.origin !== location.origin) return Promise.reject(Error('Partner source must be same-origin'));
    if (!records.has(url.href)) {
      const request = (async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        try {
          const response = await fetch(url, {credentials:'same-origin', signal:controller.signal});
          if (!response.ok) throw Error('Partner content unavailable');
          const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
          const found = new Map();
          for (const item of doc.querySelectorAll('[data-tdb-partner-records] .tdb-partner-logo')) {
            const source = item.querySelector('.tdb-partner-source');
            const id = key(item);
            if (!id || !source || source.hidden || source.classList.contains('w-condition-invisible')) continue;
            if (found.has(id)) throw Error('Duplicate partner identity');
            // Import only the native record; never retain the fetched document.
            found.set(id, document.importNode(source, true));
          }
          if (!found.size) throw Error('Partner content empty');
          return found;
        } finally { clearTimeout(timer); }
      })().catch(error => { records.delete(url.href); throw error; });
      records.set(url.href, request);
    }
    return records.get(url.href);
  }
  window.TDBPartnerCard = Object.freeze({
    version:'1.0.0',
    async prepare(host, originals) {
      const address = host.getAttribute('data-tdb-partner-source-url') || '/partner-content';
      const data = await content(address);
      const sources = originals.map(item => {
        const source = data.get(key(item));
        if (!source?.querySelector('.tooltip2_card-wrapper')) {
          records.delete(new URL(address, location.href).href);
          throw Error('Partner record unavailable');
        }
        return source.cloneNode(true);
      });
      const template = document.createElement('template');
      template.innerHTML = html;
      for (const node of template.content.children) node.setAttribute('data-tdb-partner-surface','');
      return {fragment:template.content, sources};
    }
  });
})();
