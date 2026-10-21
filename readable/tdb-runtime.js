/* Captured while the classic script executes; asynchronous features share it. */
const TDBRuntimeModuleRoot = new URL(window.TDBRelease?.base || './', document.currentScript.src);

/* One post-consent policy for in-page proximity and additional-panel intent. */
(() => {
  'use strict';
  if (window.TDBFeatureLoading) return;
  const embedMargin = '700px 0px',
    settledMs = 200,
    retryMs = 5000;
  const watches = new Set(),
    targets = new Map();
  let observer,
    mutations,
    events,
    unsubscribe,
    timer = 0,
    lastScroll = 0;
  const allowed = () => Boolean(window.TDBConsent?.allows()) && !document.hidden;
  const usable = (node) =>
    node.isConnected &&
    // Marquee repeats are aria-hidden for accessibility but remain visible and clickable.
    !node.closest('[hidden],[inert],.w-condition-invisible') &&
    !node.matches(':disabled,[aria-disabled="true"]') &&
    getComputedStyle(node).visibility !== 'hidden';
  function unobserve(watch) {
    for (const [node, owners] of targets) {
      owners.delete(watch);
      if (!owners.size) {
        observer?.unobserve(node);
        targets.delete(node);
      }
    }
    watch.visible.clear();
  }
  function prepare(watch, node) {
    if (
      watch.done ||
      watch.flight ||
      !allowed() ||
      !watch.enabled() ||
      !usable(node) ||
      Date.now() < watch.retryAt
    )
      return;
    watch.flight = Promise.resolve()
      .then(() => {
        if (!watches.has(watch) || !allowed() || !watch.enabled() || !usable(node)) return false;
        return Promise.resolve(watch.prepare(node)).then(() => true);
      })
      .then((prepared) => {
        if (prepared && allowed() && watches.has(watch)) {
          watch.done = true;
          unobserve(watch);
        }
      })
      .catch(() => {
        watch.retryAt = Date.now() + retryMs;
      })
      .finally(() => {
        watch.flight = null;
      });
  }
  function settle() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = 0;
      if (!allowed()) return;
      if (performance.now() - lastScroll < settledMs) {
        settle();
        return;
      }
      for (const watch of watches) {
        const node = [...watch.visible].find(usable);
        if (node) prepare(watch, node);
      }
    }, settledMs);
  }
  function refresh(watch) {
    if (watch.done || !watches.has(watch)) return;
    for (const [node, owners] of targets) {
      if (!node.isConnected) {
        for (const owner of owners) owner.visible.delete(node);
        observer?.unobserve(node);
        targets.delete(node);
      }
    }
    for (const node of watch.root.querySelectorAll(watch.selector)) {
      let owners = targets.get(node);
      if (!owners) {
        owners = new Set();
        targets.set(node, owners);
        observer?.observe(node);
      }
      owners.add(watch);
    }
  }
  function start() {
    if (events) return;
    events = new AbortController();
    if ('IntersectionObserver' in window)
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries)
            for (const watch of targets.get(entry.target) || []) {
              if (entry.isIntersecting) watch.visible.add(entry.target);
              else watch.visible.delete(entry.target);
            }
          settle();
        },
        { rootMargin: '0px', threshold: 0 },
      );
    const intent = (event) => {
      if (event.type === 'pointerover' && event.pointerType === 'touch') return;
      for (const watch of watches) {
        const node = event.target.closest?.(watch.selector);
        if (node && watch.root.contains(node)) prepare(watch, node);
      }
    };
    for (const type of ['pointerover', 'focusin', 'pointerdown'])
      document.addEventListener(type, intent, {
        passive: true,
        capture: true,
        signal: events.signal,
      });
    window.addEventListener(
      'scroll',
      () => {
        lastScroll = performance.now();
        settle();
      },
      { passive: true, signal: events.signal },
    );
    for (const type of ['pageshow', 'online'])
      window.addEventListener(
        type,
        () => {
          for (const watch of watches) {
            watch.retryAt = 0;
            refresh(watch);
          }
          settle();
        },
        { signal: events.signal },
      );
    document.addEventListener('visibilitychange', settle, { signal: events.signal });
    mutations = new MutationObserver((records) => {
      if (
        records.some((record) =>
          [...record.addedNodes, ...record.removedNodes].some((node) => node.nodeType === 1),
        )
      )
        for (const watch of watches) refresh(watch);
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    unsubscribe = window.TDBConsent?.subscribe(() => {
      if (!allowed())
        for (const watch of watches) {
          watch.done = false;
          refresh(watch);
        }
      settle();
    });
  }
  function stop() {
    if (watches.size) return;
    clearTimeout(timer);
    observer?.disconnect();
    mutations?.disconnect();
    events?.abort();
    unsubscribe?.();
    observer = mutations = events = unsubscribe = null;
    targets.clear();
  }
  function watchIntent({ selector, root = document, prepare: work, enabled = () => true, signal }) {
    const watch = {
      selector,
      root,
      prepare: work,
      enabled,
      visible: new Set(),
      done: false,
      flight: null,
      retryAt: 0,
    };
    function destroy() {
      watches.delete(watch);
      unobserve(watch);
      stop();
    }
    if (!signal?.aborted) {
      watches.add(watch);
      start();
      refresh(watch);
      signal?.addEventListener('abort', destroy, { once: true });
    }
    return Object.freeze({ refresh: () => refresh(watch), destroy });
  }
  window.TDBFeatureLoading = Object.freeze({
    version: '1.0.0',
    embedMargin,
    settledMs,
    watchIntent,
  });
})();

/* All first-party feature loaders share the registry shipped with consent. */
function loadScript(src, attribute, recovery = false) {
  return Promise.resolve()
    .then(() => {
      if (!window.TDBModules) throw Error('Shared module registry unavailable');
      const modules = window.TDBModules;
      return (recovery && modules.loadWithRecovery ? modules.loadWithRecovery : modules.load)(src, {
        attribute,
      });
    })
    .then(() => document.querySelector(`script[${attribute}]`));
}
function loadScriptWithRecovery(src, attribute) {
  return loadScript(src, attribute, true);
}

/* Capture interactions only after consent releases runtime, while feature loaders start. */
(() => {
  if (window.TDBRuntimePageState) return;
  const y = Math.max(window.scrollY ?? document.documentElement.scrollTop ?? 0, 0);
  const state = {
    initialY: y,
    hadInteraction: false,
    vipScrollSeed: { lastY: y, up: 0, down: 0, peek: false },
    vipIntent: null,
  };
  window.TDBRuntimePageState = state;
  const events = new AbortController();
  const options = { capture: true, passive: true, signal: events.signal };
  const remember = () => {
    state.hadInteraction = true;
  };
  for (const type of ['pointerdown', 'keydown', 'touchstart'])
    document.addEventListener(type, remember, options);
  window.addEventListener(
    'scroll',
    () => {
      state.hadInteraction = true;
      const seed = state.vipScrollSeed;
      const y = Math.max(window.scrollY ?? document.documentElement.scrollTop ?? 0, 0);
      const delta = y - seed.lastY;
      if (delta > 0) {
        seed.up = 0;
        seed.down += delta;
        if (seed.down > 140) seed.peek = false;
      } else if (delta < 0) {
        seed.down = 0;
        seed.up -= delta;
        if (seed.up > 120 && y > innerHeight * 0.5) seed.peek = true;
      }
      if (y <= innerHeight * 0.5) seed.peek = false;
      seed.lastY = y;
    },
    { passive: true, signal: events.signal },
  );
  function intent(event) {
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    const uspZone = event.target.closest?.('[data-tdb-usp-trigger-zone]');
    const uspTrigger =
      uspZone?.closest('[data-tdb-usp]') && uspZone.querySelector('[data-tdb-usp-launch]');
    if (uspTrigger && !window.TDBUSPDrawerLoader) {
      event.preventDefault();
      event.stopImmediatePropagation();
      prepareUSPDrawerLoader();
      if (!event.repeat) window.TDBUSPDrawerLoader.open(uspTrigger);
      return;
    }
    if (window.TDBVIPDrawerLoader || window.TDBVIPDrawer) return;
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    const target = event.target.closest?.(
      '#tdb-vip-drawer .tdb-vip-drawer-handle,a[href*="#vip" i],[href*="#vip" i],[data-vip-open]',
    );
    if (!target || !document.getElementById('tdb-vip-drawer')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    state.vipIntent = target;
  }
  document.addEventListener('click', intent, { capture: true, signal: events.signal });
  document.addEventListener('keydown', intent, { capture: true, signal: events.signal });
  window.addEventListener(
    'tdb:features-ready',
    () => {
      events.abort();
      const trigger = state.vipIntent;
      state.vipIntent = null;
      if (trigger) window.TDBVIPDrawerLoader?.open(trigger);
    },
    { once: true },
  );
})();

/* Started only by the consent-released runtime. Static Webflow tracks use
 * proximity discovery; refresh() explicitly discovers later DOM additions. */
(() => {
  'use strict';
  if (window.TDBLogoMarqueeLoader) return;
  const base = new URL('./', document.currentScript.src);
  const selector = '.logo-slider .partner-featured_component';
  const observed = new Set(),
    nearby = new Set();
  let schedule,
    proximity,
    lifecycle,
    flight = null;
  let started = false,
    loaded = false,
    failed = false,
    disposed = false;

  function cleanupDiscovery() {
    proximity?.disconnect();
    proximity = null;
    observed.clear();
    nearby.clear();
  }
  function prune() {
    for (const track of observed)
      if (!track.isConnected || !track.matches(selector)) {
        proximity?.unobserve(track);
        observed.delete(track);
        nearby.delete(track);
      }
  }
  function sync() {
    prune();
    if (disposed || !started || loaded || !nearby.size) return Promise.resolve();
    if (flight) return flight;
    failed = false;
    flight = (async () => {
      await schedule(() => {
        if (disposed) return;
        if (!window.TDBModules) throw Error('Shared registry unavailable');
        return Promise.all([
          window.TDBModules.load(new URL('tdb-motion.js', base).href, {
            ready: () =>
              typeof window.TDBMotion?.ddText === 'function' &&
              typeof window.TDBMotion?.duration === 'function' &&
              Boolean(window.TDBMotion?.reduced),
          }),
          window.TDBModules.load(new URL('tdb-swiper-8.4.7.min.js', base).href, {
            ready: () => typeof window.TDBSwiper?.create === 'function',
          }),
        ]);
      });
      if (disposed) return;
      // The module reads motion defaults at registration, so keep this order.
      await schedule(() =>
        disposed
          ? null
          : window.TDBModules.load(new URL('tdb-logo-marquee.min.js', base).href, {
              attribute: 'data-tdb-logo-marquee-js',
              ready: () =>
                typeof window.TDBLogoMarquee?.start === 'function' &&
                typeof window.TDBLogoMarquee?.refresh === 'function',
            }),
      );
      if (disposed) return;
      // Network completion only registers the module. Mount on a later turn.
      await schedule(() => {
        if (disposed) return;
        window.TDBLogoMarquee.start({ schedule });
        loaded = true;
        cleanupDiscovery();
      });
    })()
      .catch((error) => {
        if (!disposed) {
          failed = true;
          console.warn('TDB marquee: retaining static logos.', error);
        }
      })
      .finally(() => {
        flight = null;
      });
    return flight;
  }
  function refresh() {
    if (!started || disposed) return Promise.resolve();
    if (loaded)
      return schedule(() => {
        if (!disposed) return window.TDBLogoMarquee.refresh();
      });
    prune();
    const tracks = document.querySelectorAll(selector);
    if (!tracks.length) {
      cleanupDiscovery();
      return Promise.resolve();
    }
    if (!proximity && 'IntersectionObserver' in window) {
      proximity = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!observed.has(entry.target)) continue;
            if (entry.isIntersecting) nearby.add(entry.target);
            else nearby.delete(entry.target);
          }
          sync();
        },
        { rootMargin: '600px 0px' },
      );
    }
    for (const track of tracks) {
      if (observed.has(track)) continue;
      observed.add(track);
      if (proximity) proximity.observe(track);
      else nearby.add(track);
    }
    if (!lifecycle) {
      lifecycle = new AbortController();
      const { signal } = lifecycle;
      window.addEventListener('pageshow', refresh, { signal });
      window.addEventListener('online', sync, { signal });
      document.addEventListener(
        'visibilitychange',
        () => {
          if (!document.hidden) sync();
        },
        { signal },
      );
    }
    return sync();
  }
  function guard(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('.logo-slider .tdb-partner-logo') && !target.closest('.tdb-partner-source'))
      event.preventDefault();
  }

  function start(options) {
    if (disposed) return;
    if (!started) {
      document.addEventListener('click', guard, true);
      document.addEventListener('auxclick', guard, true);
      schedule = options.schedule;
      started = true;
    }
    return document.querySelector(selector) ? schedule(refresh) : Promise.resolve();
  }
  function destroy() {
    disposed = true;
    lifecycle?.abort();
    cleanupDiscovery();
    document.removeEventListener('click', guard, true);
    document.removeEventListener('auxclick', guard, true);
    window.TDBLogoMarquee?.destroy();
  }
  window.TDBLogoMarqueeLoader = Object.freeze({
    version: '2.0.0',
    start,
    refresh,
    destroy,
    status: () => ({
      started,
      loaded,
      loading: Boolean(flight),
      failed,
      nearby: nearby.size,
      disposed,
    }),
  });
})();

