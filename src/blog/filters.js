/* Native CMS articles and metadata, with the shared filter and drawer UI. */
(() => {
  'use strict';
  if (window.TDBBlogFilters) return;
  const base = new URL('./', document.currentScript.src);
  let instance,
    flight,
    generation = 0;
  async function mount() {
    if (instance || flight) return flight;
    const root = document.querySelector('[data-tdb-blog-page]');
    if (!root || !window.TDBConsent?.allows()) return;
    const current = generation;
    const check = () => {
      if (current !== generation || !window.TDBConsent?.allows())
        throw new DOMException('Cancelled', 'AbortError');
    };
    flight = initialize(root, check).finally(() => {
      flight = null;
    });
    return flight;
  }
  async function initialize(root, check) {
    check();
    const modules = await window.TDBModuleBootstrap.ensure(base);
    check();
    const load = (name, ready, type) => modules.load(new URL(name, base), { ready, type });
    await load('tdb-motion.js', () => !!window.TDBMotion);
    check();
    await Promise.all([
      load('tdb-filters.css', undefined, 'style'),
      load('tdb-blog.css', undefined, 'style'),
      load('tdb-drawer.css', undefined, 'style'),
      load('tdb-drawer.js', () => !!window.TDBDrawer),
      load('tdb-filters.js', () => !!window.TDBFilters),
      load('tdb-ticker.js', () => !!window.TDBNativeTicker),
    ]);
    check();
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
    const form = panel.querySelector('[data-blog-category-form]');
    const list = root.querySelector('[data-blog-post-list]');
    const reset = panel.querySelector('[data-blog-filter-reset]');
    const apply = panel.querySelector('[data-blog-filter-apply]');
    const category = panel.querySelector('[data-blog-filter-group]');
    const definitions = [
      { key: 'category', label: 'Category', all: 'All categories' },
      { key: 'author', label: 'Author', all: 'All authors', icon: 'smile-icon-lotus' },
      {
        key: 'source',
        label: 'Article origin',
        all: 'Internal & external',
        icon: 'smile-icon-display',
      },
      {
        key: 'publication',
        label: 'Publication',
        all: 'All publications',
        icon: 'tdb-blog-icon-publication',
      },
      { key: 'product', label: 'Product', all: 'All products', icon: 'tdb-blog-icon-product' },
    ];
    const keyFor = (text) => text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-GB');
    const selected = Object.fromEntries(definitions.map(({ key }) => [key, new Set()]));
    const choices = Object.fromEntries(definitions.map(({ key }) => [key, new Map()]));
    const items = [...list.children].filter((item) => item.matches('.w-dyn-item'));
    const originalHidden = items.map((item) => item.hidden);
    const index = items.map((item) => {
      const values = {};
      for (const { key } of definitions) {
        values[key] = new Set();
        for (const node of item.querySelectorAll(`[data-blog-meta="${key}"]`)) {
          const labels =
            key === 'product' ? node.textContent.split(/\||\r?\n/) : [node.textContent];
          for (const text of labels) {
            const label = text.trim().replace(/\s+/g, ' '),
              value = keyFor(label);
            if (!value) continue;
            values[key].add(value);
            if (!choices[key].has(value)) choices[key].set(value, label);
          }
        }
      }
      return { item, values };
    });
    const generated = [],
      restorers = [];
    for (const input of form.querySelectorAll('input')) {
      const label = input
        .closest('label')
        ?.querySelector('.tdb-blog-filter-label')
        ?.textContent.trim();
      if (!label) continue;
      const old = {
        type: input.type,
        value: input.value,
        name: input.name,
        checked: input.checked,
      };
      restorers.push(() => {
        Object.assign(input, old);
        input.disabled = false;
        input.removeAttribute('aria-disabled');
        delete input.dataset.blogFilterField;
        input.closest('label').classList.remove('is-disabled');
      });
      input.type = 'checkbox';
      input.name = 'blog-category';
      input.value = keyFor(label);
      input.checked = false;
      input.dataset.blogFilterField = 'category';
      choices.category.set(input.value, label);
    }
    for (const definition of definitions.slice(1)) {
      const group = document.createElement('section');
      group.className = 'smile-filter_group';
      group.dataset.blogFilterGroup = definition.key;
      group.innerHTML =
        '<button type="button" class="smile-filter_group-toggle" aria-expanded="false"><span class="smile-filter_label"><span aria-hidden="true" class="smile-icon"></span><span data-blog-group-label></span></span><span class="smile-filter_selection" data-blog-filter-summary></span><span aria-hidden="true" class="smile-filter_chevron"></span></button><div class="smile-filter_options is-collapsed" data-blog-filter-options></div>';
      group.querySelector('[data-blog-group-label]').textContent = definition.label;
      group.querySelector('.smile-icon').classList.add(definition.icon);
      const options = group.querySelector('[data-blog-filter-options]');
      for (const [value, text] of [...choices[definition.key]].sort((a, b) =>
        a[1].localeCompare(b[1], 'en-GB'),
      )) {
        const label = document.createElement('label'),
          input = document.createElement('input'),
          span = document.createElement('span');
        label.className = 'tdb-blog-filter';
        input.type = 'checkbox';
        input.name = 'blog-' + definition.key;
        input.value = value;
        input.dataset.blogFilterField = definition.key;
        span.className = 'tdb-blog-filter-label';
        span.textContent = text;
        label.append(input, span);
        options.append(label);
      }
      category.parentElement.append(group);
      generated.push(group);
    }
    const groups = [category, ...generated];
    const inputs = [...panel.querySelectorAll('[data-blog-filter-field]')];
    const matches = (record, except) =>
      definitions.every(
        ({ key }) =>
          key === except ||
          !selected[key].size ||
          [...selected[key]].some((value) => record.values[key].has(value)),
      );
    const sticky = window.TDBFilters.mountDock({
      root,
      start: root,
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
      disclosures: groups.map((group, i) => ({
        key: definitions[i].key,
        group,
        button: group.querySelector('button'),
        body: group.querySelector('[data-blog-filter-options]'),
        chevron: group.querySelector('.smile-filter_chevron'),
      })),
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
      let selectionCount = 0,
        total = 0;
      for (const [i, { key, all }] of definitions.entries()) {
        selectionCount += selected[key].size;
        groups[i].querySelector('[data-blog-filter-summary]').textContent = selected[key].size
          ? [...selected[key]].map((value) => choices[key].get(value)).join(', ')
          : all;
      }
      for (const record of index) {
        record.item.hidden = !matches(record);
        if (!record.item.hidden) total++;
      }
      for (const input of inputs) {
        const key = input.dataset.blogFilterField;
        input.checked = selected[key].has(input.value);
        // Count this option against the other groups. Selected options always
        // stay enabled so a visitor can remove them, even after CMS updates.
        input.disabled =
          !input.checked &&
          !index.some((record) => matches(record, key) && record.values[key].has(input.value));
        input.setAttribute('aria-disabled', String(input.disabled));
        input.closest('label').classList.toggle('is-disabled', input.disabled);
      }
      filters.setCount(selectionCount);
      reset.disabled = selectionCount === 0;
      reset.classList.toggle('is-disabled', !selectionCount);
      reset.setAttribute('aria-disabled', String(!selectionCount));
      ticker.update(String(total), count !== null && total < count ? -1 : 1, count !== null);
      count = total;
      apply.setAttribute('aria-label', `View ${total} ${total === 1 ? 'post' : 'posts'}`);
      apply.querySelector('[data-blog-filter-plural]').classList.toggle('is-singular', total === 1);
      sticky.refresh();
    }
    listen(form, 'submit', (event) => event.preventDefault());
    listen(panel, 'change', (event) => {
      const input = event.target.closest('[data-blog-filter-field]');
      if (!input || input.disabled) return;
      const values = selected[input.dataset.blogFilterField];
      if (input.checked) values.add(input.value);
      else values.delete(input.value);
      update();
    });
    listen(reset, 'click', () => {
      Object.values(selected).forEach((values) => values.clear());
      filters.collapseAll();
      update();
    });
    listen(apply, 'click', () => filters.set(false));
    update();
    root.dataset.blogReady = 'true';
    instance = {
      destroy() {
        lifecycle.abort();
        moving?.cancel();
        filters.destroy();
        drawer.destroy();
        ticker.destroy();
        sticky.destroy();
        generated.forEach((group) => group.remove());
        restorers.forEach((restore) => restore());
        items.forEach((item, i) => {
          item.hidden = originalHidden[i];
        });
        delete root.dataset.blogReady;
        instance = null;
      },
    };
  }
  window.TDBBlogFilters = Object.freeze({
    mount,
    destroy() {
      generation++;
      instance?.destroy();
    },
  });
})();
