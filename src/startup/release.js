/* One immutable location for every first-party runtime asset. */
(() => {
  'use strict';
  if (window.TDBRelease) return;
  const entry = document.currentScript;
  if (!entry?.src) throw Error('TDB startup must be loaded from an external script');
  const base = new URL('./', entry.src).href;
  const commit = entry.src.match(/tdb-webflow-runtime@([a-f0-9]{40})\//)?.[1] || null;
  window.TDBRelease = Object.freeze({
    version: '2.0.0',
    commit,
    base,
    asset: (filename) => new URL(filename, base).href,
  });
})();
