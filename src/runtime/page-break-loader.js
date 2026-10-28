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
    const add = (wrapper, selector, frame, allowEdges = false, restingScale) => {
      if (!wrapper) return;
      let photo = photos.get(wrapper);
      if (!photo) {
        photo = { wrapper, selector, frame, allowEdges, restingScale };
        photos.set(wrapper, photo);
      }
      if (!mounted.has(photo) && eligible(photo)) pending.add(photo);
    };
    // Shared gallery photos use the same scroll owner on every page. Swiper
    // retains its horizontal transform; page motion owns only translation Y.
    document
      .querySelectorAll('.tdb-service-parallax .swiper')
      .forEach((wrapper) => add(wrapper, '.showcase_image'));
    // Content players opt in through their section. Only the native oversized
    // poster moves; the iframe and interactive controls retain their positions.
    document
      .querySelectorAll('[data-tdb-video-poster-parallax] [data-vimeo-content-init]')
      .forEach((wrapper) => add(wrapper, '.vimeo-player__placeholder'));
    // The native shared variant reserves the same crop for a photo or ambient
    // video. Its variant selection is the opt-in on every page; the existing
    // section overlay keeps its separate opacity owner and the copy stays still.
    document
      .querySelectorAll(
        '.section_header111[data-wf--component-1---bg-image--variant="scroll-media"]',
      )
      .forEach((wrapper) =>
        add(
          wrapper,
          '.header111_background-image,.vimeo-bg[data-vimeo-ambient-init]',
          '.header111_background-image-wrapper',
        ),
      );
    // Other explicit Home photo surfaces retain their existing opt-in.
    // Logos, UI and the Smile, Review and Instagram feeds have separate owners.
    if (home) {
      add(
        home.querySelector('.section_hero-vimeo'),
        '.hero-vimeo_background-video-wrapper .vimeo-bg.hero',
        '.hero-vimeo_background-video-wrapper',
      );
      home.querySelectorAll('.section_3-image-layout .aspect-ratio-portrait').forEach((frame) =>
        // A native scale token describes the centred, full-frame resting crop.
        // The same photo can zoom without changing the parallax bounds.
        add(frame, 'img', null, false, '--tdb-photo-scale'),
      );
      add(
        home.querySelector('.layout355_component'),
        '.vimeo-bg.is-ambient',
        '.layout355_background-video-wrapper',
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
    version: '2.0.2',
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
