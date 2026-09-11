function loadScript(src, attrName, async = true) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[${attrName}]`);
    if (existing) {
      if (existing.dataset.tdbLoaded === 'true') resolve(existing);
      else {
        existing.addEventListener('load', () => resolve(existing), { once: true });
        existing.addEventListener('error', reject, { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.type = 'text/javascript';
    script.charset = 'UTF-8';
    script.async = async;
    script.setAttribute(attrName, 'true');
    script.onload = () => {
      script.dataset.tdbLoaded = 'true';
      resolve(script);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function initLenis() {
  if (document.documentElement.classList.contains('w-editor')) return;
  if (!window.Lenis || window.lenis) return;

  window.lenis = new Lenis({
    autoRaf: true,
    smoothWheel: true,
    syncTouch: false,
  });
}

function triggerAfterLCP(callback) {
  let ran = false;
  let settleTimer = null;
  let fallbackTimer = null;

  function runOnce() {
    if (ran) return;
    ran = true;
    callback();
  }

  fallbackTimer = setTimeout(runOnce, 2500);

  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver(() => {
        clearTimeout(settleTimer);
        settleTimer = setTimeout(() => {
          clearTimeout(fallbackTimer);
          observer.disconnect();
          runOnce();
        }, 100);
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'hidden') return;
        clearTimeout(fallbackTimer);
        clearTimeout(settleTimer);
        observer.disconnect();
        runOnce();
      }, { once: true });
    } catch (error) {
      runOnce();
    }
  } else if (document.readyState === 'complete') {
    runOnce();
  } else {
    addEventListener('load', runOnce, { once: true });
  }
}

function triggerAfterLoadIdle(callback) {
  function run() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => requestAnimationFrame(callback), { timeout: 2000 });
    } else {
      setTimeout(() => requestAnimationFrame(callback), 300);
    }
  }

  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
}

const LENIS_WARM_SESSION_KEY = 'tdb-lenis-warm';

function isLenisWarmSession() {
  try {
    return sessionStorage.getItem(LENIS_WARM_SESSION_KEY) === '1';
  } catch (error) {
    return false;
  }
}

function markLenisWarmSession() {
  try {
    sessionStorage.setItem(LENIS_WARM_SESSION_KEY, '1');
  } catch (error) {}
}

function loadLenisAssets() {
  const eligibleDevice = matchMedia('(min-width:768px) and (hover:hover) and (pointer:fine)');
  if (!eligibleDevice.matches) return;

  loadScript(
    'https://cdn.jsdelivr.net/npm/lenis@1.3.19/dist/lenis.min.js',
    'data-lenis-js',
  ).then(initLenis).catch(() => console.error('TDB Lenis failed to load'));
}

function startLenisForSession() {
  if (isLenisWarmSession()) {
    loadLenisAssets();
    return;
  }

  triggerAfterLoadIdle(() => {
    markLenisWarmSession();
    loadLenisAssets();
  });
}

function prepareFormsLoader() {
  const formSelector = 'form';
  const proximityExcludedFormSelector = '#vip-drawer-form';
  const vipIntentSelector = 'a[href*="#vip" i], [href*="#vip" i], [data-vip-open]';
  const observedForms = new WeakSet();
  let loadingPromise = null;
  let proximityObserver = null;
  let discoveryObserver = null;

  function cleanup() {
    proximityObserver?.disconnect();
    discoveryObserver?.disconnect();
    document.removeEventListener('focusin', onIntent, true);
    document.removeEventListener('pointerdown', onIntent, true);
    document.removeEventListener('keydown', onIntent, true);
    document.removeEventListener('submit', onIntent, true);
  }

  function loadForms() {
    if (loadingPromise) return loadingPromise;
    cleanup();
    loadingPromise = loadScript(
      'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@v0.1.0/dist/tdb-forms.min.js',
      'data-tdb-forms-js',
    ).catch(error => {
      loadingPromise = null;
      console.error('TDB Forms failed to load');
      throw error;
    });
    return loadingPromise;
  }

  function onIntent(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(formSelector) || target.closest(vipIntentSelector)) loadForms();
  }

  function observeForm(form) {
    if (!(form instanceof HTMLFormElement) || observedForms.has(form) || form.matches(proximityExcludedFormSelector)) return;
    observedForms.add(form);
    if (!proximityObserver) loadForms();
    else proximityObserver.observe(form);
  }

  function discoverForms(root = document) {
    if (root instanceof HTMLFormElement) observeForm(root);
    root.querySelectorAll?.(formSelector).forEach(observeForm);
  }

  if ('IntersectionObserver' in window) {
    proximityObserver = new IntersectionObserver(
      entries => { if (entries.some(entry => entry.isIntersecting)) loadForms(); },
      { rootMargin: '600px 0px' },
    );
  }

  document.addEventListener('focusin', onIntent, true);
  document.addEventListener('pointerdown', onIntent, true);
  document.addEventListener('keydown', onIntent, true);
  document.addEventListener('submit', onIntent, true);

  function startDiscovery() {
    discoverForms();
    discoveryObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
        if (node instanceof Element) discoverForms(node);
      }));
    });
    discoveryObserver.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startDiscovery, { once: true });
  else startDiscovery();
}

function prepareVIPDrawerLoader() {
  const drawer = document.getElementById('tdb-vip-drawer');
  if (!drawer) return;

  const triggerSelector = '#tdb-vip-drawer .tdb-vip-drawer-handle, a[href*="#vip" i], [href*="#vip" i], [data-vip-open]';
  let loadingPromise = null;
  let armed = false;

  const realDrawerReady = () => Boolean(window.TDBVIPDrawer);

  function cleanup() {
    armed = false;
    window.removeEventListener('scroll', onMeaningfulScroll);
    document.removeEventListener('click', onIntentClick, true);
    document.removeEventListener('keydown', onIntentKeydown, true);
  }

  function loadDrawer() {
    if (realDrawerReady()) return Promise.resolve(window.TDBVIPDrawer);
    if (loadingPromise) return loadingPromise;

    loadingPromise = loadScript(
      'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@432ab3ab12553c9bbff97123453272ebde1ad6da/dist/tdb-vip-drawer.js',
      'data-tdb-vip-drawer-js',
    ).then(() => {
      cleanup();
      return window.TDBVIPDrawer;
    }).catch(error => {
      document.querySelector('script[data-tdb-vip-drawer-js]')?.remove();
      loadingPromise = null;
      console.error('TDB VIP Drawer failed to load');
      throw error;
    });

    return loadingPromise;
  }

  function findTrigger(event) {
    const target = event.target;
    return target instanceof Element ? target.closest(triggerSelector) : null;
  }

  function openAfterLoad(event) {
    event.preventDefault();
    event.stopPropagation();
    loadDrawer().then(api => api?.open?.());
  }

  function onIntentClick(event) {
    if (realDrawerReady() || !findTrigger(event)) return;
    openAfterLoad(event);
  }

  function onIntentKeydown(event) {
    if (realDrawerReady() || (event.key !== 'Enter' && event.key !== ' ') || !findTrigger(event)) return;
    openAfterLoad(event);
  }

  function onMeaningfulScroll() {
    if (Math.max(window.scrollY, document.documentElement.scrollTop, 0) < 32) return;
    loadDrawer();
  }

  function arm() {
    if (armed || realDrawerReady()) return;
    armed = true;
    window.addEventListener('scroll', onMeaningfulScroll, { passive: true });
    document.addEventListener('click', onIntentClick, true);
    document.addEventListener('keydown', onIntentKeydown, true);
  }

  arm();

  if (/^#vip/i.test(location.hash || '')) loadDrawer();
  else triggerAfterLCP(loadDrawer);

  window.TDBVIPDrawerLoader = Object.freeze({
    version: '1.0.1',
    load: loadDrawer,
    status: () => ({ loaded: realDrawerReady(), loading: Boolean(loadingPromise) }),
  });
}

function prepareSliderLoader() {
  const sliderSelector = '.highlight-swiper_component, .parallax-swiper_component';
  const observedSliders = new WeakSet();
  let loadingPromise = null;
  let proximityObserver = null;
  let discoveryObserver = null;

  function cleanup() {
    proximityObserver?.disconnect();
    discoveryObserver?.disconnect();
    document.removeEventListener('pointerdown', onIntent, true);
    document.removeEventListener('keydown', onIntent, true);
  }

  function loadSliders() {
    if (loadingPromise) return loadingPromise;
    cleanup();
    loadingPromise = loadScript(
      'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@b3a0f0f2a1e57b5a67db5f5159c449cff07eebd6/dist/tdb-swiper-8.4.7.min.js',
      'data-swiper-js',
    ).then(() => loadScript(
      'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@31386d986982aa60eb6c9199b6e6b4c03693897b/dist/tdb-sliders.js',
      'data-tdb-sliders-js',
    )).catch(error => {
      loadingPromise = null;
      console.error('TDB Sliders failed to load');
      throw error;
    });
    return loadingPromise;
  }

  function onIntent(event) {
    const target = event.target;
    if (target instanceof Element && target.closest(sliderSelector)) loadSliders();
  }

  function observeSlider(slider) {
    if (!(slider instanceof Element) || observedSliders.has(slider)) return;
    observedSliders.add(slider);
    if (!proximityObserver) loadSliders();
    else proximityObserver.observe(slider);
  }

  function discoverSliders(root = document) {
    if (root instanceof Element && root.matches(sliderSelector)) observeSlider(root);
    root.querySelectorAll?.(sliderSelector).forEach(observeSlider);
  }

  if ('IntersectionObserver' in window) {
    proximityObserver = new IntersectionObserver(
      entries => { if (entries.some(entry => entry.isIntersecting)) loadSliders(); },
      { rootMargin: '800px 0px' },
    );
  }

  document.addEventListener('pointerdown', onIntent, true);
  document.addEventListener('keydown', onIntent, true);

  function startDiscovery() {
    discoverSliders();
    discoveryObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
        if (node instanceof Element) discoverSliders(node);
      }));
    });
    discoveryObserver.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startDiscovery, { once: true });
  else startDiscovery();

  window.TDBSliderLoader = Object.freeze({
    version: '0.1.0',
    load: loadSliders,
    status: () => ({ loaded: Boolean(window.TDBSliders), loading: Boolean(loadingPromise), swiperAvailable: typeof window.Swiper === 'function' }),
  });
}

prepareFormsLoader();
prepareVIPDrawerLoader();
prepareSliderLoader();
startLenisForSession();
