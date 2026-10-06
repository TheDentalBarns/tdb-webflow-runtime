/* Designer owns appearance. This adapter maps the existing controller states
 * onto native combo classes; it does not own scrolling, toggles or timing. */
(() => {
  const nav = document.querySelector('.navbar10_component');
  const glass = nav?.querySelector('.tdb-nav-bar-glass');
  const menu = nav?.querySelector('.navbar10_menu');
  if (!nav || !glass || !menu) return;
  const root = document.documentElement;
  const mobile = matchMedia('(max-width:767px)');
  const desktop = matchMedia('(min-width:992px)');
  const button = nav.querySelector('.w-nav-button');
  const transparent = nav.getAttribute('transparent-nav') === 'true';
  const set = (element, states, selected) => states.forEach(state => {
    const enabled = state === selected;
    if (element.classList.contains(state) !== enabled) element.classList.toggle(state, enabled);
  });
  function sync() {
    const clear = root.classList.contains('tdb-nav-at-top') || root.classList.contains('tdb-nav-clear-cycle');
    const open = button?.classList.contains('w--open');
    const desktopOpen = desktop.matches && !!nav.querySelector('.w-dropdown-toggle.w--open');
    let barState = null, menuState = null;
    if (mobile.matches) {
      if (!clear) barState = open ? 'is-nav-solid' : nav.classList.contains('is-trans') ? 'is-nav-frosted' : null;
      menuState = open ? 'is-menu-solid' : clear ? 'is-menu-clear' : 'is-menu-frosted';
    } else if (desktop.matches) {
      barState = desktopOpen ? 'is-nav-solid' : (!transparent || nav.classList.contains('is-trans')) ? 'is-nav-frosted' : null;
    }
    set(glass, ['is-nav-frosted', 'is-nav-solid'], barState);
    set(menu, ['is-menu-frosted', 'is-menu-solid', 'is-menu-clear'], menuState);
  }
  nav.setAttribute('data-tdb-nav-surfaces', '');
  const observer = new MutationObserver(sync);
  observer.observe(root, {attributes:true, attributeFilter:['class']});
  observer.observe(nav, {attributes:true, attributeFilter:['class','data-tdb-desktop-dropdown']});
  if (button) observer.observe(button, {attributes:true, attributeFilter:['class']});
  nav.querySelectorAll('.w-dropdown-toggle').forEach(toggle => observer.observe(toggle, {attributes:true, attributeFilter:['class']}));
  mobile.addEventListener('change', sync);
  desktop.addEventListener('change', sync);
  sync();
})();
