/* TDB slider focus v1.2.0: page chrome focus with an optional navbar participant. */
(() => {
  'use strict';
  const html = document.documentElement;
  if (html.dataset.tdbSliderFocusReady) return;
  html.dataset.tdbSliderFocusReady = '1.2.0';

  const SLIDERS = '.highlight-swiper_component,.parallax-swiper_component,.swiper,.w-slider';
  const CONTROLS = '.swiper-btn-prev,.swiper-btn-next,.swiper-bullet,.swiper-pagination-bullet,.w-slider-arrow-left,.w-slider-arrow-right,.w-slider-dot';
  const FIELDS = 'input,textarea,select,[contenteditable="true"]';
  const GALLERY = '[data-tdb-sg-overlay],.tdb-sg-filter-dock';
  let state = null, gesture = null, releaseFrame = 0, menuTimer = 0, retryTimer = 0;
  let scrollFrame = 0;
  const scrollTop = () => Math.max(window.scrollY || html.scrollTop || 0, 0);

  // Navbar pages keep their existing scroll controller. Only pages without it
  // need this temporary observer, using the same directional release thresholds.
  function updateFocusScroll() {
    scrollFrame = 0;
    if (!state || state.controller) return;
    const y = scrollTop(), delta = y - state.y;
    state.y = y;
    if (gesture?.horizontal) state.up = state.down = 0;
    else if (delta > 0) { state.up = 0; state.down += delta; }
    else if (delta < 0) { state.down = 0; state.up -= delta; }
    if (state.up > 120 || state.down > 140 || (y <= 40 && delta < 0)) scheduleRelease();
  }

  function requestFocusScroll() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateFocusScroll);
  }

  function stopFocusScroll() {
    window.removeEventListener('scroll', requestFocusScroll);
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
  }

  const rootFor = target => target?.closest?.('.logo-slider') ? null : target?.closest?.(SLIDERS);
  const unavailable = target => target?.closest?.('[disabled],[aria-disabled="true"],[hidden],[inert]');
  const galleryOwnsChrome = () => html.classList.contains('tdb-sg-chrome-away') || html.classList.contains('tdb-sg-locked');

  function cancelRelease() {
    if (releaseFrame) cancelAnimationFrame(releaseFrame);
    releaseFrame = 0;
  }

  function release() {
    cancelRelease();
    clearTimeout(menuTimer); clearTimeout(retryTimer);
    stopFocusScroll();
    state?.controller?.release();
    if (html.classList.contains('tdb-slider-focus')) html.classList.remove('tdb-slider-focus');
    if (state?.nav) {
      if (state.value) state.nav.style.setProperty('--tdb-slider-nav-away', state.value, state.priority);
      else state.nav.style.removeProperty('--tdb-slider-nav-away');
    }
    state = null;
  }

  function closeNativeMenus() {
    if (!state || galleryOwnsChrome()) return;
    document.querySelector('.navbar10_menu-button[aria-expanded="true"]')?.click();
    document.querySelectorAll('.navbar10_dropdown-toggle[aria-expanded="true"]').forEach(button => button.click());
  }

  function focusSlider(slider) {
    if (!slider || unavailable(slider) || galleryOwnsChrome()) return;
    cancelRelease();
    if (!state) {
      const nav = document.querySelector('.navbar10_component');
      state = { nav, value: nav?.style.getPropertyValue('--tdb-slider-nav-away') || '', priority: nav?.style.getPropertyPriority('--tdb-slider-nav-away') || '' };
      if (nav) {
        const top = nav.getBoundingClientRect().top;
        const parts = [nav, ...nav.querySelectorAll('.w-nav-overlay,.navbar10_menu[data-nav-menu-open],.navbar10_dropdown-list.w--open')];
        const distance = Math.max(nav.offsetHeight, ...parts.filter(part => part.getClientRects().length && getComputedStyle(part).visibility !== 'hidden').map(part => part.getBoundingClientRect().bottom - top));
        nav.style.setProperty('--tdb-slider-nav-away', distance + 'px');
      }
      const vip = document.getElementById('tdb-vip-drawer');
      if (vip?.matches('.is-open,.is-peeking')) window.TDBVIPDrawer?.close?.();
      menuTimer = setTimeout(closeNativeMenus, 430);
      // Respect the native menu's short opening guard.
      retryTimer = setTimeout(closeNativeMenus, 680);
    }
    state.slider = slider;
    state.controller = window.TDBNavScroll || null;
    stopFocusScroll();
    if (state.controller) state.controller.focus(scheduleRelease, () => Boolean(gesture?.horizontal));
    else {
      state.y = scrollTop(); state.up = state.down = 0;
      window.addEventListener('scroll', requestFocusScroll, { passive: true });
    }
    if (!html.classList.contains('tdb-slider-focus')) html.classList.add('tdb-slider-focus');
  }

  function controlFor(target) {
    const control = target?.closest?.(CONTROLS);
    return control && !unavailable(control) ? rootFor(control) : null;
  }

  function onPointerDown(event) {
    gesture = null;
    if (event.button !== 0 || event.isPrimary === false || event.target.closest?.(FIELDS + ',' + GALLERY)) return;
    const slider = rootFor(event.target);
    if (!slider || unavailable(event.target)) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, slider, horizontal: false };
    if (controlFor(event.target)) focusSlider(slider);
  }
  document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });

  function onPointerMove(event) {
    if (!gesture || gesture.id !== event.pointerId) return;
    const x = Math.abs(event.clientX - gesture.x), y = Math.abs(event.clientY - gesture.y);
    if (!gesture.horizontal && y > 10 && y > x) { gesture = null; return; }
    if (!gesture.horizontal && x > 8 && x > y * 1.2) {
      gesture.horizontal = true;
      focusSlider(gesture.slider);
    }
  }
  document.addEventListener('pointermove', onPointerMove, { capture: true, passive: true });

  const endGesture = event => {
    if (gesture?.id !== event.pointerId) return;
    if (gesture.horizontal && state) focusSlider(gesture.slider);
    gesture = null;
  };
  document.addEventListener('pointerup', endGesture, { capture: true, passive: true });
  document.addEventListener('pointercancel', endGesture, { capture: true, passive: true });

  function onClick(event) {
    if (event.target.closest?.(GALLERY + ',' + FIELDS)) return;
    const slider = controlFor(event.target);
    if (slider) { focusSlider(slider); return; }
    // Tapping a smile card's details is also deliberate slider interaction.
    if (!event.target.closest?.('a,button,[role="button"]') && event.target.closest?.('.swiper-slide,.w-slide')) {
      focusSlider(rootFor(event.target));
    }
  }
  document.addEventListener('click', onClick, { capture: true, passive: true });

  function onKeyDown(event) {
    if (event.target.closest?.(FIELDS + ',' + GALLERY)) return;
    if (event.key === 'Escape' && state) { release(); return; }
    if (!['ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(event.key)) return;
    const control = controlFor(event.target);
    if (control) { focusSlider(control); return; }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const local = rootFor(event.target);
    if (local) { focusSlider(local); return; }
    // Swiper's existing keyboard navigation can be active with body focus.
    if (event.target !== document.body && event.target !== html) return;
    const slider = [...document.querySelectorAll('.swiper')].find(element => {
      if (!rootFor(element)) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.top < innerHeight && rect.bottom > 0 && rect.right > 0 && rect.left < innerWidth && !unavailable(element);
    });
    if (slider) focusSlider(slider);
  }
  document.addEventListener('keydown', onKeyDown, { capture: true, passive: true });

  function scheduleRelease() {
    if (releaseFrame) return;
    // Let the existing nav, timer and VIP scroll handlers settle first.
    releaseFrame = requestAnimationFrame(() => {
      releaseFrame = requestAnimationFrame(() => { releaseFrame = 0; release(); });
    });
  }

  const explicitChromeIntent = event => {
    if (!state) return;
    if (event.target.closest?.('.navbar10_component,#tdb-vip-drawer,a[href*="#vip"],[data-tdb-vip-open]')) release();
  };
  document.addEventListener('focusin', explicitChromeIntent);
  document.addEventListener('pointerdown', explicitChromeIntent, { capture: true, passive: true });
  window.addEventListener('resize', () => { gesture = null; release(); }, { passive: true });
  window.addEventListener('pagehide', () => { gesture = null; release(); });
  new MutationObserver(() => { if (state && galleryOwnsChrome()) release(); }).observe(html, { attributes: true, attributeFilter: ['class'] });
  // Resume only the latest focus gesture if its module was still downloading.
  // This invokes focus bookkeeping; it never replays clicks or slide commands.
  window.TDBSliderFocus = Object.freeze({
    resume(seed) {
      if (!seed || Math.abs(window.scrollY - seed.y) > 8) return;
      const target = (seed.click || seed.key || seed.down)?.target;
      if (!target?.isConnected) return;
      if (seed.down) onPointerDown(seed.down);
      if (seed.move) onPointerMove(seed.move);
      if (seed.end) endGesture(seed.end);
      if (seed.click) onClick(seed.click);
      if (seed.key) onKeyDown(seed.key);
    },
  });
})();

