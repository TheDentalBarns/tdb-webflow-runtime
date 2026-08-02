(() => {
  const root = document.documentElement;
  const shellId = 'tdb-elfsight-timer-shell';
  const appClass = 'elfsight-app-4fa0f002-95b0-40d5-b89d-0f5e97471efb';
  const mobileQuery = matchMedia('(max-width:767px)');
  let viewportHeight = 0;

  function attachTimerState(shell) {
    if (!shell || shell._t) return;
    shell._t = 1;

    let frame = 0;
    const navbar = document.querySelector('.navbar10_component');

    const updateViewportHeight = () => {
      const currentHeight = innerHeight || root.clientHeight || 0;
      viewportHeight = viewportHeight ? Math.min(viewportHeight, currentHeight) : currentHeight;
    };

    const updateState = () => {
      frame = 0;

      const scrollTop = scrollY || root.scrollTop || 0;
      const mobileNavbarVisible =
        mobileQuery.matches &&
        navbar &&
        (navbar.classList.contains('z-hold') ||
          (navbar.classList.contains('is-trans') && !(navbar.style.transform || '').includes('-100%')));

      root.classList.toggle('tdb-timer-hidden', scrollTop < viewportHeight || mobileNavbarVisible);
    };

    const requestUpdate = () => {
      if (!frame) frame = requestAnimationFrame(updateState);
    };

    updateViewportHeight();

    if (navbar) {
      new MutationObserver(requestUpdate).observe(navbar, {
        attributes: true,
        attributeFilter: ['class', 'style'],
      });
    }

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

    mobileQuery.addEventListener
      ? mobileQuery.addEventListener('change', requestUpdate)
      : mobileQuery.addListener(requestUpdate);

    requestUpdate();
  }

  function createTimerShell() {
    let shell = document.getElementById(shellId);

    if (!shell) {
      shell = document.createElement('div');
      shell.id = shellId;
      shell.className = 'tdb-elfsight-shell';

      const widget = document.createElement('div');
      widget.className = appClass;
      widget.setAttribute('data-elfsight-app', '');

      shell.appendChild(widget);
      document.body.appendChild(shell);
    }

    attachTimerState(shell);
  }

  function scheduleTimerShell() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(createTimerShell, { timeout: 1500 });
    } else {
      setTimeout(createTimerShell, 200);
    }
  }

  ['scroll', 'pointerdown', 'keydown', 'touchstart'].forEach((eventName) => {
    addEventListener(eventName, scheduleTimerShell, { once: true, passive: true });
  });

  addEventListener('pageshow', () => attachTimerState(document.getElementById(shellId)));
})();
