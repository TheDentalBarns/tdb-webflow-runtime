/* The native About introduction remains readable if motion cannot load. */
function prepareAboutIntroLoader() {
  if (window.TDBAboutIntro) return;
  const roots = [...document.querySelectorAll('[data-tdb-stepped-intro]')];
  if (!roots.length) return;
  const owners = [];
  let flight,
    disposed = false;
  function mount() {
    if (disposed || flight || owners.length) return flight;
    flight = window.TDBModules.load(new URL('tdb-motion.js', TDBRuntimeModuleRoot).href, {
      ready: () => typeof window.TDBMotion?.steppedIntro === 'function',
    })
      .then(() => {
        if (!disposed) roots.forEach((root) => owners.push(window.TDBMotion.steppedIntro(root)));
      })
      .catch((error) => console.warn('TDB About: keeping the native introduction.', error))
      .finally(() => {
        flight = null;
      });
    return flight;
  }
  window.TDBAboutIntro = Object.freeze({
    refresh() {
      owners.forEach((owner) => owner.refresh());
      return mount();
    },
    status: () => owners.map((owner) => owner.status()),
    destroy() {
      disposed = true;
      window.removeEventListener('online', mount);
      owners.forEach((owner) => owner.destroy());
    },
  });
  window.addEventListener('online', mount);
  mount();
}
