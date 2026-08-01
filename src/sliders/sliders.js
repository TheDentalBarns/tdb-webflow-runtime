(() => {
  'use strict';

  const VERSION = '0.2.0';
  const HIGHLIGHT_SELECTOR = '.highlight-swiper_component';
  const PARALLAX_SELECTOR = '.parallax-swiper_component';
  const OBSERVED_ATTRIBUTE = 'data-tdb-slider-observed';
  const INIT_ATTRIBUTE = 'data-tdb-slider-init';
  const MAX_SWIPER_TRIES = 120;
  const SWIPER_RETRY_MS = 100;
  const VIEWPORT_MARGIN = '100px';

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

  function initHighlightSwiper(component) {
    if (!component || isInitialised(component)) return;

    const swiperEl = getSwiperElement(component);
    const countEl = component.querySelector('.swiper-count');

    if (!swiperEl || typeof window.Swiper !== 'function') return;

    const swiper = new window.Swiper(swiperEl, {
      slidesPerView: 3,
      observer: true,
      observeParents: true,
      watchSlidesProgress: true,
      spaceBetween: window.innerWidth <= 768 ? window.innerWidth * 0.05 : 20,
      grabCursor: true,
      slideToClickedSlide: true,
      rewind: true,
      speed: 175,
      preloadImages: false,
      lazy: {
        loadOnTransitionStart: false,
        loadPrevNext: false
      },
      keyboard: {
        enabled: true
      },
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
        768: {
          slidesPerView: 1,
          touchRatio: 1
        },
        0: {
          slidesPerView: 1,
          touchRatio: 1.5
        }
      }
    });

    function updateCount() {
      if (!countEl) return;
      countEl.textContent = `${swiper.activeIndex + 1} of ${swiper.slides.length}`;
    }

    updateCount();
    swiper.on('slideChange', updateCount);
    markInitialised(component, 'highlight');
  }

  function initParallaxSwiper(component) {
    if (!component || isInitialised(component)) return;

    const swiperEl = getSwiperElement(component);
    if (!swiperEl || typeof window.Swiper !== 'function') return;

    const swiper = new window.Swiper(swiperEl, {
      slidesPerView: 1,
      observer: false,
      observeParents: false,
      centeredSlides: true,
      watchSlidesProgress: true,
      autoplay: {
        delay: 4500,
        disableOnInteraction: false
      },
      grabCursor: true,
      loop: true,
      loopAdditionalSlides: 1,
      slideToClickedSlide: true,
      parallax: true,
      speed: 400,
      effect: 'slide',
      keyboard: {
        enabled: true
      },
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
        768: {
          slidesPerView: 1,
          touchRatio: 1
        },
        0: {
          slidesPerView: 1,
          touchRatio: 1.5
        }
      }
    });

    const FADE_IN_DELAY_NEXT = 100;
    const FADE_IN_DELAY_PREV = 140;
    const fadeCache = new WeakMap();
    const visibleSlides = new Set();

    function getFadeElements(slide) {
      if (!slide) return [];
      if (!fadeCache.has(slide)) {
        fadeCache.set(slide, Array.from(slide.querySelectorAll('[data-fade-slide]')));
      }
      return fadeCache.get(slide);
    }

    function setVisible(slide, visible) {
      if (!slide) return;

      getFadeElements(slide).forEach(node => {
        node.classList.toggle('is-visible', visible);
      });

      if (visible) visibleSlides.add(slide);
      else visibleSlides.delete(slide);
    }

    function hideAllVisible() {
      Array.from(visibleSlides).forEach(slide => setVisible(slide, false));
    }

    let showTimeout = null;

    function cancelShow() {
      if (!showTimeout) return;
      clearTimeout(showTimeout);
      showTimeout = null;
    }

    function setMoving(moving) {
      component.classList.toggle('is-moving', moving);
    }

    function showActiveAfter(delay) {
      cancelShow();
      const activeSlide = swiper.slides[swiper.activeIndex];
      showTimeout = setTimeout(() => setVisible(activeSlide, true), delay);
    }

    swiper.slides.forEach(slide => setVisible(slide, false));
    setVisible(swiper.slides[swiper.activeIndex], true);
    setMoving(false);

    let gestureHidden = false;

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
      showActiveAfter(
        direction === 'prev' ? FADE_IN_DELAY_PREV : FADE_IN_DELAY_NEXT
      );
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
  }

  function initByType(type, component) {
    if (type === 'highlight') initHighlightSwiper(component);
    if (type === 'parallax') initParallaxSwiper(component);
  }

  function waitForSwiperAndInit(type, component, tries = 0) {
    if (!component || !document.documentElement.contains(component)) return;
    if (isInitialised(component)) return;

    if (typeof window.Swiper === 'function') {
      initByType(type, component);
      return;
    }

    if (tries < MAX_SWIPER_TRIES) {
      setTimeout(
        () => waitForSwiperAndInit(type, component, tries + 1),
        SWIPER_RETRY_MS
      );
    }
  }

  function observeComponent(component, type) {
    if (!component || isInitialised(component)) return;
    if (component.getAttribute(OBSERVED_ATTRIBUTE) === 'true') return;

    component.setAttribute(OBSERVED_ATTRIBUTE, 'true');

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
      {
        rootMargin: VIEWPORT_MARGIN
      }
    );

    observer.observe(component);
  }

  function refresh(root = document) {
    if (root instanceof Element) {
      if (root.matches(HIGHLIGHT_SELECTOR)) observeComponent(root, 'highlight');
      if (root.matches(PARALLAX_SELECTOR)) observeComponent(root, 'parallax');
    }

    root.querySelectorAll?.(HIGHLIGHT_SELECTOR).forEach(component => {
      observeComponent(component, 'highlight');
    });

    root.querySelectorAll?.(PARALLAX_SELECTOR).forEach(component => {
      observeComponent(component, 'parallax');
    });
  }

  function start() {
    refresh();

    const mutationObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof Element) refresh(node);
        });
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    window.TDBSliders = Object.freeze({
      version: VERSION,
      refresh: () => refresh()
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
