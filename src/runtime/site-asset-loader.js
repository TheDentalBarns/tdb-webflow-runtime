(() => {
  const root = document.documentElement;
  const shellId = 'tdb-elfsight-timer-shell';
  const appClass = 'elfsight-app-4fa0f002-95b0-40d5-b89d-0f5e97471efb';
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
    requestUpdate();
  }

  function createTimerShell() {
    let shell = document.getElementById(shellId);
    if (!shell) {
      shell = document.createElement('div');
      shell.id = shellId;
      shell.className = 'tdb-elfsight-shell';
      const widget = document.createElement('div');
      widget.className = appClass;
      widget.setAttribute('data-elfsight-app', '');
      shell.appendChild(widget);
      document.body.appendChild(shell);
    }
    attachTimerState(shell);
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
    script.onload = () => { script.dataset.tdbLoaded = 'true'; resolve(script); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function loadStyle(href, attrName) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`link[${attrName}]`);
    if (existing) {
      if (existing.sheet || existing.dataset.tdbLoaded === 'true') resolve(existing);
      else {
        existing.addEventListener('load', () => resolve(existing), { once: true });
        existing.addEventListener('error', reject, { once: true });
      }
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(attrName, 'true');
    link.onload = () => { link.dataset.tdbLoaded = 'true'; resolve(link); };
    link.onerror = reject;
    document.head.appendChild(link);
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
    loadingPromise = loadScript('https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@v0.1.0/dist/tdb-forms.min.js', 'data-tdb-forms-js')
      .catch(error => { loadingPromise = null; console.error('TDB Forms failed to load'); throw error; });
    return loadingPromise;
  }
  function onIntent(event) {
    const target = event.target;
    if (target instanceof Element && (target.closest(formSelector) || target.closest(vipIntent))) loadForms();
  }
  function observeForm(form) {
    if (!(form instanceof HTMLFormElement) || observed.has(form) || form.matches(excluded)) return;
    observed.add(form);
    if (!proximityObserver) loadForms();
    else proximityObserver.observe(form);
  }
  function discover(root = document) {
    if (root instanceof HTMLFormElement) observeForm(root);
    root.querySelectorAll?.(formSelector).forEach(observeForm);
  }
  if ('IntersectionObserver' in window) {
    proximityObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadForms();
    }, { rootMargin: '600px 0px' });
  }
  document.addEventListener('focusin', onIntent, true);
  document.addEventListener('pointerdown', onIntent, true);
  document.addEventListener('keydown', onIntent, true);
  document.addEventListener('submit', onIntent, true);
  function start() {
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

  const triggerSelector = '#tdb-vip-drawer .tdb-vip-drawer-handle, a[href*="#vip" i], [href*="#vip" i], [data-vip-open]';
  const cssUrl = 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@d23bdbad45aae58517ad2c249c365420bb844fc0/dist/tdb-vip.css';
  const jsUrl = 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@432ab3ab12553c9bbff97123453272ebde1ad6da/dist/tdb-vip-drawer.js';
  let loadingPromise = null;
  let armed = false;

  const realDrawerReady = () => Boolean(window.TDBVIPDrawer);

  function cleanup() {
    armed = false;
    document.removeEventListener('click', onIntentClick, true);
    document.removeEventListener('keydown', onIntentKeydown, true);
  }

  function loadDrawer() {
    if (realDrawerReady()) return Promise.resolve(window.TDBVIPDrawer);
    if (loadingPromise) return loadingPromise;
    loadingPromise = loadStyle(cssUrl, 'data-tdb-vip-css')
      .then(() => loadScript(jsUrl, 'data-tdb-vip-drawer-js'))
      .then(() => {
        cleanup();
        return window.TDBVIPDrawer;
      })
      .catch(error => {
        document.querySelector('link[data-tdb-vip-css]')?.remove();
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
  function arm() {
    if (armed || realDrawerReady()) return;
    armed = true;
    document.addEventListener('click', onIntentClick, true);
    document.addEventListener('keydown', onIntentKeydown, true);
  }

  arm();
  if (/^#vip/i.test(location.hash || '')) loadDrawer();
  else if (window.__TDB_PRIORITY_READY__) loadDrawer();
  else window.addEventListener('tdb:priority-ready', loadDrawer, { once: true });

  window.TDBVIPDrawerLoader = Object.freeze({
    version: '1.1.0',
    load: loadDrawer,
    status: () => ({ loaded: realDrawerReady(), loading: Boolean(loadingPromise) }),
  });
}

function prepareSliderLoader() {
  const selector = '.highlight-swiper_component, .parallax-swiper_component';
  const cssUrl = 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@d23bdbad45aae58517ad2c249c365420bb844fc0/dist/tdb-slider-ui.css';
  const observed = new WeakSet();
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
    loadingPromise = Promise.all([
      loadStyle(cssUrl, 'data-tdb-slider-css'),
      loadScript('https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@b3a0f0f2a1e57b5a67db5f5159c449cff07eebd6/dist/tdb-swiper-8.4.7.min.js', 'data-swiper-js'),
    ]).then(() => loadScript(
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
    if (target instanceof Element && target.closest(selector)) loadSliders();
  }
  function observeSlider(slider) {
    if (!(slider instanceof Element) || observed.has(slider)) return;
    observed.add(slider);
    if (!proximityObserver) loadSliders();
    else proximityObserver.observe(slider);
  }
  function discover(root = document) {
    if (root instanceof Element && root.matches(selector)) observeSlider(root);
    root.querySelectorAll?.(selector).forEach(observeSlider);
  }
  if ('IntersectionObserver' in window) {
    proximityObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadSliders();
    }, { rootMargin: '800px 0px' });
  }
  document.addEventListener('pointerdown', onIntent, true);
  document.addEventListener('keydown', onIntent, true);
  function start() {
    discover();
    discoveryObserver = new MutationObserver(mutations => mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
      if (node instanceof Element) discover(node);
    })));
    discoveryObserver.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  window.TDBSliderLoader = Object.freeze({
    version: '0.2.0',
    load: loadSliders,
    status: () => ({ loaded: Boolean(window.TDBSliders), loading: Boolean(loadingPromise), swiperAvailable: typeof window.Swiper === 'function' }),
  });
}

prepareFormsLoader();
prepareVIPDrawerLoader();
prepareSliderLoader();
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
  version: '1.2.0',
  loadedAt: Date.now(),
  vip: () => window.TDBVIPDrawerLoader?.status?.() || null,
  sliders: () => window.TDBSliderLoader?.status?.() || null,
});
