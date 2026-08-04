function loadScript(src, attrName, async = true) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[${attrName}]`)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.type = 'text/javascript';
    script.charset = 'UTF-8';
    script.async = async;
    script.setAttribute(attrName, 'true');
    script.onload = resolve;
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

function loadOtherAssets() {
  const consentPromise = loadScript(
    'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@v0.3.0/dist/tdb-consent.js',
    'data-tdb-consent-js',
  ).catch(error => {
    console.error('TDB Consent failed to load');
    throw error;
  });

  const cookieScriptPromise = consentPromise.then(() =>
    loadScript(
      'https://cdn.jsdelivr.net/gh/TheDentalBarns/CookieScript@06867aa292da495320b9dd315833324e481d7b47/tdb-cookie-consent.min.js',
      'data-cookie-script-js',
    ),
  );

  const swiperPromise = loadScript(
    'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@b3a0f0f2a1e57b5a67db5f5159c449cff07eebd6/dist/tdb-swiper-8.4.7.min.js',
    'data-swiper-js',
  );

  const sliderRuntimePromise = swiperPromise.then(() =>
    loadScript(
      'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@v0.2.0/dist/tdb-sliders.js',
      'data-tdb-sliders-js',
    ),
  );

  const otherPromises = [
    loadScript(
      'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-attribution@v1.0.0/dist/tdb-attribution.min.js',
      'data-tdb-attribution-js',
    ),
    loadScript(
      'https://cdn.jsdelivr.net/npm/@finsweet/attributes-scrolldisable@1.6.2/scrolldisable.js',
      'data-scrolldisable-js',
    ),
    swiperPromise,
    sliderRuntimePromise,
    loadScript(
      'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-vimeo-js@v1.0.1/dist/vimeo-controller.min.js',
      'data-vimeo-controller-js',
    ),
  ];

  return Promise.allSettled([cookieScriptPromise, ...otherPromises]);
}

function loadLenisAssets() {
  const lenisJsPromise = loadScript(
    'https://cdn.jsdelivr.net/npm/lenis@1.3.19/dist/lenis.min.js',
    'data-lenis-js',
  );

  Promise.allSettled([lenisJsPromise]).then(() => {
    initLenis();
  });
}

function triggerAfterSettledLCP(callback) {
  let ran = false;
  let settleTimer = null;
  let fallbackTimer = null;

  function runOnce() {
    if (ran) return;
    ran = true;
    callback();
  }

  fallbackTimer = setTimeout(runOnce, 4000);

  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver(() => {
        clearTimeout(settleTimer);
        settleTimer = setTimeout(() => {
          clearTimeout(fallbackTimer);
          observer.disconnect();
          runOnce();
        }, 1000);
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });

      document.addEventListener(
        'visibilitychange',
        () => {
          if (document.visibilityState !== 'hidden') return;
          clearTimeout(fallbackTimer);
          clearTimeout(settleTimer);
          observer.disconnect();
          runOnce();
        },
        { once: true },
      );
    } catch (error) {
      runOnce();
    }
  } else {
    runOnce();
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
    if (!(form instanceof HTMLFormElement) || observedForms.has(form)) return;
    if (form.matches(proximityExcludedFormSelector)) return;
    observedForms.add(form);

    if (!proximityObserver) {
      loadForms();
      return;
    }

    proximityObserver.observe(form);
  }

  function discoverForms(root = document) {
    if (root instanceof HTMLFormElement) observeForm(root);
    root.querySelectorAll?.(formSelector).forEach(observeForm);
  }

  if ('IntersectionObserver' in window) {
    proximityObserver = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) loadForms();
      },
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
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof Element) discoverForms(node);
        });
      });
    });
    discoveryObserver.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startDiscovery, { once: true });
  } else {
    startDiscovery();
  }
}

prepareFormsLoader();

function prepareVIPDrawerLoader() {
  const drawer = document.getElementById('tdb-vip-drawer');
  if (!drawer) return;

  const mobileQuery = matchMedia('(max-width:767px)');
  const triggerSelector =
    '#tdb-vip-drawer .tdb-vip-drawer-handle, a[href*="#vip" i], [href*="#vip" i], [data-vip-open]';
  let loadingPromise = null;
  let armed = false;
  let lcpTriggerArmed = false;

  function cleanup() {
    armed = false;
    window.removeEventListener('scroll', onMeaningfulScroll);
    document.removeEventListener('click', onIntentClick, true);
    document.removeEventListener('keydown', onIntentKeydown, true);
  }

  function loadDrawer() {
    if (!mobileQuery.matches) return Promise.resolve();
    if (loadingPromise) return loadingPromise;

    window.removeEventListener('scroll', onMeaningfulScroll);
    loadingPromise = loadScript(
      'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@v0.4.0/dist/tdb-vip-drawer.js',
      'data-tdb-vip-drawer-js',
    )
      .then(() => {
        cleanup();
      })
      .catch(error => {
        document.querySelector('script[data-tdb-vip-drawer-js]')?.remove();
        loadingPromise = null;
        console.error('TDB VIP Drawer failed to load');
        throw error;
      });

    return loadingPromise;
  }

  function openAfterLoad(event) {
    event.preventDefault();
    event.stopPropagation();
    loadDrawer().then(() => {
      window.TDBVIPDrawer?.open();
    });
  }

  function findTrigger(event) {
    const target = event.target;
    if (!(target instanceof Element)) return null;
    return target.closest(triggerSelector);
  }

  function onIntentClick(event) {
    if (!mobileQuery.matches || window.TDBVIPDrawer) return;
    if (!findTrigger(event)) return;
    openAfterLoad(event);
  }

  function onIntentKeydown(event) {
    if (!mobileQuery.matches || window.TDBVIPDrawer) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (!findTrigger(event)) return;
    openAfterLoad(event);
  }

  function onMeaningfulScroll() {
    if (!mobileQuery.matches) return;
    const y = Math.max(window.scrollY, document.documentElement.scrollTop, 0);
    if (y < 32) return;
    loadDrawer();
  }

  function arm() {
    if (armed || !mobileQuery.matches || window.TDBVIPDrawer) return;
    armed = true;
    window.addEventListener('scroll', onMeaningfulScroll, { passive: true });
    document.addEventListener('click', onIntentClick, true);
    document.addEventListener('keydown', onIntentKeydown, true);

    if (!lcpTriggerArmed) {
      lcpTriggerArmed = true;
      triggerAfterSettledLCP(loadDrawer);
    }
  }

  function sync() {
    if (mobileQuery.matches) arm();
    else if (!window.TDBVIPDrawer) cleanup();
  }

  if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', sync);
  else mobileQuery.addListener?.(sync);

  sync();
}

prepareVIPDrawerLoader();

loadScript(
  'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@9ecc45134d68ac301a98b60e8a8e2971894c60ab/dist/tdb-logo-marquee.js',
  'data-tdb-logo-marquee-js',
).catch(() => {
  console.error('TDB Logo Marquee failed to load');
});

triggerAfterSettledLCP(loadOtherAssets);
triggerAfterLoadIdle(loadLenisAssets);
