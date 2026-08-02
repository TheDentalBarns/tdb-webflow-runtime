(() => {
  const initMobileNavTextClose = () => {
    const button = document.querySelector('.navbar10_menu-button, .w-nav-button');
    const menu = document.querySelector('.navbar10_menu');

    if (!button || !menu || button.dataset.tdbTextClose === '1') {
      return;
    }

    button.dataset.tdbTextClose = '1';

    let textAnimations = [];

    const menuIsOpen = () =>
      button.classList.contains('w--open') ||
      button.getAttribute('aria-expanded') === 'true' ||
      menu.hasAttribute('data-nav-menu-open');

    const clearTextAnimations = () => {
      textAnimations.forEach((animation) => {
        try {
          animation.cancel();
        } catch (error) {}
      });

      textAnimations = [];
    };

    const animateTextOut = () => {
      if (!menuIsOpen()) {
        return;
      }

      clearTextAnimations();

      const textElements = menu.querySelectorAll('.navbar10_menu-left, .navbar10_menu-right');

      textElements.forEach((element) => {
        const computed = getComputedStyle(element);
        const startTransform = computed.transform === 'none' ? 'translate3d(0, 0, 0)' : computed.transform;
        const startOpacity = Number.parseFloat(computed.opacity);

        const animation = element.animate(
          [
            {
              opacity: Number.isFinite(startOpacity) ? startOpacity : 1,
              transform: startTransform,
              offset: 0,
            },
            {
              opacity: 0.5,
              transform: 'translate3d(0, -0.2rem, 0)',
              offset: 0.2,
            },
            {
              opacity: 0.15,
              transform: 'translate3d(0, -0.45rem, 0)',
              offset: 0.42,
            },
            {
              opacity: 0,
              transform: 'translate3d(0, -0.75rem, 0)',
              offset: 0.68,
            },
            {
              opacity: 0,
              transform: 'translate3d(0, -0.95rem, 0)',
              offset: 1,
            },
          ],
          {
            duration: 420,
            easing: 'cubic-bezier(0, 0, 0.2, 1)',
            fill: 'forwards',
          },
        );

        textAnimations.push(animation);
      });

      setTimeout(() => {
        clearTextAnimations();
      }, 470);
    };

    button.addEventListener(
      'pointerdown',
      () => {
        if (button.closest('.navbar10_component')?.classList.contains('tdb-menu-transitioning')) return;

        if (menuIsOpen()) {
          animateTextOut();
        } else {
          clearTextAnimations();
        }
      },
      {
        capture: true,
        passive: true,
      },
    );

    button.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }

        if (button.closest('.navbar10_component')?.classList.contains('tdb-menu-transitioning')) return;

        if (menuIsOpen()) {
          animateTextOut();
        } else {
          clearTextAnimations();
        }
      },
      true,
    );
  };

  const addNavbarGlass = () => {
    document.querySelectorAll('.navbar10_component').forEach((navbar) => {
      if (navbar.querySelector('.tdb-nav-bar-glass')) {
        return;
      }

      const glass = document.createElement('div');
      glass.className = 'tdb-nav-bar-glass';
      glass.setAttribute('aria-hidden', 'true');
      navbar.insertBefore(glass, navbar.firstChild);
    });
  };

  const init = () => {
    initMobileNavTextClose();
    addNavbarGlass();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.Webflow = window.Webflow || [];
  window.Webflow.push(addNavbarGlass);
})();