// Both pageshow listeners run in the same dispatch. Reuse that event's snapshot
// after the announcement changes visibility, instead of forcing a second read.
// A new event (including a bfcache restore) always measures the current position.
const TDBPageShowPositions = new WeakMap();
function tdbReadPagePosition(event) {
  if (event && TDBPageShowPositions.has(event)) return TDBPageShowPositions.get(event);
  const root = document.documentElement;
  const position = {
    y: window.scrollY ?? root.scrollTop ?? 0,
    height: innerHeight || root.clientHeight || 0,
  };
  if (event) TDBPageShowPositions.set(event, position);
  return position;
}

/* Shared, demand-only bridge for standalone pages without the consent registry.
 * Bundled into those entry points; it adds no request when TDBModules exists.
 */
(() => {
  'use strict';
  if (window.TDBModuleBootstrap) return;
  let flight;
  const failed = new WeakSet();
  function ensure(base) {
    if (window.TDBModules) return Promise.resolve(window.TDBModules);
    if (flight) return flight;
    flight = new Promise((resolve, reject) => {
      const scripts = [...document.scripts].filter((node) => !failed.has(node));
      // Adopt the foundation already in flight, including its configured pins.
      let node =
        scripts.find((s) => /\/tdb-modules\.js(?:[?#]|$)/.test(s.src)) ||
        scripts.find((s) => /\/tdb-consent\.js(?:[?#]|$)/.test(s.src));
      const fresh = !node;
      node ||= document.createElement('script');
      const cleanup = () => {
        clearTimeout(timer);
        node.removeEventListener('load', done);
        node.removeEventListener('error', fail);
      };
      const done = () => {
        cleanup();
        if (window.TDBModules) resolve(window.TDBModules);
        else
          reject(
            Object.assign(Error('Shared registry loaded without expected export'), {
              code: 'TDB_EXPORT',
            }),
          );
      };
      const fail = () => {
        cleanup();
        failed.add(node);
        if (fresh) node.remove();
        // Only a failed request can be retried. A timeout may still execute.
        flight = null;
        reject(Object.assign(Error('Shared registry unavailable'), { code: 'TDB_NETWORK' }));
      };
      const timer = setTimeout(() => {
        reject(Object.assign(Error('Shared registry timed out'), { code: 'TDB_TIMEOUT' }));
      }, 20000);
      node.addEventListener('load', done, { once: true });
      node.addEventListener('error', fail, { once: true });
      if (fresh) {
        node.src = new URL('tdb-modules.js', base).href;
        node.async = true;
        document.head.append(node);
      } else if (node.dataset.tdbLoaded === 'true') done();
    });
    return flight;
  }
  window.TDBModuleBootstrap = Object.freeze({ ensure });
})();

/* TDB Treatment Calculator loader v1.6.0. URLs are immutable release pins. */
(function () {
  'use strict';
  if (window.__tdbCalculatorLoader) return;
  window.__tdbCalculatorLoader = true;
  const scriptURL = new URL('tdb-calculator.js', document.currentScript.src).href;
  const styleURL = new URL('tdb-calculator.css', document.currentScript.src).href;
  const selector = '[data-tdb-calc-open],a[href$="#treatment-calculator"]';
  let loading = null;
  function load() {
    if (window.TDBCalculator) return Promise.resolve(window.TDBCalculator);
    if (loading) return loading;
    loading = window.TDBModuleBootstrap.ensure(scriptURL)
      .then(async (modules) => {
        // Preserve CSS-before-execution: the controller measures its native UI.
        await modules.load(styleURL, { type: 'style', timeout: 15000 });
        await modules.load(scriptURL, {
          ready: () => typeof window.TDBCalculator?.open === 'function',
          timeout: 15000,
        });
        return window.TDBCalculator;
      })
      .catch((e) => {
        loading = null;
        throw e;
      });
    return loading;
  }
  function start() {
    const mount = document.querySelector('[data-tdb-calculator="inline"]');
    if (mount) {
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting)) {
              observer.disconnect();
              load().catch(() => {
                const p = mount.querySelector('[data-tdb-calc-fallback]');
                if (p)
                  p.textContent =
                    'The calculator could not load. Please refresh, or browse our treatment fees below.';
              });
            }
          },
          { rootMargin: '500px' },
        );
        observer.observe(mount);
      } else load().catch(() => {});
    }
    document.addEventListener(
      'click',
      (e) => {
        const link = e.target.closest?.(selector);
        if (
          !link ||
          window.TDBCalculator ||
          e.defaultPrevented ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey ||
          e.button > 0
        )
          return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (link.getAttribute('aria-busy') === 'true') return;
        link.setAttribute('aria-busy', 'true');
        load()
          .then((api) => api.open(link))
          .catch(() => {
            location.assign(link.href || '/dental-cost-lichfield#treatment-calculator');
          })
          .finally(() => link.removeAttribute('aria-busy'));
      },
      true,
    );
    const warm = () =>
      load()
        .then((api) => api.preload?.())
        .catch(() => {});
    if ('IntersectionObserver' in window) {
      const near = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            near.disconnect();
            warm();
          }
        },
        { rootMargin: '800px' },
      );
      document.querySelectorAll(selector).forEach((el) => near.observe(el));
    }
    document.addEventListener(
      'pointerover',
      (e) => {
        if (e.target.closest?.(selector)) warm();
      },
      { passive: true },
    );
    document.addEventListener('focusin', (e) => {
      if (e.target.closest?.(selector)) warm();
    });
    // Delegation also supports FAQ links inserted after initial page rendering.
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

/* Only shared UI is requested by the head. Feature CSS is requested when its runtime is needed. */
const tdbStyleFlights = new Map();
const tdbStyleIsReady = (property) =>
  getComputedStyle(document.documentElement).getPropertyValue(property).trim() === '1';
const tdbUIIsReady = () => tdbStyleIsReady('--tdb-ui-ready');

function tdbEnsureStylesheet(attribute, filename, property, label) {
  const isReady = () => tdbStyleIsReady(property);
  if (isReady()) return Promise.resolve();
  if (tdbStyleFlights.has(attribute)) return tdbStyleFlights.get(attribute);
  const link =
    document.querySelector(`link[${attribute}]`) ||
    Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find((node) =>
      node.href.split(/[?#]/)[0].endsWith('/dist/' + filename),
    );
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
        ['onload', 'onerror', 'data-tdb-loaded', 'data-tdb-load-failed'].forEach((name) =>
          replacement.removeAttribute(name),
        );
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
      function failed() {
        fail(new Error(`TDB ${label} request failed`));
      }
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
    const shared =
      document.querySelector('link[data-tdb-ui-css]') ||
      Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find((node) =>
        /\/dist\/tdb-ui\.css(?:[?#]|$)/.test(node.href),
      );
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
  return tdbEnsureFeatureCSS(
    'data-tdb-slider-ui-css',
    'tdb-slider-ui.css',
    '--tdb-slider-ui-ready',
    'slider UI',
  );
}
function tdbEnsureAnnouncementUI() {
  return tdbEnsureFeatureCSS(
    'data-tdb-announcement-css',
    'tdb-announcement.css',
    '--tdb-announcement-ui-ready',
    'announcement UI',
  );
}
function tdbEnsureVIPChrome() {
  return tdbEnsureFeatureCSS(
    'data-tdb-vip-chrome-css',
    'tdb-vip-chrome.css',
    '--tdb-vip-chrome-ready',
    'VIP chrome',
  );
}
function tdbEnsureVIPUI() {
  // Native Webflow CSS is already loaded before page scripts. Older markup
  // retains its pinned stylesheet, making this release safe during migration.
  if (document.querySelector('#tdb-vip-drawer[data-tdb-vip-native="1"]')) return Promise.resolve();
  return tdbEnsureFeatureCSS('data-tdb-vip-ui-css', 'tdb-vip.css', '--tdb-vip-ui-ready', 'VIP UI');
}
window.TDBFeatureCSS = Object.freeze({
  ui: tdbEnsureUI,
  carousel: tdbEnsureSliderUI,
  announcement: tdbEnsureAnnouncementUI,
});

/* Lazy native announcement loader. Heavy engines are shared through TDBModules. */
const TDBAnnouncementModuleRoot = TDBRuntimeModuleRoot;
(() => {
  let flight;
  const shared = TDBRuntimeModuleRoot.href;
  function load() {
    if (flight) return flight;
    flight = (async () => {
      const modules = window.TDBModules;
      if (!modules) throw Error('Shared module registry unavailable');
      // Both state sheets must be applied before mount can remove pending.
      await Promise.all([tdbEnsureUI(), tdbEnsureAnnouncementUI()]);
      await modules.load(shared + 'tdb-motion.js', { ready: () => Boolean(window.TDBMotion) });
      await Promise.all([
        modules.load(new URL('tdb-availability.js', TDBAnnouncementModuleRoot), {
          ready: () => Boolean(window.TDBAvailability),
        }),
        modules.load(shared + 'tdb-swiper-8.4.7.min.js', {
          attribute: 'data-swiper-js',
          ready: () => Boolean(window.TDBSwiper?.create),
        }),
        modules.load(shared + 'tdb-ticker.js', { ready: () => Boolean(window.TDBNativeTicker) }),
      ]);
      await modules.load(new URL('tdb-announcement.js', TDBAnnouncementModuleRoot), {
        ready: () => Boolean(window.TDBAnnouncement),
      });
      return window.TDBAnnouncement;
    })().catch((error) => {
      flight = null;
      throw error;
    });
    return flight;
  }
  window.TDBAnnouncementLoader = Object.freeze({ load });
})();

/* Floating banner placement and visibility, released by runtime. */
function prepareFloatingAnnouncement() {
  (() => {
    const root = document.documentElement;
    const shellId = 'tdb-elfsight-timer-shell';
    const mobileQuery = matchMedia('(max-width:767px)');
    const desktopQuery = matchMedia('(min-width:992px)');
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
        const mobileNavbarVisible =
          mobileQuery.matches &&
          navbar &&
          (navbar.classList.contains('z-hold') ||
            (navbar.classList.contains('is-trans') &&
              !(navbar.style.transform || '').includes('-100%')));
        // Match the existing desktop Home CSS so a hidden banner also pauses.
        const desktopNavbarVisible =
          path === '/' &&
          desktopQuery.matches &&
          navbar?.matches('[style*="translateY(0)"],[style*="translateY(0px)"]');
        root.classList.toggle(
          'tdb-timer-hidden',
          scrollTop < viewportHeight * revealViewports ||
            mobileNavbarVisible ||
            desktopNavbarVisible,
        );
      };
      const requestUpdate = () => {
        if (!frame) frame = requestAnimationFrame(() => updateState());
      };
      updateViewportHeight(position.height);
      if (navbar)
        new MutationObserver(requestUpdate).observe(navbar, {
          attributes: true,
          attributeFilter: ['class', 'style'],
        });
      addEventListener('scroll', requestUpdate, { passive: true });
      addEventListener(
        'resize',
        () => {
          updateViewportHeight();
          requestUpdate();
        },
        { passive: true },
      );
      addEventListener(
        'orientationchange',
        () => {
          updateViewportHeight();
          requestUpdate();
        },
        { passive: true },
      );
      mobileQuery.addEventListener
        ? mobileQuery.addEventListener('change', requestUpdate)
        : mobileQuery.addListener(requestUpdate);
      updateState(position.y);
    }

    const startupEvents = ['scroll', 'pointerdown', 'keydown', 'touchstart'];
    let scheduled = false,
      mounted = false,
      attempts = 0;
    function createTimerShell() {
      const shell = document.querySelector('[data-tdb-announcement][data-placement="floating"]');
      if (!shell || mounted || attempts >= 3) return;
      const position = tdbReadPagePosition();
      attempts++;
      // The component remains editable in Footer; body ownership avoids transformed
      // page wrappers changing fixed positioning and keeps the drawer's inert handling.
      if (shell.parentElement !== document.body) document.body.append(shell);
      attachTimerState(shell, position);
      window.TDBAnnouncementLoader.load()
        .then((api) => {
          api.mount(shell);
          mounted = true;
          startupEvents.forEach((type) => removeEventListener(type, scheduleTimerShell));
          removeEventListener('online', onOnline);
          removeEventListener('pageshow', onPageShow);
        })
        .catch(() => {
          scheduled = false;
          console.warn('TDB banner: shared modules unavailable; will retry on interaction.');
        });
    }
    function scheduleTimerShell() {
      if (scheduled || mounted || attempts >= 3) return;
      scheduled = true;
      if ('requestIdleCallback' in window) requestIdleCallback(createTimerShell, { timeout: 1500 });
      else setTimeout(createTimerShell, 200);
    }
    function onOnline() {
      attempts = 0;
      scheduleTimerShell();
    }
    function onPageShow(event) {
      const position = tdbReadPagePosition(event);
      attachTimerState(document.getElementById(shellId), position);
      if (position.y) scheduleTimerShell();
    }
    startupEvents.forEach((type) => addEventListener(type, scheduleTimerShell, { passive: true }));
    addEventListener('online', onOnline);
    addEventListener('pageshow', onPageShow);
    // The releasing consent click / restored scroll may predate this loader.
    if (window.TDBRuntimePageState?.hadInteraction || window.scrollY > 0) scheduleTimerShell();
  })();
}

/* Definition only: the consent-released runtime starts this lightweight owner. */
function prepareReviewWidgetLoader() {
  'use strict';
  if (window.TDBReviewWidgetLoader) return;
  const lifecycle = new AbortController();
  const { signal } = lifecycle;
  let section,
    observer,
    frame = 0,
    flight,
    widget,
    dirty = true,
    disposed = false,
    retryAt = 0;
  const allowed = () =>
    !disposed && Boolean(window.TDBConsent?.allows()) && !window.CookieScript?.instance?.isOpen?.();
  const past = () =>
    Boolean(
      section?.isConnected &&
        section.getClientRects().length &&
        section.getBoundingClientRect().bottom <= 0,
    );
  function load() {
    if (flight || widget || Date.now() < retryAt || !allowed() || !past()) return;
    flight = Promise.all([
      window.TDBModules.load(new URL('tdb-review-widget.css', TDBRuntimeModuleRoot), {
        type: 'style',
        attribute: 'data-tdb-review-widget-css',
        ready: () =>
          getComputedStyle(document.documentElement)
            .getPropertyValue('--tdb-review-widget-ready')
            .trim() === '1',
      }),
      window.TDBModules.load(new URL('tdb-review-widget.js', TDBRuntimeModuleRoot), {
        ready: () => typeof window.TDBReviewWidget?.mount === 'function',
      }),
    ])
      .then(() => {
        if (!allowed()) return;
        widget = window.TDBReviewWidget.mount();
        widget.setVisible(past());
      })
      .catch((error) => {
        retryAt = Date.now() + 3000;
        console.warn('TDB review widget unavailable; will retry on scroll or reconnect.', error);
      })
      .finally(() => {
        flight = null;
      });
    return flight;
  }
  function update() {
    frame = 0;
    if (disposed) return;
    // Scroll only measures the cached boundary. Layout/lifecycle refreshes can
    // discover a new override; a detached boundary is replaced on the next frame.
    if (dirty || (section && !section.isConnected)) {
      dirty = false;
      const next =
        document.querySelector('[data-tdb-review-widget-boundary]') ||
        document.querySelector('[data-tdb-review-introduction]') ||
        document
          .querySelector('[data-wf--hero---headline--variant] .button.is-review')
          ?.closest('[data-wf--hero---headline--variant]');
      if (next !== section) {
        if (section) observer?.unobserve(section);
        section = next;
        if (section) observer?.observe(section);
      }
    }
    if (widget) widget.setVisible(past());
    else load();
  }
  function queue() {
    if (!disposed && !frame && (section || dirty)) frame = requestAnimationFrame(update);
  }
  function refresh() {
    dirty = true;
    queue();
  }
  if ('ResizeObserver' in window) {
    observer = new ResizeObserver(refresh);
    observer.observe(document.body);
  }
  window.addEventListener('scroll', queue, { passive: true, signal });
  for (const type of ['resize', 'pageshow', 'tdb:features-ready'])
    window.addEventListener(type, refresh, { passive: true, signal });
  window.addEventListener(
    'online',
    () => {
      retryAt = 0;
      refresh();
    },
    { signal },
  );
  const unsubscribe = window.TDBConsent?.subscribe(refresh);
  window.TDBReviewWidgetLoader = Object.freeze({
    refresh,
    destroy() {
      disposed = true;
      lifecycle.abort();
      unsubscribe?.();
      observer?.disconnect();
      cancelAnimationFrame(frame);
      widget?.destroy();
    },
  });
  refresh();
}

/* Install the preserved accessibility owner before any VIP open. */
function prepareVIPFocus() {
  /* TDB VIP keyboard/focus layer v1.1.2.
   * Bundled before site-asset-loader in tdb-footer-runtime.min.js. Reads the
   * existing drawer classes without replacing loading or interaction ownership. */
  (() => {
    'use strict';
    const drawer = document.getElementById('tdb-vip-drawer');
    const body = drawer?.querySelector('.tdb-vip-drawer-body');
    const handle = drawer?.querySelector('.tdb-vip-drawer-handle');
    if (!drawer || !body || !handle || drawer.dataset.tdbVipFocusBound === 'true') return;
    drawer.dataset.tdbVipFocusBound = 'true';
    // Programmatic focus from the announcement can retain :focus-visible
    // after a pointer activation. Suppress only the handle's pointer outline;
    // keyboard input immediately restores the site's existing focus styling.
    // Appearance lives in Designer; this layer projects state and measured timing.
    const native = drawer.dataset.tdbVipNative === '1';
    if (!native) {
      const focusStyle = document.createElement('style');
      focusStyle.dataset.tdbVipPointerFocus = 'true';
      focusStyle.textContent =
        '#tdb-vip-drawer .tdb-vip-drawer-handle[data-tdb-vip-pointer-focus]:focus{outline:none!important}';
      document.head.appendChild(focusStyle);
    }
    const arrow = drawer.querySelector('.tdb-vip-arrow-content');
    const pulse = drawer.querySelector('[data-tdb-pulse]');
    const reducedMotion =
      window.TDBMotionPolicy?.reduced ||
      window.TDBMotion?.reduced ||
      matchMedia('(prefers-reduced-motion: reduce)');
    let interacted = false;
    function syncCheckbox(input) {
      const icon = input.closest('.w-checkbox')?.querySelector('.tdb-vip-checkbox');
      icon?.classList.toggle('is-vip-checked', input.checked);
      icon?.classList.toggle('is-vip-focused', document.activeElement === input);
    }
    if (native) {
      const syncCheckboxes = () =>
        drawer.querySelectorAll('input[type="checkbox"]').forEach(syncCheckbox);
      syncCheckboxes();
      // Native form reset and restored pages do not necessarily emit change.
      drawer.addEventListener('reset', () => queueMicrotask(syncCheckboxes));
      window.addEventListener('pageshow', syncCheckboxes);
      ['change', 'focusin', 'focusout'].forEach((type) =>
        drawer.addEventListener(type, (event) => {
          if (event.target.matches('input[type="checkbox"]')) {
            if (type === 'focusout') queueMicrotask(() => syncCheckbox(event.target));
            else syncCheckbox(event.target);
          }
        }),
      );
    }
    const original = new Map(
      ['role', 'aria-modal', 'aria-label', 'tabindex'].map((name) => [
        name,
        drawer.getAttribute(name),
      ]),
    );
    const background = new Map();
    const selector =
      'a[href],area[href],button,input:not([type="hidden"]),select,textarea,iframe,[tabindex],[contenteditable="true"]';
    let active = false;
    let origin = null;
    let latestTrigger = null;
    let restoring = 0;

    const isFocusable = (element) =>
      element instanceof HTMLElement &&
      element.tabIndex >= 0 &&
      !element.matches(':disabled') &&
      !element.closest('[inert],[hidden]') &&
      element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility !== 'hidden';
    const controls = () => Array.from(drawer.querySelectorAll(selector)).filter(isFocusable);
    const nestedConsentOpen = () =>
      window.CookieScript?.instance?.isOpen?.() ??
      Boolean(document.querySelector('#tdb-consent-root.is-consent-active'));
    const focus = (element) => {
      try {
        element?.focus({ preventScroll: true });
      } catch (_) {}
    };
    const preferredFocus = () => (isFocusable(handle) ? handle : controls()[0] || drawer);
    const trigger = (target) =>
      target instanceof Element &&
      target.closest(
        'a[href*="#vip" i],[data-vip-open],[data-vip-target],#tdb-vip-drawer .tdb-vip-drawer-handle',
      );

    function rememberTrigger(event) {
      const candidate = trigger(event.target);
      if (candidate && !drawer.contains(candidate)) latestTrigger = candidate;
    }
    document.addEventListener(
      'pointerdown',
      (event) => {
        handle.setAttribute('data-tdb-vip-pointer-focus', '');
        if (native) handle.classList.add('is-vip-pointer-focus');
        rememberTrigger(event);
      },
      true,
    );
    document.addEventListener('click', rememberTrigger, true);
    window.addEventListener('tdb:vip-open-intent', (event) => {
      const source = event.detail?.source;
      if (source instanceof HTMLElement && !drawer.contains(source)) latestTrigger = source;
    });
    document.addEventListener(
      'keydown',
      (event) => {
        if (!event.metaKey && !event.altKey && !event.ctrlKey) {
          handle.removeAttribute('data-tdb-vip-pointer-focus');
          handle.classList.remove('is-vip-pointer-focus');
        }
        if (event.key === 'Enter' || event.key === ' ') rememberTrigger(event);
      },
      true,
    );

    function lockBackground() {
      for (let node = drawer; node && node !== document.body; node = node.parentElement) {
        const parent = node.parentElement;
        if (!parent) break;
        for (const sibling of parent.children) {
          // Cookie settings is a separate, higher dialog with its own focus trap.
          if (
            sibling === node ||
            sibling.id === 'tdb-consent-root' ||
            ['SCRIPT', 'STYLE', 'LINK'].includes(sibling.tagName)
          )
            continue;
          if (!background.has(sibling)) background.set(sibling, sibling.hasAttribute('inert'));
          sibling.setAttribute('inert', '');
        }
      }
    }
    function unlockBackground() {
      for (const [node, wasInert] of background) if (!wasInert) node.removeAttribute('inert');
      background.clear();
    }
    function restoreAttributes() {
      for (const [name, value] of original) {
        if (value === null) drawer.removeAttribute(name);
        else drawer.setAttribute(name, value);
      }
    }
    function endModal() {
      active = false;
      unlockBackground();
      restoreAttributes();
      const candidate = origin;
      origin = null;
      latestTrigger = null;
      cancelAnimationFrame(restoring);
      restoring = requestAnimationFrame(() => {
        restoring = 0;
        if (active || nestedConsentOpen()) return;
        if (candidate?.isConnected && !drawer.contains(candidate) && isFocusable(candidate))
          focus(candidate);
        else {
          const fallback = Array.from(
            document.querySelectorAll('a[href*="#vip" i],[data-vip-open],[data-vip-target]'),
          ).find((node) => !drawer.contains(node) && isFocusable(node));
          focus(fallback);
        }
      });
    }
    function sync() {
      const open = drawer.classList.contains('is-open');
      const closing = drawer.classList.contains('is-closing');
      const peek = drawer.classList.contains('is-peeking');
      if (native) {
        body.classList.toggle('is-vip-open', open);
        arrow?.classList.toggle('is-vip-open', open);
        arrow?.classList.toggle('is-vip-closing', closing);
        // Webflow drops variable transition-delay values from published CSS.
        // Keep the measured delay here; native styles still own the rotation.
        arrow?.style.setProperty(
          'transition-delay',
          open ? 'var(--tdb-vip-drawer-duration,500ms)' : '0ms',
        );
        if (open) interacted = true;
        // The shared UI pulse invites the first open, then stays quiet for this visit.
        pulse?.setAttribute(
          'data-tdb-pulse',
          String(peek && !interacted && !reducedMotion.matches),
        );
      }
      const modal = open || (active && closing);
      if (modal) {
        drawer.removeAttribute('inert');
        drawer.removeAttribute('aria-hidden');
        body.removeAttribute('inert');
        body.removeAttribute('aria-hidden');
        if (!active) {
          cancelAnimationFrame(restoring);
          restoring = 0;
          const focused = document.activeElement;
          origin = latestTrigger?.isConnected
            ? latestTrigger
            : focused instanceof HTMLElement && !drawer.contains(focused)
              ? focused
              : null;
          active = true;
          drawer.setAttribute('role', 'dialog');
          drawer.setAttribute('aria-modal', 'true');
          drawer.setAttribute('aria-label', 'VIP waitlist');
          drawer.setAttribute('tabindex', '-1');
          lockBackground();
          if (!nestedConsentOpen()) focus(preferredFocus());
        }
      } else {
        if (active) endModal();
        body.setAttribute('inert', '');
        body.setAttribute('aria-hidden', 'true');
        if (peek) {
          drawer.removeAttribute('inert');
          drawer.removeAttribute('aria-hidden');
        } else {
          drawer.setAttribute('inert', '');
          drawer.setAttribute('aria-hidden', 'true');
        }
      }
    }
    document.addEventListener(
      'keydown',
      (event) => {
        if (!active || nestedConsentOpen() || event.key !== 'Tab') return;
        const available = controls();
        if (!available.length) {
          event.preventDefault();
          focus(drawer);
          return;
        }
        const index = available.indexOf(document.activeElement);
        if (event.shiftKey && index <= 0) {
          event.preventDefault();
          focus(available.at(-1));
        } else if (!event.shiftKey && (index < 0 || index === available.length - 1)) {
          event.preventDefault();
          focus(available[0]);
        }
        // Escape remains wholly owned by TDBVIPDrawer.
      },
      true,
    );
    document.addEventListener(
      'focusin',
      (event) => {
        if (!active || nestedConsentOpen() || drawer.contains(event.target)) return;
        focus(preferredFocus());
      },
      true,
    );
    document.addEventListener('CookieScriptCurrentState', () => {
      if (active && !nestedConsentOpen() && !drawer.contains(document.activeElement))
        focus(preferredFocus());
    });
    new MutationObserver(sync).observe(drawer, { attributes: true, attributeFilter: ['class'] });
    reducedMotion.addEventListener('change', sync);
    sync();
  })();
}

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
      document.addEventListener('pointerover', onPrepareIntent, true);
      document.addEventListener('pointerdown', onPrepareIntent, true);
      document.addEventListener('focusin', onPrepareIntent, true);
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
    version: '1.5.0',
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

/* Hosted feature modules share the release pin; loading stays in the footer runtime. */
const TDB_MODULE_ROOT = TDBRuntimeModuleRoot.href;
const TDBFooterModuleRoot = new URL(TDBRuntimeModuleRoot.href);
function tdbEnsureSliderFocus() {
  return Promise.all([tdbEnsureUI(), tdbEnsureSliderUI()]).then(() =>
    window.TDBModules.load(new URL('tdb-slider-focus.js', TDBFooterModuleRoot), {
      attribute: 'data-tdb-slider-focus-js',
      ready: () => Boolean(window.TDBSliderFocus),
    }),
  );
}

function prepareTooltipLoader() {
  function start() {
    const icons = [...document.querySelectorAll('.tooltip2_element-wrapper')];
    if (!icons.length) return;
    const parents = [...new Set(icons.map((icon) => icon.parentElement))];
    let flight = null,
      loaded = false,
      observer;
    function cleanup() {
      observer?.disconnect();
      parents.forEach((parent) =>
        ['pointerover', 'focusin', 'pointerdown', 'keydown'].forEach((type) =>
          parent.removeEventListener(type, demand, true),
        ),
      );
    }
    function demand() {
      if (loaded || flight) return;
      flight = loadScriptWithRecovery(TDB_MODULE_ROOT + 'tdb-tooltips.js', 'data-tdb-tooltips-js')
        .then(() => {
          if (!window.TDBTooltips) throw new Error('Tooltip module did not initialise');
          window.TDBTooltips.refresh();
          loaded = true;
          cleanup();
        })
        .catch(() => {
          flight = null;
          console.error('TDB Tooltips failed to load');
        });
    }
    parents.forEach((parent) =>
      ['pointerover', 'focusin', 'pointerdown', 'keydown'].forEach((type) =>
        parent.addEventListener(type, demand, { capture: true, passive: true }),
      ),
    );
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) demand();
        },
        { rootMargin: '600px 0px' },
      );
      parents.forEach((parent) => observer.observe(parent));
    }
    // With no viewport observer, actual pointer/keyboard intent remains available.
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

function prepareSliderFocusLoader() {
  function start() {
    const selector = '.highlight-swiper_component,.parallax-swiper_component,.swiper,.w-slider';
    const sliders = [...document.querySelectorAll(selector)].filter(
      (slider) => !slider.closest('.logo-slider'),
    );
    if (!sliders.length || window.TDBSliderFocus) return;
    let flight = null,
      loaded = false,
      observer,
      seed = null;
    const types = [
      'pointerover',
      'focusin',
      'pointerdown',
      'pointermove',
      'pointerup',
      'pointercancel',
      'click',
      'keydown',
    ];
    const snapshot = (event) => ({
      target: event.target,
      button: event.button,
      isPrimary: event.isPrimary,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      key: event.key,
    });
    function cleanup() {
      observer?.disconnect();
      types.forEach((type) => document.removeEventListener(type, onIntent, true));
    }
    function demand() {
      if (loaded || flight) return;
      if (window.TDBSliderFocus) {
        loaded = true;
        cleanup();
        seed = null;
        return;
      }
      flight = tdbEnsureSliderFocus()
        .then(() => {
          if (!window.TDBSliderFocus) throw new Error('Slider focus module did not initialise');
          loaded = true;
          cleanup();
          window.TDBSliderFocus.resume(seed);
          seed = null;
        })
        .catch(() => {
          flight = null;
          console.error('TDB Slider Focus failed to load');
        });
    }
    function onIntent(event) {
      const target = event.target;
      const slider = target.closest?.('.logo-slider') ? null : target.closest?.(selector);
      if (event.type === 'pointerdown') {
        seed = slider ? { down: snapshot(event), y: window.scrollY } : null;
      } else if (event.type === 'pointermove') {
        if (seed?.down && !seed.end && seed.down.pointerId === event.pointerId)
          seed.move = snapshot(event);
        return;
      } else if (event.type === 'pointerup' || event.type === 'pointercancel') {
        if (seed?.down?.pointerId === event.pointerId) seed.end = snapshot(event);
        return;
      } else if (slider && (event.type === 'click' || event.type === 'keydown')) {
        // Store focus intent only. Slide commands always run on the original event.
        if (event.type === 'click') {
          seed = seed || { y: window.scrollY };
          seed.click = snapshot(event);
        } else seed = { key: snapshot(event), y: window.scrollY };
      }
      if (slider) demand();
    }
    types.forEach((type) =>
      document.addEventListener(type, onIntent, { capture: true, passive: true }),
    );
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) demand();
        },
        { rootMargin: '100px 0px' },
      );
      // Custom motion sliders already preload through the 800px motion loader.
      // This observer is only for native/standalone sliders needing focus alone.
      sliders
        .filter(
          (slider) => !slider.closest('.highlight-swiper_component,.parallax-swiper_component'),
        )
        .forEach((slider) => observer.observe(slider));
    }
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

