(() => {
  const root = document.documentElement;
  const shellId = 'tdb-elfsight-timer-shell';
  const mobileQuery = matchMedia('(max-width:767px)');
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const revealViewports = path === '/' || path === '/location' ? 4 : 1;
  let viewportHeight = 0;

  function attachTimerState(shell) {
    if (!shell || shell._t) return;
    shell._t = 1;
    let frame = 0;
    const navbar = document.querySelector('.navbar10_component');
    const updateViewportHeight = () => {
      const h = innerHeight || root.clientHeight || 0;
      viewportHeight = viewportHeight ? Math.min(viewportHeight, h) : h;
    };
    const updateState = () => {
      frame = 0;
      const scrollTop = scrollY || root.scrollTop || 0;
      const mobileNavbarVisible = mobileQuery.matches && navbar && (
        navbar.classList.contains('z-hold') ||
        (navbar.classList.contains('is-trans') && !(navbar.style.transform || '').includes('-100%'))
      );
      root.classList.toggle('tdb-timer-hidden', scrollTop < viewportHeight * revealViewports || mobileNavbarVisible);
    };
    const requestUpdate = () => { if (!frame) frame = requestAnimationFrame(updateState); };
    updateViewportHeight();
    if (navbar) new MutationObserver(requestUpdate).observe(navbar, { attributes: true, attributeFilter: ['class', 'style'] });
    addEventListener('scroll', requestUpdate, { passive: true });
    addEventListener('resize', () => { updateViewportHeight(); requestUpdate(); }, { passive: true });
    addEventListener('orientationchange', () => { updateViewportHeight(); requestUpdate(); }, { passive: true });
    mobileQuery.addEventListener ? mobileQuery.addEventListener('change', requestUpdate) : mobileQuery.addListener(requestUpdate);
    updateState();
  }

  function createTimerShell() {
    let shell = document.getElementById(shellId);
    if (!shell) {
      shell = document.createElement('div');
      shell.id = shellId;
      shell.className = 'tdb-elfsight-shell';
      document.body.appendChild(shell);
    }
    attachTimerState(shell);
    window.TDBAnnouncement.mount(shell);
  }

  function scheduleTimerShell() {
    if ('requestIdleCallback' in window) requestIdleCallback(createTimerShell, { timeout: 1500 });
    else setTimeout(createTimerShell, 200);
  }

  ['scroll', 'pointerdown', 'keydown', 'touchstart'].forEach(eventName => addEventListener(eventName, scheduleTimerShell, { once: true, passive: true }));
  addEventListener('pageshow', () => attachTimerState(document.getElementById(shellId)));
})();

(() => {
  const path = window.location.pathname.toLowerCase();
  const map = {
    'composite-bonding': '.cb-priority',
    invisalign: '.invisalign-priority',
    veneers: '.veneers-priority',
  };
  const selector = Object.entries(map).find(([slug]) => path.includes(slug))?.[1];
  if (!selector) {
    document.documentElement.classList.remove('tdb-smile-sorting');
    return;
  }
  document.querySelectorAll('.gallery17_component .highlight-swiper_component').forEach(component => {
    const wrapper = component.querySelector('.swiper-wrapper');
    if (!wrapper) return;
    const slides = Array.from(wrapper.children);
    slides.sort((a, b) => {
      const aText = a.querySelector(selector)?.textContent.trim() || '';
      const bText = b.querySelector(selector)?.textContent.trim() || '';
      const ap = aText !== '' && !Number.isNaN(Number(aText)) ? Number(aText) : 999999;
      const bp = bText !== '' && !Number.isNaN(Number(bText)) ? Number(bText) : 999999;
      return ap - bp;
    });
    slides.forEach(slide => wrapper.appendChild(slide));
  });
  document.documentElement.classList.remove('tdb-smile-sorting');
})();

function loadScript(src, attrName, async = true, removeOnError = false) {
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
    script.onload = () => { script.dataset.tdbLoaded = 'true'; resolve(script); };
    script.onerror = error => {
      // Only remove the node created by this call, and only for opted-in loaders.
      if (removeOnError) script.remove();
      reject(error);
    };
    document.head.appendChild(script);
  });
}