(() => {
  'use strict';

  const VERSION = '0.7.0-banner-parallax';
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

    // Site-owner policy: first-view advance is enabled for all visitors.
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
      swiper?.off('touchStart slideChange', onIntent);
      swiper?.off('beforeDestroy', onDestroy);
      firstViewStates.delete(component);
      firstViewHandled.add(component);
      component.setAttribute(FIRST_VIEW_ATTRIBUTE, reason);
    }

    function onIntent() { finish('skipped-interaction'); }
    function onDestroy() { finish('skipped-destroyed'); }
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
    // Without reliable visibility observation, leave navigation entirely manual.
    if (!('IntersectionObserver' in window)) { finish('skipped-unsupported'); return; }
    intentEvents.forEach(type => component.addEventListener(type, onIntent, { capture: true, passive: true }));
    document.addEventListener('visibilitychange', onVisibility);
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

  function highlightGap(component) {
    if (window.innerWidth < 768 && (component.hasAttribute('data-tdb-smile-slider') || component.querySelector('a[href^="/treatments/"]') || document.documentElement.getAttribute('data-wf-page') === '677cfbe37aba5fbbc2154c24')) return window.innerWidth * 0.02;
    return window.innerWidth <= 768 ? window.innerWidth * 0.05 : 20;
  }

  function desktopGridGap(component, fallback) {
    if (!matchMedia('(min-width:992px)').matches) return fallback;
    const homeGallery = document.documentElement.dataset.wfPage === '677cf86df9952f978d94d8a9' && component.matches('.section_smile-gallery [data-tdb-smile-slider]');
    if (!component.matches(PARALLAX_SELECTOR) && !homeGallery) return fallback;
    // Computed columnGap resolves the reference grid's rem spacing to pixels.
    const gap = parseFloat(getComputedStyle(component).columnGap);
    return Number.isFinite(gap) ? gap : fallback;
  }

  function bindGridGap(component, swiper, fallback) {
    const sync = () => {
      const gap = desktopGridGap(component, fallback());
      swiper.params.spaceBetween = gap;
      swiper.originalParams.spaceBetween = gap;
    };
    // Swiper's own resize pass updates the slide positions after this read.
    swiper.on('beforeResize breakpoint', sync);
    swiper.on('beforeDestroy', () => swiper.off('beforeResize breakpoint', sync));
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
      spaceBetween: desktopGridGap(component, highlightGap(component)),
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
        0: { slidesPerView: 1, touchRatio: 1 }
      }
    });

    if (component.matches('.section_smile-gallery [data-tdb-smile-slider]') && document.documentElement.dataset.wfPage === '677cf86df9952f978d94d8a9') {
      bindGridGap(component, swiper, () => highlightGap(component));
    }

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


  function parallaxDuration(swiperEl) {
    if (!matchMedia('(min-width:992px)').matches) return 400;
    const width = swiperEl.clientWidth;
    return Math.round(Math.min(950, Math.max(650, 400 * Math.sqrt(width / 375))));
  }

  function bindParallaxDuration(component, swiperEl, swiper) {
    let frame = 0;
    let pending = null;
    const desktop = matchMedia('(min-width:992px)');
    function apply() {
      if (swiper.destroyed || pending === null || swiper.animating) return;
      const duration = pending;
      pending = null;
      swiper.params.speed = duration;
      swiper.originalParams.speed = duration;
      component.style.setProperty('--tdb-parallax-duration', duration + 'ms');
    }
    function schedule() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        pending = parallaxDuration(swiperEl);
        apply();
      });
    }
    const observer = new ResizeObserver(schedule);
    observer.observe(swiperEl);
    desktop.addEventListener('change', schedule);
    swiper.on('slideChangeTransitionEnd', apply);
    component.style.setProperty('--tdb-parallax-duration', swiper.params.speed + 'ms');
    swiper.on('beforeDestroy', () => {
      observer.disconnect();
      desktop.removeEventListener('change', schedule);
      if (frame) cancelAnimationFrame(frame);
      swiper.off('slideChangeTransitionEnd', apply);
      component.style.removeProperty('--tdb-parallax-duration');
    });
  }

  function initParallaxSwiper(component) {
    if (!component || isInitialised(component)) return;

    const swiperEl = getSwiperElement(component);
    if (!swiperEl || typeof window.Swiper !== 'function') return;

    const banner = component.hasAttribute('data-tdb-banner-parallax');
    const bannerMotion = banner && !matchMedia(REDUCED_MOTION_QUERY).matches;
    const desktopEntry = isDesktopEntryPage() || (bannerMotion && matchMedia(DESKTOP_QUERY).matches);
    const mobileEntry = isMobileEntryPage() || (bannerMotion && matchMedia(MOBILE_PORTRAIT_QUERY).matches);
    const entryMotion = desktopEntry || mobileEntry || banner;

    const cta = window.TDBParallaxControls?.prepare(component, swiperEl);

    const swiper = new window.Swiper(swiperEl, {
      slidesPerView: 1,
      initialSlide: cta?.initialIndex || 0,
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
      loop: !banner || swiperEl.querySelectorAll('.swiper-slide').length > 1,
      loopPreventsSlide: false,
      preventInteractionOnTransition: false,
      loopAdditionalSlides: 1,
      slideToClickedSlide: true,
      parallax: true,
      speed: parallaxDuration(swiperEl),
      effect: 'slide',
      keyboard: { enabled: true },
      spaceBetween: desktopGridGap(component, 0),
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
        0: { slidesPerView: 1, touchRatio: 1 }
      }
    });

    bindGridGap(component, swiper, () => 0);
    bindParallaxDuration(component, swiperEl, swiper);
    cta?.bind(swiper);

    const FADE_IN_DELAY_NEXT = 100;
    const FADE_IN_DELAY_PREV = 140;
    const fadeCache = new WeakMap();
    const visibleSlides = new Set();
    let showTimeout = null;
    let gestureHidden = false;
    let loopFixing = false;
    swiper.on('beforeLoopFix', () => { loopFixing = true; });
    swiper.on('loopFix', () => { loopFixing = false; });
    let entryPending = (desktopEntry || mobileEntry) && !cta?.skipEntry;
    component.classList.toggle('tdb-entry-pending', entryPending);

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
      swiper.slides.forEach(slide => setVisible(slide, false));
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
      showTimeout = setTimeout(() => {
        showTimeout = null;
        if (swiper.destroyed || swiper.animating || gestureHidden) return;
        const active = swiper.slides[swiper.activeIndex];
        const index = active?.getAttribute('data-swiper-slide-index');
        swiper.slides.forEach(slide => setVisible(slide, slide === active || (index !== null && slide.getAttribute('data-swiper-slide-index') === index)));
      }, delay);
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
      if (loopFixing) return;
      cancelShow();
      setMoving(true);
      hideAllVisible();
    });

    swiper.on('slideChangeTransitionEnd', () => {
      if (loopFixing) return;
      gestureHidden = false;
      const direction = swiper.swipeDirection || 'next';
      const revealDelay = direction === 'prev' ? FADE_IN_DELAY_PREV : FADE_IN_DELAY_NEXT;
      showActiveAfter(revealDelay);
      completeEntry(revealDelay);
      setMoving(false);
    });

    swiper.on('touchEnd', () => {
      gestureHidden = false;
      if (!swiper.animating) {
        setMoving(false);
        showActiveAfter(60);
      }
    });

    markInitialised(component, 'parallax');

    if (mobileEntry && entryPending) {
      swiper.autoplay?.stop();
      swiper.slideNext();
      return;
    }

    if (desktopEntry && entryPending) {
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
        if (cta?.skipEntry) { finishEntryFallback(); return; }

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
    window.TDBBannerParallax?.refresh(root);
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
      refresh: () => refresh(),
      activate: component => initParallaxSwiper(component)
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