/* Existing 800px dependency loader; runtime owns release and scheduling. */
function prepareSliderLoader() {
  const selector = '.highlight-swiper_component, .parallax-swiper_component';
  const files = { parallax: 'tdb-parallax.js', gallery: 'tdb-gallery.js' };
  const flights = new Map(),
    ready = new Set(),
    observed = new WeakSet();
  let proximityObserver = null;
  const kindOf = (root) => (root.matches('.parallax-swiper_component') ? 'parallax' : 'gallery');
  const pluginOf = (kind) => (kind === 'parallax' ? window.TDBParallaxPlugin : window.TDBGallery);

  function loadKind(kind) {
    if (flights.has(kind)) return flights.get(kind);
    const flight = Promise.all([
      tdbEnsureUI(),
      tdbEnsureSliderUI(),
      tdbEnsureSliderFocus(),
      ...(kind === 'parallax'
        ? [
            window.TDBModules.load(new URL('tdb-rendered-progress.js', TDBRuntimeModuleRoot), {
              ready: () => Boolean(window.TDBRenderedProgress),
            }),
          ]
        : []),
      window.TDBModules.load(new URL('tdb-motion.js', TDBFooterModuleRoot)),
      window.TDBModules.load(new URL('tdb-swiper-8.4.7.min.js', TDBFooterModuleRoot), {
        attribute: 'data-swiper-js',
        ready: () =>
          typeof window.Swiper === 'function' && typeof window.TDBSwiper?.create === 'function',
      }),
    ])
      .then(() =>
        window.TDBModules.load(new URL(files[kind], TDBFooterModuleRoot), {
          attribute: 'data-tdb-' + kind + '-js',
          ready: () => Boolean(pluginOf(kind)),
        }),
      )
      .then(() => {
        const plugin = pluginOf(kind);
        if (!plugin) throw Error('Carousel plugin did not initialise: ' + kind);
        ready.add(kind);
        return window.TDBRuntime.schedule(() => {
          plugin.refresh();
          return plugin;
        });
      })
      .catch((error) => {
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
      if (component)
        return loadKind(kindOf(component)).then((plugin) => {
          plugin.refresh(component);
          return plugin;
        });
    }
    const kinds = new Set(
      [...document.querySelectorAll(selector)]
        .filter((node) => !node.closest('.logo-slider'))
        .map(kindOf),
    );
    return Promise.all([...kinds].map(loadKind));
  }
  const loadSafely = (root) => {
    loadSliders(root)
      .then(() => proximityObserver?.unobserve(root))
      .catch(() => {});
  };
  function onIntent(event) {
    const target = event.target;
    if (target instanceof Element && !target.closest('.logo-slider')) {
      const root = target.closest(selector);
      if (root) loadSafely(root);
    }
  }
  // Hold an arrow action only after runtime is released, while its module arrives.
  const queuedArrows = new WeakSet();
  function onArrowIntent(event) {
    if (
      window.TDBParallaxPlugin ||
      (event.type === 'keydown' && !['Enter', ' '].includes(event.key))
    )
      return;
    if (event.button > 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return;
    const arrow = event.target.closest?.('.swiper-btn-prev,.swiper-btn-next');
    const root = arrow?.closest('.parallax-swiper_component');
    if (!root || arrow.matches(':disabled,[aria-disabled="true"],.swiper-button-disabled')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (queuedArrows.has(root)) return;
    queuedArrows.add(root);
    root.setAttribute('aria-busy', 'true');
    loadKind('parallax')
      .then((plugin) => {
        if (!root.isConnected || !arrow.isConnected) return;
        plugin.refresh(root);
        window.TDBSwiper.mount('parallax', root);
        root.removeAttribute('aria-busy');
        arrow.click();
      })
      .catch(() => {})
      .finally(() => {
        queuedArrows.delete(root);
        root.removeAttribute('aria-busy');
      });
  }
  document.addEventListener('click', onArrowIntent, true);
  document.addEventListener('keydown', onArrowIntent, true);
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
  if ('IntersectionObserver' in window)
    proximityObserver = new IntersectionObserver(
      (entries) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry) => loadSafely(entry.target));
      },
      { rootMargin: '800px 0px' },
    );
  document.addEventListener('pointerdown', onIntent, true);
  document.addEventListener('keydown', onIntent, true);
  function start() {
    discover();
    new MutationObserver((mutations) => {
      mutations.forEach((mutation) =>
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) discover(node);
        }),
      );
      if (mutations.some((mutation) => mutation.removedNodes.length)) window.TDBSwiper?.prune();
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  window.TDBSliderLoader = Object.freeze({
    version: '1.0.0',
    load: loadSliders,
    status: () => ({
      loaded: ready.size > 0,
      loading: flights.size > ready.size,
      plugins: [...ready],
      swiperAvailable: typeof window.Swiper === 'function',
    }),
  });
  // Older embeds can keep their public calls; implementation lives in plugins.
  window.TDBSliders ||= Object.freeze({
    version: '1.0.0',
    refresh: () => loadSliders(),
    activate: (root) => window.TDBSwiper?.mount('parallax', root),
  });
  window.dispatchEvent(new Event('tdb:slider-loader-ready'));
}

