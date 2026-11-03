/* Floating banner placement and visibility, released by runtime. */
function prepareFloatingAnnouncement() {
  (() => {
    const root = document.documentElement;
    const shellId = 'tdb-elfsight-timer-shell';
    const path = location.pathname.replace(/\/+$/, '') || '/';
    const revealViewports = path === '/' || path === '/location' ? 4 : 1;
    let viewportHeight = 0;

    function attachTimerState(shell, position) {
      if (!shell || shell._t) return;
      shell._t = 1;
      let frame = 0;
      const navbar = document.querySelector('.navbar10_component');
      let navbarVisible = false;
      const updateViewportHeight = (h = innerHeight || root.clientHeight || 0) => {
        viewportHeight = viewportHeight ? Math.min(viewportHeight, h) : h;
      };
      const updateState = (scrollTop = window.scrollY ?? root.scrollTop ?? 0) => {
        frame = 0;
        root.classList.toggle(
          'tdb-timer-hidden',
          scrollTop < viewportHeight * revealViewports || navbarVisible,
        );
      };
      const requestUpdate = () => {
        if (!frame) frame = requestAnimationFrame(() => updateState());
      };
      updateViewportHeight(position.height);
      // Subscribe to the existing shared observer. Appearance classes, paths and
      // serialized transform strings do not determine whether the nav is showing.
      if (navbar)
        window.TDBNavbarState.forNav(navbar).watch(
          () =>
            navbar.hasAttribute('data-tdb-nav-floating-visible') ||
            !!navbar.querySelector('.w-nav-button.w--open,.w-dropdown-toggle.w--open'),
          (visible) => {
            navbarVisible = visible;
            requestUpdate();
          },
        );
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
