/* Lazy native announcement loader. Heavy engines are shared through TDBModules. */
const TDBAnnouncementModuleRoot = new URL('./', document.currentScript.src);
(() => {
  let flight;
  const shared = 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@d71d7f008fc320948726323eb4eb758b6732a665/dist/';
  function load() {
    if (flight) return flight;
    flight = (async () => {
      const modules = window.TDBModules;
      if (!modules) throw Error('Shared module registry unavailable');
      await modules.load(shared + 'tdb-motion.js', {ready:() => Boolean(window.TDBMotion)});
      await Promise.all([
        modules.load(shared + 'tdb-swiper-8.4.7.min.js', {attribute:'data-swiper-js',ready:() => Boolean(window.TDBSwiper?.create)}),
        modules.load(shared + 'tdb-ticker.js', {ready:() => Boolean(window.TDBNativeTicker)})
      ]);
      await modules.load(new URL('tdb-announcement.js',TDBAnnouncementModuleRoot), {ready:() => Boolean(window.TDBAnnouncement)});
      return window.TDBAnnouncement;
    })().catch(error => { flight = null; throw error; });
    return flight;
  }
  window.TDBAnnouncementLoader = Object.freeze({load});
})();