function prepareCarouselStyles() {
  const seen = new WeakSet();
  let observer,
    changes,
    ready = false;
  function prepare() {
    if (ready) return;
    tdbEnsureSliderUI()
      .then(() => {
        ready = true;
        observer?.disconnect();
        changes?.disconnect();
        ['pointerover', 'focusin', 'pointerdown', 'keydown'].forEach((type) =>
          document.removeEventListener(type, intent, true),
        );
      })
      .catch(() => {});
  }
  function intent(event) {
    if (event.target.closest?.('.carousel-arrow')) prepare();
  }
  function scan(root = document) {
    const arrows = [
      ...(root.matches?.('.carousel-arrow') ? [root] : []),
      ...root.querySelectorAll('.carousel-arrow'),
    ];
    for (const arrow of arrows) {
      if (seen.has(arrow)) continue;
      seen.add(arrow);
      if (observer) observer.observe(arrow);
      else prepare();
    }
  }
  if ('IntersectionObserver' in window)
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) prepare();
      },
      { rootMargin: '800px 0px' },
    );
  ['pointerover', 'focusin', 'pointerdown', 'keydown'].forEach((type) =>
    document.addEventListener(type, intent, { capture: true, passive: true }),
  );
  scan();
  changes = new MutationObserver((records) => {
    for (const record of records)
      for (const node of record.addedNodes) {
        if (node instanceof Element) scan(node);
      }
  });
  changes.observe(document.body, { childList: true, subtree: true });
}

/* Optional smooth scrolling and its anchor compatibility live together. */
function initLenis() {
  if (document.documentElement.classList.contains('w-editor')) return;
  if (!window.Lenis || window.lenis) return;
  window.lenis = new Lenis({ autoRaf: true, smoothWheel: true, syncTouch: false });
}

