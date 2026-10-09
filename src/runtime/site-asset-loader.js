// Both pageshow listeners run in the same dispatch. Reuse that event's snapshot
// after the announcement changes visibility, instead of forcing a second read.
// A new event (including a bfcache restore) always measures the current position.
const TDBFooterPageShowPositions = new WeakMap();
function tdbReadPagePosition(event) {
  if (event && TDBFooterPageShowPositions.has(event)) return TDBFooterPageShowPositions.get(event);
  const root = document.documentElement;
  const position = {y: window.scrollY ?? root.scrollTop ?? 0, height: innerHeight || root.clientHeight || 0};
  if (event) TDBFooterPageShowPositions.set(event, position);
  return position;
}

(() => {
  const root = document.documentElement;
  const shellId = 'tdb-elfsight-timer-shell';
  const mobileQuery = matchMedia('(max-width:767px)');
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const revealViewports = path === '/' || path === '/location' ? 4 : 1;
  let viewportHeight = 0;

  function attachTimerState(shell, position) {
    if (!shell || shell._t) return;
    shell._t = 1;
    let frame = 0;
    const navbar = document.querySelector('.navbar10_component');
    const updateViewportHeight = (h = innerHeight || root.clientHeight || 0) => {
      viewportHeight = viewportHeight ? Math.min(viewportHeight, h) : h;
    };
    const updateState = (scrollTop = window.scrollY ?? root.scrollTop ?? 0) => {
      frame = 0;
      const mobileNavbarVisible = mobileQuery.matches && navbar && (
        navbar.classList.contains('z-hold') ||
        (navbar.classList.contains('is-trans') && !(navbar.style.transform || '').includes('-100%'))
      );
      root.classList.toggle('tdb-timer-hidden', scrollTop < viewportHeight * revealViewports || mobileNavbarVisible);
    };
    const requestUpdate = () => { if (!frame) frame = requestAnimationFrame(() => updateState()); };
    updateViewportHeight(position.height);
    if (navbar) new MutationObserver(requestUpdate).observe(navbar, { attributes: true, attributeFilter: ['class', 'style'] });
    addEventListener('scroll', requestUpdate, { passive: true });
    addEventListener('resize', () => { updateViewportHeight(); requestUpdate(); }, { passive: true });
    addEventListener('orientationchange', () => { updateViewportHeight(); requestUpdate(); }, { passive: true });
    mobileQuery.addEventListener ? mobileQuery.addEventListener('change', requestUpdate) : mobileQuery.addListener(requestUpdate);
    updateState(position.y);
  }

  const startupEvents = ['scroll','pointerdown','keydown','touchstart'];
  let scheduled = false, mounted = false, attempts = 0;
  function createTimerShell() {
    const shell = document.querySelector('[data-tdb-announcement][data-placement="floating"]');
    if (!shell || mounted || attempts >= 3) return;
    const position = tdbReadPagePosition();
    attempts++;
    // The component remains editable in Footer; body ownership avoids transformed
    // page wrappers changing fixed positioning and keeps the drawer's inert handling.
    if (shell.parentElement !== document.body) document.body.append(shell);
    attachTimerState(shell, position);
    window.TDBAnnouncementLoader.load().then(api => {
      api.mount(shell); mounted = true;
      startupEvents.forEach(type => removeEventListener(type, scheduleTimerShell));
      removeEventListener('online', onOnline);
      removeEventListener('pageshow', onPageShow);
    }).catch(() => {
      scheduled = false;
      console.warn('TDB banner: shared modules unavailable; will retry on interaction.');
    });
  }
  function scheduleTimerShell() {
    if (scheduled || mounted || attempts >= 3) return;
    scheduled = true;
    if ('requestIdleCallback' in window) requestIdleCallback(createTimerShell, {timeout:1500});
    else setTimeout(createTimerShell,200);
  }
  function onOnline() { attempts = 0; scheduleTimerShell(); }
  function onPageShow(event) {
    const position = tdbReadPagePosition(event);
    attachTimerState(document.getElementById(shellId), position);
    if (position.y) scheduleTimerShell();
  }
  startupEvents.forEach(type => addEventListener(type,scheduleTimerShell,{passive:true}));
  addEventListener('online', onOnline);
  addEventListener('pageshow', onPageShow);

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
  // Native Webflow CSS is already loaded before page scripts. Older markup
  // retains its pinned stylesheet, making this release safe during migration.
  if (document.querySelector('#tdb-vip-drawer[data-tdb-vip-native="1"]')) return Promise.resolve();
  return tdbEnsureFeatureCSS('data-tdb-vip-ui-css', 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@48124a90eddd39bf4ae611d00b9fe80583b98872/dist/tdb-vip.css', '--tdb-vip-ui-ready', 'VIP UI');
}
window.TDBFeatureCSS = Object.freeze({ ui: tdbEnsureUI });

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
  // VIP ships with this footer release; other feature pins stay independent.
  const jsUrl = new URL('tdb-vip-drawer.js', document.currentScript.src).href;
  let loadingPromise = null;
  let armed = false;
  // Prefer the window scroll offset, including zero, without also asking the
  // root element for layout. Retain the element fallback for older engines.
  const pageY = () => Math.max(window.scrollY ?? document.documentElement.scrollTop ?? 0, 0);
  const scrollSeed = { lastY: TDBFooterInitialScrollY, up: 0, down: 0, peek: false };
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
    if (section) {
      section.scrollIntoView({behavior:'smooth',block:'start'});
      const field = section.querySelector('input:not([type="hidden"]),button,a[href]');
      field?.focus({preventScroll:true});
    } else location.assign('/vip/become-a-patient');
  }
  let opening = null;
  function openFromTrigger(source) {
    if (opening) return opening;
    opening = loadDrawer().then(api => {
      window.dispatchEvent(new CustomEvent('tdb:vip-open-intent',{detail:{source}}));
      api.open();
    }).catch(fallbackToForm).finally(() => {opening=null;});
    return opening;
  }
  function openAfterLoad(event) {
    event.preventDefault(); event.stopPropagation();
    openFromTrigger(findTrigger(event));
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
  function onPageShow(event) {
    if (tdbReadPagePosition(event).y > 0) loadSafely();
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
  else if (demand) { if (TDBFooterInitialScrollY > 0) loadSafely(); }
  else if (window.__TDB_PRIORITY_READY__) loadSafely();
  else window.addEventListener('tdb:priority-ready', loadSafely, { once: true });

  window.TDBVIPDrawerLoader = Object.freeze({
    version: '1.4.0',
    load: loadDrawer,
    open: openFromTrigger,
    status: () => ({ loaded: realDrawerReady(), loading: Boolean(loadingPromise) && !realDrawerReady(), uiReady: tdbUIIsReady(), demand }),
  });
}

function prepareSliderLoader() {
  const selector = '.highlight-swiper_component, .parallax-swiper_component';
  const files = {parallax: 'tdb-parallax.js', gallery: 'tdb-gallery.js'};
  const flights = new Map(), ready = new Set(), observed = new WeakSet();
  let proximityObserver = null;
  const kindOf = root => root.matches('.parallax-swiper_component') ? 'parallax' : 'gallery';
  const pluginOf = kind => kind === 'parallax' ? window.TDBParallaxPlugin : window.TDBGallery;

  function loadKind(kind) {
    if (flights.has(kind)) return flights.get(kind);
    const flight = Promise.all([
      tdbEnsureUI(), tdbEnsureSliderUI(), tdbEnsureSliderFocus(),
      window.TDBModules.load(new URL('tdb-motion.js', TDBFooterModuleRoot)),
      window.TDBModules.load(new URL('tdb-swiper-8.4.7.min.js', TDBFooterModuleRoot), {
        attribute: 'data-swiper-js', ready: () => typeof window.Swiper === 'function' && typeof window.TDBSwiper?.create === 'function'
      }),
    ]).then(() => window.TDBModules.load(new URL(files[kind], TDBFooterModuleRoot), {
      attribute: 'data-tdb-' + kind + '-js', ready: () => Boolean(pluginOf(kind))
    })).then(() => {
      const plugin = pluginOf(kind);
      if (!plugin) throw Error('Carousel plugin did not initialise: ' + kind);
      ready.add(kind);
      plugin.refresh();
      return plugin;
    }).catch(error => {
      flights.delete(kind);
      console.error('TDB carousel plugin failed to load: ' + kind);
      throw error;
    });
    flights.set(kind, flight);
    return flight;
  }

  function loadSliders(root) {
    window.TDBParallax?.refresh(root || document);
    if (root instanceof Element) {
      const component = root.matches(selector) ? root : root.closest(selector);
      if (component) return loadKind(kindOf(component)).then(plugin => { plugin.refresh(component); return plugin; });
    }
    const kinds = new Set([...document.querySelectorAll(selector)].filter(node => !node.closest('.logo-slider')).map(kindOf));
    return Promise.all([...kinds].map(loadKind));
  }
  const loadSafely = root => { loadSliders(root).then(() => proximityObserver?.unobserve(root)).catch(() => {}); };
  function onIntent(event) {
    const target = event.target;
    if (target instanceof Element && !target.closest('.logo-slider')) {
      const root = target.closest(selector);
      if (root) loadSafely(root);
    }
  }
  function observeSlider(root) {
    if (!(root instanceof Element) || root.closest('.logo-slider') || observed.has(root)) return;
    observed.add(root);
    if (ready.has(kindOf(root))) pluginOf(kindOf(root)).refresh(root);
    else if (proximityObserver) proximityObserver.observe(root);
    else loadSafely(root);
  }
  function discover(root = document) {
    window.TDBParallax?.refresh(root);
    if (root instanceof Element && root.matches(selector)) observeSlider(root);
    root.querySelectorAll?.(selector).forEach(observeSlider);
  }
  if ('IntersectionObserver' in window) proximityObserver = new IntersectionObserver(entries => {
    entries.filter(entry => entry.isIntersecting).forEach(entry => loadSafely(entry.target));
  }, {rootMargin: '800px 0px'});
  document.addEventListener('pointerdown', onIntent, true);
  document.addEventListener('keydown', onIntent, true);
  function start() {
    discover();
    new MutationObserver(mutations => {
      mutations.forEach(mutation => mutation.addedNodes.forEach(node => { if (node instanceof Element) discover(node); }));
      if (mutations.some(mutation => mutation.removedNodes.length)) window.TDBSwiper?.prune();
    }).observe(document.body, {childList: true, subtree: true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
  window.TDBSliderLoader = Object.freeze({version: '1.0.0', load: loadSliders,
    status: () => ({loaded: ready.size > 0, loading: flights.size > ready.size, plugins: [...ready], swiperAvailable: typeof window.Swiper === 'function'})});
  // Older embeds can keep their public calls; implementation lives in plugins.
  window.TDBSliders ||= Object.freeze({version: '1.0.0', refresh: () => loadSliders(), activate: root => window.TDBSwiper?.mount('parallax', root)});
  window.dispatchEvent(new Event('tdb:slider-loader-ready'));
}

// Footer copy and sizing live in Designer. Keep the existing document-modified
// date behavior here, sharing the already-loaded runtime rather than an embed.
function updateNativeFooterDates() {
  const updated = new Date(document.lastModified);
  if (!Number.isFinite(updated.getTime())) return;
  const date = [String(updated.getDate()).padStart(2, '0'),
    String(updated.getMonth() + 1).padStart(2, '0'), updated.getFullYear()].join('/');
  document.querySelectorAll('[data-tdb-last-updated]').forEach(node => {
    if (node.textContent !== date) node.textContent = date;
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateNativeFooterDates, {once: true});
} else updateNativeFooterDates();

prepareFormsLoader();
prepareVIPDrawerLoader();
prepareSliderLoader();
prepareTooltipLoader();
prepareSliderFocusLoader();
startLenisForSession();

window.TDBFooterRuntime = Object.freeze({
  version: '1.6.4',
  loadedAt: Date.now(),
  vip: () => window.TDBVIPDrawerLoader?.status?.() || null,
  sliders: () => window.TDBSliderLoader?.status?.() || null,
});
