/* Temporary, read-only Android edge investigation. Opt-in staging view only. */
(() => {
  'use strict';
  if (location.hostname !== 'dentalbarns.webflow.io' ||
      new URLSearchParams(location.search).get('nav-diagnostics') !== '1' ||
      window.TDBNavDiagnostics) return;
  function init() {
    const nav = document.querySelector('[data-tdb-navbar-native]');
    const button = nav?.querySelector('.navbar10_menu-button');
    if (!nav || !button) return;
    const host = document.createElement('aside');
    host.setAttribute('data-tdb-nav-diagnostics', '1.0.0');
    host.style.cssText = 'position:fixed;inset:auto 8px 8px;z-index:2147483647;max-width:540px;pointer-events:auto;';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>
      :host{color:#fff;font:12px/1.4 monospace;user-select:text;-webkit-user-select:text}
      section{background:#202020f5;border:1px solid #aaa;padding:10px;border-radius:6px}
      strong{display:block;font:600 13px/1.4 sans-serif;margin-bottom:4px}
      pre{font:inherit;white-space:pre-wrap;margin:0 0 8px}
      button{background:#fff;color:#111;border:0;border-radius:3px;padding:8px;font:12px sans-serif;margin-right:8px;cursor:pointer}
    </style><section aria-label="Navbar edge measurements"><strong>Navbar edge measurements</strong><pre>Scroll to the affected area, then open the main menu.</pre><button type="button">Copy measurements</button><button type="button">Hide</button></section>`;
    const output = shadow.querySelector('pre');
    const [copy, hide] = shadow.querySelectorAll('button');
    document.body.append(host);
    const history = [];
    let timer = 0, frame = 0, stopped = false;
    const round = value => Math.round(value * 1000000) / 1000000;
    const open = () => button.classList.contains('w--open');
    const describe = element => element ? `${element.tagName.toLowerCase()}${element.id ? '#'+element.id : ''}.${String(element.className).trim().replace(/\s+/g,'.')}` : null;
    function measure(element) {
      if (!element) return null;
      const box = element.getBoundingClientRect(), css = getComputedStyle(element);
      return {
        element: describe(element),
        rect: Object.fromEntries(['top','bottom','left','right','width','height'].map(key => [key,round(box[key])])),
        offsetParent: describe(element.offsetParent), offsetTop: element.offsetTop,
        offsetHeight: element.offsetHeight, clientHeight: element.clientHeight,
        scrollTop: element.scrollTop, inlineStyle: element.getAttribute('style'),
        blurIdle: element.hasAttribute('data-tdb-nav-blur-idle'),
        css: Object.fromEntries(['position','top','bottom','height','min-height','margin-top','margin-bottom','padding-top','padding-bottom','border-top-width','border-bottom-width','border-bottom-style','background-color','background-clip','backdrop-filter','-webkit-backdrop-filter','transform','translate','opacity','overflow','clip-path','contain','will-change','animation-name','animation-duration','transition'].map(key => [key,css.getPropertyValue(key)]))
      };
    }
    function capture(phase = 'manual') {
      if (stopped || !open()) return null;
      const bar = measure(nav), glass = measure(nav.querySelector('.tdb-nav-bar-glass'));
      const overlay = measure(nav.querySelector('.w-nav-overlay'));
      const menu = measure(nav.querySelector('.navbar10_menu'));
      const data = {
        phase, time: new Date().toISOString(), path: location.pathname,
        browser: navigator.userAgent, dpr: devicePixelRatio,
        viewport: { width: innerWidth, height: innerHeight, scrollY,
          visual: window.visualViewport ? { width: visualViewport.width, height: visualViewport.height, offsetTop: visualViewport.offsetTop, scale: visualViewport.scale } : null },
        rootFontSize: getComputedStyle(document.documentElement).fontSize,
        htmlClasses: document.documentElement.className,
        expanded: button.getAttribute('aria-expanded'),
        foundation: window.TDBNavbarNative?.version,
        bar, glass, overlay, menu,
        gaps: {
          barToOverlay: overlay ? round(overlay.rect.top - bar.rect.bottom) : null,
          barToMenu: menu ? round(menu.rect.top - bar.rect.bottom) : null,
          barBeyondGlass: glass ? round(bar.rect.bottom - glass.rect.bottom) : null,
          overlayToMenu: overlay && menu ? round(menu.rect.top - overlay.rect.top) : null
        },
        edgeHits: [-1,-.5,0,.5,1].map(delta => ({ delta,
          elements: document.elementsFromPoint(innerWidth / 2,bar.rect.bottom + delta).slice(0,5).map(describe) }))
      };
      history.push(data); if (history.length > 12) history.shift();
      output.textContent = `${phase} | scroll ${round(scrollY)} | DPR ${devicePixelRatio}\n`+
        `Bar bottom: ${bar.rect.bottom}px\nGlass bottom: ${glass?.rect.bottom ?? 'missing'}px\n`+
        `Overlay top: ${overlay?.rect.top ?? 'missing'}px\nMenu top: ${menu?.rect.top ?? 'missing'}px\n`+
        `Bar → overlay: ${data.gaps.barToOverlay}px\nBar → menu: ${data.gaps.barToMenu}px\n`+
        `Bar beyond glass: ${data.gaps.barBeyondGlass}px\n`+
        `Blur: bar ${glass?.css['backdrop-filter'] || 'none'}; menu ${menu?.css['backdrop-filter'] || 'none'}`;
      return data;
    }
    function sample() {
      clearTimeout(timer); cancelAnimationFrame(frame);
      if (!open()) return;
      frame = requestAnimationFrame(() => capture('opening / state change'));
      timer = setTimeout(() => capture('settled'), (window.TDBNavMotion?.current.panel || 1000) + 150);
    }
    const observer = new MutationObserver(sample);
    observer.observe(button, { attributes: true, attributeFilter: ['class','aria-expanded'] });
    window.addEventListener('resize', sample, { passive: true });
    copy.addEventListener('click', async event => {
      event.stopPropagation();
      try {
        await navigator.clipboard.writeText(JSON.stringify({ snapshots: history }, null, 2));
        copy.textContent = 'Copied';
      } catch { copy.textContent = 'Please screenshot the measurements'; }
    });
    hide.addEventListener('click', event => {
      event.stopPropagation(); stopped = true;
      clearTimeout(timer); cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener('resize', sample); host.remove();
    });
    window.TDBNavDiagnostics = Object.freeze({ version: '1.0.0', capture, snapshots: () => history.slice() });
    sample();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
