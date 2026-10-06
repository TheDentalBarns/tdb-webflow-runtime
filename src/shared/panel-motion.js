/* Shared vertical-panel motion. Bundled with each consumer; no loading gate. */
(() => {
  if (window.TDBPanelMotion) return;
  const duration = (height = document.documentElement.clientHeight || innerHeight || 375) =>
    Math.round(Math.min(950, Math.max(400, 400 * Math.sqrt(height / 375))));
  window.TDBPanelMotion = Object.freeze({
    version: '1.0.0',
    duration,
    easing: 'cubic-bezier(0.165,0.84,0.44,1)',
  });
})();
