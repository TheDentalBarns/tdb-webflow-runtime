/* Lazy native announcement loader. Heavy engines are shared through TDBModules. */
const TDBAnnouncementModuleRoot = TDBRuntimeModuleRoot;
(() => {
  let flight;
  const shared = TDBRuntimeModuleRoot.href;
  function load() {
    if (flight) return flight;
    flight = (async () => {
      const modules = window.TDBModules;
      if (!modules) throw Error('Shared module registry unavailable');
      // Both state sheets must be applied before mount can remove pending.
      await Promise.all([tdbEnsureUI(), tdbEnsureAnnouncementUI()]);
      await modules.load(shared + 'tdb-motion.js', { ready: () => Boolean(window.TDBMotion) });
      await Promise.all([
        modules.load(new URL('tdb-availability.js', TDBAnnouncementModuleRoot), {
          ready: () => Boolean(window.TDBAvailability),
        }),
        modules.load(shared + 'tdb-swiper-8.4.7.min.js', {
          attribute: 'data-swiper-js',
          ready: () => Boolean(window.TDBSwiper?.create),
        }),
        modules.load(shared + 'tdb-ticker.js', { ready: () => Boolean(window.TDBNativeTicker) }),
      ]);
      await modules.load(new URL('tdb-announcement.js', TDBAnnouncementModuleRoot), {
        ready: () => Boolean(window.TDBAnnouncement),
      });
      return window.TDBAnnouncement;
    })().catch((error) => {
      flight = null;
      throw error;
    });
    return flight;
  }
  window.TDBAnnouncementLoader = Object.freeze({ load });
})();
