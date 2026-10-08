/* Shared vertical-panel motion. Bundled with each consumer; no loading gate. */
(() => {
  if (window.TDBPanelMotion?.bind) return;
  const duration = (height = document.documentElement.clientHeight || innerHeight || 375) =>
    Math.round(Math.min(950, Math.max(400, 400 * Math.sqrt(height / 375))));
  window.TDBPanelMotion = Object.freeze({
    version: '1.1.0',
    duration,
    easing: 'cubic-bezier(0.165,0.84,0.44,1)',
    // Capture one clock for each native panel cycle, including close cleanup.
    bind(node, prefix) {
      let milliseconds;
      function prepare() {
        milliseconds = duration();
        node.style.setProperty(prefix + '-duration', milliseconds + 'ms');
        node.style.setProperty(prefix + '-ease', 'cubic-bezier(0.165,0.84,0.44,1)');
      }
      prepare();
      return Object.freeze({prepare, get cleanup() { return milliseconds + 50; }});
    },
  });
})();
