(() => {
  'use strict';

  function loadNavbarWhenPresent() {
    const hasScrollNav = document.querySelector('.navbar10_component');
    const hasMenu = document.querySelector('.navbar10_menu') &&
      document.querySelector('.navbar10_menu-button, .w-nav-button');

    if (!hasScrollNav && !hasMenu) {
      // The footer normally follows the complete page. Recheck unfinished HTML
      // so moving this snippet earlier cannot accidentally omit navigation.
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadNavbarWhenPresent, { once: true });
      }
      return;
    }

    if (document.querySelector('script[data-tdb-navbar-js]')) return;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@0c4f2c8abd91eaf491ae41abebcc71c6e8cd0370/dist/tdb-navbar.min.js';
    script.async = false;
    script.defer = true;
    script.setAttribute('data-tdb-navbar-js', 'true');
    document.head.appendChild(script);
  }

  loadNavbarWhenPresent();
})();
