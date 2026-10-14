/* Preserved VIP loading and intent; initialized by runtime. */
function tdbPreloadVIPScript(src) {
  if (
    (tdbUIIsReady() && tdbStyleIsReady('--tdb-vip-ui-ready')) ||
    document.querySelector('link[data-tdb-vip-preload]') ||
    document.querySelector('script[data-tdb-vip-drawer-js]')
  )
    return;
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
    function failed() {
      fail(new Error('TDB VIP request failed'));
    }
    script.addEventListener('load', loaded);
    script.addEventListener('error', failed);
    timeout = setTimeout(() => fail(new Error('TDB VIP request timed out')), 15000);
    if (isNew) document.head.appendChild(script);
    else if (script.dataset.tdbLoaded === 'true') loaded();
  });
}

function prepareVIPDrawerLoader() {
  const drawer = document.getElementById('tdb-vip-drawer');
  if (!drawer) return;

  const demand =
    document.documentElement.getAttribute('data-wf-page') === '677cf86df9952f978d94d8a9';
  const triggerSelector =
    '#tdb-vip-drawer .tdb-vip-drawer-handle, a[href*="#vip" i], [href*="#vip" i], [data-vip-open]';
  // VIP ships with this footer release; other feature pins stay independent.
  const jsUrl =
    'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@405af73d4d62619c66bb1140ee6f1e6081b0559c/dist/tdb-vip-drawer.js';
  let loadingPromise = null;
  let armed = false;
  // Prefer the window scroll offset, including zero, without also asking the
  // root element for layout. Retain the element fallback for older engines.
  const pageY = () => Math.max(window.scrollY ?? document.documentElement.scrollTop ?? 0, 0);
  const scrollSeed = { ...window.TDBRuntimePageState.vipScrollSeed };
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
    loadingPromise = Promise.all([tdbEnsureUI(), tdbEnsureVIPUI(), tdbEnsureVIPChrome()])
      .then(() => {
        return tdbLoadVIPScript(jsUrl);
      })
      .then(() => {
        const api = window.TDBVIPDrawer;
        if (demand) api.resumeScroll?.(scrollSeed);
        cleanup();
        return api;
      })
      .catch((error) => {
        document.querySelector('link[data-tdb-vip-preload]')?.remove();
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
  function fallbackToForm() {
    const section = Array.from(document.querySelectorAll('#VIP')).find(
      (node) => !drawer.contains(node),
    );
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const field = section.querySelector('input:not([type="hidden"]),button,a[href]');
      field?.focus({ preventScroll: true });
    } else location.assign('/vip/become-a-patient');
  }
  let opening = null;
  function openFromTrigger(source) {
    if (opening) return opening;
    opening = loadDrawer()
      .then((api) => {
        window.dispatchEvent(new CustomEvent('tdb:vip-open-intent', { detail: { source } }));
        api.open();
      })
      .catch(fallbackToForm)
      .finally(() => {
        opening = null;
      });
    return opening;
  }
  function openAfterLoad(event) {
    event.preventDefault();
    event.stopPropagation();
    openFromTrigger(findTrigger(event));
  }
  function onIntentClick(event) {
    if (realDrawerReady() || !findTrigger(event)) return;
    openAfterLoad(event);
  }
  function onIntentKeydown(event) {
    if (realDrawerReady() || (event.key !== 'Enter' && event.key !== ' ') || !findTrigger(event))
      return;
    openAfterLoad(event);
  }
  const loadSafely = () => {
    loadDrawer().catch(() => {});
  };
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
  else if (demand) {
    if (window.TDBRuntimePageState.vipScrollSeed.lastY > 0) loadSafely();
  } else loadSafely();

  window.TDBVIPDrawerLoader = Object.freeze({
    version: '1.4.1',
    load: loadDrawer,
    open: openFromTrigger,
    status: () => ({
      loaded: realDrawerReady(),
      loading: Boolean(loadingPromise) && !realDrawerReady(),
      uiReady: tdbUIIsReady(),
      demand,
    }),
  });
}