const tdbRecoverableScriptFlights = new Map();
function loadScriptWithRecovery(src, attrName) {
  if (tdbRecoverableScriptFlights.has(attrName)) return tdbRecoverableScriptFlights.get(attrName);
  function attempt(retries) {
    return loadScript(src, attrName, true, true).catch(error => {
      if (!retries) throw error;
      // Retry explicit request errors only. A timeout could replay a script that executes late.
      return new Promise(resolve => setTimeout(resolve, 250)).then(() => attempt(retries - 1));
    });
  }
  const flight = attempt(1).finally(() => tdbRecoverableScriptFlights.delete(attrName));
  tdbRecoverableScriptFlights.set(attrName, flight);
  return flight;
}

/* Only shared UI is requested by the head. Feature CSS is requested when its runtime is needed. */
const tdbStyleFlights = new Map();
const tdbStyleIsReady = property => getComputedStyle(document.documentElement)
  .getPropertyValue(property).trim() === '1';
const tdbUIIsReady = () => tdbStyleIsReady('--tdb-ui-ready');

function tdbEnsureStylesheet(attribute, filename, property, label) {
  const isReady = () => tdbStyleIsReady(property);
  if (isReady()) return Promise.resolve();
  if (tdbStyleFlights.has(attribute)) return tdbStyleFlights.get(attribute);
  const link = document.querySelector(`link[${attribute}]`) ||
    Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .find(node => node.href.split(/[?#]/)[0].endsWith('/dist/' + filename));
  if (!link) return Promise.reject(new Error(`TDB ${label} link is missing`));

  function waitFor(link, retries) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let timeout;
      function cleanup() {
        clearTimeout(timeout);
        link.removeEventListener('load', loaded);
        link.removeEventListener('error', failed);
      }
      function fail(error) {
        if (settled) return;
        settled = true;
        cleanup();
        link.dataset.tdbLoadFailed = 'true';
        if (!retries || !link.isConnected) return reject(error);
        const replacement = link.cloneNode(false);
        // Keep the original location: appending to head would change cascade order.
        ['onload', 'onerror', 'data-tdb-loaded', 'data-tdb-load-failed']
          .forEach(name => replacement.removeAttribute(name));
        replacement.media = 'print';
        const next = waitFor(replacement, retries - 1);
        link.replaceWith(replacement);
        next.then(resolve, reject);
      }
      function loaded() {
        if (settled) return;
        link.media = 'all';
        if (!isReady()) return fail(new Error(`TDB ${label} bundle is stale or incomplete`));
        settled = true;
        cleanup();
        link.dataset.tdbLoaded = 'true';
        delete link.dataset.tdbLoadFailed;
        resolve();
      }
      function failed() { fail(new Error(`TDB ${label} request failed`)); }
      link.addEventListener('load', loaded);
      link.addEventListener('error', failed);
      timeout = setTimeout(() => fail(new Error(`TDB ${label} request timed out`)), 15000);
      if (link.dataset.tdbLoadFailed === 'true') failed();
      else if (link.sheet) loaded();
    });
  }
  const flight = waitFor(link, 1).finally(() => tdbStyleFlights.delete(attribute));
  tdbStyleFlights.set(attribute, flight);
  return flight;
}

