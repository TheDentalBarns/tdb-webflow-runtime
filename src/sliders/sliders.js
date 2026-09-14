(() => {
  'use strict';

  const VERSION = '0.5.3';
  const HIGHLIGHT_SELECTOR = '.highlight-swiper_component';
  const PARALLAX_SELECTOR = '.parallax-swiper_component';
  const OBSERVED_ATTRIBUTE = 'data-tdb-slider-observed';
  const INIT_ATTRIBUTE = 'data-tdb-slider-init';
  const MAX_SWIPER_TRIES = 120;
  const SWIPER_RETRY_MS = 100;
  const VIEWPORT_MARGIN = '100px';
  const DESKTOP_QUERY = '(min-width:768px)';
  const MOBILE_PORTRAIT_QUERY = '(max-width:767px) and (orientation:portrait)';
  const REDUCED_MOTION_QUERY = '(prefers-reduced-motion:reduce)';
  const FIRST_VIEW_ATTRIBUTE = 'data-tdb-slider-first-view';
  const firstViewStates = new Map();
  const firstViewHandled = new WeakSet();

  // Prepare near the viewport, but move only after the actual slider enters it.
  // This deliberately does not share the parallax caption/opacity machinery.
  function prepareHighlightFirstView(component) {
    if (firstViewHandled.has(component) || firstViewStates.has(component)) return;
    const swiperEl = getSwiperElement(component);
    if (!swiperEl) return;

    const motion = matchMedia(REDUCED_MOTION_QUERY);
    const intentEvents = ['pointerdown', 'touchstart', 'keydown', 'click', 'focusin'];
    let swiper = null;
    let observer = null;
    let inView = false;
    let frame = 0;
    let timer = 0;
    let finished = false;

    function cancelScheduled() {
      if (frame) cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
      frame = timer = 0;
    }

    function finish(reason) {
      if (finished) return;
      finished = true;
      cancelScheduled();
      observer?.disconnect();
      intentEvents.forEach(type => component.removeEventListener(type, onIntent, true));
      document.removeEventListener('visibilitychange', onVisibility);
      if (motion.removeEventListener) motion.removeEventListener('change', onMotion);
      else motion.removeListener?.(onMotion);
      swiper?.off('touchStart slideChange', onIntent);
      swiper?.off('beforeDestroy', onDestroy);
      firstViewStates.delete(component);
      firstViewHandled.add(component);
      component.setAttribute(FIRST_VIEW_ATTRIBUTE, reason);
    }

    function onIntent() { finish('skipped-interaction'); }
    function onDestroy() { finish('skipped-destroyed'); }
    function onMotion() { if (motion.matches) finish('skipped-reduced-motion'); }
    function onVisibility() {
      if (document.hidden) cancelScheduled();
      else schedule();
    }

    function canAdvance() {
      if (finished || !swiper) return false;
      if (!document.documentElement.contains(component) || swiper.destroyed) {
        finish('skipped-detached');
        return false;
      }
      if (motion.matches) {
        finish('skipped-reduced-motion');
        return false;
      }
      if (component.contains(document.activeElement) || swiper.realIndex !== 0 || swiper.animating) {
        finish('skipped-interaction');
        return false;
      }
      return inView && !document.hidden;
    }

    function advance() {
      timer = 0;
      if (!canAdvance()) return;
      const rect = swiperEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || rect.bottom <= 0 || rect.right <= 0 ||
          rect.top >= window.innerHeight || rect.left >= window.innerWidth) return;
      if (getComputedStyle(swiperEl).visibility !== 'visible' ||
          swiperEl.closest('[hidden], [inert], [aria-hidden="true"]')) {
        finish('skipped-hidden');
        return;
      }
      swiper.update();
      if (!canAdvance()) return;
      if (swiper.slides.length < 2 || swiper.isLocked || !swiper.enabled) {
        finish('skipped-unavailable');
        return;
      }
      // Consume before slideNext: its callbacks must not schedule a second move.
      finish('advanced');
      swiper.slideNext(swiper.params.speed, true);
    }

    function schedule() {
      if (frame || timer || !canAdvance()) return;
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (canAdvance()) timer = setTimeout(advance, 120);
        });
      });
    }

    firstViewStates.set(component, {
      cancel: () => finish('skipped-detached'),
      bind(instance) {
        if (finished) return;
        swiper = instance;
        if (swiper.slides.length < 2) { finish('skipped-unavailable'); return; }
        swiper.on('touchStart slideChange', onIntent);
        swiper.on('beforeDestroy', onDestroy);
        schedule();
      }
    });
    component.setAttribute(FIRST_VIEW_ATTRIBUTE, 'pending');
    if (motion.matches) { finish('skipped-reduced-motion'); return; }
    // Without reliable visibility observation, leave navigation entirely manual.
    if (!('IntersectionObserver' in window)) { finish('skipped-unsupported'); return; }
    intentEvents.forEach(type => component.addEventListener(type, onIntent, { capture: true, passive: true }));
    document.addEventListener('visibilitychange', onVisibility);
    if (motion.addEventListener) motion.addEventListener('change', onMotion);
    else motion.addListener?.(onMotion);
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        inView = entry.isIntersecting && entry.intersectionRatio > 0;
        if (inView) schedule();
        else cancelScheduled();
      });
    }, { rootMargin: '0px', threshold: 0 });
    observer.observe(swiperEl);
  }

  function getCurrentPath() {
    return location.pathname.replace(/\/+$/, '') || '/';
  }

  function isEntryPage() {
    const path = getCurrentPath();
    return path === '/' || path === '/location';
  }

  function isDesktopEntryPage() {
    return isEntryPage() && matchMedia(DESKTOP_QUERY).matches;
  }

  function isMobileEntryPage() {
    return (
      isEntryPage() &&
      matchMedia(MOBILE_PORTRAIT_QUERY).matches &&
      !matchMedia(REDUCED_MOTION_QUERY).matches
    );
  }

  function getSwiperElement(component) {
    return component?.querySelector?.('.swiper') || null;
  }

  function isInitialised(component) {
    const swiperEl = getSwiperElement(component);
    return (
      component?.getAttribute?.(INIT_ATTRIBUTE) === 'true' ||
      Boolean(swiperEl?.swiper)
    );
  }

  function markInitialised(component, type) {
    component.setAttribute(INIT_ATTRIBUTE, 'true');
    component.dataset.tdbSliderType = type;
  }

  function placeMobileParallaxControls(component) {
    if (!isEntryPage() || !matchMedia(MOBILE_PORTRAIT_QUERY).matches) return;
    const swiperEl = component.querySelector(':scope > .swiper');
    const controls = component.querySelector(':scope > .swiper_functions-btm.hide');
    if (swiperEl && controls) swiperEl.appendChild(controls);
  }

  function configurePageNavigation(root = document) {
    if (!isEntryPage()) return;

    if (matchMedia(MOBILE_PORTRAIT_QUERY).matches) {
      document.documentElement.classList.add('tdb-slider-next');
      root.querySelectorAll?.(PARALLAX_SELECTOR).forEach(placeMobileParallaxControls);
      if (root instanceof Element && root.matches(PARALLAX_SELECTOR)) {
        placeMobileParallaxControls(root);
      }
    }

    if (matchMedia(DESKTOP_QUERY).matches) {
      document.documentElement.classList.add('tdb-slider-desktop');
    }
  }

  // Swiper 8 repeats end cards with DOM copies. Webflow's existing interaction
  // targets still refer to the original cards. Route only the copies' card
  // events through those originals and mirror their visual state. Swiper keeps
  // owning pointer/touch navigation; no second card animation is introduced.
  function bindLoopCards(component, swiper) {
    const sources = new WeakMap();
    const copies = new Map();
    const observer = new MutationObserver(records => {
      records.forEach(record => {
        const targets = copies.get(record.target);
        if (!targets) return;
        const value = record.target.getAttribute(record.attributeName);
        targets.forEach(target => {
          if (value === null) target.removeAttribute(record.attributeName);
          else if (target.getAttribute(record.attributeName) !== value) target.setAttribute(record.attributeName, value);
        });
      });
    });

    function mapCopies() {
      observer.disconnect();
      copies.clear();
      const originals = new Map();
      swiper.slides.forEach(slide => {
        if (!slide.classList.contains('swiper-slide-duplicate')) {
          originals.set(slide.getAttribute('data-swiper-slide-index'), slide);
        }
      });
      swiper.slides.forEach(slide => {
        if (!slide.classList.contains('swiper-slide-duplicate')) return;
        const original = originals.get(slide.getAttribute('data-swiper-slide-index'));
        if (!original) return;
        sources.set(slide, original);
        const originalsBelow = original.querySelectorAll('*');
        slide.querySelectorAll('*').forEach((copy, index) => {
          const source = originalsBelow[index];
          if (!source) return;
          sources.set(copy, source);
          if (!copies.has(source)) copies.set(source, []);
          copies.get(source).push(copy);
        });
      });
      originals.forEach(slide => observer.observe(slide, {
        subtree: true, attributes: true,
        attributeFilter: ['style', 'class', 'aria-expanded']
      }));
    }

    function relay(event) {
      const source = sources.get(event.target);
      if (!source || !event.target.closest('.swiper-slide-duplicate')) return;
      // A completed swipe must never turn into an accidental card/link click.
      if (event.type === 'click' && !swiper.allowClick) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      const forwarded = new MouseEvent(event.type, {
        bubbles: true, cancelable: true, view: window,
        clientX: event.clientX, clientY: event.clientY,
        screenX: event.screenX, screenY: event.screenY,
        button: event.button, buttons: event.buttons, detail: event.detail,
        ctrlKey: event.ctrlKey, shiftKey: event.shiftKey,
        altKey: event.altKey, metaKey: event.metaKey,
        relatedTarget: sources.get(event.relatedTarget) || event.relatedTarget
      });
      event.stopImmediatePropagation();
      // The original link retains its native destination and card handlers.
      if (event.type === 'click') event.preventDefault();
      source.dispatchEvent(forwarded);
    }

    const events = ['mouseover', 'mouseout', 'click'];
    events.forEach(type => component.addEventListener(type, relay, true));
    mapCopies();
    swiper.on('breakpoint', mapCopies);
    swiper.on('beforeDestroy', () => {
      observer.disconnect();
      copies.clear();
      events.forEach(type => component.removeEventListener(type, relay, true));
      swiper.off('breakpoint', mapCopies);
    });
  }

  function initHighlightSwiper(component) {
    if (!component || isInitialised(component)) return;

    const swiperEl = getSwiperElement(component);
    const countEl = component.querySelector('.swiper-count');
    if (!swiperEl || typeof window.Swiper !== 'function') return;
    const slideCount = swiperEl.querySelectorAll('.swiper-wrapper > .swiper-slide:not(.swiper-slide-duplicate)').length;

    const swiper = new window.Swiper(swiperEl, {
      slidesPerView: 3,
      observer: true,
      observeParents: true,
      watchSlidesProgress: true,
      spaceBetween: window.innerWidth <= 768 ? window.innerWidth * 0.05 : 20,
      grabCursor: true,
      slideToClickedSlide: true,
      rewind: false,
      loop: slideCount > 1,
      loopAdditionalSlides: 1,
      loopPreventsSlide: false,
      speed: 400,
      autoplay: false,
      preventInteractionOnTransition: false,
      preloadImages: false,
      lazy: {
        loadOnTransitionStart: false,
        loadPrevNext: false
      },
      keyboard: { enabled: true },
      navigation: {
        nextEl: component.querySelector('.swiper-btn-next'),
        prevEl: component.querySelector('.swiper-btn-prev'),
        disabledClass: 'is-disabled'
      },
      pagination: {
        el: component.querySelector('.swiper-pagination'),
        bulletActiveClass: 'is-active',
        bulletClass: 'swiper-bullet',
        bulletElement: 'button',
        clickable: true
      },
      breakpoints: {
        768: { slidesPerView: 1, touchRatio: 1 },
        0: { slidesPerView: 1, touchRatio: 1.5 }
      }
    });

    function updateCount() {
      if (countEl) countEl.textContent = `${swiper.realIndex + 1} of ${slideCount}`;
    }

    updateCount();
    swiper.on('slideChange', updateCount);
    if (swiper.params.loop) {
      bindLoopCards(component, swiper);
      // Settle on the original card at either join. This is an invisible
      // position correction, so existing card focus and interactions survive.
      swiper.on('slideChangeTransitionEnd', () => swiper.loopFix());
    }
    markInitialised(component, 'highlight');
    firstViewStates.get(component)?.bind(swiper);
  }

  // Keep the CMS links as the source of truth, but give each entry-page
  // carousel one stationary, keyboard-accessible call to action.
  function prepareParallaxCTA(component, swiperEl) {
    if (!/^\/(?:location\/?)?$/.test(window.location.pathname)) return null;
    const slides = Array.from(swiperEl.querySelectorAll('.swiper-slide'));
    const sources = slides.map(slide => {
      const link = slide.querySelector('.service-card-button-wrap a[href]');
      return link && {
        href: link.getAttribute('href'),
        target: link.getAttribute('target'),
        rel: link.getAttribute('rel'),
        label: link.textContent.replace(/\s+/g, ' ').trim(),
        title: slide.querySelector('.service-card-mobile-title')?.textContent.trim() || ''
      };
    });
    const sourceButton = swiperEl.querySelector('.service-card-button-wrap a[href]');
    if (!sourceButton) return null;

    const button = sourceButton.cloneNode(true);
    button.removeAttribute('aria-hidden');
    button.removeAttribute('tabindex');
    button.removeAttribute('data-fade-slide');
    button.classList.remove('fade', 'animate');
    button.setAttribute('data-tdb-parallax-cta', '');
    [button, ...button.querySelectorAll('[id]')].forEach(node => node.removeAttribute('id'));
    const layer = document.createElement('div');
    layer.className = 'tdb-parallax-cta-layer';
    if (window.location.pathname.replace(/\/$/, '') === '/location') layer.classList.add('is-location');
    layer.appendChild(button);

    const removed = [];
    slides.forEach((slide, index) => {
      slide.setAttribute('data-tdb-parallax-cta-index', String(index));
      // Location also has obsolete button copies outside the canonical wrapper.
      slide.querySelectorAll('.showcase-content_btm a.button').forEach(node => {
        removed.push({ node, parent: node.parentNode, next: node.nextSibling });
        node.remove();
      });
    });
    component.classList.add('has-static-parallax-cta');
    swiperEl.appendChild(layer);

    let swiper = null;
    let busy = false;
    // Own touch feedback explicitly: native :hover can survive a Back restore.
    function resetTouchFeedback() {
      button.classList.add('is-cta-reset');
      button.classList.remove('is-touch-held');
    }
    function onPointerDown(event) {
      button.classList.remove('is-cta-reset');
      const pressed = button.contains(event.target) && !busy &&
        button.getAttribute('aria-disabled') !== 'true';
      button.classList.toggle('is-touch-held', pressed && event.pointerType === 'touch');
    }
    function onKeyDown() {
      button.classList.remove('is-cta-reset', 'is-touch-held');
    }
    function sync() {
      const slide = swiper?.slides[swiper.activeIndex] || slides[0];
      const index = slide?.getAttribute('data-tdb-parallax-cta-index');
      const source = index == null ? null : sources[Number(index)];
      if (!source?.href) {
        button.removeAttribute('href');
        button.setAttribute('aria-disabled', 'true');
        button.tabIndex = -1;
        return;
      }
      button.setAttribute('href', source.href);
      for (const key of ['target', 'rel']) {
        if (source[key]) button.setAttribute(key, source[key]);
        else button.removeAttribute(key);
      }
      // Reuse the original button's text node container and arrow artwork.
      if (button.firstElementChild) button.firstElementChild.textContent = source.label;
      button.setAttribute('aria-label', source.title ? `${source.label}: ${source.title}` : source.label);
      if (busy) button.setAttribute('aria-disabled', 'true');
      else button.removeAttribute('aria-disabled');
      button.tabIndex = busy ? -1 : 0;
    }
    function onClick(event) {
      if (busy || button.getAttribute('aria-disabled') === 'true') event.preventDefault();
    }
    function destroy() {
      swiper?.off('slideChange', sync);
      button.removeEventListener('click', onClick);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      button.removeEventListener('pointercancel', resetTouchFeedback);
      window.removeEventListener('pagehide', resetTouchFeedback);
      window.removeEventListener('pageshow', resetTouchFeedback);
      layer.remove();
      component.classList.remove('has-static-parallax-cta');
      slides.forEach(slide => slide.removeAttribute('data-tdb-parallax-cta-index'));
      removed.slice().reverse().forEach(({ node, parent, next }) => {
        parent.insertBefore(node, next?.parentNode === parent ? next : null);
      });
    }
    button.addEventListener('click', onClick);
    document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
    document.addEventListener('keydown', onKeyDown, true);
    button.addEventListener('pointercancel', resetTouchFeedback);
    window.addEventListener('pagehide', resetTouchFeedback);
    window.addEventListener('pageshow', resetTouchFeedback);
    sync();
    return {
      bind(instance) {
        swiper = instance;
        swiper.on('slideChange', sync);
        swiper.on('beforeDestroy', destroy);
        sync();
      },
      setBusy(value) { busy = value; sync(); }
    };
  }

  function initParallaxSwiper(component) {
    if (!component || isInitialised(component)) return;

    placeMobileParallaxControls(component);

    const swiperEl = getSwiperElement(component);
    if (!swiperEl || typeof window.Swiper !== 'function') return;

    const desktopEntry = isDesktopEntryPage();
    const mobileEntry = isMobileEntryPage();
    const entryMotion = desktopEntry || mobileEntry;

    const cta = prepareParallaxCTA(component, swiperEl);

    const swiper = new window.Swiper(swiperEl, {
      slidesPerView: 1,
      observer: false,
      observeParents: false,
      centeredSlides: true,
      watchSlidesProgress: true,
      autoplay: entryMotion
        ? false
        : {
            delay: 4500,
            disableOnInteraction: false
          },
      grabCursor: true,
      loop: true,
      loopPreventsSlide: false,
      preventInteractionOnTransition: false,
      loopAdditionalSlides: 1,
      slideToClickedSlide: true,
      parallax: true,
      speed: 400,
      effect: 'slide',
      keyboard: { enabled: true },
      spaceBetween: 0,
      resistanceRatio: 0,
      touchReleaseOnEdges: true,
      followFinger: true,
      navigation: {
        nextEl: component.querySelector('.swiper-btn-next'),
        prevEl: component.querySelector('.swiper-btn-prev'),
        disabledClass: 'is-disabled'
      },
      pagination: {
        el: component.querySelector('.swiper-pagination'),
        bulletActiveClass: 'is-active',
        bulletClass: 'swiper-bullet',
        bulletElement: 'button',
        clickable: true
      },
      breakpoints: {
        768: { slidesPerView: 1, touchRatio: 1 },
        0: { slidesPerView: 1, touchRatio: 1.5 }
      }
    });

    cta?.bind(swiper);

    const FADE_IN_DELAY_NEXT = 100;
    const FADE_IN_DELAY_PREV = 140;
    const fadeCache = new WeakMap();
    const visibleSlides = new Set();
    let showTimeout = null;
    let gestureHidden = false;
    let entryPending = entryMotion;

    function getFadeElements(slide) {
      if (!slide) return [];
      if (!fadeCache.has(slide)) {
        fadeCache.set(slide, Array.from(slide.querySelectorAll('[data-fade-slide]')));
      }
      return fadeCache.get(slide);
    }

    function setVisible(slide, visible) {
      if (!slide) return;
      getFadeElements(slide).forEach(node => node.classList.toggle('is-visible', visible));
      if (visible) visibleSlides.add(slide);
      else visibleSlides.delete(slide);
    }

    function hideAllVisible() {
      Array.from(visibleSlides).forEach(slide => setVisible(slide, false));
    }

    function cancelShow() {
      if (!showTimeout) return;
      clearTimeout(showTimeout);
      showTimeout = null;
    }

    function setMoving(moving) {
      component.classList.toggle('is-moving', moving);
      cta?.setBusy(moving);
    }

    function showActiveAfter(delay) {
      cancelShow();
      const activeSlide = swiper.slides[swiper.activeIndex];
      showTimeout = setTimeout(() => setVisible(activeSlide, true), delay);
    }

    function completeEntry(revealDelay = FADE_IN_DELAY_NEXT) {
      if (!entryPending) return;
      entryPending = false;
      setTimeout(() => component.classList.remove('tdb-entry-pending'), revealDelay);
    }

    swiper.slides.forEach(slide => setVisible(slide, false));
    setVisible(swiper.slides[swiper.activeIndex], true);
    setMoving(false);

    swiper.on('touchStart', () => {
      gestureHidden = false;
      cancelShow();
    });

    swiper.on('sliderMove', () => {
      if (gestureHidden) return;
      gestureHidden = true;
      cancelShow();
      setMoving(true);
      hideAllVisible();
    });

    swiper.on('slideChangeTransitionStart', () => {
      cancelShow();
      setMoving(true);
      hideAllVisible();
    });

    swiper.on('slideChangeTransitionEnd', () => {
      gestureHidden = false;
      const direction = swiper.swipeDirection || 'next';
      const revealDelay = direction === 'prev' ? FADE_IN_DELAY_PREV : FADE_IN_DELAY_NEXT;
      showActiveAfter(revealDelay);
      completeEntry(revealDelay);
      setTimeout(() => setMoving(false), 0);
    });

    swiper.on('touchEnd', () => {
      gestureHidden = false;
      if (!swiper.animating) {
        setMoving(false);
        showActiveAfter(60);
      }
    });

    markInitialised(component, 'parallax');

    if (mobileEntry) {
      swiper.autoplay?.stop();
      swiper.slideNext();
      return;
    }

    if (desktopEntry) {
      const nextButton = component.querySelector('.swiper-btn-next');

      const finishEntryFallback = () => {
        if (!entryPending) return;
        entryPending = false;
        component.classList.remove('tdb-entry-pending');
        setMoving(false);
        showActiveAfter(FADE_IN_DELAY_NEXT);
      };

      const advanceOnce = () => {
        if (swiper.destroyed || !entryPending) return;

        swiper.update();
        if (swiper.params.loop && typeof swiper.loopFix === 'function') swiper.loopFix();
        swiper.slideNext(swiper.params.speed, true);

        setTimeout(() => {
          if (!entryPending || swiper.destroyed || swiper.animating) return;
          nextButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }, 100);

        setTimeout(finishEntryFallback, swiper.params.speed + FADE_IN_DELAY_NEXT + 300);
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(() => setTimeout(advanceOnce, 120));
      });
    }
  }

  function initByType(type, component) {
    if (type === 'highlight') initHighlightSwiper(component);
    if (type === 'parallax') initParallaxSwiper(component);
  }

  function waitForSwiperAndInit(type, component, tries = 0) {
    if (!component || !document.documentElement.contains(component) || isInitialised(component)) return;

    if (typeof window.Swiper === 'function') {
      initByType(type, component);
      return;
    }

    if (tries < MAX_SWIPER_TRIES) {
      setTimeout(() => waitForSwiperAndInit(type, component, tries + 1), SWIPER_RETRY_MS);
    }
  }

  function observeComponent(component, type) {
    if (!component || isInitialised(component)) return;
    if (component.getAttribute(OBSERVED_ATTRIBUTE) === 'true') return;

    component.setAttribute(OBSERVED_ATTRIBUTE, 'true');
    if (type === 'highlight') prepareHighlightFirstView(component);

    if (type === 'parallax' && (isDesktopEntryPage() || isMobileEntryPage())) {
      component.classList.add('tdb-entry-pending');
    }

    if (!('IntersectionObserver' in window)) {
      waitForSwiperAndInit(type, component);
      return;
    }

    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          currentObserver.unobserve(entry.target);
          waitForSwiperAndInit(type, entry.target);
        });
      },
      { rootMargin: VIEWPORT_MARGIN }
    );

    observer.observe(component);
  }

  function refresh(root = document) {
    configurePageNavigation(root);

    if (root instanceof Element) {
      if (root.matches(HIGHLIGHT_SELECTOR)) observeComponent(root, 'highlight');
      if (root.matches(PARALLAX_SELECTOR)) observeComponent(root, 'parallax');
    }

    root.querySelectorAll?.(HIGHLIGHT_SELECTOR).forEach(component => observeComponent(component, 'highlight'));
    root.querySelectorAll?.(PARALLAX_SELECTOR).forEach(component => observeComponent(component, 'parallax'));
  }

  function onNavigationClick(event) {
    const button = event.target.closest?.('.swiper-btn-prev,.swiper-btn-next');
    if (!button || !button.closest(PARALLAX_SELECTOR)) return;
    const wrapper = button.closest('.swiper-buttons-wrapper');
    wrapper?.querySelectorAll('.swiper-btn-prev,.swiper-btn-next').forEach(candidate => {
      candidate.classList.toggle('is-selected', candidate === button);
    });
  }

  function start() {
    refresh();
    document.addEventListener('click', onNavigationClick);

    const mutationObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof Element) refresh(node);
        });
      });
      // Detached roots must not retain viewport/media/document listeners.
      if (mutations.some(mutation => mutation.removedNodes.length)) {
        firstViewStates.forEach((state, component) => {
          if (!document.documentElement.contains(component)) state.cancel();
        });
      }
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    window.TDBSliders = Object.freeze({
      version: VERSION,
      refresh: () => refresh()
    });
  }

  // The bundle also serves focus-only native/logo strips. The motion runtime
  // still waits for Swiper and both stylesheets before initializing cards.
  // Capture their load events so slow requests remain safe without polling.
  let started = false;
  function startWhenReady() {
    if (started || document.readyState === 'loading' || typeof window.Swiper !== 'function') return;
    const style = getComputedStyle(document.documentElement);
    if (style.getPropertyValue('--tdb-ui-ready').trim() !== '1' ||
        style.getPropertyValue('--tdb-slider-ui-ready').trim() !== '1') return;
    started = true;
    document.removeEventListener('load', onDependencyLoad, true);
    start();
  }
  function onDependencyLoad(event) {
    if (event.target.matches?.('script[data-swiper-js],link[data-tdb-ui-css],link[href*="/dist/tdb-ui.css"],link[data-tdb-slider-ui-css],link[href*="/dist/tdb-slider-ui.css"]')) {
      // A stylesheet's onload handler may switch its media to "all".
      queueMicrotask(startWhenReady);
    }
  }
  document.addEventListener('load', onDependencyLoad, true);
  document.addEventListener('DOMContentLoaded', startWhenReady, { once: true });
  startWhenReady();
})();
