/* Native panels, artwork, copy and links work without this scroll enhancement. */
function prepareHeroCampaignLoader() {
  if (window.TDBHeroCampaign) return;
  const root = document.querySelector('[data-tdb-campaign-hero]');
  if (!root?.querySelector('[data-tdb-campaign-panel]')) return;
  let owner,
    flight,
    disposed = false;
  function mount() {
    if (disposed || flight || owner) return flight;
    flight = Promise.all([
      window.TDBModules.load(new URL('tdb-motion.js', TDBRuntimeModuleRoot).href, {
        ready: () => Boolean(window.TDBMotion?.frames),
      }),
      window.TDBModules.load(new URL('tdb-hero-campaign.js', TDBRuntimeModuleRoot).href, {
        ready: () => typeof window.TDBCampaignHero?.mount === 'function',
      }),
    ])
      .then(() => {
        if (!disposed) owner = window.TDBCampaignHero.mount(root);
      })
      .catch((error) => {
        console.warn('TDB campaign hero: retaining native panels and links.', error);
      })
      .finally(() => {
        flight = null;
      });
    return flight;
  }
  window.TDBHeroCampaign = Object.freeze({
    refresh() {
      owner?.refresh();
      return mount();
    },
    status: () => owner?.status() || { ready: false },
    destroy() {
      disposed = true;
      window.removeEventListener('online', mount);
      owner?.destroy();
    },
  });
  window.addEventListener('online', mount);
  mount();
}