function tdbEnsureUI() {
  return tdbEnsureStylesheet('data-tdb-ui-css', 'tdb-ui.css', '--tdb-ui-ready', 'global UI');
}
function tdbEnsureFeatureCSS(attribute, filename, property, label) {
  if (tdbStyleIsReady(property)) return Promise.resolve();
  let link = document.querySelector(`link[${attribute}]`);
  if (!link) {
    const shared = document.querySelector('link[data-tdb-ui-css]') ||
      Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .find(node => /\/dist\/tdb-ui\.css(?:[?#]|$)/.test(node.href));
    if (!shared) return Promise.reject(new Error('TDB global UI link is missing'));
    link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL(filename, shared.href).href;
    link.setAttribute(attribute, 'true');
    // Match the old bundle's cascade: after shared UI, before later page overrides.
    shared.insertAdjacentElement('afterend', link);
  }
  return tdbEnsureStylesheet(attribute, filename, property, label);
}
function tdbEnsureSliderUI() {
  return tdbEnsureFeatureCSS('data-tdb-slider-ui-css', TDB_SLIDER_ROOT + 'tdb-slider-ui.css', '--tdb-slider-ui-ready', 'slider UI');
}
function tdbEnsureVIPUI() {
  return tdbEnsureFeatureCSS('data-tdb-vip-ui-css', 'tdb-vip.css', '--tdb-vip-ui-ready', 'VIP UI');
}
function tdbEnsureContentVideoUI() {
  return tdbEnsureFeatureCSS('data-tdb-vimeo-content-ui-css', 'tdb-vimeo-content-ui.css', '--tdb-vimeo-content-ui-ready', 'content-video UI');
}
window.TDBFeatureCSS = Object.freeze({ contentVideo: tdbEnsureContentVideoUI, ui: tdbEnsureUI });

function tdbPreloadVIPScript(src) {
  if ((tdbUIIsReady() && tdbStyleIsReady('--tdb-vip-ui-ready')) || document.querySelector('link[data-tdb-vip-preload]') ||
      document.querySelector('script[data-tdb-vip-drawer-js]')) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'script';
  link.href = src;
  link.setAttribute('data-tdb-vip-preload', 'true');
  // Match the existing classic script's request mode: no crossorigin attribute.
  link.onerror = () => link.remove();
  document.head.appendChild(link);
}

function tdbLoadVIPScript(src, retries = 1) {
  if (window.TDBVIPDrawer) return Promise.resolve(window.TDBVIPDrawer);
  return new Promise((resolve, reject) => {
    let script = document.querySelector('script[data-tdb-vip-drawer-js]');
    const isNew = !script;
    let settled = false;
    let timeout;
    if (isNew) {
      script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.charset = 'UTF-8';
      script.setAttribute('data-tdb-vip-drawer-js', 'true');
    }
    function cleanup() {
      clearTimeout(timeout);
      script.removeEventListener('load', loaded);
      script.removeEventListener('error', failed);
    }
    function fail(error, allowRetry = true) {
      if (settled) return;
      settled = true;
      cleanup();
      script.remove();
      document.querySelector('link[data-tdb-vip-preload]')?.remove();
      if (!allowRetry || !retries) return reject(error);
      setTimeout(() => tdbLoadVIPScript(src, retries - 1).then(resolve, reject), 250);
    }
    function loaded() {
      if (settled) return;
      if (!window.TDBVIPDrawer) {
        // Replaying a partly executed runtime is not a network recovery strategy.
        return fail(new Error('TDB VIP script loaded without a ready API'), false);
      }
      settled = true;
      cleanup();
      script.dataset.tdbLoaded = 'true';
      document.querySelector('link[data-tdb-vip-preload]')?.remove();
      resolve(window.TDBVIPDrawer);
    }
    function failed() { fail(new Error('TDB VIP request failed')); }
    script.addEventListener('load', loaded);
    script.addEventListener('error', failed);
    timeout = setTimeout(() => fail(new Error('TDB VIP request timed out')), 15000);
    if (isNew) document.head.appendChild(script);
    else if (script.dataset.tdbLoaded === 'true') loaded();
  });
}

function initLenis() {
  if (document.documentElement.classList.contains('w-editor')) return;
  if (!window.Lenis || window.lenis) return;
  window.lenis = new Lenis({ autoRaf: true, smoothWheel: true, syncTouch: false });
}

function triggerAfterLoadIdle(callback) {
  function run() {
    if ('requestIdleCallback' in window) requestIdleCallback(() => requestAnimationFrame(callback), { timeout: 2000 });
    else setTimeout(() => requestAnimationFrame(callback), 300);
  }
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
}

const LENIS_WARM_SESSION_KEY = 'tdb-lenis-warm';
function isLenisWarmSession() {
  try { return sessionStorage.getItem(LENIS_WARM_SESSION_KEY) === '1'; } catch (error) { return false; }
}
function markLenisWarmSession() {
  try { sessionStorage.setItem(LENIS_WARM_SESSION_KEY, '1'); } catch (error) {}
}
function loadLenisAssets() {
  if (!matchMedia('(min-width:768px) and (hover:hover) and (pointer:fine)').matches) return;
  loadScript('https://cdn.jsdelivr.net/npm/lenis@1.3.19/dist/lenis.min.js', 'data-lenis-js')
    .then(initLenis)
    .catch(() => console.error('TDB Lenis failed to load'));
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
  const excluded = '#vip-drawer-form';
  const vipIntent = 'a[href*="#vip" i], [href*="#vip" i], [data-vip-open]';
  const observed = new WeakSet();
  let loadingPromise = null;
  let loaded = false;
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
    loadingPromise = loadScriptWithRecovery('https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@v0.1.0/dist/tdb-forms.min.js', 'data-tdb-forms-js')
      .then(script => { loaded = true; cleanup(); return script; })
      .catch(error => { loadingPromise = null; console.error('TDB Forms failed to load'); throw error; });
    return loadingPromise;
  }
  const loadSafely = () => { loadForms().catch(() => {}); };
  function onIntent(event) {
    const target = event.target;
    if (target instanceof Element && (target.closest(formSelector) || target.closest(vipIntent))) loadSafely();
  }
  function observeForm(form) {
    if (!(form instanceof HTMLFormElement) || observed.has(form) || form.matches(excluded)) return;
    observed.add(form);
    if (!proximityObserver) loadSafely();
    else proximityObserver.observe(form);
  }
  function discover(root = document) {
    if (root instanceof HTMLFormElement) observeForm(root);
    root.querySelectorAll?.(formSelector).forEach(observeForm);
  }
  if ('IntersectionObserver' in window) {
    proximityObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadSafely();
    }, { rootMargin: '600px 0px' });
  }
  document.addEventListener('focusin', onIntent, true);
  document.addEventListener('pointerdown', onIntent, true);
  document.addEventListener('keydown', onIntent, true);
  document.addEventListener('submit', onIntent, true);
  function start() {
    if (loaded) return;
    discover();
    discoveryObserver = new MutationObserver(mutations => mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
      if (node instanceof Element) discover(node);
    })));
    discoveryObserver.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

