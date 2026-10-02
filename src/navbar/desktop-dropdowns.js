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
    html.tdb-desktop-nav-locked{overflow:hidden!important;overscroll-behavior:none;scrollbar-gutter:stable}
    html.tdb-desktop-nav-locked .navbar10_component{transform:translateY(0)!important}
    .navbar10_component .w-dropdown-list[data-tdb-desktop-panel]{display:block!important;opacity:1!important;overflow:hidden;animation:none!important;transition:none!important}
    .navbar10_component .w-dropdown-list[data-tdb-desktop-panel]>.navbar10_container{max-height:calc(100dvh - var(--tdb-desktop-nav-height,5rem));overflow-y:auto;overscroll-behavior:contain;animation:none!important;transition:none!important}
    .navbar10_component .w-dropdown-list[data-tdb-desktop-panel] :is(.navbar10_dropdown-content-left,.navbar10_dropdown-content-right){animation:none!important;transition:none!important}
  }`;
  document.head.append(css);
  let lock = null;
  function syncLock() {
    const active = desktop.matches && panels.some(item => item.live);
    if (active && !lock) {
      lock = { prevent: root.getAttribute('data-lenis-prevent') };
      // Finish any already-running smooth wheel movement at its visible position.
      // Prevent new Lenis gestures without stopping its lifecycle (drawers share it).
      window.lenis?.scrollTo?.(scrollY, {immediate:true, force:true});
      root.setAttribute('data-lenis-prevent', '');
      root.classList.add('tdb-desktop-nav-locked');
      nav.setAttribute('data-tdb-desktop-dropdown', '');
      window.TDBNavScroll?.release?.();
    } else if (!active && lock) {
      if (lock.prevent === null) root.removeAttribute('data-lenis-prevent');
      else root.setAttribute('data-lenis-prevent', lock.prevent);
      root.classList.remove('tdb-desktop-nav-locked');
      nav.removeAttribute('data-tdb-desktop-dropdown');
      lock = null;
    }
  }
  function cancel(item) {
    item.animations.forEach(animation => animation.cancel());
    item.animations = [];
  }
  function reset(item) {
    item.generation++;
    cancel(item);
    item.panel.removeAttribute('data-tdb-desktop-panel');
    item.panel.inert = item.originalInert;
    item.open = item.live = false;
  }
  function transition(item, open) {
    const {panel} = item;
    const container = panel.querySelector(':scope > .navbar10_container');
    if (!container) return;
    const content = [...container.querySelectorAll('.navbar10_dropdown-content-left,.navbar10_dropdown-content-right')];
    const wasLive = item.live;
    const clip = wasLive ? getComputedStyle(panel).clipPath : 'inset(0px 0px 100% 0px)';
    const translate = wasLive ? getComputedStyle(container).transform : 'translateY(-100%)';
    const previous = content.map(el => ({opacity:wasLive ? getComputedStyle(el).opacity : '0',transform:wasLive ? getComputedStyle(el).transform : 'translateY(-0.75rem)'}));
    cancel(item);
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
    motion(panel,[{clipPath:clip === 'none' ? 'inset(0px)' : clip},{clipPath:open ? 'inset(0px)' : 'inset(0px 0px 100% 0px)'}],{duration:500,easing:'cubic-bezier(0.165,0.84,0.44,1)'});
    motion(container,[{transform:translate},{transform:open ? 'translateY(0)' : 'translateY(-100%)'}],{duration:500,easing:'cubic-bezier(0.165,0.84,0.44,1)'});
    content.forEach((el,i) => motion(el, open ? [previous[i],{opacity:1,transform:'translateY(0)'}] : [
      {...previous[i],offset:0},{opacity:.5,transform:'translateY(-0.2rem)',offset:.2},
      {opacity:.15,transform:'translateY(-0.45rem)',offset:.42},
      {opacity:0,transform:'translateY(-0.75rem)',offset:.68},
      {opacity:0,transform:'translateY(-0.95rem)',offset:1}
    ],{duration:open ? 520 : 420,delay:open ? 70 : 0,easing:open ? 'cubic-bezier(0.5,0,1,1)' : 'cubic-bezier(0,0,0.2,1)'}));
    Promise.all(item.animations.map(animation => animation.finished.catch(() => {}))).then(() => {
      if (generation !== item.generation) return;
      if (open) panel.setAttribute('data-tdb-desktop-panel','open');
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
  addEventListener('pagehide',() => {panels.forEach(reset);syncLock();});
  addEventListener('pageshow',sync);
  sync();
})();
