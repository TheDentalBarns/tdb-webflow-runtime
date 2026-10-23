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

function tdbLoadVIPScript(src) {
  const modules = window.TDBModules;
  if (!modules) return Promise.reject(Error('Shared module registry unavailable'));
  return (modules.loadWithRecovery || modules.load)(src, {
    attribute: 'data-tdb-vip-drawer-js',
    ready: () => typeof window.TDBVIPDrawer?.open === 'function',
    timeout: 15000,
  })
    .then(() => window.TDBVIPDrawer)
    .finally(() => {
      document.querySelector('link[data-tdb-vip-preload]')?.remove();
    });
}

function prepareVIPDrawerLoader() {
  const drawer = document.getElementById('tdb-vip-drawer');
  if (!drawer) return;

  const demand = true;
  const triggerSelector =
    '#tdb-vip-drawer .tdb-vip-drawer-handle, a[href*="#vip" i], [href*="#vip" i], [data-vip-open]';
  const jsUrl = window.TDBModules.resolve(new URL('tdb-vip-drawer.js', TDBRuntimeModuleRoot));
  let loadingPromise = null;
  let contentPromise = null;
  let announcementFlight = null;
  let armed = false;
  let preparationWatch;
  const allowed = () => !window.TDBConsent || window.TDBConsent.allows();
  const announcements = () => [...document.querySelectorAll('[data-tdb-announcement]')];
  const announcementReady = () =>
    !announcements().length ||
    announcements().some((node) => node.hasAttribute('data-tdb-announcement-ready'));
  function waitForAnnouncement() {
    if (!allowed()) return Promise.reject(new DOMException('Cancelled', 'AbortError'));
    if (announcementReady()) return Promise.resolve();
    if (announcementFlight) return announcementFlight;
    announcementFlight = new Promise((resolve, reject) => {
      const finish = (error) => {
        clearTimeout(timeout);
        window.removeEventListener('tdb:announcement-state', check);
        error ? reject(error) : resolve();
      };
      const check = () => {
        if (!allowed()) finish(new DOMException('Cancelled', 'AbortError'));
        else if (announcementReady()) finish();
      };
      const timeout = setTimeout(() => finish(Error('Announcement is not ready')), 30000);
      window.addEventListener('tdb:announcement-state', check);
      // Direct VIP activation can start the announcement, but never bypass it.
      Promise.resolve()
        .then(() => window.TDBAnnouncementLoader.load())
        .then((api) => {
          announcements().forEach((node) => api.mount(node));
          check();
        })
        .catch(finish);
    }).finally(() => {
      announcementFlight = null;
    });
    return announcementFlight;
  }
  // Prefer the window scroll offset, including zero, without also asking the
  // root element for layout. Retain the element fallback for older engines.
  const pageY = () => Math.max(window.scrollY ?? document.documentElement.scrollTop ?? 0, 0);
  const scrollSeed = { ...window.TDBRuntimePageState.vipScrollSeed };
  const realDrawerReady = () => Boolean(window.TDBVIPDrawer);

  function cleanup() {
    armed = false;
    preparationWatch?.destroy();
    document.removeEventListener('click', onIntentClick, true);
    document.removeEventListener('keydown', onIntentKeydown, true);
    document.removeEventListener('pointerover', onPrepareIntent, true);
    document.removeEventListener('pointerdown', onPrepareIntent, true);
    document.removeEventListener('focusin', onPrepareIntent, true);
    window.removeEventListener('scroll', onPrepareScroll);
    window.removeEventListener('pageshow', onPageShow);
    window.removeEventListener('hashchange', onHashChange);
    window.removeEventListener('tdb:announcement-state', onAnnouncementState);
  }

  function loadDrawer() {
    if (loadingPromise) return loadingPromise;
    if (realDrawerReady()) return Promise.resolve(window.TDBVIPDrawer);
    loadingPromise = waitForAnnouncement()
      .then(() => {
        if (!allowed()) throw new DOMException('Cancelled', 'AbortError');
        tdbPreloadVIPScript(jsUrl);
        return Promise.all([tdbEnsureUI(), tdbEnsureVIPUI(), tdbEnsureVIPChrome()]);
      })
      .then(() => {
        if (!allowed()) throw new DOMException('Cancelled', 'AbortError');
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
  function prepareContent() {
    if (!drawer.hasAttribute('data-tdb-vip-lazy')) return Promise.resolve();
    if (contentPromise) return contentPromise;
    contentPromise = waitForAnnouncement()
      .then(() => {
        if (!allowed()) throw new DOMException('Cancelled', 'AbortError');
        return Promise.all([
          window.TDBModules.load(new URL('tdb-vip-content.js', TDBRuntimeModuleRoot), {
            ready: () => !!window.TDBVIPContent,
          }),
          window.TDBModules.load(new URL('tdb-vip-content.css', TDBRuntimeModuleRoot), {
            type: 'style',
          }),
          window.TDBFormsLoader.load(),
        ]);
      })
      .then(() => {
        if (!allowed()) throw new DOMException('Cancelled', 'AbortError');
        return window.TDBVIPContent.mount(drawer);
      })
      .catch((error) => {
        contentPromise = null;
        throw error;
      });
    return contentPromise;
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
        return api.open();
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
  function prepareForBanner() {
    if (!allowed() || !announcementReady()) return;
    Promise.all([loadDrawer(), prepareContent()]).catch(() => {});
  }
  function onAnnouncementState(event) {
    preparationWatch?.refresh();
    if (event.detail?.ready && (event.detail.visible || scrollSeed.peek)) prepareForBanner();
  }
  function onPrepareIntent(event) {
    if (findTrigger(event)) prepareForBanner();
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
    // The calling handle is about to appear; arbitrary scrolling is not intent.
    if (scrollSeed.peek) prepareForBanner();
  }
  function onPageShow(event) {
    if (
      announcements().some(
        (node) =>
          node.hasAttribute('data-tdb-announcement-ready') &&
          node.getAttribute('aria-hidden') === 'false',
      ) ||
      scrollSeed.peek
    )
      prepareForBanner();
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
      if (window.TDBFeatureLoading) {
        preparationWatch = window.TDBFeatureLoading.watchIntent({
          selector: triggerSelector,
          enabled: announcementReady,
          prepare: () => Promise.all([loadDrawer(), prepareContent()]),
        });
      } else {
        document.addEventListener('pointerover', onPrepareIntent, true);
        document.addEventListener('pointerdown', onPrepareIntent, true);
        document.addEventListener('focusin', onPrepareIntent, true);
      }
      window.addEventListener('scroll', onPrepareScroll, { passive: true });
      window.addEventListener('pageshow', onPageShow, { passive: true });
      window.addEventListener('hashchange', onHashChange);
      window.addEventListener('tdb:announcement-state', onAnnouncementState);
    }
  }

  arm();
  if (/^#vip/i.test(location.hash || '')) loadSafely();
  else if (demand) {
    onPageShow();
  } else loadSafely();

  window.TDBVIPDrawerLoader = Object.freeze({
    version: '1.6.0',
    load: loadDrawer,
    open: openFromTrigger,
    prepareContent,
    fallback: fallbackToForm,
    status: () => ({
      loaded: realDrawerReady(),
      loading: Boolean(loadingPromise) && !realDrawerReady(),
      uiReady: tdbUIIsReady(),
      demand,
    }),
  });
}
