/* Smile Gallery presentation v4.1.2. Native Designer structure; shared ticker and motion. */
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
  const values = slide => valueKeys.map(key => {
    const fact = slide?.querySelector('[data-tdb-smile-source-fact="' + key + '"]');
    return (fact?.querySelector('.tdb-smile-source-value') || fact)?.textContent.trim() || '';
  });

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
    let revealed = false, disposed = false, countTicker = null, totalTicker = null, tickerFailed = false, factTickers = [], revision = 0;
    const listeners = [];
    let stopSettled = null;
    const desktop = matchMedia('(min-width:992px)');
    const clean = text => text.trim().replace(/\s+/g, ' ');
    const cancelShow = () => { clearTimeout(showTimer); showTimer = 0; };
    const cancelTickers = () => { countTicker?.settle(); totalTicker?.settle(); factTickers.forEach(ticker => ticker.settle()); };
    let openCard = null, pointerKind = 'mouse', gesture = null;
    const cardOf = node => node?.closest?.('.tdb-smile-card');
    const activeCard = card => {
      const slide = card?.closest('.swiper-slide');
      if (!slide || !root.contains(card)) return false;
      const logical = slide.hasAttribute('data-swiper-slide-index') ? Number(slide.getAttribute('data-swiper-slide-index')) : originals.indexOf(slide);
      return logical === (swiper ? swiper.realIndex : 0);
    };
    function syncReveal() {
      if (openCard && (!openCard.isConnected || !activeCard(openCard))) openCard = null;
      slides.forEach(slide => {
        const logical = slide.hasAttribute('data-swiper-slide-index') ? Number(slide.getAttribute('data-swiper-slide-index')) : originals.indexOf(slide);
        const active = logical === (swiper ? swiper.realIndex : 0);
        const card = slide.querySelector('.tdb-smile-card');
        // Apply to the real card and loop copies using logical slide identity.
        const open = Boolean(openCard && active);
        card?.setAttribute('aria-expanded', String(open));
        const details = slide.querySelector('.tdb-smile-details');
        details?.classList.toggle('is-open', open);
        details?.setAttribute('aria-hidden', String(!open));
        slide.querySelector('.tdb-smile-overlay')?.classList.toggle('is-open', open);
        slide.querySelectorAll('.tdb-smile-image-label').forEach(node => node.classList.toggle('is-expanded', open));
        slide.classList.toggle('is-muted', Boolean(swiper && !active));
      });
    }
    function closeDetails() { openCard = null; syncReveal(); }
    const onOver = event => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      const card = cardOf(event.target);
      if (!activeCard(card) || moving) return;
      openCard = desktop.matches && event.target.closest('.tdb-smile-summary-ready') ? null : card;
      syncReveal();
    };
    const onOut = event => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      const card = cardOf(event.target);
      if (card && !card.contains(event.relatedTarget)) closeDetails();
    };
    const onDown = event => { pointerKind = event.pointerType || 'mouse'; gesture = {x:event.clientX,y:event.clientY,moved:false}; };
    const onMove = event => { if (gesture && Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>8) gesture.moved = true; };
    const onClick = event => {
      const card = cardOf(event.target);
      if (!card || !['', '#'].includes(card.getAttribute('href') || '')) return;
      event.preventDefault();
      if (!activeCard(card) || swiper?.allowClick === false || (event.detail !== 0 && gesture?.moved) || moving) return;
      if (pointerKind !== 'mouse' || event.detail === 0) {
        openCard = openCard ? null : card; syncReveal();
      }
    };
    const onFocus = event => { const card = cardOf(event.target); if (activeCard(card) && card.matches(':focus-visible')) { openCard = card; syncReveal(); } };
    const onBlur = event => { if (!cardOf(event.target)?.contains(event.relatedTarget)) closeDetails(); };
    const onKey = event => {
      if (event.key === 'Escape') closeDetails();
      if (event.key === ' ' && activeCard(cardOf(event.target)) && !moving) { event.preventDefault(); openCard = openCard ? null : cardOf(event.target); syncReveal(); }
    };
    const outside = event => { if (!root.contains(event.target)) closeDetails(); };
    const revealEvents = {pointerover:onOver,pointerout:onOut,pointerdown:onDown,pointermove:onMove,pointercancel:closeDetails,click:onClick,focusin:onFocus,focusout:onBlur,keydown:onKey};
    Object.entries(revealEvents).forEach(([event,handler]) => root.addEventListener(event,handler));
    document.addEventListener('pointerdown', outside);
    desktop.addEventListener('change', closeDetails);
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
      const total = String(originals.length).padStart(2, '0');
      // Keep Designer's initial value until the shared ticker can animate it.
      if (totalTicker) totalTicker.update(total);
      else if (tickerFailed) totalNode.textContent = total;
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
      cancelShow(); moving = true; closeDetails();
      showText(motion.reduced.matches ? swiper.realIndex : null, !motion.reduced.matches);
    }
    function refresh() {
      slides = [...track.children].filter(node => node.matches('.swiper-slide'));
      originals = slides.filter(node => !node.classList.contains('swiper-slide-duplicate'));
      update();
      if (swiper && !moving && !showTimer && !swiper.animating) {
        if (revealed) showText(swiper.realIndex);
        else if (root.getAttribute('data-tdb-slider-first-view') !== 'pending') reveal(motion.carousel.nextDelay);
      }
    }
    function unbind() {
      stopSettled?.(); stopSettled = null;
      listeners.splice(0).forEach(([event, handler]) => swiper?.off(event, handler));
      cancelShow(); cancelTickers(); swiper = null; moving = false;
    }
    function bind(instance) {
      if (instance === swiper || !instance || instance.destroyed) return;
      unbind(); swiper = instance;
      let settledIndex = swiper.realIndex;
      const on = (event, handler) => { listeners.push([event, handler]); swiper.on(event, handler); };
      on('slideChange', () => { closeDetails(); update(); });
      on('touchStart', cancelShow);
      on('sliderMove', () => { if (!moving) hide(); });
      on('slideChangeTransitionStart', hide);
      stopSettled = window.TDBSwiper.onSettled(swiper, () => {
        const changed = swiper.realIndex !== settledIndex;
        settledIndex = swiper.realIndex;
        update();
        reveal(changed ? (swiper.swipeDirection === 'prev' ? motion.carousel.previousDelay : motion.carousel.nextDelay) : motion.carousel.settleDelay);
      });
      on('beforeDestroy', () => {
        // Swiper iterates this listener array directly. Removing listeners here
        // would skip the shared adapter's following teardown callback.
        cancelShow(); cancelTickers(); listeners.length = 0; stopSettled = null;
        swiper = null; moving = false; closeDetails(); showText(0);
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
      disposed = true; revision++; unbind(); observer.disconnect();
      Object.entries(revealEvents).forEach(([event,handler]) => root.removeEventListener(event,handler));
      document.removeEventListener('pointerdown', outside);
      desktop.removeEventListener('change', closeDetails);
      closeDetails();
      countTicker?.destroy(); totalTicker?.destroy(); factTickers.forEach(ticker => ticker.destroy());
      showText(0); viewports.forEach(node => node.classList.add('is-ready')); roots.delete(root);
    }});
    roots.set(root, api); root.setAttribute('data-tdb-smile-card-design', '4.1');
    refresh();
    const token = revision;
    tickerReady().then(() => {
      if (disposed || token !== revision) return;
      countTicker = window.TDBNativeTicker.mount(current, {template,valueClass:'tdb-smile-counter-value',incomingClass:'tdb-smile-counter-value'});
      totalTicker = window.TDBNativeTicker.mount(totalNode, {template,valueClass:'tdb-smile-counter-value',incomingClass:'tdb-smile-counter-value'});
      factTickers = slots.map((slot, column) => window.TDBNativeTicker.mount(slot, {template,valueClass:'tdb-smile-fact-value',incomingClass:'tdb-smile-fact-value',normalize:text=>column<2?clean(text).toUpperCase():clean(text)}));
      update();
    }).catch(() => {
      // Keep the total accurate if the optional ticker cannot be downloaded.
      if (disposed || token !== revision) return;
      tickerFailed = true; update();
    });
    return api;
  }
  window.TDBSmileCards = Object.freeze({version:'4.1.2',prepare,prune(){roots.forEach((api,root)=>{if(!root.isConnected)api.destroy();});}});
})();
