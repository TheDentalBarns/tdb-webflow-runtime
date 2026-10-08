/* TDB native USP adapter v2.0.0. Designer owns every surface and control. */
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
    const records = [...section.querySelectorAll('[data-tdb-usp-source]')].map(source => ({
      title: source.querySelector('.usp-logo_top-wrapper .text-style-tagline').textContent.trim(),
      logo: source.querySelector('.usp-logo_top-image'), body: source.querySelector('.modal-content-split')
    }));
    const controller = new AbortController(), {signal} = controller, scroll = new Map();
    let swiper, requested = 0, last = 0, direction = 1, activeSlide, source, chrome = [], vipTimer, restoreTimer;
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
    function saveScroll() { if (activeSlide) scroll.set(Number(activeSlide.dataset.tdbUspSlide), activeSlide.scrollTop); }
    function reflect(animate = true) {
      const index = swiper.realIndex;
      ticker.update(String(index + 1).padStart(2, '0'), direction, animate);
      titleTicker.update(records[index].title, direction, animate);
      [...swiper.slides].forEach(slide => {
        const selected = Number(slide.dataset.tdbUspSlide) === index;
        slide.inert = !selected; slide.setAttribute('aria-hidden', String(!selected));
        if (selected && slide !== activeSlide) slide.scrollTop = scroll.get(index) || 0;
      });
      activeSlide = swiper.slides[swiper.activeIndex]; last = index;
    }
    function createSwiper() {
      if (swiper) return;
      swiper = window.TDBSwiper.create(viewport, {
        wrapperClass: 'tdb-usp_track', slideClass: 'tdb-usp_slide', slidesPerView: 1, spaceBetween: 0,
        loop: records.length > 1, loopAdditionalSlides: 1, initialSlide: requested,
        speed: window.TDBMotion.duration(innerWidth), loopPreventsSlide: false,
        preventInteractionOnTransition: false, touchStartPreventDefault: false, threshold: 12,
        touchAngle: 40, grabCursor: true, a11y: {enabled: false}, observer: false,
        on: { beforeTransitionStart() { saveScroll(); }, touchStart() { saveScroll(); } }
      });
      swiper.on('slideChange', () => {
        direction = swiper.swipeDirection === 'prev' ? -1 : swiper.swipeDirection === 'next' ? 1 : direction;
        reflect();
      });
      window.TDBSwiper.onSettled(swiper, () => reflect(false));
      window.TDBSwiper.watchDuration(root, viewport, swiper, '--tdb-usp-duration', () => innerWidth);
      reflect(false);
    }
    function restoreChrome() {
      clearTimeout(restoreTimer); chrome.forEach(animation => animation.cancel()); chrome = [];
    }
    function hideChrome() {
      restoreChrome();
      const nav = document.querySelector('.navbar10_component');
      const nodes = [...document.querySelectorAll('.navbar10_component,.navbar-bg_layer,.tdb-announcement,#tdb-elfsight-timer-shell,#tdb-vip-drawer')];
      chrome = nodes.map(node => {
        const rect = node.getBoundingClientRect();
        const height = node === nav ? Math.max(rect.height, ...[...node.querySelectorAll('.w-nav-overlay,.navbar10_menu[data-nav-menu-open],.navbar10_dropdown-list.w--open')].filter(n => n.getClientRects().length).map(n => n.getBoundingClientRect().bottom - rect.top)) : rect.height;
        return node.animate([{transform:getComputedStyle(node).transform}, {transform:`translateY(${node.id === 'tdb-vip-drawer' ? height : -Math.max(height, rect.bottom)}px)`}], {duration:420,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
      });
      if (document.querySelector('#tdb-vip-drawer.is-open,#tdb-vip-drawer.is-peeking')) {
        window.TDBVIPDrawer?.close?.();
        vipTimer = setTimeout(() => { if (drawer.state !== 'closed') window.lenis?.stop(); }, 560);
      }
    }
    const drawer = window.TDBDrawer.mount(shell, {
      onOpen() {
        createSwiper(); swiper.update(); swiper.slideToLoop(requested, 0, false); reflect(false);
        source?.querySelector('.tdb-usp_launch-icon')?.classList.add('is-open'); hideChrome();
      },
      onClose() {
        saveScroll(); ticker.settle(); titleTicker.settle(); clearTimeout(vipTimer);
        source?.querySelector('.tdb-usp_launch-icon')?.classList.remove('is-open');
        window.TDBVIPDrawer?.reset?.(); window.lenis?.stop();
        document.querySelector('.navbar10_menu-button[aria-expanded="true"]')?.click();
        document.querySelectorAll('.navbar10_dropdown-toggle[aria-expanded="true"]').forEach(node => node.click());
        restoreTimer = setTimeout(restoreChrome, window.TDBMotion.duration(innerWidth));
      }
    });
    function step(event, delta) {
      if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
      event.preventDefault(); if (!swiper || drawer.state === 'closed' || drawer.state === 'closing') return;
      saveScroll(); direction = delta;
      if (delta < 0) swiper.slidePrev(); else swiper.slideNext();
    }
    for (const [selector, delta] of [['[data-tdb-usp-prev]', -1], ['[data-tdb-usp-next]', 1]]) {
      const control = root.querySelector(selector); control.setAttribute('role', 'button'); control.tabIndex = 0;
      for (const name of ['click', 'keydown']) control.addEventListener(name, event => step(event, delta), {signal});
    }
    shell.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') step({...event, type:'click', preventDefault:() => event.preventDefault()}, event.key === 'ArrowLeft' ? -1 : 1);
    }, {signal});
    const api = { async open(index, trigger) { if (drawer.state !== 'closed') return; requested = index; source = trigger; await drawer.open(trigger); }, close:() => drawer.close(), destroy() { drawer.destroy(); swiper?.destroy(true,true); controller.abort(); restoreChrome(); clearTimeout(vipTimer); ticker.destroy(); titleTicker.destroy(); instances.delete(section); } };
    instances.set(section, api); return api;
  }
  function discover() {
    document.querySelectorAll('[data-tdb-usp]').forEach(section => {
      let flight;
      const prepare = () => flight ||= code().then(() => window.TDBSwiper.mount('usp-drawer', section)).catch(error => { flight = null; throw error; });
      const triggers = section.querySelectorAll('[data-tdb-usp-launch]');
      triggers.forEach(trigger => { trigger.setAttribute('aria-disabled', 'false'); trigger.setAttribute('role', 'button'); trigger.tabIndex = 0; });
      async function activate(event) {
        if (event.type === 'keydown' && !['Enter',' '].includes(event.key)) return;
        const item = event.target.closest('.banner-feature_item-content');
        const trigger = item?.querySelector('[data-tdb-usp-launch]'); if (!trigger) return;
        event.preventDefault(); if (trigger.getAttribute('aria-busy') === 'true') return;
        trigger.setAttribute('aria-busy', 'true');
        try { await (await prepare()).open(Number(trigger.dataset.tdbUspLaunch), trigger); }
        catch (_) { trigger.setAttribute('aria-label', 'Unable to load. Try again: ' + item.querySelector('.text-style-tagline-restored').textContent.trim()); }
        finally { trigger.removeAttribute('aria-busy'); }
      }
      section.addEventListener('click', activate); section.addEventListener('keydown', activate);
      for (const name of ['pointerover','focusin','pointerdown']) section.addEventListener(name, event => { if (event.target.closest('.banner-feature_item-content')) prepare().catch(() => {}); }, {passive:true});
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => { if(entries.some(entry => entry.isIntersecting)){ observer.disconnect(); prepare().catch(() => {}); } }, {rootMargin:'500px'});
        observer.observe(section);
      }
    });
  }
  window.TDBUSPDrawer = Object.freeze({version:'2.0.0',close(){ document.querySelectorAll('[data-tdb-usp]').forEach(root => instances.get(root)?.close()); }});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', discover, {once:true}); else discover();
})();
