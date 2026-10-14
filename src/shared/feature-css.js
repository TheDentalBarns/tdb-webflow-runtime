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
  return tdbEnsureFeatureCSS('data-tdb-slider-ui-css', 'tdb-slider-ui.css', '--tdb-slider-ui-ready', 'slider UI');
}
function tdbEnsureAnnouncementUI() {
  return tdbEnsureFeatureCSS('data-tdb-announcement-css', 'tdb-announcement.css', '--tdb-announcement-ui-ready', 'announcement UI');
}
function tdbEnsureVIPChrome() {
  return tdbEnsureFeatureCSS('data-tdb-vip-chrome-css', 'tdb-vip-chrome.css', '--tdb-vip-chrome-ready', 'VIP chrome');
}
function tdbEnsureVIPUI() {
  // Native Webflow CSS is already loaded before page scripts. Older markup
  // retains its pinned stylesheet, making this release safe during migration.
  if (document.querySelector('#tdb-vip-drawer[data-tdb-vip-native="1"]')) return Promise.resolve();
  return tdbEnsureFeatureCSS('data-tdb-vip-ui-css', 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@48124a90eddd39bf4ae611d00b9fe80583b98872/dist/tdb-vip.css', '--tdb-vip-ui-ready', 'VIP UI');
}
window.TDBFeatureCSS = Object.freeze({ ui: tdbEnsureUI, carousel: tdbEnsureSliderUI, announcement: tdbEnsureAnnouncementUI });


