/* Physical phone orientation avoids triggering when the portrait keyboard opens. */
(() => {
  const touch = matchMedia('(pointer: coarse)');
  const landscape = matchMedia('(orientation: landscape)');
  function update() {
    const shortSide = Math.min(screen.width, screen.height);
    const type = screen.orientation?.type;
    const rotated = type
      ? type.startsWith('landscape')
      : typeof window.orientation === 'number'
        ? Math.abs(window.orientation) === 90
        : landscape.matches;
    const active = touch.matches && shortSide > 0 && shortSide <= 600 && rotated;
    if (active && !document.querySelector('style[data-tdb-phone-landscape-css]')) {
      const style = document.createElement('style');
      style.setAttribute('data-tdb-phone-landscape-css', '');
      style.textContent = __TDB_PHONE_LANDSCAPE_CSS__;
      document.head.append(style);
    }
    document.documentElement.classList.toggle('tdb-phone-landscape', active);
  }
  update();
  touch.addEventListener('change', update);
  landscape.addEventListener('change', update);
  screen.orientation?.addEventListener('change', update);
  window.addEventListener('orientationchange', update);
  window.addEventListener('resize', update, { passive: true });
})();
