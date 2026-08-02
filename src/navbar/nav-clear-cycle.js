(() => {
  const root = document.documentElement;
  const navbar = document.querySelector('.navbar10_component');
  const menuButton = document.querySelector('.navbar10_menu-button,.w-nav-button');
  const mobileQuery = matchMedia('(max-width:767px)');

  if (!navbar || !menuButton || navbar.getAttribute('transparent-nav') !== 'true') return;

  let clearCycle = false;
  let cleanupTimer;

  const menuIsOpen = () => menuButton.classList.contains('w--open');

  menuButton.addEventListener(
    'pointerdown',
    () => {
      if (navbar.classList.contains('tdb-menu-transitioning') || menuIsOpen()) return;

      clearTimeout(cleanupTimer);
      clearCycle = mobileQuery.matches && root.classList.contains('tdb-nav-at-top');
      root.classList.toggle('tdb-nav-clear-cycle', clearCycle);
    },
    { capture: true, passive: true },
  );

  new MutationObserver(() => {
    clearTimeout(cleanupTimer);

    if (menuIsOpen()) return;
    if (!clearCycle) return root.classList.remove('tdb-nav-clear-cycle');

    cleanupTimer = setTimeout(() => {
      clearCycle = false;
      root.classList.remove('tdb-nav-clear-cycle');
    }, 470);
  }).observe(menuButton, {
    attributes: true,
    attributeFilter: ['class'],
  });

  const resetAtDesktop = () => {
    if (mobileQuery.matches) return;

    clearTimeout(cleanupTimer);
    clearCycle = false;
    root.classList.remove('tdb-nav-clear-cycle');
  };

  mobileQuery.addEventListener
    ? mobileQuery.addEventListener('change', resetAtDesktop)
    : mobileQuery.addListener(resetAtDesktop);
})();
