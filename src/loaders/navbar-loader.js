/* TDB navbar loader 1.0.0. Native navigation first; motion after a decision.
 * Downloaded enhancement waits for an open native menu to close before mounting.
 */
(() => {
  'use strict';
  const nav = document.querySelector('.navbar10_component');
  if (!nav || window.TDBNavbarLoader || window.TDBNavbar) return;
  const base = new URL('./', document.currentScript.src);
  const events = ['CookieScriptLoaded','CookieScriptCurrentState','CookieScriptAccept','CookieScriptAcceptAll','CookieScriptAcceptSelection','CookieScriptReject','CookieScriptClose'];
  const root = document.documentElement;
  const originalDuration = nav.getAttribute('data-duration');
  const transparent = nav.getAttribute('transparent-nav') === 'true';
  const colours = [...nav.querySelectorAll('#nav-button-link,.navbar10_logo-link,.navbar10_link,.menu-icon5'),nav].map(node => [node,node.classList.contains('is-trans')]);
  let flight = null, install = null, ready = false, lastOpen = false, timer = 0;
  const opened = () => !!nav.querySelector('.w-nav-button.w--open,.w-dropdown-toggle.w--open,[data-nav-menu-open]');
  function decided() {
    try {
      const action = window.CookieScript?.instance?.currentState?.()?.action;
      if (['accept','reject','close'].includes(String(action).toLowerCase())) return true;
      const raw = document.cookie.split(';').map(s => s.trim()).find(s => s.startsWith('CookieScriptConsent='));
      const saved = raw && JSON.parse(decodeURIComponent(raw.slice(raw.indexOf('=') + 1)));
      return ['accept','reject','close'].includes(String(saved?.action || saved?.a).toLowerCase());
    } catch { return false; }
  }
  function duration(value) {
    nav.setAttribute('data-duration',String(value));
    const config = window.jQuery?.data(nav,'.w-nav')?.config;
    if (config) config.duration = Number(value);
  }
  const style = document.createElement('style');
  style.dataset.tdbNavbarFallback = '';
  style.textContent = 'html[data-tdb-nav-basic-open]{overflow:hidden} .navbar10_component[data-tdb-nav-basic] .navbar10_menu-left,.navbar10_component[data-tdb-nav-basic] .navbar10_menu-right{opacity:1!important;animation:none!important;transform:none!important}';
  document.head.append(style);
  nav.setAttribute('data-tdb-nav-basic','');
  duration(0);
  (window.Webflow ||= []).push(() => { if (!ready) duration(0); });
  function sync() {
    if (ready) return;
    const open = opened();
    if (open !== lastOpen) {
      lastOpen = open;
      root.toggleAttribute('data-tdb-nav-basic-open',open);
      if (transparent) colours.forEach(([node,original]) => node.classList.toggle('is-trans',open || original));
    }
    if (!open && install) {
      ready = true;
      observer.disconnect();
      clearTimeout(timer);
      events.forEach(type => window.removeEventListener(type,onConsent));
      window.removeEventListener('online',prepare);
      document.removeEventListener('pointerdown',onIntent,true);
      document.removeEventListener('focusin',onIntent,true);
      root.removeAttribute('data-tdb-nav-basic-open');
      nav.removeAttribute('data-tdb-nav-basic');
      style.remove();
      duration(originalDuration || 500);
      install();
    }
  }
  const observer = new MutationObserver(sync);
  observer.observe(nav,{subtree:true,attributes:true,attributeFilter:['class','aria-expanded','data-nav-menu-open']});
  function prepare() {
    if (ready || flight || !decided()) return flight;
    flight = new Promise(resolve => {
      const script = document.createElement('script');
      script.src = new URL('tdb-navbar.min.js',base).href;
      script.async = true;
      script.dataset.tdbNavbarEnhancement = '';
      let timeout;
      const finish = ok => {
        clearTimeout(timeout);
        script.onload = script.onerror = null;
        if (!ok) { script.remove(); flight = null; }
        resolve(ok);
      };
      script.onload = () => finish(!!install || ready);
      script.onerror = () => finish(false);
      timeout = setTimeout(() => finish(false),15000);
      document.head.append(script);
    });
    return flight;
  }
  function onConsent() { clearTimeout(timer); timer = setTimeout(prepare,0); }
  function onIntent(event) { if (nav.contains(event.target)) prepare(); }
  window.TDBNavbarLoader = Object.freeze({version:'1.0.0',prepare,register(callback) { if (!ready) { install = callback; sync(); } },status:() => ({decided:decided(),ready,waitingForClose:!!install && !ready})});
  events.forEach(type => window.addEventListener(type,onConsent));
  window.addEventListener('online',prepare);
  document.addEventListener('pointerdown',onIntent,true);
  document.addEventListener('focusin',onIntent,true);
  sync();
  prepare();
})();
