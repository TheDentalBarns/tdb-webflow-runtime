/* TDB native USP adapter v2.2.2. Designer owns every surface and control. */
(() => {
  'use strict';
  if (window.TDBUSPDrawer) return;
  const base = new URL('./', document.currentScript.src), instances = new WeakMap();
  let dependencies;
  function code() {
    if (!dependencies) dependencies = (async () => {
      await window.TDBModules.load(new URL('tdb-motion.js', base));
      await Promise.all([
        window.TDBModules.load(new URL('tdb-drawer.js', base)),
        window.TDBModules.load(new URL('tdb-ticker.js', base)),
        window.TDBModules.load(new URL('tdb-swiper-8.4.7.min.js', base), {
          attribute: 'data-swiper-js', ready: () => typeof window.TDBSwiper?.create === 'function'
        })
      ]);
      window.TDBSwiper.register('usp-drawer', { mount });
    })().catch(error => { dependencies = null; throw error; });
    return dependencies;
  }
  function mount(section) {
    if (instances.has(section)) return instances.get(section);
    const root = section.querySelector('[data-tdb-usp-content]');
    const shell = root.closest('[data-tdb-drawer]'), panel = shell.querySelector('[data-tdb-drawer-panel]');
    const close = shell.querySelector('[data-tdb-drawer-close]');
    const viewport = root.querySelector('[data-tdb-usp-viewport]'), track = root.querySelector('[data-tdb-usp-track]');
    const template = root.querySelector('[data-tdb-usp-template]'), title = root.querySelector('[data-tdb-usp-title]');
    const header = root.querySelector('.tdb-usp_header'), footer = root.querySelector('.tdb-usp_footer');
    const records = [...section.querySelectorAll('[data-tdb-usp-source]')].map(source => ({
      title: source.querySelector('[data-tdb-usp-source-title]').textContent.trim(),
      logo: source.querySelector('[data-tdb-usp-source-logo]'), body: source.querySelector('[data-tdb-usp-source-body]')
    }));
    const controller = new AbortController(), {signal} = controller, scroll = new Map();
    let swiper, requested = 0, direction = 1, activeSlide, source;
    let landscape = false;
    panel.setAttribute('aria-label', 'Practice highlights');
    close.setAttribute('aria-label', 'Close practice highlights');
    const ticker = window.TDBNativeTicker.mount(root.querySelector('[data-tdb-usp-position]'));
    const titleTicker = window.TDBNativeTicker.mount(title, {
      template: root.querySelector('.tdb-usp_templates'), valueClass: 'tdb-usp_title-value', incomingClass: 'tdb-usp_title-incoming'
    });
    const logo = root.querySelector('[data-tdb-usp-logo]');
    for (const name of ['src', 'srcset', 'sizes', 'alt']) {
      const value = records[0].logo.getAttribute(name);
      if (value) logo.setAttribute(name, value);
    }
    logo.alt = 'The Dental Barns';
    records.forEach((record, index) => {
      const slide = template.cloneNode(true);
      slide.removeAttribute('data-tdb-usp-template');
      slide.dataset.tdbUspSlide = String(index);
      slide.setAttribute('aria-label', record.title);
      const image = slide.querySelector('[data-tdb-usp-image]'), original = record.body.querySelector('img');
      if (original) {
        for (const name of ['src', 'srcset', 'alt', 'width', 'height']) {
          const value = original.getAttribute(name); if (value) image.setAttribute(name, value);
        }
        image.sizes = '(max-width:767px) 100vw, 28rem'; image.draggable = false;
      }
      const copy = slide.querySelector('[data-tdb-usp-copy]');
      for (const child of record.body.children) if (child.tagName !== 'IMG') copy.append(child.cloneNode(true));
      slide.querySelectorAll('[id],[data-w-id]').forEach(node => { node.removeAttribute('id'); node.removeAttribute('data-w-id'); });
      track.append(slide);
    });
    const reading = window.TDBDrawerReading.mount({
      pane: root, footer, viewport, track, swiper: () => swiper, slideScroll: () => activeSlide,
      active: () => drawer.state === 'open', onMode: value => { landscape = value; },
      nodes: () => [root, header, footer, viewport, track, close, template, template.querySelector('.tdb-usp_slide-content'), ...track.querySelectorAll('.tdb-usp_slide,.tdb-usp_slide-content')],
      durationRoot: root, durationProperty: '--tdb-usp-duration'
    });
    const readingScroll = reading.scroll, captureReadingAnchor = reading.capture;
    const applyReadingAnchor = reading.apply, setReadingMode = reading.setMode;
    function saveScroll() { if (activeSlide) scroll.set(Number(activeSlide.dataset.tdbUspSlide), readingScroll().scrollTop); }
    function reflect(animate = true) {
      const index = swiper.realIndex;
      ticker.update(String(index + 1).padStart(2, '0'), direction, animate);
      titleTicker.update(records[index].title, direction, animate);
      [...swiper.slides].forEach(slide => {
        const selected = slide === swiper.slides[swiper.activeIndex];
        if (selected && slide !== activeSlide) slide.scrollTop = landscape ? 0 : scroll.get(index) || 0;
      });
      activeSlide = swiper.slides[swiper.activeIndex];
    }
    function createSwiper() {
      if (swiper) return;
      swiper = window.TDBSwiper.create(viewport, {
        wrapperClass: 'tdb-usp_track', slideClass: 'tdb-usp_slide', slidesPerView: 1, spaceBetween: 0,
        loop: records.length > 1, loopAdditionalSlides: 1, initialSlide: requested, autoHeight: landscape,
        speed: window.TDBMotion.duration(innerWidth), loopPreventsSlide: false,
        preventInteractionOnTransition: false, touchStartPreventDefault: false, threshold: 12,
        touchAngle: 40, grabCursor: true, a11y: {enabled: false}, observer: false,
        on: {
          beforeTransitionStart() { saveScroll(); captureReadingAnchor(); },
          touchStart() { saveScroll(); }, sliderFirstMove: captureReadingAnchor,
          transitionStart: applyReadingAnchor
        }
      });
      swiper.on('slideChange', () => {
        direction = swiper.swipeDirection === 'prev' ? -1 : swiper.swipeDirection === 'next' ? 1 : direction;
        reflect();
      });
      window.TDBCarouselVisibility.bind(swiper, {activeOnly: true});
      reading.bind();
      swiper.on('loopFix', () => reflect(false));
      window.TDBSwiper.onSettled(swiper, () => { applyReadingAnchor(); reading.clear(); reflect(false); });
      reflect(false);
    }
    const drawer = window.TDBDrawer.mount(shell, {
      hideChrome: true,
      onOpen() {
        reading.clear(); setReadingMode();
        createSwiper(); swiper.update(); swiper.slideToLoop(requested, 0, false); reflect(false);
        if (landscape) root.scrollTop = scroll.get(requested) || 0;
        source?.querySelector('.tdb-usp_launch-icon')?.classList.add('is-open');
      },
      onClose() {
        saveScroll(); reading.clear(); ticker.settle(); titleTicker.settle();
        source?.querySelector('.tdb-usp_launch-icon')?.classList.remove('is-open');

      }
    });
    setReadingMode();
    window.TDBCarouselControls.bind({
      root: shell, previous: root.querySelector('[data-tdb-usp-prev]'), next: root.querySelector('[data-tdb-usp-next]'), signal,
      enabled: () => Boolean(swiper) && drawer.state !== 'closed' && drawer.state !== 'closing',
      navigate(delta) {
        saveScroll(); captureReadingAnchor(); direction = delta;
        if (delta < 0) swiper.slidePrev(); else swiper.slideNext();
      }
    });
    const api = { async open(index, trigger) { if (drawer.state !== 'closed') return; requested = index; source = trigger; await drawer.open(trigger); }, close:() => drawer.close(), destroy() { drawer.destroy(); reading.destroy(); swiper?.destroy(true,true); controller.abort(); ticker.destroy(); titleTicker.destroy(); instances.delete(section); } };
    instances.set(section, api); return api;
  }
  function discover() {
    document.querySelectorAll('[data-tdb-usp]').forEach(section => {
      let flight;
      const prepare = () => flight ||= code().then(() => window.TDBSwiper.mount('usp-drawer', section)).catch(error => { flight = null; throw error; });
      const triggers = section.querySelectorAll('[data-tdb-usp-launch]');
      const zones = [...section.querySelectorAll('[data-tdb-usp-trigger-zone]')];
      let selectedZone = null, pressedZone = null;
      const hovered = new Set();
      const reflectBarns = () => zones.forEach(zone => {
        zone.querySelector('.feature-item_door-image')?.classList.toggle('is-usp-active',
          zone === selectedZone || zone === pressedZone || hovered.has(zone) || zone.contains(document.activeElement));
      });
      // Native pointer focus can leave the icon before click commits selection.
      // Hold the pressed state across that gap; cancellation never selects it.
      section.addEventListener('pointerdown', event => {
        if (event.isPrimary === false || (event.button != null && event.button !== 0)) return;
        const zone = event.target.closest('[data-tdb-usp-trigger-zone]');
        if (zone && zones.includes(zone)) { pressedZone = zone; reflectBarns(); }
      });
      document.addEventListener('pointerup', event => {
        if (pressedZone && !pressedZone.contains(event.target)) { pressedZone = null; reflectBarns(); }
      });
      section.addEventListener('pointercancel', () => { pressedZone = null; reflectBarns(); });
      section.addEventListener('dragstart', () => { pressedZone = null; reflectBarns(); });
      zones.forEach(zone => {
        zone.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovered.add(zone); reflectBarns(); } });
        zone.addEventListener('pointerleave', () => { hovered.delete(zone); reflectBarns(); });
        zone.addEventListener('pointercancel', () => { hovered.delete(zone); reflectBarns(); });
        zone.addEventListener('focusin', reflectBarns);
        zone.addEventListener('focusout', () => queueMicrotask(reflectBarns));
      });
      triggers.forEach(trigger => { trigger.setAttribute('aria-disabled', 'false'); trigger.setAttribute('role', 'button'); trigger.tabIndex = 0; });
      async function activate(event) {
        if (event.type === 'keydown' && !['Enter',' '].includes(event.key)) return;
        const item = event.target.closest('[data-tdb-usp-trigger-zone]');
        const trigger = item?.querySelector('[data-tdb-usp-launch]'); if (!trigger) return;
        event.preventDefault(); if (trigger.getAttribute('aria-busy') === 'true') return;
        selectedZone = item; pressedZone = null; reflectBarns();
        await window.TDBModules.withBusy(trigger, async () => (await prepare()).open(Number(trigger.dataset.tdbUspLaunch), trigger), {
          onError() { trigger.setAttribute('aria-label', 'Unable to load. Try again: ' + item.querySelector('[data-tdb-usp-label]').textContent.trim()); }
        });
      }
      section.addEventListener('click', activate); section.addEventListener('keydown', activate);
      for (const name of ['pointerover','focusin','pointerdown']) section.addEventListener(name, event => { if (event.target.closest('[data-tdb-usp-trigger-zone]')) prepare().catch(() => {}); }, {passive:true});
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => { if(entries.some(entry => entry.isIntersecting)){ observer.disconnect(); prepare().catch(() => {}); } }, {rootMargin:'500px'});
        observer.observe(section);
      }
    });
  }
  window.TDBUSPDrawer = Object.freeze({version:'2.2.2',close(){ document.querySelectorAll('[data-tdb-usp]').forEach(root => instances.get(root)?.close()); }});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', discover, {once:true}); else discover();
})();
