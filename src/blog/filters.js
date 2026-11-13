/* Blog categories retain their native CMS/Finsweet bindings. Shared filter UI. */
(() => {
  'use strict';
  if (window.TDBBlogFilters) return;
  const base = new URL('./', document.currentScript.src);
  let instance, flight;
  async function mount() {
    if (instance || flight) return flight;
    const root = document.querySelector('[data-tdb-blog-page]');
    if (!root) return;
    flight = initialize(root).finally(() => {
      flight = null;
    });
    return flight;
  }
  async function initialize(root) {
    const modules = await window.TDBModuleBootstrap.ensure(base);
    const load = (name, ready, type) => modules.load(new URL(name, base), { ready, type });
    await load('tdb-motion.js', () => !!window.TDBMotion);
    await Promise.all([
      load('tdb-smile-page.css', undefined, 'style'),
      load('tdb-blog.css', undefined, 'style'),
      load('tdb-drawer.css', undefined, 'style'),
      load('tdb-drawer.js', () => !!window.TDBDrawer),
      load('tdb-filters.js', () => !!window.TDBFilters),
      load('tdb-ticker.js', () => !!window.TDBNativeTicker),
    ]);
    for (const control of root.querySelectorAll('[type="button"]:not(button)')) {
      const button = document.createElement('button');
      for (const { name, value } of control.attributes)
        if (name !== 'href') button.setAttribute(name, value);
      button.append(...control.childNodes);
      control.replaceWith(button);
    }
    const lifecycle = new AbortController(),
      { signal } = lifecycle;
    const listen = (node, type, fn) => node.addEventListener(type, fn, { signal });
    const dock = root.querySelector('[data-blog-filter-dock]');
    const toggle = dock.querySelector('[data-blog-filter-toggle]');
    const panel = dock.querySelector('[data-blog-filter-panel]');
    const heading = panel.querySelector('h3');
    const dialog = root.querySelector('[data-blog-filter-drawer]');
    const dialogPanel = dialog.querySelector('[data-tdb-drawer-panel]');
    const form = panel.querySelector('[fs-list-element="filters"]');
    const list = root.querySelector('[fs-list-element="list"]');
    const reset = panel.querySelector('[data-blog-filter-reset]');
    const apply = panel.querySelector('[data-blog-filter-apply]');
    const summary = panel.querySelector('[data-blog-filter-summary]');
    const group = panel.querySelector('[data-blog-filter-group]');
    const sticky = window.TDBFilters.mountDock({
      root,
      dock,
      home: root.querySelector('[data-blog-filter-home]'),
      landing: root.querySelector('[data-blog-filter-landing]'),
    });
    const ticker = window.TDBNativeTicker.mount(apply.querySelector('[data-blog-filter-count]'));
    let filters,
      count = null,
      moving;
    function move(from, to) {
      moving?.cancel();
      if (window.TDBMotion.reduced.matches) return;
      moving = toggle.animate(
        [
          { translate: `${from.left - to.left}px ${from.top - to.top}px` },
          { translate: '0px 0px' },
        ],
        {
          duration: window.TDBMotion.duration(innerWidth),
          easing: window.TDBMotion.easing?.('travel') || 'ease',
          fill: 'both',
        },
      );
      const current = moving;
      current.finished
        .catch(() => {})
        .finally(() => {
          if (moving === current) {
            current.cancel();
            moving = null;
          }
        });
    }
    const drawer = window.TDBDrawer.mount(dialog, {
      hideChrome: true,
      onOpen() {
        const from = toggle.getBoundingClientRect();
        dialogPanel.append(dock);
        dock.classList.add('is-in-drawer');
        move(from, toggle.getBoundingClientRect());
      },
      onClose() {
        filters.set(false);
        moving?.cancel();
        if (!window.TDBMotion.reduced.matches) {
          const from = toggle.getBoundingClientRect(),
            to = sticky.anchor.getBoundingClientRect();
          moving = toggle.animate(
            [
              { translate: '0px 0px' },
              { translate: `${to.left - from.left}px ${to.top - from.top}px` },
            ],
            {
              duration: window.TDBMotion.duration(innerWidth),
              easing: window.TDBMotion.easing?.('travel') || 'ease',
              fill: 'both',
            },
          );
        }
      },
      onClosed() {
        moving?.cancel();
        moving = null;
        dock.classList.remove('is-in-drawer');
        sticky.restore();
        filters.reset();
      },
      returnFocus: () => toggle,
    });
    filters = window.TDBFilters.mount(panel, {
      toggle,
      heading,
      badge: dock.querySelector('[data-blog-filter-badge]'),
      escapeRoot: document,
      disclosures: [
        {
          key: 'category',
          group,
          button: group.querySelector('button'),
          body: group.querySelector('[data-blog-filter-options]'),
          chevron: group.querySelector('.smile-filter_chevron'),
        },
      ],
      labels: { open: 'Open blog filters', close: 'Close blog filters' },
      onChange(open) {
        dock.classList.toggle('is-expanded', open);
        if (open) {
          drawer.open(toggle, { animatePanel: false });
          heading.focus({ preventScroll: true });
        } else drawer.close();
      },
    });
    function update() {
      const selected = form.querySelector('input:checked');
      const label = selected
        ?.closest('label')
        ?.querySelector('.tdb-blog-filter-label')
        ?.textContent.trim();
      summary.textContent = label || 'All categories';
      filters.setCount(selected ? 1 : 0);
      reset.disabled = !selected;
      reset.classList.toggle('is-disabled', !selected);
      reset.setAttribute('aria-disabled', String(!selected));
      const total = [...list.children].filter(
        (item) =>
          item.matches('.w-dyn-item') && !item.hidden && getComputedStyle(item).display !== 'none',
      ).length;
      ticker.update(String(total), count !== null && total < count ? -1 : 1, count !== null);
      count = total;
      apply.setAttribute('aria-label', `View ${total} ${total === 1 ? 'post' : 'posts'}`);
      apply.querySelector('[data-blog-filter-plural]').classList.toggle('is-singular', total === 1);
      sticky.refresh();
    }
    listen(form, 'submit', (event) => event.preventDefault());
    listen(form, 'change', update);
    listen(reset, 'click', () => {
      form.querySelector('[fs-list-element="clear"]').click();
      filters.collapseAll();
      update();
    });
    listen(apply, 'click', () => filters.set(false));
    const observer = new MutationObserver(update);
    observer.observe(list, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden'],
    });
    update();
    root.dataset.blogReady = 'true';
    instance = {
      destroy() {
        observer.disconnect();
        lifecycle.abort();
        moving?.cancel();
        filters.destroy();
        drawer.destroy();
        ticker.destroy();
        sticky.destroy();
        delete root.dataset.blogReady;
        instance = null;
      },
    };
  }
  window.TDBBlogFilters = Object.freeze({
    mount,
    destroy() {
      instance?.destroy();
    },
  });
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => mount().catch(() => {}), { once: true });
  else mount().catch(() => {});
})();