function triggerAfterLoadIdle(callback) {
  function run() {
    if ('requestIdleCallback' in window)
      requestIdleCallback(() => requestAnimationFrame(callback), { timeout: 2000 });
    else setTimeout(() => requestAnimationFrame(callback), 300);
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
  if (!matchMedia('(min-width:768px) and (hover:hover) and (pointer:fine)').matches) return;
  loadScript(new URL('tdb-lenis.min.js', TDBRuntimeModuleRoot).href, 'data-lenis-js')
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
function prepareSmoothScroll() {
  /* Let Webflow's native home section link settle during Lenis wheel inertia. */
  (() => {
    'use strict';
    document.addEventListener(
      'click',
      (event) => {
        if (
          event.defaultPrevented ||
          event.button > 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        const link = event.target.closest?.('a[href="#All-treatments"]');
        if (!link || !document.getElementById('All-treatments')) return;
        // Lenis ignores native scroll events while its smooth animation is active.
        // Stop that old wheel trajectory before Webflow performs its anchor scroll.
        // Webflow continues to own the destination, focus, history and link behavior.
        if (window.lenis?.isScrolling === 'smooth') window.lenis.reset();
      },
      true,
    );
  })();

  startLenisForSession();
}

function updateNativeFooterDates() {
  const updated = new Date(document.lastModified);
  if (!Number.isFinite(updated.getTime())) return;
  const date = [
    String(updated.getDate()).padStart(2, '0'),
    String(updated.getMonth() + 1).padStart(2, '0'),
    updated.getFullYear(),
  ].join('/');
  document.querySelectorAll('[data-tdb-last-updated]').forEach((node) => {
    if (node.textContent !== date) node.textContent = date;
  });
}

/* TDB shared carousel arrow feedback v1.1.0.
 * Installed once by the consent-released runtime. Native controls own styling and
 * carousel modules retain navigation. Match Services' last-clicked state.
 */
function prepareCarouselArrowFeedback() {
  'use strict';
  if (window.TDBCarouselArrowFeedback) return;
  function selectArrow(arrow) {
    if (
      !arrow ||
      arrow.closest('[inert]') ||
      arrow.matches(
        ':disabled,[aria-disabled="true"],.is-disabled,.swiper-button-disabled,.swiper-button-lock',
      )
    )
      return;
    // Every native/legacy pair shares one immediate controls wrapper.
    // Stay inside it: selection in one carousel must not clear another's.
    for (const sibling of arrow.parentElement?.children || []) {
      if (sibling.matches('.carousel-arrow'))
        sibling.classList.toggle('is-selected', sibling === arrow);
    }
  }
  function clearPair(arrow) {
    for (const sibling of arrow?.parentElement?.children || []) {
      if (sibling.matches('.carousel-arrow')) sibling.classList.remove('is-selected');
    }
  }
  window.TDBCarouselArrowFeedback = Object.freeze({
    version: '1.1.0',
    select: selectArrow,
    clear: clearPair,
  });
  function select(event) {
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    if (event.button > 0) return;
    selectArrow(event.target.closest?.('.carousel-arrow'));
  }
  document.addEventListener('click', select, true);
  // Swiper's div-based buttons handle Enter/Space without dispatching click.
  // Change presentation only; their existing handler still advances the slide.
  document.addEventListener('keydown', select, true);
}

/* Forms start after either consent choice, then proximity or explicit intent.
 * One request owns VIP behaviour and shared validation; Webflow owns transport. */
function prepareFormsLoader() {
  if (window.TDBFormsLoader) return;
  const formSelector = 'form';
  const vipIntent = '#tdb-vip-drawer .tdb-vip-drawer-handle, [href*="#vip" i], [data-vip-open]';
  const observed = new WeakSet(),
    edited = new WeakSet(),
    pending = new WeakSet();
  let flight = null,
    loaded = false,
    proximityObserver,
    discoveryObserver,
    drawerObserver;
  let calculatorInterest = null;
  const src = new URL('tdb-vip-form.js', TDBRuntimeModuleRoot).href;

  function cleanup() {
    proximityObserver?.disconnect();
    discoveryObserver?.disconnect();
    drawerObserver?.disconnect();
    for (const type of ['focusin', 'pointerdown', 'keydown'])
      document.removeEventListener(type, onIntent, true);
    for (const type of ['input', 'change']) document.removeEventListener(type, rememberInput, true);
    document.removeEventListener('submit', onSubmit, true);
    window.removeEventListener('tdb:vip-open-intent', loadSafely);
  }
  function loadForms() {
    if (flight) return flight;
    flight = window.TDBModules.load(src, {
      attribute: 'data-tdb-vip-form',
      ready: () => !!window.TDBVIPForm && !!window.TDBForms,
      timeout: 15000,
    })
      .then(() => {
        window.TDBForms.refresh();
        window.TDBVIPForm.refresh();
        if (calculatorInterest !== null) {
          window.TDBVIPInterest.fromCalculator(calculatorInterest);
          calculatorInterest = null;
        }
        loaded = true;
        cleanup();
        return window.TDBForms;
      })
      .catch((error) => {
        flight = null;
        throw error;
      });
    return flight;
  }
  function loadSafely() {
    loadForms().catch((error) => console.warn('TDB form preparation unavailable.', error));
  }
  function rememberInput(event) {
    if (event.target.matches?.('select') && event.target.closest(formSelector))
      edited.add(event.target);
  }
  function onIntent(event) {
    if (event.target.closest?.(formSelector + ',' + vipIntent)) loadSafely();
  }
  function showFailure(form) {
    let message = form.querySelector('[data-tdb-form-load-error]');
    if (!message) {
      message = document.createElement('p');
      message.setAttribute('data-tdb-form-load-error', '');
      message.setAttribute('role', 'alert');
      form.append(message);
    }
    message.textContent = 'We could not prepare your enquiry. Please try again.';
  }
  function onSubmit(event) {
    const form = event.target;
    if (loaded || event.defaultPrevented || !(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (pending.has(form)) return;
    pending.add(form);
    const submitter = event.submitter;
    const oldBusy = form.getAttribute('aria-busy');
    form.setAttribute('aria-busy', 'true');
    form.querySelector('[data-tdb-form-load-error]')?.remove();
    loadForms()
      .then(() => {
        if (!form.isConnected) return;
        // requestSubmit preserves native validation, submitter values and Webflow.
        // Never use form.submit(), which bypasses those owners.
        if (submitter?.isConnected && submitter.form === form && !submitter.disabled)
          form.requestSubmit(submitter);
        else form.requestSubmit();
      })
      .catch(() => showFailure(form))
      .finally(() => {
        pending.delete(form);
        if (oldBusy === null) form.removeAttribute('aria-busy');
        else form.setAttribute('aria-busy', oldBusy);
      });
  }
  function observeForm(form) {
    if (!(form instanceof HTMLFormElement) || observed.has(form)) return;
    observed.add(form);
    // A hidden drawer is prepared by its opener, not its page position.
    if (form.closest('#tdb-vip-drawer')) return;
    if (proximityObserver) proximityObserver.observe(form);
    else loadSafely();
  }
  function discover(root = document) {
    if (root instanceof HTMLFormElement) observeForm(root);
    root.querySelectorAll?.(formSelector).forEach(observeForm);
  }
  window.TDBFormsLoader = Object.freeze({
    version: '1.0.0',
    load: loadForms,
    wasEdited: (select) => edited.has(select),
    status: () => ({ loaded, loading: !!flight && !loaded }),
  });
  // Calculator intent must survive the interval before the form bundle arrives.
  if (!window.TDBVIPInterest)
    window.TDBVIPInterest = Object.freeze({
      fromCalculator(value) {
        calculatorInterest = value;
        loadSafely();
      },
    });
  if ('IntersectionObserver' in window)
    proximityObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadSafely();
      },
      { rootMargin: '600px 0px' },
    );
  for (const type of ['focusin', 'pointerdown', 'keydown'])
    document.addEventListener(type, onIntent, true);
  for (const type of ['input', 'change']) document.addEventListener(type, rememberInput, true);
  document.addEventListener('submit', onSubmit, true);
  window.addEventListener('tdb:vip-open-intent', loadSafely);
  function start() {
    if (loaded) return;
    discover();
    discoveryObserver = new MutationObserver((records) =>
      records.forEach((record) =>
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) discover(node);
        }),
      ),
    );
    discoveryObserver.observe(document.body, { childList: true, subtree: true });
    const drawer = document.getElementById('tdb-vip-drawer');
    if (drawer) {
      const prepareOpenDrawer = () => {
        if (drawer.classList.contains('is-open')) loadSafely();
      };
      drawerObserver = new MutationObserver(prepareOpenDrawer);
      drawerObserver.observe(drawer, { attributes: true, attributeFilter: ['class'] });
      prepareOpenDrawer();
    }
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

/* Consent releases this loader; the attribution module still owns storage permission. */
function prepareAttributionLoader() {
  if (window.TDBAttribution || document.querySelector('script[data-tdb-attribution-js]')) return;
  window.TDBModules.load(new URL('tdb-attribution.min.js', TDBRuntimeModuleRoot), {
    attribute: 'data-tdb-attribution-js',
    ready: () => Boolean(window.TDBAttribution),
  }).catch((error) => console.warn('TDB attribution unavailable.', error));
}

/* Brevo website tracking. Registered by the deferred runtime; targeting is mandatory. */
function prepareBrevoConsent() {
  'use strict';
  if (window.TDBBrevoConsent || !window.TDBConsent?.subscribe) return;
  const consent = window.TDBConsent;
  const src = 'https://cdn.brevo.com/js/sdk-loader.js';
  const permitted = () => consent.allows('targeting');
  let state = 'blocked',
    attempts = 0,
    flight = null,
    retry = 0;
  let started = false,
    initialised = false,
    reloadRequested = false;

  function clearCookies() {
    const host = location.hostname;
    const root = ['thedentalbarns.co.uk', 'thedentalbarns.com'].find(
      (domain) => host === domain || host.endsWith('.' + domain),
    );
    const domains = new Set(['', host, ...(root ? [root] : [])]);
    for (const domain of domains)
      document.cookie =
        'sib_cuid=; Max-Age=0; Path=/; SameSite=Lax' + (domain ? '; Domain=' + domain : '');
  }
  function sync() {
    if (permitted()) {
      if (!reloadRequested) start();
      return;
    }
    clearTimeout(retry);
    retry = 0;
    if (consent.currentState().decided || started) clearCookies();
    if (!started) {
      state = 'blocked';
      return;
    }
    // The SDK has no verified shutdown contract. Never claim that a requested
    // reload already stopped it: navigation can be cancelled by beforeunload.
    state = 'reload-required';
    if (!reloadRequested) {
      reloadRequested = true;
      window.location.reload();
    }
  }
  function start() {
    if (started || flight || retry || attempts >= 2 || reloadRequested || !permitted()) return;
    if (
      document.querySelector('script[data-tdb-brevo-js],script#sendinblue-js') ||
      [...document.scripts].some((node) => node.src === src) ||
      (Array.isArray(window.Brevo) &&
        window.Brevo.some((item) => Array.isArray(item) && item[0] === 'init'))
    ) {
      started = true;
      state = 'existing';
      return;
    }
    started = true;
    state = 'loading';
    attempts++;
    flight = (async () => {
      try {
        await window.TDBModules.load(src, { attribute: 'data-tdb-brevo-js' });
        if (!permitted() || reloadRequested) {
          sync();
          return;
        }
        // The bootstrap supports init after load. Recheck permission here so
        // a revoked request cannot enqueue tracking while navigation is pending.
        initialised = true;
        state = 'initialising';
        window.Brevo ||= [];
        window.Brevo.push(['init', { client_key: 'hpwhoa9n2kbqn118b9von9ae' }]);
        window.Brevo.push(() => {
          if (permitted() && !reloadRequested) state = 'ready';
          else sync();
        });
        document.getElementById('sendinblue-js')?.addEventListener(
          'error',
          () => {
            if (!reloadRequested) state = 'error';
          },
          { once: true },
        );
      } catch (error) {
        if (reloadRequested) return;
        state = 'error';
        // The shared registry removes a failed owned tag. Timeouts can still
        // execute late, so only an explicit network error permits a retry.
        if (/^Dependency unavailable:/.test(error.message)) {
          started = false;
          if (attempts < 2 && permitted())
            retry = setTimeout(() => {
              retry = 0;
              sync();
            }, 1000);
        }
        console.warn('TDB Brevo tracker unavailable.', error);
      }
    })().finally(() => {
      flight = null;
    });
  }
  window.TDBBrevoConsent = Object.freeze({
    version: '2.0.0',
    status: () => ({
      state,
      consent: permitted(),
      attempts,
      initialised,
      reloadRequired: reloadRequested,
    }),
  });
  consent.subscribe(sync);
  // The native consent adapter rereads the cookie, including changes made in
  // another tab. Lifecycle checks reuse that adapter rather than parsing again.
  window.addEventListener('pageshow', sync);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') sync();
  });
}

/* Definition-only. Runtime owns startup; the drawer owns content and motion. */
function prepareUSPDrawerLoader() {
  'use strict';
  if (window.TDBUSPDrawerLoader) return;
  const selector = '[data-tdb-usp]',
    zoneSelector = '[data-tdb-usp-trigger-zone]';
  const url = new URL('tdb-usp-drawer.js', TDBRuntimeModuleRoot);
  const seen = new WeakSet(),
    pending = new WeakSet(),
    labels = new WeakMap();
  const events = new AbortController();
  let flight = null,
    prefetchFailed = false,
    disposed = false;
  const proximity =
    !window.TDBFeatureLoading && 'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries)
              if (entry.isIntersecting) {
                proximity.unobserve(entry.target);
                warm();
              }
          },
          { rootMargin: '500px' },
        )
      : null;

  function refresh(root = document) {
    if (disposed) return;
    const sections = [
      ...(root.matches?.(selector) ? [root] : []),
      ...root.querySelectorAll(selector),
    ];
    for (const section of sections) {
      if (seen.has(section)) continue;
      seen.add(section);
      section.querySelectorAll('[data-tdb-usp-launch]').forEach((trigger) => {
        trigger.setAttribute('role', 'button');
        trigger.setAttribute('aria-disabled', 'false');
        trigger.tabIndex = 0;
      });
      // Older runtimes retain their proximity fallback; shared intent owns warming now.
      if (!section.hasAttribute('data-tdb-usp-lazy')) proximity?.observe(section);
    }
    window.TDBUSPDrawer?.refresh?.();
  }
  function load() {
    if (disposed) return Promise.reject(Error('Practice highlights loader disposed'));
    if (window.TDBConsent && !window.TDBConsent.allows())
      return Promise.reject(new DOMException('Cancelled', 'AbortError'));
    if (flight) return flight;
    flight = Promise.resolve()
      .then(() => {
        if (!window.TDBModules?.load) throw Error('Shared module registry unavailable');
        return window.TDBModules.load(url, { ready: () => Boolean(window.TDBUSPDrawer?.refresh) });
      })
      .then(() => {
        if (disposed || (window.TDBConsent && !window.TDBConsent.allows()))
          throw new DOMException('Cancelled', 'AbortError');
        window.TDBUSPDrawer.refresh();
        proximity?.disconnect();
        return window.TDBUSPDrawer;
      })
      .finally(() => {
        flight = null;
      });
    return flight;
  }
  function warm() {
    if (!prefetchFailed && !disposed)
      load().catch(() => {
        prefetchFailed = true;
      });
  }
  async function open(trigger) {
    if (disposed || !trigger?.isConnected || pending.has(trigger)) return;
    pending.add(trigger);
    if (!labels.has(trigger)) labels.set(trigger, trigger.getAttribute('aria-label'));
    const label = labels.get(trigger);
    if (label == null) trigger.removeAttribute('aria-label');
    else trigger.setAttribute('aria-label', label);
    let ready = false;
    try {
      if (!window.TDBModules?.withBusy) throw Error('Shared module registry unavailable');
      await window.TDBModules.withBusy(
        trigger,
        async () => {
          await load();
          ready = true;
        },
        {
          signal: events.signal,
          onError(error) {
            throw error;
          },
        },
      );
      // Replay only after the download busy state clears. The adapter owns
      // selection, content loading, focus, spinner and the actual opening.
      if (ready && !disposed && trigger.isConnected) trigger.click();
    } catch (error) {
      const text =
        trigger.closest(zoneSelector)?.querySelector('[data-tdb-usp-label]')?.textContent.trim() ||
        'Practice highlights';
      trigger.setAttribute('aria-label', 'Unable to load. Try again: ' + text);
      console.warn('Practice highlights could not load', error);
    } finally {
      pending.delete(trigger);
    }
  }
  function target(event) {
    const zone = event.target.closest?.(zoneSelector);
    return zone?.closest(selector) ? zone.querySelector('[data-tdb-usp-launch]') : null;
  }
  function activate(event) {
    if (event.defaultPrevented || (event.type === 'keydown' && !['Enter', ' '].includes(event.key)))
      return;
    const trigger = target(event);
    if (!trigger || window.TDBUSPDrawer?.has?.(trigger.closest(selector))) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!event.repeat) open(trigger);
  }
  for (const type of ['click', 'keydown'])
    document.addEventListener(type, activate, { capture: true, signal: events.signal });
  window.TDBFeatureLoading?.watchIntent({
    selector: '[data-tdb-usp] [data-tdb-usp-trigger-zone]',
    signal: events.signal,
    prepare: (zone) => load().then((api) => api.prepare(zone.closest(selector))),
  });
  for (const type of window.TDBFeatureLoading ? [] : ['pointerover', 'focusin', 'pointerdown'])
    document.addEventListener(
      type,
      (event) => {
        const trigger = target(event);
        if (trigger && !window.TDBUSPDrawer?.has?.(trigger.closest(selector))) warm();
      },
      { passive: true, signal: events.signal },
    );
  window.TDBUSPDrawerLoader = Object.freeze({
    version: '2.0.0',
    load,
    open,
    refresh,
    destroy() {
      disposed = true;
      events.abort();
      proximity?.disconnect();
    },
  });
  refresh();
}

