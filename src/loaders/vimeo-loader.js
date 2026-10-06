/* TDB Vimeo loader 1.1.0. Early first-party UI and consent handoff.
 * No Vimeo SDK/iframe until functionality permission; prepare near the viewport.
 * The controller owns playback. Webflow owns the frame and control design.
 */
(() => {
  'use strict';
  if (window.TDBVimeoLoader) return;
  const base = new URL('./', document.currentScript.src);
  const selector = '[data-vimeo-hero-shell],[data-vimeo-ambient-init],[data-vimeo-content-init]';
  const consentEvents = ['CookieScriptLoaded','CookieScriptAcceptAll','CookieScriptAccept','CookieScriptAcceptSelection','CookieScriptCategory-functionality','CookieScriptReject','CookieScriptClose'];
  const roots = [...document.querySelectorAll(selector)];
  if (!roots.length) return;
  let pending = null, near = false, flight = null, cssFlight = null, observer = null;
  let api = null, wantsSettings = false;
  const permitted = () => {
    try { return window.CookieScript?.instance?.currentState()?.categories?.includes('functionality') === true; }
    catch { return false; }
  };
  function mark(root, state) {
    if (!root) return;
    const waiting = state === 'awaiting-consent' || state === 'loading';
    if (root.matches('[data-vimeo-hero-shell]')) {
      root.setAttribute('data-vimeo-ui',state);
      root.setAttribute('data-vimeo-pulse',String(!waiting));
    } else {
      root.setAttribute('data-vimeo-loading',String(waiting));
      root.setAttribute('data-vimeo-awaiting-consent',String(state === 'awaiting-consent'));
    }
  }
  function clearPending() {
    mark(pending,'idle');
    pending = null;
    wantsSettings = false;
  }
  function showSettings() {
    wantsSettings = true;
    if (typeof window.openCookieSettingsPanel === 'function') {
      window.openCookieSettingsPanel(); wantsSettings = false;
    } else if (typeof window.CookieScript?.instance?.show === 'function') {
      window.CookieScript.instance.show(); wantsSettings = false;
    }
  }
  function asset(file, kind, attr) {
    return new Promise((resolve,reject) => {
      let node = document.querySelector('['+attr+']');
      if (node?.dataset.tdbLoaded === 'true') return resolve(node);
      if (node?.dataset.tdbFailed === 'true') { node.remove(); node = null; }
      const owned = !node;
      node ||= document.createElement(kind);
      let timer;
      const finish = (ok) => {
        clearTimeout(timer);
        node.removeEventListener('load',loaded);
        node.removeEventListener('error',failed);
        node.dataset[ok?'tdbLoaded':'tdbFailed'] = 'true';
        if (!ok && owned) node.remove();
        ok ? resolve(node) : reject(new Error('Vimeo '+file+' unavailable'));
      };
      const loaded = () => finish(true), failed = () => finish(false);
      node.addEventListener('load',loaded,{once:true});
      node.addEventListener('error',failed,{once:true});
      timer = setTimeout(failed,15000);
      if (owned) {
        node.setAttribute(attr,'');
        if (kind === 'link') { node.rel='stylesheet'; node.href=new URL(file,base).href; }
        else { node.src=new URL(file,base).href; node.async=true; }
        document.head.appendChild(node);
      }
    });
  }
  function styles() {
    const present = () => getComputedStyle(document.documentElement).getPropertyValue('--tdb-vimeo-ui-ready').trim() === '1';
    if (present()) return Promise.resolve();
    return cssFlight ||= (async () => {
      // Shared UI supplies these states before playback. Keep standalone CSS as
      // a recovery path and for pages that have not adopted the shared release.
      const shared = document.querySelector('link[data-tdb-ui-css]');
      if (shared && !shared.sheet) await new Promise(resolve => {
        const done = () => { clearTimeout(timer); shared.removeEventListener('load',done); shared.removeEventListener('error',done); resolve(); };
        const timer = setTimeout(done,15000);
        shared.addEventListener('load',done,{once:true});
        shared.addEventListener('error',done,{once:true});
      });
      if (!present()) await asset('tdb-vimeo.css','link','data-tdb-vimeo-css');
    })().catch(error => { cssFlight=null; throw error; });
  }
  async function prepare() {
    if (!permitted() || (!near && !pending)) return null;
    if (api) return api;
    if (flight) return flight;
    flight = (async () => {
      await styles();
      if (!permitted()) return null;
      if (!window.TDBVimeo) await asset('tdb-vimeo.js','script','data-vimeo-controller-js');
      // Permission can change while a requested asset is in flight.
      if (!permitted()) return null;
      api = window.TDBVimeo?.init();
      if (!api) throw new Error('Vimeo controller did not initialise');
      observer?.disconnect();
      document.removeEventListener('click',onClick,true);
      document.removeEventListener('pointerover',onIntent,true);
      document.removeEventListener('focusin',onIntent,true);
      consentEvents.forEach(type => window.removeEventListener(type,onConsent));
      const target = pending;
      pending = null;
      if (target?.isConnected) api.play(target);
      return api;
    })().catch(error => {
      clearPending();
      console.warn(error.message);
      return null;
    }).finally(() => { flight=null; });
    return flight;
  }
  function onClick(event) {
    const control = event.target.closest?.('[data-vimeo-control="play"]');
    const root = control?.closest('[data-vimeo-content-init],[data-vimeo-hero-shell]');
    if (!root || api) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (pending !== root) clearPending();
    pending = root;
    mark(root,permitted()?'loading':'awaiting-consent');
    if (!permitted()) showSettings();
    else prepare();
  }
  function onIntent(event) {
    if (!event.target.closest?.(selector)) return;
    near = true;
    prepare();
  }
  function onConsent(event) {
    // Consent libraries update their state before or immediately after the event.
    setTimeout(() => {
      if (api) return;
      if (permitted()) { wantsSettings=false; prepare(); }
      else if (event.type === 'CookieScriptClose' || event.type === 'CookieScriptReject' || event.type.startsWith('CookieScriptAccept')) clearPending();
      else if (wantsSettings) showSettings();
    },80);
  }
  window.TDBVimeoLoader = Object.freeze({version:'1.1.0',prepare,status:()=>({present:roots.length,permitted:permitted(),near,pending:!!pending,loading:!!flight,ready:!!api})});
  document.addEventListener('click',onClick,true);
  document.addEventListener('pointerover',onIntent,true);
  document.addEventListener('focusin',onIntent,true);
  consentEvents.forEach(type => window.addEventListener(type,onConsent));
  styles().catch(() => {});
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { near=true; prepare(); }
    },{rootMargin:'300px 0px'});
    roots.forEach(root => observer.observe(root.closest('.layout355_background-video-wrapper') || root));
  } else { near=true; prepare(); }
})();
