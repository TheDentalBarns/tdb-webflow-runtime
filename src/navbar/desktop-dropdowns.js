/* Desktop dropdowns share the mobile nav's panel and content cadence.
   Webflow continues to own toggles, ARIA, keyboard handling and link navigation. */
(() => {
  const nav = document.querySelector('.navbar10_component');
  if (!nav) return;
  const desktop = matchMedia('(min-width:992px)');
  const root = document.documentElement;
  const panels = [...nav.querySelectorAll('.navbar10_menu-dropdown')].map(dropdown => ({
    toggle: dropdown.querySelector('.w-dropdown-toggle'),
    panel: dropdown.querySelector('.w-dropdown-list'),
    open: false, live: false, animations: [], generation: 0
  })).filter(item => item.toggle && item.panel);
  if (!panels.length) return;
  const css = document.createElement('style');
  css.dataset.tdbDesktopDropdowns = '';
  css.textContent = `@media(min-width:992px){
    html.tdb-desktop-nav-locked{overflow:hidden!important;overscroll-behavior:none}
    html.tdb-desktop-nav-locked .navbar10_component{transform:translateY(0)!important}
    .navbar10_component .w-dropdown-list[data-tdb-desktop-panel]{display:block!important;opacity:1!important;overflow:hidden;animation:none!important;transition:none!important}
    .navbar10_component .w-dropdown-list[data-tdb-desktop-panel]>.navbar10_container{max-height:calc(100dvh - var(--tdb-desktop-nav-height,5rem));overflow-y:auto;overscroll-behavior:contain;animation:none!important;transition:none!important}
    .navbar10_component .w-dropdown-list[data-tdb-desktop-panel]>.navbar10_container:focus{outline:none!important}
    .navbar10_component .w-dropdown-list[data-tdb-desktop-panel] :is(a,button,[role=button]):focus-visible{outline:1px solid #d6cab4!important;outline-offset:3px}
    .navbar10_component .w-dropdown-list[data-tdb-desktop-panel] :is(.navbar10_dropdown-content-left,.navbar10_dropdown-content-right){animation:none!important;transition:none!important}
  }`;
  document.head.append(css);
  // Same dimming as the patient review drawer, below both dropdown panels.
  const backdrop = document.createElement('div');
  backdrop.className = 'tdb-desktop-nav-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.append(backdrop);
  css.textContent += `
    .tdb-desktop-nav-backdrop{position:fixed;inset:0;z-index:2147483400;background:rgba(0,0,0,.5);opacity:0;visibility:hidden;pointer-events:none;transition:opacity var(--tdb-nav-detail-duration,420ms) ease,visibility 0s var(--tdb-nav-detail-duration,420ms)}
    @media(min-width:992px){
      html.tdb-desktop-nav-locked .navbar10_component{z-index:2147483401!important}
      html.tdb-desktop-nav-locked .tdb-desktop-nav-backdrop{visibility:visible;pointer-events:auto;transition-delay:0s}
      .tdb-desktop-nav-backdrop.is-open{opacity:1}
    }`;
  let lock = null;
  function syncLock() {
    const active = desktop.matches && panels.some(item => item.live);
    backdrop.classList.toggle('is-open', desktop.matches && panels.some(item => item.open));
    if (active && !lock) {
      lock = { prevent: document.body.getAttribute('data-lenis-prevent') };
      // Finish any already-running smooth wheel movement at its visible position.
      // Prevent new Lenis gestures without stopping its lifecycle (drawers share it).
      window.lenis?.scrollTo?.(scrollY, {immediate:true, force:true});
      // Lenis excludes its root element from the event path check. The body
      // must carry this attribute so it covers every page and menu gesture.
      document.body.setAttribute('data-lenis-prevent', '');
      root.classList.add('tdb-desktop-nav-locked');
      nav.setAttribute('data-tdb-desktop-dropdown', '');
      window.TDBNavScroll?.release?.();
    } else if (!active && lock) {
      if (lock.prevent === null) document.body.removeAttribute('data-lenis-prevent');
      else document.body.setAttribute('data-lenis-prevent', lock.prevent);
      root.classList.remove('tdb-desktop-nav-locked');
      nav.removeAttribute('data-tdb-desktop-dropdown');
      lock = null;
    }
  }
  function cancel(item) {
    item.animations.forEach(animation => animation.cancel());
    item.animations = [];
  }
  // Webflow's .w--open owns the desktop width, inset, padding and cream fill.
  // Keep those exact values until the closing animation has fully disappeared.
  const appearanceProperties = ['left','right','top','width','min-width','max-width','box-sizing','background-color','padding-left','padding-right','padding-top','padding-bottom'];
  function holdAppearance(item) {
    if (item.appearance) return;
    const style = getComputedStyle(item.panel);
    const values = appearanceProperties.map(property => [property,style.getPropertyValue(property)]);
    item.appearance = appearanceProperties.map(property => [property,item.panel.style.getPropertyValue(property),item.panel.style.getPropertyPriority(property)]);
    values.forEach(([property,value]) => item.panel.style.setProperty(property,value,property === 'padding-top' || property === 'padding-bottom' ? '' : 'important'));
  }
  function releaseAppearance(item) {
    item.appearance?.forEach(([property,value,priority]) => value ? item.panel.style.setProperty(property,value,priority) : item.panel.style.removeProperty(property));
    item.appearance = null;
  }
  function reset(item) {
    item.generation++;
    cancel(item);
    item.panel.removeAttribute('data-tdb-desktop-panel');
    releaseAppearance(item);
    item.panel.inert = item.originalInert;
    item.open = item.live = false;
  }
  function transition(item, open) {
    const timing = window.TDBNavMotion.refresh();
    const {panel} = item;
    const container = panel.querySelector(':scope > .navbar10_container');
    if (!container) return;
    const content = [...container.querySelectorAll('.navbar10_dropdown-content-left,.navbar10_dropdown-content-right')];
    const wasLive = item.live;
    const height = wasLive ? panel.getBoundingClientRect().height : 0;
    const startPaddingTop = wasLive ? getComputedStyle(panel).paddingTop : '0px';
    const startPaddingBottom = wasLive ? getComputedStyle(panel).paddingBottom : '0px';
    const translate = wasLive ? getComputedStyle(container).transform : 'translateY(-100%)';
    const previous = content.map(el => ({opacity:wasLive ? getComputedStyle(el).opacity : '0',transform:wasLive ? getComputedStyle(el).transform : 'translateY(-0.75rem)'}));
    cancel(item);
    if (open) holdAppearance(item);
    const generation = ++item.generation;
    item.open = open;
    item.live = true;
    panel.setAttribute('data-tdb-desktop-panel', open ? 'opening' : 'closing');
    panel.inert = !open;
    nav.style.setProperty('--tdb-desktop-nav-height', nav.getBoundingClientRect().height+'px');
    syncLock();
    const motion = (el, frames, options) => {
      const animation = el.animate(frames, {...options,fill:'both'});
      item.animations.push(animation);
      return animation;
    };
    // A height reveal avoids compositing a moving scroll container through an
    // animated clip-path, which can flash or clip sideways during closing.
    const paddingTop = getComputedStyle(panel).paddingTop;
    const paddingBottom = getComputedStyle(panel).paddingBottom;
    const fullHeight = container.getBoundingClientRect().height + (parseFloat(paddingTop)||0) + (parseFloat(paddingBottom)||0);
    motion(panel,[{height:height+'px',paddingTop:startPaddingTop,paddingBottom:startPaddingBottom},{height:open ? fullHeight+'px' : '0px',paddingTop:open ? paddingTop : '0px',paddingBottom:open ? paddingBottom : '0px'}],{duration:timing.panel,easing:'cubic-bezier(0.165,0.84,0.44,1)'});
    motion(container,[{transform:translate},{transform:open ? 'translateY(0)' : 'translateY(-100%)'}],{duration:timing.panel,easing:'cubic-bezier(0.165,0.84,0.44,1)'});
    content.forEach((el,i) => motion(el, open ? [previous[i],{opacity:1,transform:'translateY(0)'}] : [
      {...previous[i],offset:0},{opacity:.5,transform:'translateY(-0.2rem)',offset:.2},
      {opacity:.15,transform:'translateY(-0.45rem)',offset:.42},
      {opacity:0,transform:'translateY(-0.75rem)',offset:.68},
      {opacity:0,transform:'translateY(-0.95rem)',offset:1}
    ],{duration:open ? timing.textIn : timing.textOut,delay:open ? timing.delay : 0,easing:open ? 'cubic-bezier(0.5,0,1,1)' : 'cubic-bezier(0,0,0.2,1)'}));
    Promise.all(item.animations.map(animation => animation.finished.catch(() => {}))).then(() => {
      if (generation !== item.generation) return;
      if (open) {cancel(item);panel.setAttribute('data-tdb-desktop-panel','open');}
      else {reset(item);syncLock();}
    });
  }
  panels.forEach(item => {item.originalInert = item.panel.inert;});
  function sync() {
    panels.forEach(item => {
      if (!desktop.matches) {if(item.live) reset(item);return;}
      const open = item.toggle.getAttribute('aria-expanded') === 'true';
      if (open !== item.open) transition(item,open);
    });
    syncLock();
  }
  const observer = new MutationObserver(sync);
  panels.forEach(item => observer.observe(item.toggle,{attributes:true,attributeFilter:['aria-expanded']}));
  // Native menu scrolling is allowed, but wheel gestures elsewhere cannot reach
  // the page or the smooth-scroll handler, including throughout closing motion.
  document.addEventListener('wheel',event => {
    if (!lock || event.ctrlKey) return;
    if (!panels.some(item => item.open && item.panel.contains(event.target))) event.preventDefault();
  },{capture:true,passive:false});
  desktop.addEventListener('change',sync);
  addEventListener('resize',() => {
    if (!desktop.matches) return;
    panels.filter(item => item.open && item.panel.dataset.tdbDesktopPanel === 'open').forEach(item => {
      releaseAppearance(item);holdAppearance(item);
    });
  },{passive:true});
  addEventListener('pagehide',() => {panels.forEach(reset);syncLock();});
  addEventListener('pageshow',sync);
  sync();

  // Warm only menu images, after a consent decision and the initial page load.
  // Two low-priority decodes at a time avoid a burst of work on the first click.
  let consentDecided = false, warming = false;
  const idle = task => 'requestIdleCallback' in window ? requestIdleCallback(task,{timeout:2000}) : setTimeout(task,150);
  function warmImages() {
    if (!desktop.matches || !consentDecided || warming) return;
    if (document.readyState !== 'complete') {addEventListener('load',warmImages,{once:true});return;}
    warming = true;
    const queue = panels.flatMap(item => [...item.panel.querySelectorAll('img')]);
    async function batch() {
      if (!desktop.matches) {warming=false;return;}
      await Promise.allSettled(queue.splice(0,2).map(async image => {
        image.fetchPriority='low';image.decoding='async';image.loading='eager';
        try {await image.decode?.();} catch (_) { /* Opening never waits on an image. */ }
      }));
      if (queue.length) idle(batch);
    }
    idle(batch);
  }
  function consentComplete() {consentDecided=true;warmImages();}
  function storedConsent() {
    const cookie=document.cookie.split('; ').find(value=>value.startsWith('CookieScriptConsent='));
    try {if(cookie && /"action"|"a":|accept|reject|close/.test(decodeURIComponent(cookie))) consentComplete();} catch (_) {}
  }
  ['CookieScriptAccept','CookieScriptAcceptAll','CookieScriptReject','CookieScriptClose'].forEach(type=>addEventListener(type,consentComplete));
  addEventListener('CookieScriptLoaded',storedConsent);
  desktop.addEventListener('change',warmImages);
  storedConsent();
})();