/* Definition-only. Consent releases the launcher; activation fetches the controller. */
function prepareFiveSensesLauncher() {
  'use strict';
  if (window.TDBFiveSensesLauncher) return;
  const selector = '[data-tdb-senses-open]',
    lifecycle = new AbortController();
  let flight,
    disposed = false;
  function load() {
    if (!flight)
      flight = window.TDBModules.load(new URL('tdb-five-senses-loader.js', TDBRuntimeModuleRoot), {
        ready: () => typeof window.TDBFiveSensesEntry?.open === 'function',
      }).catch((error) => {
        flight = null;
        throw error;
      });
    return flight;
  }
  async function open(trigger) {
    if (disposed || trigger?.getAttribute('aria-busy') === 'true') return;
    try {
      let ready = false;
      await window.TDBModules.withBusy(
        trigger,
        async () => {
          await load();
          ready = true;
        },
        {
          signal: lifecycle.signal,
          onError(error) {
            throw error;
          },
        },
      );
      if (ready && !disposed && trigger.isConnected) window.TDBFiveSensesEntry.open(trigger);
    } catch (error) {
      if (!disposed) console.warn('TDB Five Senses: please try opening again.', error);
    }
  }
  function activate(event) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    const trigger = event.target.closest?.(selector);
    if (!trigger || trigger.matches(':disabled,[aria-disabled="true"]')) return;
    if (event.type === 'click' && event.button !== 0) return;
    if (trigger.matches('a[download],a[target]:not([target="_self"])')) return;
    if (event.type === 'keydown') {
      if (
        !['Enter', ' '].includes(event.key) ||
        trigger.tagName === 'BUTTON' ||
        (event.key === 'Enter' && trigger.matches('a[href]'))
      )
        return;
      event.preventDefault();
      if (event.repeat) return;
    } else event.preventDefault();
    open(trigger);
  }
  function refresh(root = document) {
    for (const trigger of [
      ...(root.matches?.(selector) ? [root] : []),
      ...root.querySelectorAll(selector),
    ]) {
      trigger.setAttribute('aria-haspopup', 'dialog');
      if (!trigger.matches('button,a[href]')) {
        trigger.setAttribute('role', 'button');
        if (!trigger.hasAttribute('tabindex')) trigger.tabIndex = 0;
      }
    }
  }
  document.addEventListener('click', activate, { capture: true, signal: lifecycle.signal });
  document.addEventListener('keydown', activate, { signal: lifecycle.signal });
  window.TDBFiveSensesLauncher = Object.freeze({
    version: '1.0.0',
    open,
    refresh,
    destroy() {
      disposed = true;
      lifecycle.abort();
      window.TDBFiveSensesEntry?.destroy();
    },
  });
  refresh();
  // Existing shared URLs now arrive at the dedicated introduction.
  const url = new URL(location.href);
  if (url.pathname === '/' && url.searchParams.get('five-senses') === '1') {
    url.pathname = '/five-senses-experience';
    url.searchParams.delete('five-senses');
    location.replace(url.href);
  }
}

/* Prime only the controller near the cards. Audio stays behind a deliberate hold. */
function prepareHoldAudioLoader() {
  'use strict';
  const buttons = [...document.querySelectorAll('[data-tdb-hold-audio]')];
  if (window.TDBHoldAudioLoader || !buttons.length) return;
  const lifecycle = new AbortController(),
    options = { signal: lifecycle.signal };
  let flight,
    observer,
    held,
    context,
    disposed = false;
  function load() {
    if (!flight) {
      flight = window.TDBModules.load(new URL('tdb-hold-audio.js', TDBRuntimeModuleRoot).href, {
        ready: () => typeof window.TDBHoldAudio?.press === 'function',
      })
        .then(() => {
          observer?.disconnect();
        })
        .catch((error) => {
          flight = null;
          throw error;
        });
    }
    return flight;
  }
  function release(immediate = false) {
    const session = held;
    held = null;
    window.TDBHoldAudio?.release(immediate);
    if (!session) return;
    session.button.setAttribute('aria-pressed', 'false');
    session.button.removeAttribute('aria-busy');
    if (session.pointer != null && session.button.hasPointerCapture?.(session.pointer))
      session.button.releasePointerCapture(session.pointer);
  }
  function press(button, input) {
    if (disposed || held?.button === button || button.disabled) return;
    release();
    const session = { button, ...input };
    held = session;
    button.setAttribute('aria-pressed', 'true');
    button.setAttribute('aria-busy', 'true');
    if (session.pointer != null) {
      try {
        button.setPointerCapture(session.pointer);
      } catch (_) {}
    }
    try {
      // Unlock synchronously even when a cold module download is still pending.
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context ||= new AudioContext();
      Promise.all([context.resume(), load()])
        .then(() => {
          if (!disposed && held === session && button.isConnected && !document.hidden)
            window.TDBHoldAudio.press(button, input, context);
        })
        .catch(() => {
          if (held !== session) return;
          release();
          button.title = 'Sound unavailable. Hold to try again.';
        });
    } catch (_) {
      release();
    }
  }
  for (const button of buttons) {
    button.addEventListener(
      'pointerdown',
      (event) => {
        if (event.button === 0 && event.isPrimary !== false)
          press(button, { pointer: event.pointerId });
      },
      options,
    );
    button.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') return release();
        if (![' ', 'Enter'].includes(event.key)) return;
        event.preventDefault();
        if (!event.repeat) press(button, { key: event.key });
      },
      options,
    );
    button.addEventListener(
      'keyup',
      (event) => {
        if (held?.button === button && held.key === event.key) {
          event.preventDefault();
          release();
        }
      },
      options,
    );
    button.addEventListener(
      'blur',
      () => {
        if (held?.button === button) release();
      },
      options,
    );
    button.addEventListener(
      'lostpointercapture',
      (event) => {
        if (held?.button === button && held.pointer === event.pointerId) release();
      },
      options,
    );
    for (const type of ['click', 'contextmenu'])
      button.addEventListener(type, (event) => event.preventDefault(), options);
    button.addEventListener('focus', () => load().catch(() => {}), options);
  }
  for (const type of ['pointerup', 'pointercancel'])
    window.addEventListener(
      type,
      (event) => {
        if (held && held.pointer === event.pointerId) release();
      },
      options,
    );
  window.addEventListener('blur', () => release(), options);
  window.addEventListener('pagehide', () => release(true), options);
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) release();
    },
    options,
  );
  if (window.IntersectionObserver) {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) load().catch(() => {});
      },
      { rootMargin: '600px 0px' },
    );
    buttons.forEach((button) => observer.observe(button.closest('[data-tdb-audio-card]')));
  } else load().catch(() => {});
  window.TDBHoldAudioLoader = Object.freeze({
    destroy() {
      release(true);
      disposed = true;
      lifecycle.abort();
      observer?.disconnect();
      window.TDBHoldAudio?.destroy();
      if (context && context.state !== 'closed') context.close().catch(() => {});
    },
  });
}

/* Definition-only. Load the review feature after the shared cookie decision. */
function prepareReviewFeatureLoader() {
  'use strict';
  if (window.TDBReviewFeatureLoader) return;
  const components =
    '[data-tdb-review-introduction],[data-tdb-review-cards],[data-tdb-review-quotes],[data-tdb-review-placeholder]';
  const triggers = '[data-tdb-review-trigger],[data-tdb-quote-action],[data-tdb-cards-open]';
  const lifecycle = new AbortController();
  let flight,
    disposed = false,
    unsubscribe;
  function allowed() {
    return !disposed && Boolean(window.TDBConsent?.allows());
  }
  async function load() {
    if (!allowed()) throw new DOMException('Cancelled', 'AbortError');
    if (window.TDBReviewLoader) return window.TDBReviewLoader;
    if (!flight)
      flight = window.TDBModules.load(new URL('tdb-reviews-loader.js', TDBRuntimeModuleRoot), {
        ready: () => typeof window.TDBReviewLoader?.open === 'function',
      })
        .then(() => {
          if (!allowed()) {
            if (disposed) window.TDBReviewLoader?.destroy?.();
            throw new DOMException('Cancelled', 'AbortError');
          }
          return window.TDBReviewLoader;
        })
        .finally(() => {
          flight = null;
        });
    return flight;
  }
  function refresh() {
    if (!allowed()) return;
    if (window.TDBReviewLoader) {
      window.TDBReviewLoader.refresh();
      return;
    }
    // The standalone archive has a separate controller.
    if (!document.querySelector(components + ',' + triggers)) return;
    load().catch((error) => {
      if (error.name !== 'AbortError') console.warn('TDB review feature unavailable.', error);
    });
  }
  function activate(event) {
    if (window.TDBReviewLoader || !allowed() || event.defaultPrevented) return;
    const trigger = event.target.closest?.(triggers);
    if (!trigger) return;
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey ||
      (event.type === 'click' && event.button !== 0) ||
      trigger.matches('a[download],a[target]:not([target="_self"])')
    )
      return;
    if (
      event.type === 'keydown' &&
      (trigger.matches('button') || (event.key === 'Enter' && trigger.matches('a[href]')))
    )
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (
      event.repeat ||
      trigger.matches(':disabled,[aria-disabled="true"]') ||
      trigger.getAttribute('aria-busy') === 'true'
    )
      return;
    const reviewId =
      trigger.closest('[data-review-id]')?.dataset.reviewId ||
      trigger
        .closest(components)
        ?.querySelector('[data-tdb-review-id]')
        ?.getAttribute('data-tdb-review-id') ||
      '';
    window.TDBModules.withBusy(
      trigger,
      async () => {
        const feature = await load();
        if (!disposed && trigger.isConnected)
          await feature.open({ trigger, reviewId, signal: lifecycle.signal });
      },
      {
        signal: lifecycle.signal,
        onError(error) {
          const status = trigger.closest(components)?.querySelector('[data-tdb-review-status]');
          if (status) status.textContent = 'The reviews could not load. Please try again.';
          else console.warn('TDB reviews: please try opening again.', error);
        },
      },
    );
  }
  for (const type of ['click', 'keydown'])
    document.addEventListener(type, activate, { capture: true, signal: lifecycle.signal });
  for (const type of ['online', 'pageshow'])
    window.addEventListener(type, refresh, { signal: lifecycle.signal });
  window.TDBReviewFeatureLoader = Object.freeze({
    version: '1.0.0',
    load,
    refresh,
    destroy() {
      disposed = true;
      lifecycle.abort();
      unsubscribe?.();
      window.TDBReviewLoader?.destroy?.();
    },
  });
  unsubscribe = window.TDBConsent?.subscribe(refresh);
  if (!unsubscribe) refresh();
}

