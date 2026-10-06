/* Capture one clock for the whole open/close cycle, including arrow and cleanup. */
(() => {
  if (window.TDBVIPMotion) return;
  window.TDBVIPMotion = drawer => {
    let duration;
    function prepare() {
      duration = window.TDBPanelMotion.duration();
      drawer.style.setProperty('--tdb-vip-drawer-duration', duration + 'ms');
      drawer.style.setProperty('--tdb-vip-drawer-ease', window.TDBPanelMotion.easing);
    }
    prepare();
    return Object.freeze({prepare, get cleanup() { return duration + 50; }});
  };
})();
