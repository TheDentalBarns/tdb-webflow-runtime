/* A fixed, external layout with one shared presentation; CMS values stay data. */
(() => {
  'use strict';
  if (window.TDBSmileFeed) return;
  const base = new URL('./', document.currentScript.src);
  const templateHTML =
    '<div data-tdb-smile-slider="true" class="highlight-swiper_component tdb-smile-carousel" data-tdb-smile-feed-root=""><div class="swiper tdb-smile-viewport"><div role="list" class="swiper-wrapper is-3-grid"><div role="listitem" class="swiper-slide is-3-grid smile tdb-smile-slide"><a role="button" data-tdb-smile-open="true" aria-expanded="false" href="#" class="layout423_card text-color-alternate smile tdb-smile-card w-inline-block"><div class="layout423_image-wrapper smile"><div class="tdb-smile-before-crop"><img class="layout423_image smile" alt="" decoding="async"></div><div class="tdb-smile-after-crop"><img class="layout423_image smile" alt="" decoding="async"></div></div></a></div></div></div><div class="swiper_functions-btm tdb-smile-controls"><div class="swiper-buttons-wrapper tdb-smile-buttons"><div data-tdb-smile-prev="true" class="carousel-arrow slider-arrow swiper-btn-prev is-dark tdb-smile-arrow-prev"><span aria-hidden="true" class="carousel-arrow-icon is-previous"></span></div><div data-tdb-smile-next="true" class="carousel-arrow slider-arrow swiper-btn-next is-dark tdb-smile-arrow-next"><span aria-hidden="true" class="carousel-arrow-icon"></span></div></div></div><div data-tdb-smile-presentation="native" class="tdb-smile-presentation"><div class="layout423_card-content smile tdb-smile-shared-content"><div class="margin-top margin-medium smile left tdb-smile-header"><div aria-hidden="true" class="tdb-smile-kicker">Smile transformation</div><div data-fade-slide="" data-tdb-smile-title="true" class="tdb-smile-heading"></div></div><div aria-hidden="true" class="smile-card tdb-smile-details"><p data-fade-slide="" class="paragraph-smile descript tdb-smile-description"></p></div><div class="margin-top margin-medium smile tdb-smile-summary-ready"><div class="tdb-smile-summary"><div data-fade-slide="" aria-label="Treatments carried out" class="tdb-smile-treatments"></div></div></div></div><div class="layout423_image-wrapper smile tdb-smile-shared-picture"><div class="layout423_overlay smile tdb-smile-overlay"></div><span data-fade-slide="" class="tdb-smile-image-label is-before">Before</span><span data-fade-slide="" class="tdb-smile-image-label">After</span></div><div aria-hidden="true" class="tdb-smile-static-kicker">Smile transformation</div><div aria-live="polite" aria-atomic="true" class="tdb-smile-counter"><span aria-hidden="true" class="tdb-smile-counter-current">01</span><span aria-hidden="true" class="tdb-smile-counter-divider"></span><span aria-hidden="true" class="tdb-smile-counter-total">01</span><span class="tdb-smile-counter-label"></span></div><div role="group" aria-label="Treatment summary" class="tdb-smile-facts tdb-smile-static-facts"><div class="tdb-smile-fact is-price"><img src="https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/6ac8e18e6a41113d6b28c57d_tdb-price-tag.svg" loading="lazy" alt="" class="tdb-smile-fact-icon tdb-smile-static-asset"><span class="tdb-smile-fact-ticker"><span class="tdb-smile-fact-slot"><span class="tdb-smile-fact-value"></span></span></span></div><div class="tdb-smile-fact"><span aria-hidden="true" class="tdb-smile-fact-divider"></span><img src="https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/6ac8c58089197784d522c2a2_tdb-review-clock-brand.svg" loading="lazy" alt="" class="tdb-smile-fact-icon tdb-smile-static-asset"><span class="tdb-smile-fact-ticker is-duration"><span class="tdb-smile-fact-slot"><span class="tdb-smile-fact-value"></span></span></span></div><div class="tdb-smile-fact is-clinician"><span aria-hidden="true" class="tdb-smile-fact-divider"></span><img src="https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/6ac7b9746219384b25f0e78d_tdb-review-lotus.svg" loading="lazy" aria-hidden="true" alt="" class="tdb-smile-clinician-icon"><span class="tdb-smile-fact-ticker is-clinician"><span class="tdb-smile-fact-slot"><span class="tdb-smile-fact-value"></span></span></span></div></div><div data-tdb-smile-ticker-template="" aria-hidden="true" class="tdb-smile-source"><span class="tdb-smile-counter-value"></span><span class="tdb-smile-fact-value"></span></div></div></div>';
  const diamond =
    'https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/6ac8f795d857a42b8d46b54c_tdb-exceptional-diamond.svg';
  const records = new Map(),
    presentations = new WeakMap();
  let disposed = false,
    serial = 0;
  const allowed = () => !disposed && Boolean(window.TDBConsent?.allows());
  const cancelled = () => new DOMException('Cancelled', 'AbortError');
  function check(holder, signal) {
    if (!allowed() || signal.aborted || !holder.isConnected) throw cancelled();
  }
  function validText(value, max) {
    return typeof value === 'string' && value.length <= max;
  }
  async function readFeed(endpoint, signal) {
    const url = new URL(endpoint, location.href);
    if (
      ![location.origin, 'https://tdb-public-availability.david-070.workers.dev'].includes(
        url.origin,
      ) ||
      url.pathname !== '/tdb-content/v1/smiles.json' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw Error('Smile feed must use its configured endpoint');
    url.protocol = 'https:';
    url.host = 'tdb-public-availability.david-070.workers.dev';
    const controller = new AbortController(),
      abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    const timer = setTimeout(abort, 10000);
    let payload;
    try {
      const response = await fetch(url, {
        credentials: 'omit',
        redirect: 'error',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json'))
        throw Error('Smile feed unavailable');
      const body = await response.text();
      if (body.length > 524288) throw Error('Smile feed too large');
      payload = JSON.parse(body);
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
    }
    if (
      payload?.version !== 1 ||
      payload.feed !== 'smiles' ||
      !Number.isSafeInteger(payload.checkedAt) ||
      payload.checkedAt > Date.now() + 60000 ||
      Date.now() - payload.checkedAt >= 3600000 ||
      !Array.isArray(payload.cases) ||
      !payload.cases.length ||
      payload.cases.length > 100 ||
      !Number.isSafeInteger(payload.total) ||
      payload.total < payload.cases.length
    )
      throw Error('Smile feed has no current cases');
    const ids = new Set();
    for (const item of payload.cases) {
      const image = new URL(item.image?.src);
      if (
        !validText(item.id, 80) ||
        !item.id ||
        ids.has(item.id) ||
        !validText(item.title, 500) ||
        !item.title ||
        !validText(item.description, 4000) ||
        !validText(item.image.alt, 2000) ||
        image.protocol !== 'https:' ||
        image.hostname !== 'cdn.prod.website-files.com' ||
        image.username ||
        image.password ||
        image.port ||
        !image.pathname.startsWith('/67837ee85ee175873126e461/') ||
        ['price', 'duration', 'clinician'].some((key) => !validText(item[key], 100)) ||
        !Array.isArray(item.treatments) ||
        item.treatments.length > 6 ||
        item.treatments.some((value) => !validText(value, 100))
      )
        throw Error('Invalid Smile feed record');
      ids.add(item.id);
    }
    return payload;
  }
  function decode(src, signal) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      let timer;
      const finish = (error) => {
        clearTimeout(timer);
        image.onload = image.onerror = null;
        signal.removeEventListener('abort', abort);
        error ? reject(error) : resolve();
      };
      const abort = () => finish(cancelled());
      if (signal.aborted) return abort();
      signal.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => finish(Error('Smile image timed out')), 15000);
      image.onerror = () => finish(Error('Smile image unavailable'));
      image.onload = () =>
        image.decode
          ? image.decode().then(
              () => finish(),
              () => finish(Error('Smile image unavailable')),
            )
          : finish();
      image.src = src;
    });
  }
  function build(payload) {
    const template = document.createElement('template');
    template.innerHTML = templateHTML;
    const root = template.content.firstElementChild,
      track = root.querySelector('.swiper-wrapper');
    root.setAttribute('data-tdb-smile-total', String(payload.total));
    const card = track.firstElementChild;
    card.remove();
    const details = root.querySelector('.tdb-smile-details');
    details.id = 'tdb-smile-details-' + ++serial;
    payload.cases.forEach((item, index) => {
      const slide = card.cloneNode(true),
        button = slide.querySelector('.tdb-smile-card');
      slide.setAttribute('data-smile-index', String(index));
      button.setAttribute('aria-label', item.title);
      button.setAttribute('aria-controls', details.id);
      button.setAttribute('tabindex', '0');
      slide.querySelector('.tdb-smile-before-crop img').alt = item.image.alt;
      slide.querySelector('.tdb-smile-after-crop img').setAttribute('aria-hidden', 'true');
      track.append(slide);
    });
    root.querySelectorAll('[data-tdb-smile-prev],[data-tdb-smile-next]').forEach((button) => {
      button.setAttribute('role', 'button');
      button.setAttribute('tabindex', '0');
      button.setAttribute(
        'aria-label',
        button.hasAttribute('data-tdb-smile-prev') ? 'Previous smile' : 'Next smile',
      );
    });
    const title = root.querySelector('.tdb-smile-heading'),
      description = root.querySelector('.tdb-smile-description');
    const treatments = root.querySelector('.tdb-smile-treatments'),
      frame = root.querySelector('[data-tdb-smile-presentation]');
    const desktop = matchMedia('(min-width:992px)'),
      slideImages = new WeakMap();
    let current = -1,
      timer;
    const imageWindow = () => {
      const radius = desktop.matches ? 2 : 1,
        length = payload.cases.length,
        viewportWidth = document.documentElement.clientWidth || innerWidth;
      for (const slide of track.children) {
        let images = slideImages.get(slide);
        if (!images) slideImages.set(slide, (images = [...slide.querySelectorAll('img')]));
        const pending = images.filter((image) => !image.hasAttribute('src'));
        // This is an image-loading window, not a visibility controller. Loaded
        // photos need no further geometry reads. New loop copies are discovered
        // by identity, and clearing a source still permits it to be restored.
        if (!pending.length) continue;
        const index = Number(slide.getAttribute('data-smile-index'));
        const distance = Math.min(
          (index - current + length) % length,
          (current - index + length) % length,
        );
        // Wide layouts can expose more than two neighbours. Cover every visible
        // card plus one card-width beyond each screen edge, including loop clones.
        if (distance > radius) {
          const rect = slide.getBoundingClientRect();
          const inWindow =
            rect.width > 0 && rect.right >= -rect.width && rect.left <= viewportWidth + rect.width;
          if (!inWindow) continue;
        }
        pending.forEach((image) => {
          image.src = payload.cases[index].image.src;
        });
      }
    };
    const write = (item) => {
      title.textContent = item.title;
      description.textContent = item.description;
      treatments.replaceChildren(
        ...item.treatments.map((label) => {
          const row = document.createElement('div'),
            image = document.createElement('img'),
            text = document.createElement('span');
          row.className = 'treatment-smile tdb-smile-treatment';
          image.crossOrigin = 'anonymous';
          image.src = diamond;
          image.alt = '';
          image.className = 'tdb-smile-treatment-icon';
          text.className = 'paragraph-smile tdb-smile-treatment-name';
          text.textContent = label;
          row.append(image, text);
          return row;
        }),
      );
    };
    const presentation = {
      overSummary(event) {
        const box = root.getBoundingClientRect();
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        return event.clientY >= box.bottom - 9 * rem;
      },
      facts(index) {
        const item = payload.cases[index];
        return [item.price, item.duration, item.clinician];
      },
      update(index) {
        if (index !== current) {
          clearTimeout(timer);
          const first = current < 0;
          current = index;
          if (first || window.TDBMotion?.reduced.matches) write(payload.cases[index]);
          else {
            this.fade(false, true);
            timer = setTimeout(() => write(payload.cases[index]), 150);
          }
        }
        imageWindow();
      },
      fade(visible, moving) {
        frame.querySelectorAll('[data-fade-slide]').forEach((node) => {
          node.classList.toggle('is-visible', visible);
          node.classList.toggle('is-moving', moving);
        });
      },
      open(open) {
        details.classList.toggle('is-open', open);
        details.setAttribute('aria-hidden', String(!open));
        root.querySelector('.tdb-smile-overlay').classList.toggle('is-open', open);
        root
          .querySelectorAll('.tdb-smile-image-label')
          .forEach((node) => node.classList.toggle('is-expanded', open));
      },
      destroy() {
        clearTimeout(timer);
        resize?.disconnect();
        presentations.delete(root);
      },
    };
    presentations.set(root, presentation);
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(imageWindow) : null;
    resize?.observe(root);
    return root;
  }
  function waitFor(root, signal, test, event) {
    return new Promise((resolve, reject) => {
      let observer, timer;
      const finish = (error) => {
        observer?.disconnect();
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
        if (event) window.removeEventListener(event, inspect);
        error ? reject(error) : resolve();
      };
      const abort = () => finish(cancelled());
      const inspect = () => (signal.aborted ? abort() : test() && finish());
      observer = new MutationObserver(inspect);
      observer.observe(root, { attributes: true });
      if (event) window.addEventListener(event, inspect);
      signal.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => finish(Error('Smile carousel preparation timed out')), 20000);
      inspect();
    });
  }
  function reset(holder, record) {
    record.controller?.abort();
    if (record.root) {
      presentations.get(record.root)?.destroy();
      record.root.remove();
      window.TDBSwiper?.prune();
      window.TDBSmileCards?.prune();
    }
    record.root = null;
    record.ready = false;
    holder.removeAttribute('aria-busy');
    holder.removeAttribute('data-smile-state');
    const fallback = holder.querySelector('.tdb-smile-holding-image');
    fallback?.removeAttribute('aria-hidden');
    fallback?.removeAttribute('tabindex');
  }
  function prepare(holder) {
    if (!allowed() || !holder?.isConnected) return Promise.resolve();
    let record = records.get(holder);
    if (!record) {
      record = {};
      records.set(holder, record);
    }
    if (record.ready || record.flight || record.retryAt > Date.now())
      return record.flight || Promise.resolve();
    const controller = new AbortController(),
      signal = controller.signal;
    record.controller = controller;
    holder.setAttribute('aria-busy', 'true');
    record.flight = (async () => {
      const [payload] = await Promise.all([
        readFeed(holder.getAttribute('data-tdb-smile-feed'), signal).then(async (payload) => {
          check(holder, signal);
          // Match the other deferred feed: only entry images, parallel with assets.
          await Promise.all(
            payload.cases.slice(0, 2).map((item) => decode(item.image.src, signal)),
          );
          return payload;
        }),
        window.TDBModules.load(new URL('tdb-smile-feed.css', base), {
          type: 'style',
          attribute: 'data-tdb-smile-feed-css',
        }),
        waitFor(
          holder,
          signal,
          () => Boolean(window.TDBSliderLoader),
          'tdb:slider-loader-ready',
        ).then(() => {
          check(holder, signal);
          return window.TDBSliderLoader.prepare?.('gallery');
        }),
      ]);
      check(holder, signal);
      const root = build(payload);
      record.root = root;
      holder.append(root);
      window.TDBLazyIconMasks?.refresh();
      const mounted = waitFor(
        root,
        signal,
        () => root.getAttribute('data-tdb-slider-init') === 'true',
      );
      await Promise.all([
        window.TDBSliderLoader.load(root).then(() => {
          check(holder, signal);
          // The embed already passed its shared preparation gate. Do not wait for the
          // generic carousel's separate 100px mount observer and time out.
          // First-view entrance motion retains its own visibility gate.
          window.TDBSwiper.mount('gallery', root);
        }),
        mounted,
      ]);
      check(holder, signal);
      holder.setAttribute('data-smile-state', 'ready');
      holder.removeAttribute('aria-busy');
      const fallback = holder.querySelector('.tdb-smile-holding-image');
      fallback?.setAttribute('aria-hidden', 'true');
      fallback?.setAttribute('tabindex', '-1');
      record.ready = true;
    })()
      .catch((error) => {
        reset(holder, record);
        if (error.name !== 'AbortError') {
          record.retryAt = Date.now() + 5000;
          holder.setAttribute('data-smile-state', 'error');
          console.warn('TDB Smiles: holding image retained.', error);
        }
      })
      .finally(() => {
        record.flight = null;
      });
    return record.flight;
  }
  const unsubscribe = window.TDBConsent?.subscribe(() => {
    if (!allowed()) records.forEach((record, holder) => reset(holder, record));
  });
  window.TDBSmileFeed = Object.freeze({
    version: '1.1.0',
    prepare,
    presentation: (root) => presentations.get(root),
    destroy() {
      if (disposed) return;
      disposed = true;
      unsubscribe?.();
      records.forEach((record, holder) => reset(holder, record));
      records.clear();
    },
  });
})();
