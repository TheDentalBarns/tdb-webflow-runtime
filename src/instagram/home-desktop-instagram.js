/* Desktop Home variant. Data stays at its existing public, immutable source. */
(async () => {
  try {
    if (!window.TDBInstagramManualData) {
      const response = await fetch(
        'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@0523117b5dfc0ac2b4e23373d3333f0c72e01b7c/src/instagram/manual-gallery.json',
      );
      if (!response.ok) throw Error('Instagram data unavailable');
      window.TDBInstagramManualData = await response.json();
    }
    tdbStartLegacyInstagram(window.TDBInstagramManualData, {
      version: '0.6.5-home-desktop.1',
      homeDesktop: true,
    });
  } catch (error) {
    document.querySelectorAll('[data-tdb-ig-widget][aria-busy="true"]').forEach((mount) => {
      const link = document.createElement('a');
      link.href = 'https://www.instagram.com/thedentalbarns/';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'View our Instagram';
      mount.replaceChildren(link);
      mount.removeAttribute('aria-busy');
    });
  }
})();
