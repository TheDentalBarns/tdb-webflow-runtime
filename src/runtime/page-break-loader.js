/* Definition-only: the consent-released runtime starts this loader. */
function preparePageBreakLoader() {
  'use strict';
  if (window.TDBPageBreaks) return;
  const selector = '[data-tdb-page-break]';
  const pending = new Set(),
    mounted = new Set(),
    owners = [];
  const home = document.querySelector('[data-tdb-home-photo-parallax]');
  const photos = new WeakMap();
  let observer,
    flight,
    disposed = false,
    retrying = false,
    retryAt = 0;

  function eligible(node) {
    if (node.wrapper) return node.wrapper.isConnected && node.wrapper.querySelector(node.selector);
    return (
      node.isConnected &&
      node.matches(selector) &&
      (node.getAttribute('data-tdb-parallax-mode') === 'opacity' ||
        node.querySelector('[data-tdb-page-break-image],img'))
    );
  }
  function discover() {
    document.querySelectorAll(selector).forEach((node) => {
      if (!mounted.has(node) && eligible(node)) pending.add(node);
    });
    // Explicit Home photo surfaces; never select every img (logos, UI and the
    // Smile, Review and Instagram feeds have their own presentation owners).
    if (home) {
      const add = (wrapper, selector, frame, allowEdges = false) => {
        if (!wrapper) return;
        let photo = photos.get(wrapper);
        if (!photo) {
          photo = { wrapper, selector, frame, allowEdges };
          photos.set(wrapper, photo);
        }
        if (!mounted.has(photo) && eligible(photo)) pending.add(photo);
      };
      add(
        home.querySelector('.section_hero-vimeo'),
        '.hero-vimeo_background-video-wrapper .vimeo-bg.hero',
        '.hero-vimeo_background-video-wrapper',
      );
      add(home.querySelector('.tdb-service-parallax .swiper'), '.showcase_image');
      home.querySelectorAll('.section_3-image-layout .aspect-ratio-portrait').forEach((frame) =>
        // The speaker zooms the child photo. Measure/move its native resting
        // crop layer so that zoom never looks like a layout change on scroll.
        add(
          frame,
          frame.querySelector('[data-tdb-audio-parallax]') ? '[data-tdb-audio-parallax]' : 'img',
        ),
      );
      add(
        home.querySelector('.layout355_component'),
        '.vimeo-bg.is-ambient',
        '.layout355_background-video-wrapper',
      );
      add(
        home.querySelector('.section_header111'),
        '.header111_background-image',
        '.header111_background-image-wrapper',
      );
      add(home.querySelector('[data-tdb-treatment] .swiper'), '.tdb-treatment-image');
      const candle = home.querySelector('.exceptional_image-candle');
      add(candle?.parentElement, '.exceptional_image-candle', null, true);
    }
  }
  function stopRetry() {
    retrying = false;
    window.removeEventListener('online', retry);
    window.removeEventListener('pointerdown', retry);
  }
  function retry(event) {
    if (event.type === 'online' || Date.now() >= retryAt) mount();
  }
  function keepStatic() {
    for (const node of pending) {
      if (node.wrapper) continue;
      if (!(parseFloat(node.getAttribute('data-tdb-parallax-reveal-in')) > 0)) continue;
      const image = node.querySelector('[data-tdb-page-break-image]') || node.querySelector('img');
      if (image) image.style.opacity = '1';
    }
  }
  function mount() {
    if (disposed) return Promise.resolve();
    if (flight) return flight;
    for (const node of pending) if (!eligible(node)) pending.delete(node);
    if (!pending.size) {
      stopRetry();
      return Promise.resolve();
    }
    observer?.disconnect();
    flight = (async () => {
      if (!window.TDBModules) throw Error('Page breaks require the shared module registry');
      await window.TDBModules.load(new URL('tdb-motion.js', TDBRuntimeModuleRoot).href, {
        ready: () => typeof window.TDBMotion?.pageBreaks === 'function',
      });
      if (disposed) return;
      const nodes = [...pending].filter(eligible);
      if (nodes.length) {
        const owner = window.TDBMotion.pageBreaks(nodes);
        owners.push(owner);
        nodes.forEach((node) => {
          mounted.add(node);
          pending.delete(node);
        });
      }
      pending.clear();
      stopRetry();
    })()
      .catch((error) => {
        if (disposed) return;
        keepStatic();
        retryAt = Date.now() + 5000;
        if (!retrying) {
          retrying = true;
          window.addEventListener('online', retry);
          window.addEventListener('pointerdown', retry, { passive: true });
        }
        console.warn('TDB page breaks: keeping native static images.', error);
      })
      .finally(() => {
        flight = null;
      });
    return flight;
  }
  function refresh() {
    if (disposed) return Promise.resolve();
    discover();
    owners.forEach((owner) => owner.refresh());
    return mount();
  }
  function destroy() {
    if (disposed) return;
    disposed = true;
    observer?.disconnect();
    stopRetry();
    window.removeEventListener('pageshow', onPageShow);
    owners.forEach((owner) => owner.destroy());
    owners.length = 0;
    pending.clear();
    mounted.clear();
  }
  function onPageShow(event) {
    // Motion owners already restore themselves from BFCache.
    if (event.persisted && retrying) mount();
  }
  window.TDBPageBreaks = Object.freeze({
    version: '2.0.1',
    refresh,
    destroy,
    status: () => owners.flatMap((owner) => owner.status()),
  });
  discover();
  if (!pending.size) return;
  window.addEventListener('pageshow', onPageShow);
  if (typeof window.IntersectionObserver === 'function') {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) mount();
      },
      { rootMargin: '600px 0px' },
    );
    pending.forEach((node) => observer.observe(node.wrapper || node));
  } else mount();
}