function prepareVIPDrawerLoader() {
  const drawer = document.getElementById('tdb-vip-drawer');
  if (!drawer) return;

  const demand = document.documentElement.getAttribute('data-wf-page') === '677cf86df9952f978d94d8a9';
  const triggerSelector = '#tdb-vip-drawer .tdb-vip-drawer-handle, a[href*="#vip" i], [href*="#vip" i], [data-vip-open]';
  const legacyUrl = 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@71ff4c4be481a56d7dc11c09a7b0563850f7838b/dist/tdb-vip-drawer-legacy.js';
  const jsUrl = demand ? 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@71ff4c4be481a56d7dc11c09a7b0563850f7838b/dist/tdb-vip-drawer.js' : legacyUrl;
  let loadingPromise = null;
  let armed = false;
  let openPending = false;
  // Prefer the window scroll offset, including zero, without also asking the
  // root element for layout. Retain the element fallback for older engines.
  const pageY = () => Math.max(window.scrollY ?? document.documentElement.scrollTop ?? 0, 0);
  const scrollSeed = { lastY: pageY(), up: 0, down: 0, peek: false };
  const realDrawerReady = () => Boolean(window.TDBVIPDrawer);

  function cleanup() {
    armed = false;
    document.removeEventListener('click', onIntentClick, true);
    document.removeEventListener('keydown', onIntentKeydown, true);
    document.removeEventListener('pointerover', onPrepareIntent, true);
    document.removeEventListener('pointerdown', onPrepareIntent, true);
    document.removeEventListener('focusin', onPrepareIntent, true);
    window.removeEventListener('scroll', onPrepareScroll);
    window.removeEventListener('pageshow', onPageShow);
    window.removeEventListener('hashchange', onHashChange);
  }

  function loadDrawer() {
    if (loadingPromise) return loadingPromise;
    if (realDrawerReady()) return Promise.resolve(window.TDBVIPDrawer);
    tdbPreloadVIPScript(jsUrl);
    loadingPromise = Promise.all([tdbEnsureUI(), tdbEnsureVIPUI()])
      .then(() => {
        if (demand) {
          // Resolve the hidden starting geometry only after actual demand, before
          // the runtime can enable transitions or replay an immediate open.
          drawer.setAttribute('data-tdb-vip-prepared', 'true');
          drawer.getBoundingClientRect();
        }
        return tdbLoadVIPScript(jsUrl);
      })
      .then(() => {
        const api = window.TDBVIPDrawer;
        if (demand) api.resumeScroll?.(scrollSeed);
        cleanup();
        return api;
      })
      .catch(error => {
        document.querySelector('link[data-tdb-vip-preload]')?.remove();
        loadingPromise = null;
        if (demand && !realDrawerReady()) drawer.removeAttribute('data-tdb-vip-prepared');
        console.error('TDB VIP Drawer failed to load');
        throw error;
      });
    return loadingPromise;
  }

  function findTrigger(event) {
    const target = event.target;
    return target instanceof Element ? target.closest(triggerSelector) : null;
  }
  function fallbackToForm() {
    const section = Array.from(document.querySelectorAll('#VIP')).find(node => !drawer.contains(node));
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function openAfterLoad(event) {
    event.preventDefault();
    event.stopPropagation();
    if (openPending) return;
    openPending = true;
    loadDrawer().then(api => api?.open?.()).catch(() => {
      if (demand) fallbackToForm();
    }).finally(() => { openPending = false; });
  }
  function onIntentClick(event) {
    if (realDrawerReady() || !findTrigger(event)) return;
    openAfterLoad(event);
  }
  function onIntentKeydown(event) {
    if (realDrawerReady() || (event.key !== 'Enter' && event.key !== ' ') || !findTrigger(event)) return;
    openAfterLoad(event);
  }
  const loadSafely = () => { loadDrawer().catch(() => {}); };
  function onPrepareIntent(event) {
    if (findTrigger(event)) loadSafely();
  }
  function onPrepareScroll() {
    const y = pageY();
    const delta = y - scrollSeed.lastY;
    if (!delta) return;
    if (delta > 0) {
      scrollSeed.up = 0;
      scrollSeed.down += delta;
      if (scrollSeed.down > 140) scrollSeed.peek = false;
    } else {
      scrollSeed.down = 0;
      scrollSeed.up += -delta;
      if (scrollSeed.up > 120 && y > innerHeight * 0.5) scrollSeed.peek = true;
    }
    if (y <= innerHeight * 0.5) scrollSeed.peek = false;
    scrollSeed.lastY = y;
    // First actual movement gives the download a head start before a reversal.
    loadSafely();
  }
  function onPageShow() {
    if (pageY() > 0) loadSafely();
  }
  function onHashChange() {
    if (/^#vip/i.test(location.hash || '')) loadSafely();
  }
  function arm() {
    if (armed || realDrawerReady()) return;
    armed = true;
    document.addEventListener('click', onIntentClick, true);
    document.addEventListener('keydown', onIntentKeydown, true);
    if (demand) {
      document.addEventListener('pointerover', onPrepareIntent, true);
      document.addEventListener('pointerdown', onPrepareIntent, true);
      document.addEventListener('focusin', onPrepareIntent, true);
      window.addEventListener('scroll', onPrepareScroll, { passive: true });
      window.addEventListener('pageshow', onPageShow, { passive: true });
      window.addEventListener('hashchange', onHashChange);
    }
  }

  arm();
  if (/^#vip/i.test(location.hash || '')) loadSafely();
  else if (demand) onPageShow();
  else if (window.__TDB_PRIORITY_READY__) loadSafely();
  else window.addEventListener('tdb:priority-ready', loadSafely, { once: true });

  window.TDBVIPDrawerLoader = Object.freeze({
    version: '1.3.1',
    load: loadDrawer,
    status: () => ({ loaded: realDrawerReady(), loading: Boolean(loadingPromise) && !realDrawerReady(), uiReady: tdbUIIsReady(), demand }),
  });
}

function prepareSliderLoader() {
  const selector = '.highlight-swiper_component, .parallax-swiper_component';
  const observed = new WeakSet();
  let loadingPromise = null;
  let loaded = false;
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
    loadingPromise = Promise.all([
      tdbEnsureUI(),
      tdbEnsureSliderUI(),
      loadScriptWithRecovery('https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@b3a0f0f2a1e57b5a67db5f5159c449cff07eebd6/dist/tdb-swiper-8.4.7.min.js', 'data-swiper-js'),
    ]).then(tdbEnsureSliderRuntime).then(script => {
      loaded = true;
      cleanup();
      return script;
    }).catch(error => {
      loadingPromise = null;
      console.error('TDB Sliders failed to load');
      throw error;
    });
    return loadingPromise;
  }
  const loadSafely = () => { loadSliders().catch(() => {}); };
  function onIntent(event) {
    const target = event.target;
    if (target instanceof Element && !target.closest('.logo-slider') && target.closest(selector)) loadSafely();
  }
  function observeSlider(slider) {
    if (!(slider instanceof Element) || slider.closest('.logo-slider') || observed.has(slider)) return;
    observed.add(slider);
    if (!proximityObserver) loadSafely();
    else proximityObserver.observe(slider);
  }
  function discover(root = document) {
    if (root instanceof Element && root.matches(selector)) observeSlider(root);
    root.querySelectorAll?.(selector).forEach(observeSlider);
  }
  if ('IntersectionObserver' in window) {
    proximityObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadSafely();
    }, { rootMargin: '800px 0px' });
  }
  document.addEventListener('pointerdown', onIntent, true);
  document.addEventListener('keydown', onIntent, true);
  function start() {
    if (loaded) return;
    discover();
    discoveryObserver = new MutationObserver(mutations => mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
      if (node instanceof Element) discover(node);
    })));
    discoveryObserver.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  window.TDBSliderLoader = Object.freeze({
    version: '0.2.4',
    load: loadSliders,
    status: () => ({ loaded: Boolean(window.TDBSliders), loading: !loaded && Boolean(loadingPromise), swiperAvailable: typeof window.Swiper === 'function' }),
  });
  window.dispatchEvent(new Event('tdb:slider-loader-ready'));
}