/* Proximity releases shared SVG artwork; Designer owns appearance and dimensions. */
function prepareLazyIconMasks() {
  'use strict';
  if (window.TDBLazyIconMasks) return;
  const base = 'https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/';
  const assets = {
    ig: '6ac8c5438b7e68a92fade1e2_tdb-icon-instagram.svg',
    smile: '6ac8f795d857a42b8d46b54c_tdb-exceptional-diamond.svg',
    review: '6ac7b973bb15c9b9f29a8d18_tdb-review-quote.svg',
    star: '6ac7b973280ebf1329ec59f0_tdb-review-star.svg',
    google: '6ac7b972653444187f404ca8_tdb-review-google.svg',
    facebook: '6ac7b973ba7906fe700055be_tdb-review-facebook.svg',
    yell: '6ac7b973ba7906fe700055e8_tdb-review-yell.svg',
    doctify: '6ac7b973dd39bbf3927772e6_tdb-review-doctify.svg',
  };
  const seen = new WeakSet(),
    pending = new Set();
  let disposed = false;
  const allowed = () => !disposed && Boolean(window.TDBConsent?.allows());
  function reveal(node) {
    if (!node.isConnected) return;
    if (node.hasAttribute('data-tdb-lazy-platform') || node.matches('.tdb-quotes_source')) {
      // A hydrated quote owns its CMS platform. Never overwrite it with the
      // authored Google fallback, even if hydration wins the proximity race.
      if (
        node.dataset.reviewPlatform ||
        node.style.backgroundImage ||
        node.childElementCount ||
        node.textContent.trim()
      )
        return;
      const platform = node.dataset.tdbLazyPlatform || 'google';
      const file = Object.hasOwn(assets, platform) && assets[platform];
      if (!file) return;
      if (node.tagName === 'IMG') {
        if (!node.hasAttribute('src')) node.src = base + file;
      } else node.style.backgroundImage = 'url("' + base + file + '")';
      return;
    }
    const kind = node.dataset.tdbNativeHolderIcon || node.dataset.tdbLazyMask || 'star';
    const file = assets[{ instagram: 'ig', reviews: 'review' }[kind] || kind];
    if (!file) return;
    node.style.maskImage = 'url("' + base + file + '")';
    node.style.webkitMaskImage = node.style.maskImage;
  }
  const observer =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            if (disposed) return;
            for (const entry of entries)
              if (entry.isIntersecting) {
                pending.add(entry.target);
                observer.unobserve(entry.target);
              }
            refresh();
          },
          { rootMargin: '400px' },
        )
      : null;
  function refresh() {
    if (!allowed()) return;
    document
      .querySelectorAll(
        '[data-tdb-native-holder-icon],[data-tdb-lazy-mask],[data-tdb-lazy-platform],.tdb-quotes_source,.tdb-review-summary-star-direct,.tdb-quote-decoration-stars,.tdb-quote-star-asset',
      )
      .forEach((node) => {
        if (seen.has(node)) return;
        seen.add(node);
        if (observer) observer.observe(node);
        else pending.add(node);
      });
    for (const node of pending) reveal(node);
    pending.clear();
  }
  const unsubscribe = window.TDBConsent?.subscribe(refresh);
  window.TDBLazyIconMasks = Object.freeze({
    refresh,
    destroy() {
      disposed = true;
      observer?.disconnect();
      pending.clear();
      unsubscribe?.();
    },
  });
  if (!unsubscribe) refresh();
}

/* Definition-only. Native CMS Instagram enhancement follows the shared decision. */
function prepareInstagramFeatureLoader() {
  'use strict';
  if (window.TDBInstagramFeatureLoader) return;
  // Historical pages with an explicitly owned native build keep that controller.
  if (document.querySelector('script[data-tdb-instagram-native][src]')) return;
  const lifecycle = new AbortController();
  let flight,
    deferredFlight,
    disposed = false,
    unsubscribe;
  const near = new Set(),
    observed = new WeakSet();
  const proximity =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                near.add(entry.target);
                proximity.unobserve(entry.target);
              }
            });
            refresh();
          },
          { rootMargin: window.TDBFeatureLoading?.embedMargin || '700px 0px' },
        )
      : null;
  const allowed = () => !disposed && Boolean(window.TDBConsent?.allows());
  function deferred() {
    document.querySelectorAll('[data-tdb-ig-placeholder]').forEach((holder) => {
      if (observed.has(holder)) return;
      observed.add(holder);
      if (proximity) proximity.observe(holder);
      else near.add(holder);
    });
    for (const holder of near) if (!holder.isConnected) near.delete(holder);
    if (!near.size || deferredFlight) return;
    for (const holder of near)
      if (holder.getAttribute('data-ig-state') !== 'ready')
        holder.setAttribute('aria-busy', 'true');
    deferredFlight = Promise.resolve()
      .then(() => {
        if (!allowed()) {
          for (const holder of near) holder.removeAttribute('aria-busy');
          return;
        }
        return window.TDBModules.load(new URL('tdb-instagram-deferred.js', TDBRuntimeModuleRoot), {
          ready: () => Boolean(window.TDBInstagramDeferred),
          attribute: 'data-tdb-instagram-deferred',
        });
      })
      .then(() => {
        if (disposed) window.TDBInstagramDeferred?.destroy();
        else if (allowed())
          return Promise.all(
            [...near].map((holder) => window.TDBInstagramDeferred?.prepare(holder)),
          );
      })
      .catch((error) => {
        if (!disposed) console.warn('TDB Instagram: retaining the holding image.', error);
      })
      .finally(() => {
        for (const holder of near) holder.removeAttribute('aria-busy');
        deferredFlight = null;
      });
    return deferredFlight;
  }
  function refresh() {
    if (!allowed()) return;
    deferred();
    if (window.TDBInstagramNative) {
      window.TDBInstagramNative.refresh();
      return;
    }
    if (flight || !document.querySelector('[data-tdb-ig-native]')) return;
    flight = Promise.resolve()
      .then(() => {
        if (!allowed()) return;
        return window.TDBModules.load(
          new URL('tdb-instagram-native.min.js', TDBRuntimeModuleRoot),
          {
            ready: () => Boolean(window.TDBInstagramNative),
            attribute: 'data-tdb-instagram-feature',
          },
        );
      })
      .then(() => {
        if (disposed) window.TDBInstagramNative?.destroy?.();
        else if (allowed()) window.TDBInstagramNative?.refresh();
      })
      .catch((error) => {
        if (!disposed) console.warn('TDB Instagram: retaining native posts.', error);
      })
      .finally(() => {
        flight = null;
      });
    return flight;
  }
  window.TDBInstagramFeatureLoader = Object.freeze({
    version: '1.1.0',
    refresh,
    destroy() {
      if (disposed) return;
      disposed = true;
      lifecycle.abort();
      proximity?.disconnect();
      near.clear();
      unsubscribe?.();
      window.TDBInstagramDeferred?.destroy();
      window.TDBInstagramNative?.destroy?.();
    },
  });
  for (const event of ['online', 'pageshow'])
    window.addEventListener(event, refresh, { signal: lifecycle.signal });
  for (const event of ['pointerover', 'focusin'])
    document.addEventListener(
      event,
      (e) => {
        if (e.target.closest?.('[data-tdb-ig-placeholder][data-ig-state="error"]')) refresh();
      },
      { passive: true, signal: lifecycle.signal },
    );
  unsubscribe = window.TDBConsent?.subscribe(refresh);
  if (!unsubscribe) refresh();
}

/* The Home Smile feed is released by the same consent and proximity policy as IG. */
function prepareSmileFeatureLoader() {
  'use strict';
  if (window.TDBSmileFeatureLoader) return;
  const near = new Set(),
    seen = new WeakSet(),
    lifecycle = new AbortController();
  let flight,
    disposed = false;
  const allowed = () => !disposed && Boolean(window.TDBConsent?.allows());
  const observer =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries)
              if (entry.isIntersecting) {
                near.add(entry.target);
                observer.unobserve(entry.target);
              }
            refresh();
          },
          { rootMargin: window.TDBFeatureLoading?.embedMargin || '700px 0px' },
        )
      : null;
  function refresh() {
    if (!allowed()) {
      for (const holder of near) holder.removeAttribute('aria-busy');
      return;
    }
    document.querySelectorAll('[data-tdb-smile-placeholder]').forEach((holder) => {
      if (seen.has(holder)) return;
      seen.add(holder);
      if (observer) observer.observe(holder);
      else near.add(holder);
    });
    for (const holder of near) if (!holder.isConnected) near.delete(holder);
    if (!near.size || flight) return;
    for (const holder of near)
      if (holder.getAttribute('data-smile-state') !== 'ready')
        holder.setAttribute('aria-busy', 'true');
    flight = window.TDBModules.load(new URL('tdb-smile-feed.js', TDBRuntimeModuleRoot), {
      ready: () => Boolean(window.TDBSmileFeed),
      attribute: 'data-tdb-smile-feed-js',
    })
      .then(() => {
        if (disposed) window.TDBSmileFeed?.destroy();
        else if (allowed())
          return Promise.all([...near].map((holder) => window.TDBSmileFeed.prepare(holder)));
      })
      .catch(() => {
        if (!disposed) console.warn('TDB Smiles: retaining the holding image.');
      })
      .finally(() => {
        for (const holder of near) holder.removeAttribute('aria-busy');
        flight = null;
      });
    return flight;
  }
  const unsubscribe = window.TDBConsent?.subscribe(refresh);
  for (const type of ['online', 'pageshow'])
    window.addEventListener(type, refresh, { signal: lifecycle.signal });
  for (const type of ['pointerover', 'focusin'])
    document.addEventListener(
      type,
      (event) => {
        if (event.target.closest?.('[data-tdb-smile-placeholder][data-smile-state="error"]'))
          refresh();
      },
      { passive: true, signal: lifecycle.signal },
    );
  window.TDBSmileFeatureLoader = Object.freeze({
    refresh,
    destroy() {
      disposed = true;
      observer?.disconnect();
      unsubscribe?.();
      lifecycle.abort();
      near.clear();
      window.TDBSmileFeed?.destroy();
    },
  });
  if (!unsubscribe) refresh();
}

/* Definition-only: the consent-released runtime starts this loader. */
function preparePageBreakLoader() {
  'use strict';
  if (window.TDBPageBreaks) return;
  const selector = '[data-tdb-page-break]';
  const pending = new Set(),
    mounted = new Set(),
    owners = [];
  const home = document.querySelector('[data-tdb-home-photo-parallax]');
  const photos = new WeakMap();
  let observer,
    flight,
    disposed = false,
    retrying = false,
    retryAt = 0;

  function eligible(node) {
    if (node.wrapper) return node.wrapper.isConnected && node.wrapper.querySelector(node.selector);
    return (
      node.isConnected &&
      node.matches(selector) &&
      (node.getAttribute('data-tdb-parallax-mode') === 'opacity' ||
        node.querySelector('[data-tdb-page-break-image],img'))
    );
  }
  function discover() {
    document.querySelectorAll(selector).forEach((node) => {
      if (!mounted.has(node) && eligible(node)) pending.add(node);
    });
    // Explicit Home photo surfaces; never select every img (logos, UI and the
    // Smile, Review and Instagram feeds have their own presentation owners).
    if (home) {
      const add = (wrapper, selector, frame, allowEdges = false) => {
        if (!wrapper) return;
        let photo = photos.get(wrapper);
        if (!photo) {
          // The trio's zoom reports its changing bounds. Keep the carousels,
          // sticky backgrounds and overflowing candle on their full read path.
          photo = {
            wrapper,
            selector,
            frame,
            allowEdges,
            offscreen: wrapper.hasAttribute('data-tdb-audio-card'),
          };
          photos.set(wrapper, photo);
        }
        if (!mounted.has(photo) && eligible(photo)) pending.add(photo);
      };
      add(
        home.querySelector('.section_hero-vimeo'),
        '.hero-vimeo_background-video-wrapper .vimeo-bg.hero',
        '.hero-vimeo_background-video-wrapper',
      );
      add(home.querySelector('.tdb-service-parallax .swiper'), '.showcase_image');
      home
        .querySelectorAll('.section_3-image-layout .aspect-ratio-portrait')
        .forEach((frame) => add(frame, 'img'));
      add(
        home.querySelector('.layout355_component'),
        '.vimeo-bg.is-ambient',
        '.layout355_background-video-wrapper',
      );
      add(
        home.querySelector('.section_header111'),
        '.header111_background-image',
        '.header111_background-image-wrapper',
      );
      add(home.querySelector('[data-tdb-treatment] .swiper'), '.tdb-treatment-image');
      const candle = home.querySelector('.exceptional_image-candle');
      add(candle?.parentElement, '.exceptional_image-candle', null, true);
    }
  }
  function stopRetry() {
    retrying = false;
    window.removeEventListener('online', retry);
    window.removeEventListener('pointerdown', retry);
  }
  function retry(event) {
    if (event.type === 'online' || Date.now() >= retryAt) mount();
  }
  function keepStatic() {
    for (const node of pending) {
      if (node.wrapper) continue;
      if (!(parseFloat(node.getAttribute('data-tdb-parallax-reveal-in')) > 0)) continue;
      const image = node.querySelector('[data-tdb-page-break-image]') || node.querySelector('img');
      if (image) image.style.opacity = '1';
    }
  }
  function mount() {
    if (disposed) return Promise.resolve();
    if (flight) return flight;
    for (const node of pending) if (!eligible(node)) pending.delete(node);
    if (!pending.size) {
      stopRetry();
      return Promise.resolve();
    }
    observer?.disconnect();
    flight = (async () => {
      if (!window.TDBModules) throw Error('Page breaks require the shared module registry');
      await window.TDBModules.load(new URL('tdb-motion.js', TDBRuntimeModuleRoot).href, {
        ready: () => typeof window.TDBMotion?.pageBreaks === 'function',
      });
      if (disposed) return;
      const nodes = [...pending].filter(eligible);
      if (nodes.length) {
        const owner = window.TDBMotion.pageBreaks(nodes);
        owners.push(owner);
        nodes.forEach((node) => {
          mounted.add(node);
          pending.delete(node);
        });
      }
      pending.clear();
      stopRetry();
    })()
      .catch((error) => {
        if (disposed) return;
        keepStatic();
        retryAt = Date.now() + 5000;
        if (!retrying) {
          retrying = true;
          window.addEventListener('online', retry);
          window.addEventListener('pointerdown', retry, { passive: true });
        }
        console.warn('TDB page breaks: keeping native static images.', error);
      })
      .finally(() => {
        flight = null;
      });
    return flight;
  }
  function refresh() {
    if (disposed) return Promise.resolve();
    discover();
    owners.forEach((owner) => owner.refresh());
    return mount();
  }
  function destroy() {
    if (disposed) return;
    disposed = true;
    observer?.disconnect();
    stopRetry();
    window.removeEventListener('pageshow', onPageShow);
    owners.forEach((owner) => owner.destroy());
    owners.length = 0;
    pending.clear();
    mounted.clear();
  }
  function onPageShow(event) {
    // Motion owners already restore themselves from BFCache.
    if (event.persisted && retrying) mount();
  }
  window.TDBPageBreaks = Object.freeze({
    version: '2.0.0',
    refresh,
    destroy,
    status: () => owners.flatMap((owner) => owner.status()),
  });
  discover();
  if (!pending.size) return;
  window.addEventListener('pageshow', onPageShow);
  if (typeof window.IntersectionObserver === 'function') {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) mount();
      },
      { rootMargin: '600px 0px' },
    );
    pending.forEach((node) => observer.observe(node.wrapper || node));
  } else mount();
}

