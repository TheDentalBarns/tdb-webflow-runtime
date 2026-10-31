/* Shared vertical-panel motion. Bundled with each consumer; no loading gate. */
(() => {
  if (window.TDBPanelMotion?.bind) return;
  const rootProfile = window.TDBMotionProfile;
  function create(profile) {
    const easing =
      profile?.easing('panel', 'cubic-bezier(0.165,0.84,0.44,1)') ||
      'cubic-bezier(0.165,0.84,0.44,1)';
    const duration = (height = document.documentElement.clientHeight || innerHeight || 375) =>
      profile?.vertical(height) ??
      Math.round(Math.min(950, Math.max(400, 400 * Math.sqrt(height / 375))));
    return Object.freeze({
      version: '1.1.0',
      duration,
      easing,
      // Capture one clock for each native panel cycle, including close cleanup.
      bind(node, prefix) {
        let milliseconds;
        function prepare() {
          milliseconds = duration();
          node.style.setProperty(prefix + '-duration', milliseconds + 'ms');
          node.style.setProperty(prefix + '-ease', easing);
        }
        prepare();
        return Object.freeze({
          prepare,
          get cleanup() {
            return milliseconds + 50;
          },
        });
      },
    });
  }
  const families = new Map();
  const base = create(rootProfile);
  window.TDBPanelMotion = Object.freeze({
    ...base,
    forFamily(name) {
      if (!families.has(name))
        families.set(name, create(rootProfile?.forFamily?.(name) || rootProfile));
      return families.get(name);
    },
  });
})();
