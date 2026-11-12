/* Smile Gallery v2.1.0. Native CMS grid, review-style filters, comparisons and shared motion. */
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
        gender: ['male', 'female'].includes(text('gender-value').toLowerCase())
          ? text('gender-value').toLowerCase()
          : '',
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
    const registrations = [];
    const register = listen;
    listen = (node, type, handler, options) => {
      register(node, type, handler, options);
      registrations.push(() => node.removeEventListener(type, handler, options));
    };
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
        for (const remove of registrations) remove();
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
      const saved = getSaved(),
        url = new URL(location.href);
      let mode =
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
      const orders = {
        'price-asc': 'Price: low to high',
        'price-desc': 'Price: high to low',
        'duration-asc': 'Duration: low to high',
        'duration-desc': 'Duration: high to low',
      };
      let order = url.searchParams.get('order') || saved.order || 'price-asc';
      if (!orders[order]) order = 'price-asc';
      let gender = url.searchParams.get('gender') || saved.gender || '';
      if (!['male', 'female'].includes(gender)) gender = '';
      const numericPrice = (item) =>
        Number(item.price.replace(/,/g, '').match(/\d+(?:\.\d+)?/)?.[0] || Infinity);
      // Compare the starting estimate of ranges; normalize mixed CMS units to minutes.
      const durationMinutes = (item) => {
        const match = item.duration
          .toLowerCase()
          .match(
            /(\d+(?:\.\d+)?)\s*(?:[-–]\s*\d+(?:\.\d+)?\s*)?(minute|min|hour|hr|day|week|month|year)/,
          );
        if (!match) return Infinity;
        return (
          Number(match[1]) *
          {
            minute: 1,
            min: 1,
            hour: 60,
            hr: 60,
            day: 1440,
            week: 10080,
            month: 43830,
            year: 525960,
          }[match[2]]
        );
      };
      let cases = [],
        currentId = saved.currentId,
        drawerIndex = 0,
        stageVisible = true,
        filteringFromPage = false,
        closingTimer;
      const filterHome = page.querySelector('[data-smile-filter-home]');
      const embedded = page.querySelector('[data-smile-embedded-filter]');
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
      const motion = window.TDBMotion;
      const animations = new Set();
      const animate = async (node, frames, duration) => {
        if (!node?.animate || motion.reduced.matches || signal.aborted) return;
        const animation = node.animate(frames, {
          duration,
          easing: motion.easing?.('fade', 'ease') || 'ease',
          fill: 'both',
        });
        animations.add(animation);
        try {
          await animation.finished;
        } catch {
        } finally {
          animation.cancel();
          animations.delete(animation);
        }
      };
      cleanup.push(() => {
        clearTimeout(closingTimer);
        for (const a of animations) a.cancel();
      });
      const fadeOut = motion.defaults?.fadeOut || 120,
        fadeIn = motion.defaults?.fadeIn || 350;
      const listen = (node, type, fn, options = {}) =>
        node.addEventListener(type, fn, { signal, ...options });
      const matches = (item, selection = chosen, doctor = clinician, patient = gender) =>
        (!doctor || item.clinician === doctor) &&
        (!patient || item.gender === patient) &&
        [...selection].every((value) => item.treatments.some((t) => slug(t) === value));
      const persist = () => {
        try {
          sessionStorage.setItem(
            key,
            JSON.stringify({
              display: mode,
              treatments: [...chosen],
              clinician,
              gender,
              order,
              currentId,
            }),
          );
        } catch {}
      };
      const forms = [panel, embedded];
      const option = (label, value, group, checked, type, prefix) => {
        const row = document.createElement('label');
        row.className = 'smile-page-filter_option';
        const input = document.createElement('input');
        Object.assign(input, { type, name: prefix + 'smile-' + group, value, checked });
        input.dataset.smileOption = group;
        const text = document.createElement('span');
        text.textContent = label;
        row.append(input, text);
        return row;
      };
      for (const [index, form] of forms.entries()) {
        const prefix = index ? 'embedded-' : '';
        form
          .querySelector('[data-smile-options="order"]')
          .replaceChildren(
            ...Object.entries(orders).map(([value, label]) =>
              option(label, value, 'order', order === value, 'radio', prefix),
            ),
          );
        form.querySelector('[data-smile-options="gender"]').replaceChildren(
          ...[
            ['All patients', ''],
            ['Male', 'male'],
            ['Female', 'female'],
          ].map(([label, value]) => {
            const row = option(label, value, 'gender', gender === value, 'radio', prefix);
            if (value && !payload.cases.some((item) => item.gender === value)) {
              row.querySelector('input').disabled = true;
              row.title = 'No matching smiles';
            }
            return row;
          }),
        );
        form
          .querySelector('[data-smile-options="treatment"]')
          .replaceChildren(
            ...treatments.map((t) =>
              option(t, slug(t), 'treatment', chosen.has(slug(t)), 'checkbox', prefix),
            ),
          );
        form
          .querySelector('[data-smile-options="clinician"]')
          .replaceChildren(
            ...['', ...clinicians].map((t) =>
              option(t || 'All clinicians', t, 'clinician', clinician === t, 'radio', prefix),
            ),
          );
        form.querySelector('[data-smile-options="display"]').replaceChildren(
          ...[
            ['Before / after', 'before-after'],
            ['Slider', 'slider'],
          ].map(([label, value]) =>
            option(label, value, 'display', mode === value, 'radio', prefix),
          ),
        );
      }
      const draft = (form) => ({
        treatments: new Set(
          [...form.querySelectorAll('[data-smile-option="treatment"]:checked')].map(
            (input) => input.value,
          ),
        ),
        clinician: form.querySelector('[data-smile-option="clinician"]:checked')?.value || '',
        display: form.querySelector('[data-smile-option="display"]:checked')?.value || mode,
        order: form.querySelector('[data-smile-option="order"]:checked')?.value || order,
        gender: form.querySelector('[data-smile-option="gender"]:checked')?.value || '',
      });
      const updateCount = (form) => {
        const selection = draft(form),
          total = payload.cases.filter((item) =>
            matches(item, selection.treatments, selection.clinician, selection.gender),
          ).length;
        form
          .querySelector('[data-smile-filter-apply]')
          ?.replaceChildren(
            document.createTextNode('View ' + total + (total === 1 ? ' smile' : ' smiles')),
          );
        const selectedNames = treatments.filter((t) => selection.treatments.has(slug(t)));
        for (const [name, text] of Object.entries({
          treatment: selectedNames.join(', ') || 'All treatments',
          clinician: selection.clinician || 'All clinicians',
          display: selection.display === 'slider' ? 'Slider' : 'Before / after',
          order: orders[selection.order],
          gender: selection.gender
            ? selection.gender[0].toUpperCase() + selection.gender.slice(1)
            : 'All patients',
        }))
          form.querySelector('[data-smile-summary="' + name + '"]').textContent = text;
      };
      const syncForms = () => {
        for (const form of forms) {
          for (const input of form.querySelectorAll('[data-smile-option]'))
            input.checked =
              input.dataset.smileOption === 'treatment'
                ? chosen.has(input.value)
                : input.value ===
                  { display: mode, clinician, gender, order }[input.dataset.smileOption];
          updateCount(form);
        }
      };
      const disclosures = (form) =>
        [...form.querySelectorAll('[data-smile-filter-group]')]
          .filter(
            (group) =>
              group.closest('[data-smile-filter-panel], [data-smile-embedded-filter]') === form,
          )
          .map((group) => ({
            key: group.dataset.smileFilterGroup,
            group,
            button: group.querySelector('[data-smile-group-toggle]'),
            body: group.querySelector('[data-smile-options]'),
            chevron: group.querySelector('.smile-filter_chevron'),
          }));
      for (const entry of disclosures(embedded)) {
        entry.body.id = 'smile-embedded-' + entry.key;
        entry.button.setAttribute('aria-controls', entry.body.id);
        listen(entry.button, 'click', () => {
          const open = entry.button.getAttribute('aria-expanded') !== 'true';
          for (const other of disclosures(embedded)) {
            const active = other.key === entry.key && open;
            other.button.setAttribute('aria-expanded', String(active));
            other.group.classList.toggle('is-expanded', active);
            other.body.classList.toggle('is-collapsed', !active);
            other.chevron.style.transform = active ? 'rotate(180deg)' : '';
          }
          if (open)
            animate(
              entry.body,
              [
                { opacity: 0, transform: 'translateY(-20px)' },
                { opacity: 1, transform: 'translateY(0)' },
              ],
              motion.defaults?.base || 400,
            );
        });
      }
      const counter = window.TDBNativeTicker.mount(
        drawerRoot.querySelector('[data-smile-case-count]'),
        {
          template: drawerRoot,
          valueClass: 'smile-page-count_value',
          incomingClass: 'smile-page-count_value',
        },
      );
      const tickers = Object.fromEntries(
        ['price', 'duration', 'clinician'].map((field) => [
          field,
          window.TDBNativeTicker.mount(reading.querySelector('[data-smile-case-' + field + ']'), {
            valueClass: 'smile-page-fact_value',
            incomingClass: 'smile-page-fact_value',
          }),
        ]),
      );
      cleanup.push(() => {
        counter.destroy();
        Object.values(tickers).forEach((t) => t.destroy());
      });
      const drawerPhoto = reading.querySelector('.smile-page_drawer-photo'),
        drawerImage = drawerPhoto.querySelector('img');
      const comparisons = new Map();
      let drawerComparison;
      const applyDisplay = () => {
        for (const control of comparisons.values()) control.destroy();
        comparisons.clear();
        drawerComparison?.destroy();
        drawerComparison = null;
        if (mode === 'slider') {
          for (const item of payload.cases) {
            const photo = item.node.querySelector('[data-smile-grid-photo]');
            comparisons.set(photo, comparison(photo, photo.querySelector('img'), listen));
          }
          drawerComparison = comparison(drawerPhoto, drawerImage, listen);
        }
      };
      const treatmentHeight =
        Math.max(...payload.cases.map((item) => item.treatments.length)) * 1.3 + 2.25;
      page.style.setProperty('--smile-treatment-space', treatmentHeight + 'rem');
      reading.style.setProperty('--smile-treatment-space', treatmentHeight + 'rem');
      // Reserve actual authored copy geometry at the current width, including
      // longer titles and wrapped treatment names from the CMS.
      const reserveCards = () => {
        for (const selector of ['.smile-grid_header', '.smile-grid_treatments']) {
          const slots = [...stage.querySelectorAll(selector)];
          for (const slot of slots) slot.style.minHeight = '';
          if (innerWidth <= 640) continue;
          const height = Math.max(0, ...slots.map((slot) => slot.getBoundingClientRect().height));
          for (const slot of slots) slot.style.minHeight = height + 'px';
        }
      };
      let reservedWidth = 0;
      const reserveCase = () => {
        const copy = reading.querySelector('.smile-page_drawer-copy');
        if (!copy.clientWidth || copy.clientWidth === reservedWidth) return;
        reservedWidth = copy.clientWidth;
        const measure = document.createElement('div');
        Object.assign(measure.style, {
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none',
          width: reservedWidth + 'px',
        });
        measure.setAttribute('aria-hidden', 'true');
        reading.append(measure);
        for (const field of ['title', 'description']) {
          const target = reading.querySelector('[data-smile-case-' + field + ']');
          const sample = target.cloneNode(false);
          sample.removeAttribute('data-smile-case-' + field);
          sample.style.minHeight = '0';
          measure.replaceChildren(sample);
          let height = 0;
          for (const item of payload.cases) {
            sample.textContent = item[field];
            height = Math.max(height, sample.getBoundingClientRect().height);
          }
          target.style.minHeight = height + 'px';
        }
        measure.remove();
      };
      const paintCase = (index, direction = 1, transition = true) => {
        if (!cases.length) return;
        drawerIndex = (index + cases.length) % cases.length;
        const item = cases[drawerIndex];
        currentId = item.id;
        persist();
        drawerImage.src = item.image.src;
        drawerImage.alt = item.image.alt;
        drawerComparison?.refresh();
        for (const field of ['title', 'description'])
          reading.querySelector('[data-smile-case-' + field + ']').textContent = item[field];
        for (const [field, ticker] of Object.entries(tickers))
          ticker.update(item[field], direction, transition);
        reading.querySelector('[data-smile-case-treatments]').replaceChildren(
          ...item.treatments.map((t) => {
            const li = document.createElement('li');
            li.textContent = t;
            return li;
          }),
        );
        counter.update(String(drawerIndex + 1).padStart(2, '0'), direction, transition);
        drawerRoot.querySelector('[data-smile-case-total]').textContent = String(
          cases.length,
        ).padStart(2, '0');
        drawerRoot.querySelector('[data-smile-case-announcement]').textContent =
          'Smile ' + (drawerIndex + 1) + ' of ' + cases.length + ': ' + item.title;
        previous.disabled = next.disabled = cases.length < 2;
        reading.scrollTop = 0;
        if (transition) {
          animate(
            reading.querySelector('[data-smile-case-title]'),
            [
              { opacity: 0, transform: 'translateX(' + direction * 2 + 'rem)' },
              { opacity: 1, transform: 'translateX(0)' },
            ],
            motion.duration?.(reading.clientWidth) || 650,
          );
          for (const node of [
            drawerPhoto,
            reading.querySelector('[data-smile-case-description]'),
            reading.querySelector('[data-smile-case-treatments]'),
          ])
            animate(node, [{ opacity: 0 }, { opacity: 1 }], fadeIn);
        }
      };
      const updateDock = () => {
        if (dock.classList.contains('is-in-drawer')) return;
        const bounds = filterHome.getBoundingClientRect();
        const chromeHeight =
          6 * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
        const pastAnchor = bounds.top < chromeHeight;
        dock.classList.toggle('is-floating', pastAnchor);
        dock.classList.toggle('is-offscreen', pastAnchor && !stageVisible);
      };
      const drawer = window.TDBDrawer.mount(drawerRoot, {
        hideChrome: true,
        onOpen() {
          drawerPanel.append(dock);
          dock.classList.add('is-in-drawer');
          dock.classList.remove('is-offscreen', 'is-floating');
          reserveCase();
        },
        onClose() {
          clearTimeout(closingTimer);
          filteringFromPage = false;
          filters.reset();
          filterHome.append(dock);
          dock.classList.remove('is-in-drawer');
          updateDock();
        },
        returnFocus: (source) =>
          source === toggle
            ? toggle
            : cases[drawerIndex]?.node.querySelector('[data-smile-grid-photo]') || toggle,
      });
      cleanup.push(() => {
        drawer.destroy();
        filterHome.append(dock);
        dock.classList.remove('is-in-drawer', 'is-expanded', 'is-offscreen', 'is-floating');
      });
      const filters = window.TDBFilters.mount(panel, {
        toggle,
        heading: panel.querySelector('h3'),
        badge: dock.querySelector('[data-smile-filter-badge]'),
        blockedControls: [close, previous, next],
        inertTargets: [reading],
        escapeRoot: document,
        disclosures: disclosures(panel),
        labels: { open: 'Open smile filters', close: 'Close smile filters' },
        onChange(open) {
          dock.classList.toggle('is-expanded', open);
          clearTimeout(closingTimer);
          if (open) {
            syncForms();
            if (drawerRoot.hidden) {
              filteringFromPage = true;
              paintCase(
                Math.max(
                  0,
                  cases.findIndex((item) => item.id === currentId),
                ),
                1,
                false,
              );
              drawer.open(toggle);
              panel.querySelector('h3').focus({ preventScroll: true });
            }
          } else if (filteringFromPage) {
            closingTimer = setTimeout(
              () => {
                if (!signal.aborted && !filters.isOpen) drawer.close(true);
              },
              motion.reduced.matches ? 0 : motion.duration?.(innerWidth) || 650,
            );
          }
        },
      });
      cleanup.push(() => filters.destroy());
      filters.setCount(chosen.size + Number(!!clinician) + Number(!!gender));
      for (const item of payload.cases) {
        item.item.parentElement.append(item.item);
        const photo = item.node.querySelector('[data-smile-grid-photo]');
        photo.setAttribute('aria-label', 'View case: ' + item.title);
        photo.setAttribute('aria-haspopup', 'dialog');
        photo.setAttribute('aria-controls', drawerPanel.id);
        photo.querySelector('img').draggable = false;
      }
      applyDisplay();
      window.TDBLazyIconMasks?.refresh();
      cleanup.push(() => {
        for (const item of payload.cases) item.item.hidden = false;
        for (const control of comparisons.values()) control.destroy();
        drawerComparison?.destroy();
      });
      async function render() {
        cases = payload.cases.filter((item) => matches(item));
        const value = order.startsWith('duration') ? durationMinutes : numericPrice;
        const direction = order.endsWith('desc') ? -1 : 1;
        cases.sort((a, b) => {
          const first = value(a),
            second = value(b);
          if (first === second) return 0;
          if (!Number.isFinite(first)) return 1;
          if (!Number.isFinite(second)) return -1;
          return (first - second) * direction;
        });
        for (const item of cases) item.item.parentElement.append(item.item);
        for (const item of payload.cases) item.item.hidden = !cases.includes(item);
        const count = cases.length + (cases.length === 1 ? ' smile' : ' smiles');
        status.textContent = count;
        embedded.querySelector('[data-smile-embedded-count]').textContent = count;
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
      let renderRevision = 0;
      async function select(form, closeFilter = false) {
        const selection = draft(form),
          token = ++renderRevision,
          changed = selection.display !== mode;
        if (closeFilter) filters.set(false);
        await Promise.all([
          animate(stage, [{ opacity: 1 }, { opacity: 0 }], fadeOut),
          !drawerRoot.hidden
            ? animate(drawerPhoto, [{ opacity: 1 }, { opacity: 0 }], fadeOut)
            : null,
        ]);
        if (signal.aborted || token !== renderRevision) return;
        chosen = selection.treatments;
        clinician = selection.clinician;
        mode = selection.display;
        order = selection.order;
        gender = selection.gender;
        if (changed) applyDisplay();
        filters.setCount(chosen.size + Number(!!clinician) + Number(!!gender));
        await render();
        syncForms();
        const destination = new URL(location.href);
        destination.searchParams.set('display', mode);
        if (chosen.size) destination.searchParams.set('treatments', [...chosen].join(','));
        else destination.searchParams.delete('treatments');
        if (clinician) destination.searchParams.set('clinician', clinician);
        else destination.searchParams.delete('clinician');
        destination.searchParams.set('order', order);
        if (gender) destination.searchParams.set('gender', gender);
        else destination.searchParams.delete('gender');
        history.replaceState(history.state, '', destination.href);
        await animate(stage, [{ opacity: 0 }, { opacity: 1 }], fadeIn);
        updateDock();
      }
      for (const form of forms) {
        listen(form, 'submit', (event) => event.preventDefault());
        listen(form, 'change', () => {
          updateCount(form);
          if (form === embedded) select(form);
        });
        listen(form.querySelector('[data-smile-filter-reset]'), 'click', () => {
          for (const input of form.querySelectorAll('[data-smile-option="treatment"]'))
            input.checked = false;
          form.querySelector('[data-smile-option="clinician"][value=""]').checked = true;
          form.querySelector('[data-smile-option="gender"][value=""]').checked = true;
          form.querySelector('[data-smile-option="order"][value="price-asc"]').checked = true;
          updateCount(form);
          if (form === embedded) select(form);
        });
      }
      listen(apply, 'click', () => select(panel, true));
      const openCase = (index, source) => {
        if (!cases.length) return;
        filteringFromPage = false;
        paintCase(index, 1, false);
        drawer.open(source);
      };
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
      let scrollFrame;
      listen(
        window,
        'scroll',
        () => {
          if (scrollFrame) return;
          scrollFrame = requestAnimationFrame(() => {
            scrollFrame = null;
            updateDock();
          });
        },
        { passive: true },
      );
      listen(
        window,
        'resize',
        () => {
          updateDock();
          reserveCards();
          reserveCase();
        },
        { passive: true },
      );
      const observer = new IntersectionObserver(
        (entries) => {
          stageVisible = entries.some((entry) => entry.isIntersecting);
          updateDock();
        },
        { threshold: 0 },
      );
      cleanup.push(() => {
        observer.disconnect();
        cancelAnimationFrame(scrollFrame);
      });
      observer.observe(stage);
      await render();
      reserveCards();
      document.fonts?.ready.then(() => {
        if (!signal.aborted) {
          reserveCards();
          reservedWidth = 0;
          reserveCase();
        }
      });
      syncForms();
      updateDock();
      page.dataset.smilePageReady = 'true';
      page.removeAttribute('aria-busy');
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
    version: '2.1.0',
    mount,
    destroy() {
      instance?.destroy();
    },
  });
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-smile-page-retry]')) mount().catch(() => {});
  });
})();
