/* Smile Gallery v2.0.0. Native page shell, shared feed/cards, drawer, filters and tickers. */
(() => {
  'use strict';
  if (window.TDBSmilePage) return;
  const base = new URL('./', document.currentScript.src);
  let instance, flight;
  const key = 'tdb-smile-gallery-view';
  const slug = (text) =>
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[®™]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  const getSaved = () => {
    try {
      return JSON.parse(sessionStorage.getItem(key)) || {};
    } catch {
      return {};
    }
  };
  function nativeCases() {
    const source = document.querySelector('[data-smile-page-source]');
    if (!source) throw Error('Gallery CMS source missing');
    const cases = [...source.querySelectorAll('[data-tdb-sg-case]')].map((node) => {
      const text = (field) =>
        (node.querySelector(`[data-tdb-sg-${field}]`)?.textContent || '')
          .trim()
          .replace(/\s+/g, ' ');
      const image = node.querySelector('[data-tdb-sg-image]');
      if (!image?.src || !text('title')) throw Error('Incomplete gallery case');
      return {
        node,
        item: node.closest('.w-dyn-item') || node,
        id: image.getAttribute('src'),
        title: text('title'),
        description: text('description'),
        image: { src: image.src, alt: image.alt },
        price: text('price-value'),
        duration: text('duration-value'),
        clinician: text('clinician-value'),
        treatments: [
          ...new Set(
            [...node.querySelectorAll('[data-tdb-sg-treatment-name]')].map((n) =>
              n.textContent.trim(),
            ),
          ),
        ],
      };
    });
    const price = (item) =>
      Number(item.price.replace(/,/g, '').match(/\d+(?:\.\d+)?/)?.[0] || Infinity);
    cases.sort((a, b) => price(a) - price(b));
    if (!cases.length) throw Error('Gallery has no published cases');
    return { version: 1, feed: 'smiles', total: cases.length, cases };
  }
  async function mount() {
    if (instance || flight) return flight;
    const page = document.querySelector('[data-tdb-smile-page]');
    if (!page || !window.TDBConsent?.allows()) return;
    flight = initialize(page).finally(() => {
      flight = null;
    });
    return flight;
  }
  function comparison(photo, original, listen) {
    const before = document.createElement('div');
    const after = document.createElement('div');
    before.className = 'smile-comparison_before';
    after.className = 'smile-comparison_after';
    const images = [before, after].map((layer) => {
      const image = document.createElement('img');
      image.alt = '';
      image.draggable = false;
      image.loading = 'lazy';
      layer.append(image);
      return image;
    });
    const range = document.createElement('input');
    Object.assign(range, { type: 'range', min: '0', max: '100', value: '50' });
    range.className = 'smile-comparison_range';
    range.setAttribute('aria-label', 'Reveal before and after smile');
    const handle = document.createElement('span');
    handle.className = 'smile-comparison_handle';
    handle.setAttribute('aria-hidden', 'true');
    photo.dataset.smileComparison = 'true';
    original.hidden = true;
    original.draggable = false;
    photo.append(after, before, handle, range);
    let dragging = false,
      moved = false,
      originX = 0;
    const update = () => {
      const value = Math.round(Math.max(0, Math.min(100, Number(range.value))));
      photo.style.setProperty('--smile-reveal', value + '%');
      range.setAttribute('aria-valuetext', value + '% before, ' + (100 - value) + '% after');
    };
    const position = (event) => {
      const bounds = photo.getBoundingClientRect();
      range.value = String(((event.clientX - bounds.left) / bounds.width) * 100);
      update();
    };
    listen(range, 'pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      originX = event.clientX;
      dragging = true;
      moved = false;
      range.focus({ preventScroll: true });
      range.setPointerCapture?.(event.pointerId);
    });
    listen(range, 'pointermove', (event) => {
      if (!dragging) return;
      if (Math.abs(event.clientX - originX) > 3) moved = true;
      if (moved) {
        event.preventDefault();
        position(event);
      }
    });
    const finish = (event) => {
      dragging = false;
      if (range.hasPointerCapture?.(event.pointerId)) range.releasePointerCapture(event.pointerId);
    };
    listen(range, 'pointerup', finish);
    listen(range, 'pointercancel', finish);
    listen(range, 'input', update);
    listen(range, 'keydown', (event) => event.stopPropagation());
    listen(photo, 'dragstart', (event) => event.preventDefault());
    const refresh = () => {
      for (const image of images) {
        const src = original.getAttribute('src');
        if (src) image.src = src;
      }
      range.value = '50';
      moved = false;
      update();
    };
    refresh();
    return {
      refresh,
      dragged: () => moved,
      destroy() {
        for (const element of [before, after, handle, range]) element.remove();
        original.hidden = false;
        delete photo.dataset.smileComparison;
        photo.style.removeProperty('--smile-reveal');
      },
    };
  }
  async function initialize(page) {
    // Webflow exports its native controls as links/blocks. Keep their authored
    // content and styles, but give interactive controls native button behavior.
    for (const scope of [page, document.querySelector('[data-smile-case-drawer]')])
      for (const control of scope.querySelectorAll('[type="button"]:not(button)')) {
        const button = document.createElement('button');
        for (const { name, value } of control.attributes)
          if (name !== 'href') button.setAttribute(name, value);
        button.append(...control.childNodes);
        control.replaceWith(button);
      }
    const lifecycle = new AbortController(),
      { signal } = lifecycle;
    const load = (name, ready, type) =>
      window.TDBModules.load(new URL(name, base), { ready, type });
    const stage = page.querySelector('[data-smile-page-stage]');
    const status = page.querySelector('[data-smile-page-status]');

    const cleanup = [];
    const dispose = () => {
      lifecycle.abort();
      for (const release of cleanup.reverse()) release();

      page.removeAttribute('data-smile-page-ready');
      instance = null;
    };
    page.setAttribute('aria-busy', 'true');
    page.querySelector('[data-smile-page-retry]').hidden = true;
    try {
      await Promise.all([
        load('tdb-smile-page.css', undefined, 'style'),
        load('tdb-drawer.js', () => !!window.TDBDrawer),
        load('tdb-drawer.css', undefined, 'style'),
        load('tdb-filters.js', () => !!window.TDBFilters),
        load('tdb-ticker.js', () => !!window.TDBNativeTicker),
      ]);
      if (!window.TDBConsent?.allows()) throw new DOMException('Cancelled', 'AbortError');
      const payload = nativeCases();
      if (!window.TDBConsent?.allows()) throw new DOMException('Cancelled', 'AbortError');
      const saved = getSaved(),
        url = new URL(location.href);
      const mode =
        (url.searchParams.get('display') || saved.display) === 'slider' ? 'slider' : 'before-after';
      const treatments = [...new Set(payload.cases.flatMap((item) => item.treatments))].sort();
      const clinicians = [
        ...new Set(payload.cases.map((item) => item.clinician).filter(Boolean)),
      ].sort();
      let chosen = new Set(
        (url.searchParams.has('treatments')
          ? url.searchParams.get('treatments').split(',')
          : saved.treatments || []
        ).filter((value) => treatments.some((t) => slug(t) === value)),
      );
      let clinician = url.searchParams.get('clinician') || saved.clinician || '';
      if (!clinicians.includes(clinician)) clinician = '';
      let cases = [],
        currentId = saved.currentId,
        drawerIndex = 0,
        stageVisible = true;
      const filterHome = page.querySelector('[data-smile-filter-home]');
      const dock = page.querySelector('[data-smile-filter-dock]');
      const panel = dock.querySelector('[data-smile-filter-panel]');
      const toggle = dock.querySelector('[data-smile-filter-toggle]');
      const apply = panel.querySelector('[data-smile-filter-apply]');
      const drawerRoot = document.querySelector('[data-smile-case-drawer]');
      const drawerPanel = drawerRoot.querySelector('[data-tdb-drawer-panel]');
      const close = drawerRoot.querySelector('[data-tdb-drawer-close]');
      const reading = drawerRoot.querySelector('[data-smile-case-reading]');
      const previous = drawerRoot.querySelector('[data-smile-case-previous]');
      const next = drawerRoot.querySelector('[data-smile-case-next]');
      const matches = (item, selection = chosen, doctor = clinician) =>
        (!doctor || item.clinician === doctor) &&
        [...selection].every((value) => item.treatments.some((t) => slug(t) === value));
      const persist = (display = mode, reopen = false) => {
        try {
          sessionStorage.setItem(
            key,
            JSON.stringify({ display, treatments: [...chosen], clinician, currentId, reopen }),
          );
        } catch {}
      };
      const listen = (node, type, fn, options = {}) =>
        node.addEventListener(type, fn, { signal, ...options });
      const option = (label, value, group, checked, type) => {
        const row = document.createElement('label');
        row.className = 'smile-page-filter_option';
        const input = document.createElement('input');
        input.type = type;
        input.name = group;
        input.value = value;
        input.checked = checked;
        const text = document.createElement('span');
        text.textContent = label;
        row.append(input, text);
        return row;
      };
      panel
        .querySelector('[data-smile-treatment-options]')
        .replaceChildren(
          ...treatments.map((t) =>
            option(t, slug(t), 'smile-treatment', chosen.has(slug(t)), 'checkbox'),
          ),
        );
      panel
        .querySelector('[data-smile-clinician-options]')
        .replaceChildren(
          ...['', ...clinicians].map((t) =>
            option(t || 'All clinicians', t, 'smile-clinician', clinician === t, 'radio'),
          ),
        );
      panel.querySelectorAll('[name="smile-display"]').forEach((input) => {
        input.checked = input.value === mode;
        input.setAttribute('aria-label', input.value === 'slider' ? 'Slider' : 'Before / after');
      });
      const draft = () => ({
        treatments: new Set(
          [...panel.querySelectorAll('[name="smile-treatment"]:checked')].map(
            (input) => input.value,
          ),
        ),
        clinician: panel.querySelector('[name="smile-clinician"]:checked')?.value || '',
        display: panel.querySelector('[name="smile-display"]:checked')?.value || mode,
      });
      const updateCount = () => {
        const selection = draft(),
          total = payload.cases.filter((item) =>
            matches(item, selection.treatments, selection.clinician),
          ).length;
        apply.textContent = `View ${total} smile${total === 1 ? '' : 's'}`;
      };
      const countSlot = drawerRoot.querySelector('[data-smile-case-count]');
      const counter = window.TDBNativeTicker.mount(countSlot, {
        template: drawerRoot,
        valueClass: 'smile-page-count_value',
        incomingClass: 'smile-page-count_value',
      });
      cleanup.push(() => counter.destroy());
      const drawerPhoto = reading.querySelector('.smile-page_drawer-photo');
      const drawerImage = drawerPhoto.querySelector('img');
      const drawerComparison =
        mode === 'slider' ? comparison(drawerPhoto, drawerImage, listen) : null;
      if (drawerComparison) cleanup.push(drawerComparison.destroy);
      const paintCase = (index, direction = 1) => {
        if (!cases.length) return;
        drawerIndex = (index + cases.length) % cases.length;
        const item = cases[drawerIndex];
        currentId = item.id;
        persist();
        const image = drawerImage;
        image.src = item.image.src;
        image.alt = item.image.alt;
        drawerComparison?.refresh();
        for (const field of ['title', 'description', 'price', 'duration', 'clinician'])
          reading.querySelector(`[data-smile-case-${field}]`).textContent = item[field];
        reading.querySelector('[data-smile-case-treatments]').replaceChildren(
          ...item.treatments.map((t) => {
            const li = document.createElement('li');
            li.textContent = t;
            return li;
          }),
        );
        counter.update(String(drawerIndex + 1).padStart(2, '0'), direction);
        drawerRoot.querySelector('[data-smile-case-total]').textContent = String(
          cases.length,
        ).padStart(2, '0');
        drawerRoot.querySelector('[data-smile-case-announcement]').textContent =
          `Smile ${drawerIndex + 1} of ${cases.length}: ${item.title}`;
        previous.disabled = next.disabled = cases.length < 2;
        reading.scrollTop = 0;
      };
      const drawer = window.TDBDrawer.mount(drawerRoot, {
        hideChrome: true,
        onOpen() {
          drawerPanel.append(dock);
          dock.classList.add('is-in-drawer');
          dock.classList.remove('is-offscreen');
        },
        onClose() {
          filters.reset();
          filterHome.append(dock);
          dock.classList.remove('is-in-drawer');
          dock.classList.toggle('is-offscreen', !stageVisible);
        },
        returnFocus: () =>
          cases[drawerIndex]?.node.querySelector('[data-smile-grid-photo]') || toggle,
      });
      cleanup.push(() => {
        drawer.destroy();
        filterHome.append(dock);
        dock.classList.remove('is-in-drawer', 'is-expanded', 'is-offscreen');
      });
      const filters = window.TDBFilters.mount(panel, {
        toggle,
        heading: panel.querySelector('h3'),
        badge: dock.querySelector('[data-smile-filter-badge]'),
        blockedControls: [close, previous, next],
        escapeRoot: document,
        labels: { open: 'Open smile filters', close: 'Close smile filters' },
        onChange(open) {
          dock.classList.toggle('is-expanded', open);
          if (open) updateCount();
        },
      });
      cleanup.push(() => filters.destroy());
      filters.setCount(chosen.size + Number(!!clinician));
      listen(panel, 'change', updateCount);
      listen(panel, 'submit', (event) => event.preventDefault());
      listen(panel.querySelector('[data-smile-filter-reset]'), 'click', () => {
        panel.querySelectorAll('[name="smile-treatment"]').forEach((input) => {
          input.checked = false;
        });
        panel.querySelector('[name="smile-clinician"][value=""]').checked = true;
        updateCount();
      });
      const openCase = (index, source) => {
        if (!cases.length) return;
        paintCase(index);
        drawer.open(source);
      };
      const comparisons = new Map();
      for (const item of payload.cases) {
        item.item.parentElement.append(item.item);
        const photo = item.node.querySelector('[data-smile-grid-photo]');
        photo.setAttribute('aria-label', 'View case: ' + item.title);
        photo.setAttribute('aria-haspopup', 'dialog');
        photo.setAttribute('aria-controls', drawerPanel.id);
        const image = photo.querySelector('img');
        image.draggable = false;
        if (mode === 'slider') comparisons.set(photo, comparison(photo, image, listen));
      }
      window.TDBLazyIconMasks?.refresh();
      cleanup.push(() => {
        for (const item of payload.cases) item.item.hidden = false;
        for (const control of comparisons.values()) control.destroy();
      });
      async function render() {
        cases = payload.cases.filter((item) => matches(item));
        for (const item of payload.cases) item.item.hidden = !cases.includes(item);
        status.textContent = cases.length + (cases.length === 1 ? ' smile' : ' smiles');
        page.querySelector('[data-smile-empty]').hidden = !!cases.length;
        if (!cases.length) {
          await drawer.close(true);
          persist();
          return;
        }
        const index = Math.max(
          0,
          cases.findIndex((item) => item.id === currentId),
        );
        currentId = cases[index].id;
        if (!drawerRoot.hidden) paintCase(index);
        persist();
      }
      listen(stage, 'click', (event) => {
        const photo = event.target.closest('[data-smile-grid-photo]');
        if (!photo) return;
        event.preventDefault();
        if (comparisons.get(photo)?.dragged()) return;
        const index = cases.findIndex((item) => item.node.contains(photo));
        if (index >= 0) openCase(index, photo);
      });
      listen(stage, 'keydown', (event) => {
        if (event.target.matches('input')) return;
        const photo = event.target.closest('[data-smile-grid-photo]');
        if (photo && ['Enter', ' '].includes(event.key)) {
          event.preventDefault();
          openCase(
            cases.findIndex((item) => item.node.contains(photo)),
            photo,
          );
        }
      });
      listen(previous, 'click', () => paintCase(drawerIndex - 1, -1));
      listen(next, 'click', () => paintCase(drawerIndex + 1));
      listen(drawerPanel, 'keydown', (event) => {
        if (filters.isOpen || event.target.matches('input,select,textarea')) return;
        if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
          event.preventDefault();
          const direction = event.key === 'ArrowLeft' ? -1 : 1;
          paintCase(drawerIndex + direction, direction);
        }
      });
      listen(apply, 'click', async () => {
        const selection = draft();
        chosen = selection.treatments;
        clinician = selection.clinician;
        filters.setCount(chosen.size + Number(!!clinician));
        persist(selection.display, !drawerRoot.hidden);
        if (selection.display !== mode) {
          const destination = new URL(location.href);
          destination.searchParams.set('display', selection.display);
          if (chosen.size) destination.searchParams.set('treatments', [...chosen].join(','));
          else destination.searchParams.delete('treatments');
          if (clinician) destination.searchParams.set('clinician', clinician);
          else destination.searchParams.delete('clinician');
          destination.hash = 'smile-gallery-cases';
          location.assign(destination.href);
          return;
        }
        filters.set(false);
        apply.disabled = true;
        try {
          await render();
        } finally {
          apply.disabled = false;
        }
      });
      const observer = new IntersectionObserver(
        (entries) => {
          stageVisible = entries.some((entry) => entry.isIntersecting);
          if (!drawerRoot.hidden) return;
          dock.classList.toggle('is-offscreen', !stageVisible);
          if (!stageVisible) filters.reset();
        },
        { threshold: 0 },
      );
      cleanup.push(() => observer.disconnect());
      observer.observe(stage);
      await render();
      updateCount();
      page.dataset.smilePageReady = 'true';
      page.removeAttribute('aria-busy');
      if (saved.reopen && cases.length)
        openCase(
          Math.max(
            0,
            cases.findIndex((item) => item.id === saved.currentId),
          ),
        );
      const unsubscribe = window.TDBConsent.subscribe(() => {
        if (!window.TDBConsent.allows()) instance?.destroy();
      });
      cleanup.push(() => unsubscribe?.());
      instance = { destroy: dispose };
    } catch (error) {
      dispose();
      page.removeAttribute('aria-busy');
      status.textContent = 'The gallery could not load. Please try again.';
      page.querySelector('[data-smile-page-retry]').hidden = false;
      throw error;
    }
  }
  window.TDBSmilePage = Object.freeze({
    version: '2.0.0',
    mount,
    destroy() {
      instance?.destroy();
    },
  });
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-smile-page-retry]')) mount().catch(() => {});
  });
})();