prepareFormsLoader();
prepareVIPDrawerLoader();
prepareSliderLoader();
prepareTooltipLoader();
prepareSliderFocusLoader();
startLenisForSession();

(() => {
  const root = document.documentElement;
  const navbar = document.querySelector('.navbar10_component');
  const button = document.querySelector('.navbar10_menu-button,.w-nav-button');
  const mobile = matchMedia('(max-width:767px)');
  if (!navbar || !button || navbar.getAttribute('transparent-nav') !== 'true') return;
  let clearCycle = false;
  let timer;
  const open = () => button.classList.contains('w--open');
  button.addEventListener('pointerdown', () => {
    if (navbar.classList.contains('tdb-menu-transitioning') || open()) return;
    clearTimeout(timer);
    clearCycle = mobile.matches && root.classList.contains('tdb-nav-at-top');
    root.classList.toggle('tdb-nav-clear-cycle', clearCycle);
  }, { capture: true, passive: true });
  new MutationObserver(() => {
    clearTimeout(timer);
    if (open()) return;
    if (!clearCycle) return root.classList.remove('tdb-nav-clear-cycle');
    timer = setTimeout(() => {
      clearCycle = false;
      root.classList.remove('tdb-nav-clear-cycle');
    }, 470);
  }).observe(button, { attributes: true, attributeFilter: ['class'] });
  const reset = () => {
    if (mobile.matches) return;
    clearTimeout(timer);
    clearCycle = false;
    root.classList.remove('tdb-nav-clear-cycle');
  };
  mobile.addEventListener ? mobile.addEventListener('change', reset) : mobile.addListener(reset);
})();

window.TDBFooterRuntime = Object.freeze({
  version: '1.4.21',
  loadedAt: Date.now(),
  vip: () => window.TDBVIPDrawerLoader?.status?.() || null,
  sliders: () => window.TDBSliderLoader?.status?.() || null,
});
