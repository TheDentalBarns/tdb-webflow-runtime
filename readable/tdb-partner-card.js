(() => {
  'use strict';
  if (window.TDBPartnerCard) return;
  const endpoint =
    'https://tdb-public-availability.david-070.workers.dev/tdb-content/v1/partners.json';
  let flight;
  const validText = (v, max) => typeof v === 'string' && v.length <= max;
  function safeURL(value, image = false) {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      (image &&
        (url.hostname !== 'cdn.prod.website-files.com' ||
          !url.pathname.startsWith('/67837ee85ee175873126e461/')))
    )
      throw Error('Invalid partner URL');
    return url.href;
  }
  function richText(html) {
    const t = document.createElement('template');
    t.innerHTML = html;
    const allowed = new Set([
      'P',
      'BR',
      'STRONG',
      'B',
      'EM',
      'I',
      'U',
      'S',
      'A',
      'UL',
      'OL',
      'LI',
      'BLOCKQUOTE',
      'H2',
      'H3',
      'H4',
      'H5',
      'H6',
    ]);
    for (const node of [...t.content.querySelectorAll('*')]) {
      if (!allowed.has(node.tagName)) {
        node.remove();
        continue;
      }
      const href = node.tagName === 'A' && node.getAttribute('href');
      for (const attr of [...node.attributes]) node.removeAttribute(attr.name);
      if (href) {
        try {
          node.href = safeURL(href);
          node.rel = 'noopener noreferrer';
        } catch {}
      }
    }
    return t.content;
  }
  function source(record) {
    const t = document.createElement('template');
    t.innerHTML =
      '<div class="tdb-partner-source"><div class="tooltip2_card-wrapper"><div class="tooltip2_image-wrapper"><img class="tooltip2_image" loading="lazy" data-tdb-partner-image-sizes="12.1rem"></div><div class="tdb-partner-copy"><div class="margin-bottom margin-xxsmall"><div class="text-style-tagline-restored"></div></div><div class="text-rich-text is-tooltip tdb-partner-copy-body w-richtext"></div></div></div><a class="tdb-partner-link-source" data-tdb-partner-link aria-hidden="true" tabindex="-1" target="_blank" rel="noopener noreferrer"></a></div>';
    const root = t.content.firstElementChild,
      image = root.querySelector('img');
    if (Array.isArray(record.variants) && record.variants.length) {
      image.sizes = '12.1rem';
      image.srcset = record.variants
        .map((v) => {
          if (!Number.isSafeInteger(v.width) || v.width < 1 || v.width > 20000)
            throw Error('Invalid partner image width');
          return safeURL(v.url, true) + ' ' + v.width + 'w';
        })
        .join(', ');
    }
    image.src = safeURL(record.image, true);
    image.alt = record.imageAlt;
    root.querySelector('.text-style-tagline-restored').textContent = record.name;
    root.querySelector('.tdb-partner-copy-body').append(richText(record.body));
    const link = root.querySelector('[data-tdb-partner-link]');
    if (record.link) link.href = safeURL(record.link);
    else link.remove();
    return root;
  }
  async function read() {
    if (!flight)
      flight = (async () => {
        const controller = new AbortController(),
          timer = setTimeout(() => controller.abort(), 15000);
        try {
          const response = await fetch(endpoint, {
            credentials: 'omit',
            redirect: 'error',
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          });
          if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json'))
            throw Error('Partner feed unavailable');
          const text = await response.text();
          if (text.length > 1048576) throw Error('Partner feed too large');
          const data = JSON.parse(text),
            age = Date.now() - data.checkedAt;
          if (
            data.version !== 1 ||
            data.feed !== 'partners' ||
            !Number.isSafeInteger(data.checkedAt) ||
            age < -60000 ||
            age >= 3600000 ||
            !Array.isArray(data.partners) ||
            data.partners.length > 1000
          )
            throw Error('Invalid partner feed');
          const records = new Map();
          for (const record of data.partners) {
            if (
              !['id', 'slug', 'name', 'imageAlt'].every((k) => validText(record[k], 1000)) ||
              !validText(record.body, 20000)
            )
              throw Error('Invalid partner record');
            const node = source(record);
            for (const key of [
              'item:' + record.id,
              'item:' + record.slug,
              new URL(safeURL(record.logo, true)).pathname,
            ]) {
              if (records.has(key)) throw Error('Duplicate partner identity');
              records.set(key, node);
            }
          }
          return records;
        } finally {
          clearTimeout(timer);
        }
      })().catch((error) => {
        flight = null;
        throw error;
      });
    return flight;
  }
  window.TDBPartnerCard = Object.freeze({
    version: '1.1.0',
    async prepare(host, items) {
      const records = await read();
      const sources = items.map((item) => {
        const id = item.getAttribute('data-item-id'),
          logo = item.querySelector('.logo_image')?.getAttribute('src');
        const node =
          records.get('item:' + id) || (logo && records.get(new URL(logo, location.href).pathname));
        if (!node) {
          flight = null;
          throw Error('Partner record unavailable');
        }
        return node.cloneNode(true);
      });
      const d = document.createElement('template');

      d.innerHTML =
        '<div aria-hidden="true" class="tdb-partner-overlay"></div><img alt="" class="tdb-partner-spotlight" loading="lazy"/><div aria-hidden="true" aria-label="Partner details" class="tdb-partner-tooltip" role="region"><div class="tdb-partner-backdrop"></div><div aria-hidden="true" class="tdb-partner-tint"></div><div class="tdb-partner-content"><div class="tdb-partner-header"><a aria-label="Close partner details" class="carousel-arrow tdb-service-arrow tdb-partner-close w-button" href="#" role="button" tabindex="0" type="button"><img alt="" aria-hidden="true" class="tdb-partner-icon" height="16" loading="lazy" src="https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/6ac903f5a05e10347d13d4a5_tdb-close.svg" width="16"/></a></div><div class="tdb-partner-swiper"><div class="tdb-partner-slides"></div></div><div class="tdb-partner-footer"><div class="tdb-partner-visit-slot"><a class="tdb-service-discover w-inline-block" data-tdb-partner-visit="" href="#"><div>Visit partner</div><div class="icon-embed-xxsmall w-embed"><img alt="" aria-hidden="true" class="tdb-partner-icon" height="16" loading="lazy" src="https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/6ac9040240c896d539d1903d_tdb-globe.svg" width="16"/></div></a></div><div class="tdb-partner-controls"><a aria-label="Previous partner" class="carousel-arrow tdb-service-arrow tdb-partner-prev w-button" href="#" role="button" tabindex="0" type="button"><span class="tdb-partner-prev-icon"><img crossorigin="anonymous" alt="" aria-hidden="true" class="tdb-partner-icon" height="16" loading="lazy" src="https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/6ac8c5037ecf8cf1ab74a93a_tdb-arrow.svg" width="16"/></span></a><a aria-label="Next partner" class="carousel-arrow tdb-service-arrow tdb-partner-next w-button" href="#" role="button" tabindex="0" type="button"><img crossorigin="anonymous" alt="" aria-hidden="true" class="tdb-partner-icon" height="16" loading="lazy" src="https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/6ac8c5037ecf8cf1ab74a93a_tdb-arrow.svg" width="16"/></a></div></div></div></div>';
      for (const t of d.content.children) t.setAttribute('data-tdb-partner-surface', '');
      return { fragment: d.content, sources };
    },
  });
})();