/* Definition-only: consent-released runtime starts each loader in its own turn. */
const TDBFeatureStartup = (() => {
  let flight;
  const done = new Set();
  const steps = [
    prepareLazyIconMasks,
    prepareBrevoConsent,
    prepareUSPDrawerLoader,
    preparePageBreakLoader,
    prepareFiveSensesLauncher,
    prepareHoldAudioLoader,
    prepareReviewFeatureLoader,
    prepareReviewWidgetLoader,
    prepareInstagramFeatureLoader,
    prepareSmileFeatureLoader,
    prepareAttributionLoader,
    prepareFormsLoader,
    prepareCarouselArrowFeedback,
    prepareVIPFocus,
    prepareVIPDrawerLoader,
    prepareFloatingAnnouncement,
    prepareSliderLoader,
    prepareCarouselStyles,
    prepareTooltipLoader,
    prepareSliderFocusLoader,
    prepareSmoothScroll,
    updateNativeFooterDates,
  ];
  function start(schedule, active = () => true) {
    if (flight) return flight;
    let incomplete = false;
    flight = (async () => {
      const failures = [];
      for (const step of steps) {
        if (!active()) {
          incomplete = true;
          return;
        }
        if (done.has(step)) continue;
        await schedule(() => {
          if (!active()) {
            incomplete = true;
            return;
          }
          try {
            step();
            done.add(step);
          } catch (error) {
            incomplete = true;
            failures.push({ feature: step.name, error });
            console.warn('[TDB runtime] Feature initialization failed:', step.name, error);
          }
        });
      }
      if (!active()) {
        incomplete = true;
        return;
      }
      // Healthy features can settle captured input even if a sibling failed.
      // Failed steps remain retryable; completed owners never initialise twice.
      window.dispatchEvent(new CustomEvent('tdb:features-ready', { detail: { failures } }));
      return { failures };
    })()
      .catch((error) => {
        incomplete = true;
        throw error;
      })
      .finally(() => {
        if (incomplete) flight = null;
      });
    return flight;
  }
  return Object.freeze({ start });
})();

/* TDB runtime v1.4.1. Consent hands off once; feature loaders follow in idle turns.
 * Component-owned fades retain their existing gates and shared motion owner.
 */
(() => {
  'use strict';
  if (window.TDBRuntime) return;
  const base = new URL('./', document.currentScript.src);
  const selector = '[data-tdb-dd-page],.tdbc-dd-fade';
  const mounted = new Map(),
    cancellations = new Set();
  const lifecycle = new AbortController(),
    { signal } = lifecycle;
  let pending = null,
    observer,
    disposed = false,
    dirty = false,
    started = false,
    retryNeeded = false;
  let navbarFlight = null,
    navbarRequested = false,
    navbarRetry = false,
    controlsReady = false;

  // A bounded initial-render heuristic, not a claim that the final LCP is known.
  // Wait for load + a short quiet period; never hold background work indefinitely.
  function initialRender() {
    return new Promise((resolve) => {
      const gate = new AbortController();
      let quietTimer,
        limitTimer,
        paintObserver,
        finished = false;
      function finish() {
        if (finished) return;
        finished = true;
        clearTimeout(quietTimer);
        clearTimeout(limitTimer);
        paintObserver?.disconnect();
        gate.abort();
        cancellations.delete(finish);
        resolve(!disposed);
      }
      function quiet() {
        clearTimeout(quietTimer);
        if (document.readyState === 'complete') quietTimer = setTimeout(finish, 150);
      }
      cancellations.add(finish);
      window.addEventListener('load', quiet, { once: true, signal: gate.signal });
      // On an active visit, let the idle queue proceed instead of extending the gate.
      for (const event of ['pointerdown', 'keydown'])
        window.addEventListener(event, finish, { once: true, passive: true, signal: gate.signal });
      try {
        if (window.PerformanceObserver?.supportedEntryTypes?.includes('largest-contentful-paint')) {
          paintObserver = new PerformanceObserver(quiet);
          paintObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        }
      } catch (_) {
        paintObserver?.disconnect();
      }
      limitTimer = setTimeout(finish, 1500);
      quiet();
    });
  }

  function background(work) {
    return new Promise((resolve, reject) => {
      if (disposed) {
        resolve(null);
        return;
      }
      const idle =
        typeof window.requestIdleCallback === 'function' &&
        typeof window.cancelIdleCallback === 'function';
      let handle;
      function cancel() {
        if (idle) window.cancelIdleCallback(handle);
        else clearTimeout(handle);
        cancellations.delete(cancel);
        resolve(null);
      }
      function run(deadline) {
        cancellations.delete(cancel);
        if (disposed) {
          resolve(null);
          return;
        }
        try {
          resolve(work(deadline));
        } catch (error) {
          reject(error);
        }
      }
      cancellations.add(cancel);
      handle = idle
        ? window.requestIdleCallback(run, { timeout: 1000 })
        : setTimeout(() => run({ didTimeout: true, timeRemaining: () => 0 }), 16);
    });
  }

  function eligible(node) {
    return (
      node.isConnected &&
      node.matches(selector) &&
      !node.closest('template,[data-tdb-quotes-template]') &&
      !node.matches('.tdbc-dialog .tdbc-section-footer .tdbc-dd-fade') &&
      !(node.hasAttribute('data-tdb-dd-legacy') && node.hasAttribute('data-w-id'))
    );
  }
  const renderReady = initialRender();
  function enhanceNavbar() {
    if (disposed || navbarRequested) return Promise.resolve(navbarRequested);
    if (navbarFlight) return navbarFlight;
    if (!window.TDBConsent?.allows() || window.CookieScript?.instance?.isOpen?.())
      return Promise.resolve(false);
    const loader = window.TDBNavbarLoader;
    if (!loader && !document.querySelector('[data-tdb-disclosure-trigger],[data-tdb-chevron]'))
      return Promise.resolve(false);
    navbarFlight = (async () => {
      if (!(await renderReady) || disposed) return false;
      await background(() =>
        window.TDBModules.load(new URL('tdb-control-motion.css', base).href, {
          type: 'style',
          attribute: 'data-tdb-control-motion-css',
        }),
      );
      if (disposed) return false;
      if (loader) {
        await background(() =>
          window.TDBModules.load(new URL('tdb-navbar.min.js', base).href, {
            attribute: 'data-tdb-navbar-enhancement',
            timeout: 15000,
            ready: () => loader.status().registered || loader.status().ready,
          }),
        );
        if (disposed) return false;
        loader.activate(background);
        navbarRequested = true;
      }
      await background(() => {
        if (controlsReady) return;
        // Do not replay an entrance for a disclosure already opened natively.
        document
          .querySelectorAll('[data-tdb-disclosure-interacted]')
          .forEach((node) => node.removeAttribute('data-tdb-disclosure-interacted'));
        document.documentElement.setAttribute('data-tdb-control-motion', '');
        controlsReady = true;
      });
      navbarRetry = false;
      return true;
    })()
      .catch((error) => {
        if (!disposed) {
          navbarRetry = true;
          console.warn('TDB navbar: retaining native navigation.', error);
        }
        return false;
      })
      .finally(() => {
        navbarFlight = null;
        // A fast runtime can arrive before the deferred early navbar loader.
        if (!loader && window.TDBNavbarLoader && !navbarRequested && !navbarRetry && !disposed)
          enhanceNavbar();
      });
    return navbarFlight;
  }
  function refresh() {
    if (disposed) return Promise.resolve();
    dirty = true;
    if (pending) return pending;
    pending = (async () => {
      if (!(await renderReady) || disposed) return;
      if (!started) {
        observer = new MutationObserver((records) => {
          // Ignore ticker text replacements and unrelated DOM changes.
          if (
            records.some((record) =>
              [...record.addedNodes, ...record.removedNodes].some(
                (node) =>
                  node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector)),
              ),
            )
          )
            refresh();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        started = true;
      }
      do {
        dirty = false;
        retryNeeded = false;
        const nodes = await background(() => {
          for (const [node, owner] of mounted) {
            if (!eligible(node)) {
              owner.destroy();
              mounted.delete(node);
            }
          }
          const targets = [...document.querySelectorAll(selector)].filter(
            (node) => eligible(node) && !mounted.has(node),
          );
          if (!targets.length) return [];
          if (!window.TDBModules) throw Error('Shared registry unavailable');
          return window.TDBModules.load(new URL('tdb-motion.js', base).href, {
            ready: () => typeof window.TDBMotion?.ddText === 'function',
          }).then(() => targets);
        });
        if (disposed || !nodes) return;
        let index = 0;
        while (index < nodes.length && !disposed) {
          // Loading and mounting have separate turns. Bound each mounting batch
          // by node count and time; the shared motion owner performs geometry work.
          await background((deadline) => {
            const began = performance.now();
            let count = 0;
            while (index < nodes.length && count < 8) {
              if (
                count &&
                (performance.now() - began >= 4 ||
                  (!deadline.didTimeout && deadline.timeRemaining() < 1))
              )
                break;
              const node = nodes[index++];
              count++;
              if (!eligible(node) || mounted.has(node)) continue;
              const root = node.closest('.tdbc-dialog');
              const mode = node.getAttribute('data-tdb-dd-page') || 'viewport';
              const preset = node.getAttribute('data-tdb-dd-preset') || 'standard';
              mounted.set(node, window.TDBMotion.ddText([node], { root, mode, preset }));
            }
          });
        }
      } while (dirty && !disposed);
    })()
      .catch((error) => {
        if (!disposed) {
          retryNeeded = true;
          console.warn('TDB DD: keeping the readable native fallback.', error);
        }
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  }
  function destroy() {
    if (disposed) return;
    disposed = true;
    lifecycle.abort();
    observer?.disconnect();
    window.TDBLogoMarqueeLoader?.destroy();
    window.TDBUSPDrawerLoader?.destroy();
    window.TDBPageBreaks?.destroy();
    window.TDBFiveSensesLauncher?.destroy();
    window.TDBHoldAudioLoader?.destroy();
    window.TDBReviewFeatureLoader?.destroy();
    window.TDBReviewWidgetLoader?.destroy();
    window.TDBLazyIconMasks?.destroy();
    window.TDBInstagramFeatureLoader?.destroy();
    for (const cancel of [...cancellations]) cancel();
    mounted.forEach((owner) => owner.destroy());
    mounted.clear();
  }
  const api = Object.freeze({
    version: '1.5.0',
    refresh,
    enhanceNavbar,
    schedule: background,
    count: () => mounted.size,
    destroy,
    status: () => ({
      started,
      pending: !!pending,
      mounted: mounted.size,
      retryNeeded,
      disposed,
      controlsReady,
      navbarRequested,
      navbarRetry,
    }),
  });
  window.TDBRuntime = api;
  window.TDBDDFades = api;
  window.addEventListener('pageshow', refresh, { signal });
  window.addEventListener('tdb:navbar-ready', enhanceNavbar, { signal });
  for (const event of ['wheel', 'touchstart', 'pointerdown', 'online'])
    window.addEventListener(
      event,
      () => {
        if (retryNeeded && !pending && !disposed) refresh();
        if (navbarRetry && !navbarFlight && !disposed) enhanceNavbar();
      },
      { passive: true, signal },
    );
  // The consent handoff occurs after DOM preparation. Keep direct loading safe too.
  function start() {
    refresh();
    enhanceNavbar();
    renderReady
      .then((ready) => {
        if (ready) {
          if (typeof TDBFeatureStartup !== 'undefined')
            TDBFeatureStartup.start(background, () => !disposed).catch((error) => {
              if (!disposed) console.warn('TDB feature startup unavailable.', error);
            });
          return window.TDBLogoMarqueeLoader?.start({ schedule: background });
        }
      })
      .catch((error) => {
        if (!disposed) console.warn('TDB marquee startup unavailable.', error);
      });
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start, { once: true, signal });
  else start();
})();
