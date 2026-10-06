/* Smile Gallery presentation v4.0.0. Native Designer structure; shared ticker and motion. */
(() => {
  'use strict';
  if (window.TDBSmileCards) return;
  const roots = new Map();
  const base = new URL('./', document.currentScript?.src || location.href);
  let tickerFlight;
  function tickerReady() {
    if (!tickerFlight) {
      tickerFlight = window.TDBModules.load(new URL('tdb-ticker.js', base), { ready: () => Boolean(window.TDBNativeTicker) });
      tickerFlight.catch(() => { tickerFlight = null; });
    }
    return tickerFlight;
  }
  const valueKeys = ['price', 'duration', 'clinician'];
  const values = slide => valueKeys.map(key => slide?.querySelector('[data-tdb-smile-source-fact="' + key + '"] .tdb-smile-source-value')?.textContent.trim() || '');

  function prepare(root) {
    if (!root.matches('[data-tdb-smile-slider]') || !root.querySelector('[data-tdb-smile-presentation]')) return null;
    if (roots.has(root)) return roots.get(root);
    const track = root.querySelector('.swiper-wrapper');
    const presentation = root.querySelector('[data-tdb-smile-presentation]');
    const current = presentation.querySelector('.tdb-smile-counter-current');
    const totalNode = presentation.querySelector('.tdb-smile-counter-total');
    const label = presentation.querySelector('.tdb-smile-counter-label');
    const facts = presentation.querySelector('.tdb-smile-static-facts');
    const viewports = [...facts.querySelectorAll('.tdb-smile-fact-ticker')];
    const slots = viewports.map(node => node.querySelector('.tdb-smile-fact-slot'));
    const template = presentation.querySelector('[data-tdb-smile-ticker-template]');
    const motion = window.TDBMotion;
    let slides = [], originals = [], swiper = null, showTimer = 0, moving = false;
    let revealed = false, disposed = false, countTicker = null, factTickers = [], revision = 0;
    const listeners = [];
    const desktop = matchMedia('(min-width:992px)');
    const clean = text => text.trim().replace(/\s+/g, ' ');
    const cancelShow = () => { clearTimeout(showTimer); showTimer = 0; };
    const cancelTickers = () => { countTicker?.settle(); factTickers.forEach(ticker => ticker.settle()); };
    function revealState(slide) {
      const details = slide.querySelector('.tdb-smile-details');
      const expanded = details && Number.parseFloat(details.style.opacity) > 0 && details.style.height !== '0px';
      slide.querySelectorAll('.tdb-smile-image-label').forEach(node => node.classList.toggle('is-expanded', Boolean(expanded)));
      const logical = slide.hasAttribute('data-swiper-slide-index') ? Number(slide.getAttribute('data-swiper-slide-index')) : originals.indexOf(slide);
      const active = !swiper || logical === swiper.realIndex;
      const footerHover = Boolean(desktop.matches && active && slide.querySelector('.tdb-smile-summary-ready:hover'));
      slide.classList.toggle('is-muted', Boolean(swiper && !active));
      slide.querySelector('.tdb-smile-overlay')?.classList.toggle('is-suppressed', Boolean(desktop.matches && (!active || footerHover)));
      details?.classList.toggle('is-suppressed', footerHover);
    }
    const syncReveal = () => slides.forEach(revealState);
    const revealObserver = new MutationObserver(records => {
      new Set(records.map(record => record.target.closest('.swiper-slide'))).forEach(slide => { if (slide) revealState(slide); });
    });
    const onPointer = event => { const slide = event.target.closest('.swiper-slide'); if (slide) revealState(slide); };
    root.addEventListener('mouseover', onPointer);
    root.addEventListener('mouseout', onPointer);
    desktop.addEventListener('change', syncReveal);
    function showText(index, fast = false) {
      slides.forEach((slide, order) => {
        const logical = slide.hasAttribute('data-swiper-slide-index') ? Number(slide.getAttribute('data-swiper-slide-index')) : order;
        slide.querySelectorAll('[data-fade-slide]').forEach(node => {
          node.classList.toggle('is-moving', fast);
          node.classList.toggle('is-visible', index === logical);
        });
      });
    }
    function update() {
      if (disposed) return;
      const index = swiper && !swiper.destroyed ? swiper.realIndex : 0;
      const direction = swiper && swiper.activeIndex < swiper.previousIndex ? -1 : 1;
      totalNode.textContent = String(originals.length).padStart(2, '0');
      label.textContent = 'Smile ' + (index + 1) + ' of ' + originals.length;
      const count = String(index + 1).padStart(2, '0');
      if (countTicker) countTicker.update(count, direction, Boolean(swiper));
      else current.textContent = count;
      const active = swiper && !swiper.destroyed ? swiper.slides[swiper.activeIndex] : originals[index];
      const data = values(active);
      data.forEach((text, column) => {
        if (factTickers[column]) factTickers[column].update(text, direction, revealed);
        else slots[column].textContent = text;
      });
      facts.setAttribute('aria-label', 'Treatment summary: ' + data.join(', '));
      syncReveal();
    }
    function reveal(delay) {
      cancelShow(); moving = false; showText(null);
      const draw = () => {
        showTimer = 0;
        if (!swiper || swiper.destroyed || disposed || !root.isConnected) return;
        showText(swiper.realIndex);
        revealed = true;
        viewports.forEach(node => node.classList.add('is-ready'));
      };
      if (motion.reduced.matches) draw(); else showTimer = setTimeout(draw, delay);
    }
    function hide() {
      cancelShow(); moving = true;
      showText(motion.reduced.matches ? swiper.realIndex : null, !motion.reduced.matches);
    }
    function refresh() {
      slides = [...track.children].filter(node => node.matches('.swiper-slide'));
      originals = slides.filter(node => !node.classList.contains('swiper-slide-duplicate'));
      revealObserver.disconnect();
      slides.forEach(slide => {
        const details = slide.querySelector('.tdb-smile-details');
        if (details) revealObserver.observe(details, {attributes:true,attributeFilter:['style']});
      });
      // These native grid sizers contain only CMS text. The browser calculates
      // maximum column dimensions; JS never reads or writes presentation geometry.
      const lines = Math.max(3, ...originals.map(slide => [...slide.querySelectorAll('.tdb-smile-treatment')].filter(node => !node.classList.contains('w-condition-invisible')).length));
      // Content count is data, while its responsive height expression is authored
      // in Designer. All currently published records fit the native three rows.
      for (const [name, value] of [['--tdb-smile-treatment-lines', lines], ['--tdb-smile-extra-lines', lines - 3]])
        if (root.style.getPropertyValue(name) !== String(value)) root.style.setProperty(name, String(value));
      viewports.forEach((viewport, column) => {
        const seed = viewport.querySelector('.tdb-smile-fact-sizer');
        const texts = [...new Set(originals.map(slide => values(slide)[column]))];
        const key = texts.join('\n');
        if (viewport.dataset.sizingValues === key) return;
        viewport.querySelectorAll('.tdb-smile-fact-sizer').forEach(node => { if (node !== seed) node.remove(); });
        texts.forEach((text, index) => {
          const node = index === 0 ? seed : seed.cloneNode(true);
          node.textContent = text; node.setAttribute('aria-hidden', 'true');
          if (index) viewport.insertBefore(node, slots[column]);
        });
        viewport.dataset.sizingValues = key;
      });
      update();
      if (swiper && !moving && !showTimer && !swiper.animating) {
        if (revealed) showText(swiper.realIndex);
        else if (root.getAttribute('data-tdb-slider-first-view') !== 'pending') reveal(motion.carousel.nextDelay);
      }
    }
    function unbind() {
      listeners.splice(0).forEach(([event, handler]) => swiper?.off(event, handler));
      cancelShow(); cancelTickers(); swiper = null; moving = false;
    }
    function bind(instance) {
      if (instance === swiper || !instance || instance.destroyed) return;
      unbind(); swiper = instance;
      const on = (event, handler) => { listeners.push([event, handler]); swiper.on(event, handler); };
      on('slideChange', update);
      on('touchStart', cancelShow);
      on('sliderMove', () => { if (!moving) hide(); });
      on('slideChangeTransitionStart', hide);
      on('slideChangeTransitionEnd', () => { update(); reveal(swiper.swipeDirection === 'prev' ? motion.carousel.previousDelay : motion.carousel.nextDelay); });
      on('touchEnd', () => { if (!swiper.animating) reveal(motion.carousel.settleDelay); });
      on('beforeDestroy', () => {
        // Swiper iterates this listener array directly. Removing listeners here
        // would skip the shared adapter's following teardown callback.
        cancelShow(); cancelTickers(); listeners.length = 0;
        swiper = null; moving = false; showText(0);
      });
      refresh(); showText(revealed ? swiper.realIndex : null);
    }
    const observer = new MutationObserver(() => {
      if (!root.isConnected) return api.destroy();
      refresh();
    });
    // Child-list changes cover loop copies and CMS reorder; no subtree/style
    // observer or ResizeObserver is needed for stationary card layout.
    observer.observe(track, { childList: true });
    observer.observe(root, { attributes: true, attributeFilter: ['data-tdb-slider-first-view'] });
    const api = Object.freeze({bind,refresh,destroy() {
      if (disposed) return;
      disposed = true; revision++; unbind(); observer.disconnect(); revealObserver.disconnect();
      root.removeEventListener('mouseover', onPointer); root.removeEventListener('mouseout', onPointer);
      desktop.removeEventListener('change', syncReveal);
      countTicker?.destroy(); factTickers.forEach(ticker => ticker.destroy());
      showText(0); viewports.forEach(node => node.classList.add('is-ready')); roots.delete(root);
    }});
    roots.set(root, api); root.setAttribute('data-tdb-smile-card-design', '4.0');
    refresh();
    const galleryLink = root.closest('.section_smile-gallery')?.querySelector('[data-tdb-gallery-count-link]');
    if (galleryLink && !galleryLink.dataset.countPrepared) {
      galleryLink.dataset.countPrepared = 'true';
      fetch(galleryLink.getAttribute('href'), {credentials:'same-origin',priority:'low'}).then(response => response.ok ? response.text() : '').then(html => {
        if (!html || disposed) return;
        const source = document.createElement('template'); source.innerHTML = html;
        const count = source.content.querySelectorAll('[data-tdb-sg-list] [data-tdb-sg-case]').length;
        const countLabel = galleryLink.querySelector('[data-tdb-gallery-count-label]');
        if (count && countLabel) countLabel.textContent = 'Explore ' + count.toLocaleString('en-GB') + (count === 1 ? ' smile transformation' : ' smile transformations');
      }).catch(() => {});
    }
    const token = revision;
    tickerReady().then(() => {
      if (disposed || token !== revision) return;
      countTicker = window.TDBNativeTicker.mount(current, {template,valueClass:'tdb-smile-counter-value',incomingClass:'tdb-smile-counter-value'});
      factTickers = slots.map((slot, column) => window.TDBNativeTicker.mount(slot, {template,valueClass:'tdb-smile-fact-value',incomingClass:'tdb-smile-fact-value',normalize:text=>column<2?clean(text).toUpperCase():clean(text)}));
      update();
    }).catch(() => { /* Native values remain usable; movement does not depend on ticker download. */ });
    return api;
  }
  window.TDBSmileCards = Object.freeze({version:'4.0.0',prepare,prune(){roots.forEach((api,root)=>{if(!root.isConnected)api.destroy();});}});
})();
