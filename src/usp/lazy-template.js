/* Native Designer snapshot, requested on explicit USP open only.
 * Source content stays in an inert fragment; only the shared shell enters the DOM.
 */
(() => {
  'use strict';
  if (window.TDBUSPDrawerTemplate) return;
  const html = __TDB_USP_DRAWER_HTML__, sources = __TDB_USP_SOURCES_HTML__;
  const instances = new WeakMap();
  window.TDBUSPDrawerTemplate = Object.freeze({
    version: '1.0.0',
    records(section) { return instances.get(section)?.records; },
    mount(section) {
      if (instances.has(section)) return instances.get(section).root;
      const host = section.querySelector('[data-tdb-usp-mount]');
      if (!host?.isConnected) throw Error('Practice highlights mount unavailable');
      const template = document.createElement('template');
      template.innerHTML = html;
      const shell = template.content.firstElementChild;
      const root = shell?.querySelector('[data-tdb-usp-content]');
      if (!root) throw Error('Practice highlights template invalid');
      const data = document.createElement('template');
      data.innerHTML = sources;
      const records = [...data.content.querySelectorAll('[data-tdb-usp-source]')].map(source => ({
        title: source.querySelector('[data-tdb-usp-source-title]').textContent.trim(),
        logo: source.querySelector('[data-tdb-usp-source-logo]'),
        body: source.querySelector('[data-tdb-usp-source-body]')
      }));
      if (!records.length) throw Error('Practice highlights content unavailable');
      shell.setAttribute('data-tdb-usp-shell', '');
      shell.hidden = true; shell.inert = true;
      host.append(shell);
      instances.set(section, {root, records});
      return root;
    }
  });
})();
