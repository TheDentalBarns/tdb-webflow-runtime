/* Smile Gallery v2.2.0. Native CMS grid, review-style filters, comparisons and shared motion. */
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
        image: { src: image.src, alt: image.alt, srcset: image.srcset, sizes: image.sizes },
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
    const nativeBefore = photo.querySelector('[data-smile-before-image]');
    const before = nativeBefore ? null : document.createElement('div');
    const after = nativeBefore ? null : document.createElement('div');
    if (before) before.className = 'smile-comparison_before';
    if (after) after.className = 'smile-comparison_after';
    const images = nativeBefore
      ? [nativeBefore, original]
      : [before, after].map((layer) => {
          const image = document.createElement('img');
          image.alt = '';
          image.draggable = false;
          image.loading = 'lazy';
          image.decoding = 'async';
          layer.append(image);
          return image;
        });
    // A native range covering the photo steals Android taps and changes value
    // before a vertical pan is recognised. Only the divider is a drag target.
    const range = document.createElement('div');
    range.className = 'smile-comparison_control';
    range.tabIndex = 0;
    range.setAttribute('role', 'slider');
    range.setAttribute('aria-valuemin', '0');
    range.setAttribute('aria-valuemax', '100');
    range.setAttribute('aria-orientation', 'horizontal');
    range.setAttribute('aria-label', 'Reveal before and after smile');
    const attributes = ['role', 'tabindex'].map((name) => [name, photo.getAttribute(name)]);
    let opener;
    if (photo.matches('[data-smile-grid-photo]')) {
      opener = document.createElement('button');
      opener.type = 'button';
      opener.className = 'smile-comparison_open';
      for (const name of ['aria-label', 'aria-haspopup', 'aria-controls'])
        if (photo.hasAttribute(name)) opener.setAttribute(name, photo.getAttribute(name));
      photo.setAttribute('role', 'group');
      photo.removeAttribute('tabindex');
      photo.append(opener);
    }
    const nativeHandle = photo.querySelector('[data-smile-divider]');
    const handle = nativeHandle || document.createElement('span');
    handle.classList.add('smile-comparison_handle');
    handle.setAttribute('aria-hidden', 'true');
    photo.dataset.smileComparison = 'true';
    original.hidden = !nativeBefore;
    original.draggable = false;
    if (!nativeBefore) photo.append(after, before);
    if (!nativeHandle) photo.append(handle);
    photo.append(range);
    let active = false,
      dragging = false,
      moved = false,
      value = 50,
      originValue = 50,
      originX = 0,
      originY = 0,
      axis = null,
      pointerId;
    const update = (next) => {
      value = Math.round(Math.max(0, Math.min(100, next)));
      photo.style.setProperty('--smile-reveal', value + '%');
      range.setAttribute('aria-valuenow', String(value));
      range.setAttribute('aria-valuetext', value + '% before, ' + (100 - value) + '% after');
    };
    listen(photo, 'pointerdown', (event) => {
      if (event.button !== 0 || event.isPrimary === false) return;
      // Do not cancel touchstart: native vertical scrolling and button clicks
      // remain available. Horizontal dragging starts only after axis detection.
      originX = event.clientX;
      originY = event.clientY;
      originValue = value;
      pointerId = event.pointerId;
      axis = null;
      active = true;
      dragging = range.contains(event.target);
      moved = false;
    });
    listen(photo, 'pointermove', (event) => {
      if (!active || event.pointerId !== pointerId) return;
      if (!axis) {
        const x = Math.abs(event.clientX - originX),
          y = Math.abs(event.clientY - originY);
        if (Math.max(x, y) < 8) return;
        moved = true;
        axis = x > y * 1.2 ? 'horizontal' : 'vertical';
        if (axis === 'horizontal' && dragging) {
          range.focus({ preventScroll: true });
          range.setPointerCapture?.(event.pointerId);
        }
      }
      if (axis !== 'horizontal' || !dragging) return;
      event.preventDefault();
      const width = photo.getBoundingClientRect().width;
      if (width) update(originValue + ((event.clientX - originX) / width) * 100);
    });
    const finish = (event) => {
      if (event.pointerId !== pointerId) return;
      active = dragging = false;
      if (event.type === 'pointercancel') moved = true;
      if (range.hasPointerCapture?.(event.pointerId)) range.releasePointerCapture(event.pointerId);
    };
    listen(photo, 'pointerup', finish);
    listen(photo, 'pointercancel', finish);
    listen(range, 'keydown', (event) => {
      event.stopPropagation();
      const next = {
        ArrowLeft: value - 1,
        ArrowDown: value - 1,
        ArrowRight: value + 1,
        ArrowUp: value + 1,
        PageDown: value - 10,
        PageUp: value + 10,
        Home: 0,
        End: 100,
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      update(next);
    });
    listen(photo, 'dragstart', (event) => event.preventDefault());
    const refresh = () => {
      for (const image of images) {
        const src = original.getAttribute('src');
        image.sizes = original.sizes;
        image.srcset = original.srcset;
        if (src && image.getAttribute('src') !== src) image.src = src;
      }
      moved = false;
      update(50);
    };
    refresh();
    return {
      refresh,
      ignoreClick(event) {
        const ignore =
          moved && (range.contains(event.target) || event.detail > 0 || !!event.pointerType);
        moved = false;
        return ignore;
      },
      destroy() {
        for (const remove of registrations) remove();
        for (const element of [before, after, nativeHandle ? null : handle, range, opener])
          element?.remove();
        nativeHandle?.classList.remove('smile-comparison_handle');
        for (const [name, value] of attributes)
          if (value === null) photo.removeAttribute(name);
          else photo.setAttribute(name, value);
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
    stage.id ||= 'smile-gallery-results';
    const status = page.querySelector('[data-smile-page-status]');

    const cleanup = [];
    const dispose = () => {
      lifecycle.abort();
      for (const release of cleanup.reverse()) release();

      page.removeAttribute('data-smile-page-ready');
      delete document.documentElement.dataset.smilePending;
      delete stage.dataset.smilePending;
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
        (url.searchParams.get('display') || saved.display) === 'before-after'
          ? 'before-after'
          : 'slider';
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
      // Patient filtering is deferred; stale saved links must still show every smile.
      let gender = '';
      if (url.searchParams.has('gender')) {
        url.searchParams.delete('gender');
        history.replaceState(history.state, '', url.href);
      }
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
        filteringFromPage = false;
      const filterHome = page.querySelector('[data-smile-filter-home]');
      const embedded = page.querySelector('[data-smile-embedded-filter]');
      const dock = page.querySelector('[data-smile-filter-dock]');
      const landing = page.querySelector('[data-smile-filter-landing]');
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
      const animations = new Set(),
        nodeAnimations = new WeakMap();
      const animate = async (node, frames, duration, family = 'fade', options = {}) => {
        if (!node?.animate || motion.reduced.matches || signal.aborted) return;
        nodeAnimations.get(node)?.cancel();
        const animation = node.animate(frames, {
          duration,
          easing:
            options.easing ||
            motion.easing?.(family, family === 'travel' ? 'cubic-bezier(.3,0,.2,1)' : 'ease') ||
            'ease',
          delay: options.delay || 0,
          fill: 'both',
        });
        nodeAnimations.set(node, animation);
        animations.add(animation);
        try {
          await animation.finished;
        } catch {
        } finally {
          animation.cancel();
          animations.delete(animation);
          if (nodeAnimations.get(node) === animation) nodeAnimations.delete(node);
        }
      };
      cleanup.push(() => {
        for (const a of animations) a.cancel();
      });
      const fadeOut = motion.defaults?.fadeOut || 120,
        fadeIn = motion.defaults?.fadeIn || 350;
      const listen = (node, type, fn, options = {}) =>
        node.addEventListener(type, fn, { signal, ...options });
      const imageParts =
        '.smile-grid_image,.smile-grid_before-image,.smile-grid_divider,.smile-comparison_before,.smile-comparison_after,.smile-comparison_handle';
      const contentParts =
        imageParts +
        ',[data-tdb-sg-title],[data-smile-grid-treatments],[data-tdb-sg-price-value],[data-tdb-sg-duration-value],[data-tdb-sg-clinician-value]';
      const fadeContents = (from, to, duration, scope = stage, selector = contentParts) =>
        Promise.all(
          [...scope.querySelectorAll(selector)]
            .filter((node) => {
              if (node.closest('[hidden]')) return false;
              if (node.matches(imageParts) && node.closest('[data-smile-image-ready="false"]'))
                return false;
              const bounds = node.getBoundingClientRect();
              return bounds.bottom >= 0 && bounds.top <= innerHeight;
            })
            .map((node) => animate(node, [{ opacity: from }, { opacity: to }], duration)),
        );
      const revealContents = () => {
        delete document.documentElement.dataset.smilePending;
        delete stage.dataset.smilePending;
        return fadeContents(0, 1, fadeIn);
      };
      // Photos keep their native cream frame until the shared source has decoded.
      // Lazy images are not requested early merely to prepare the comparison.
      for (const item of payload.cases) {
        const photo = item.node.querySelector('[data-smile-grid-photo]');
        const image = photo.querySelector('[data-tdb-sg-image]');
        photo.dataset.smileImageReady = 'false';
        const ready = async () => {
          if (photo.dataset.smileImageReady === 'true') return;
          try {
            await image.decode?.();
          } catch {}
          if (signal.aborted) return;
          photo.dataset.smileImageReady = 'true';
          if (page.dataset.smilePageReady && !stage.dataset.smilePending)
            fadeContents(0, 1, fadeIn, photo, imageParts);
        };
        listen(image, 'load', ready);
        if (image.complete && image.naturalWidth) ready();
        cleanup.push(() => delete photo.dataset.smileImageReady);
      }
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
        form.querySelector('[data-smile-filter-group="gender"]').hidden = true;
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
        gender: '',
      });
      const actionCounts = new Map(
        forms.map((form) => {
          const button =
            form === embedded ? embedded.querySelector('[data-smile-view-results]') : apply;
          const ticker = window.TDBNativeTicker.mount(
            button.querySelector('[data-smile-action-count]'),
          );
          button.querySelector('[data-smile-count-reserve]').textContent = String(payload.total);
          cleanup.push(() => ticker.destroy());
          return [form, { button, ticker, shown: null }];
        }),
      );
      const updateCount = (form) => {
        const selection = draft(form),
          total = payload.cases.filter((item) =>
            matches(item, selection.treatments, selection.clinician, selection.gender),
          ).length;
        // Keep selected treatments available to remove; disable only impossible additions.
        for (const input of form.querySelectorAll('[data-smile-option="treatment"]')) {
          const next = new Set(selection.treatments).add(input.value);
          input.disabled =
            !input.checked &&
            !payload.cases.some((item) => matches(item, next, selection.clinician));
        }
        for (const input of form.querySelectorAll('[data-smile-option="clinician"]'))
          input.disabled =
            !input.checked &&
            !payload.cases.some((item) => matches(item, selection.treatments, input.value));
        const action = actionCounts.get(form);
        action.ticker.update(
          String(total),
          action.shown !== null && total < action.shown ? -1 : 1,
          action.shown !== null,
        );
        action.shown = total;
        action.button.setAttribute(
          'aria-label',
          'View ' + total + (total === 1 ? ' smile' : ' smiles'),
        );
        action.button
          .querySelector('[data-smile-count-plural]')
          .classList.toggle('is-singular', total === 1);
        const reset = form.querySelector('[data-smile-filter-reset]');
        const unchanged =
          !selection.treatments.size &&
          !selection.clinician &&
          selection.order === 'price-asc' &&
          selection.display === 'slider';
        reset.disabled = unchanged;
        reset.setAttribute('aria-disabled', String(unchanged));
        reset.classList.toggle('is-disabled', unchanged);
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
              !group.hidden &&
              group.closest('[data-smile-filter-panel], [data-smile-embedded-filter]') === form,
          )
          .map((group) => ({
            key: group.dataset.smileFilterGroup,
            group,
            button: group.querySelector('[data-smile-group-toggle]'),
            body: group.querySelector('[data-smile-options]'),
            chevron: group.querySelector('.smile-filter_chevron'),
          }));
      const embeddedAccordion = window.TDBFilters.mountDisclosures(embedded, {
        disclosures: disclosures(embedded),
      });
      cleanup.push(() => embeddedAccordion.destroy());
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
        document.documentElement.dataset.smileDisplay = mode;
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
      reading.style.setProperty('--smile-treatment-space', treatmentHeight + 'rem');
      // Card geometry belongs to the native Designer styles at every breakpoint.
      let reservedWidth = 0;
      const reserveCase = () => {
        const copy = reading.querySelector('.smile-page_drawer-copy');
        const width = copy.getBoundingClientRect().width;
        if (!width || width === reservedWidth) return;
        reservedWidth = width;
        const measure = document.createElement('div');
        Object.assign(measure.style, {
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none',
          display: 'flow-root',
          width: reservedWidth + 'px',
        });
        measure.setAttribute('aria-hidden', 'true');
        reading.append(measure);
        for (const field of ['title', 'treatments']) {
          const target = reading.querySelector('[data-smile-case-' + field + ']');
          const sample = target.cloneNode(false);
          sample.removeAttribute('data-smile-case-' + field);
          sample.style.minHeight = '0';
          sample.style.margin = '0';
          sample.style.width = target.getBoundingClientRect().width + 'px';
          measure.replaceChildren(sample);
          let height = 0;
          for (const item of payload.cases) {
            if (field === 'treatments')
              sample.replaceChildren(
                ...item.treatments.map((text) => {
                  const li = document.createElement('li');
                  li.textContent = text;
                  return li;
                }),
              );
            else sample.textContent = item[field];
            height = Math.max(height, sample.getBoundingClientRect().height);
          }
          target.style.minHeight = Math.ceil(height) + 'px';
        }
        // Reserve each value's widest label so its neighbouring icon stays still.
        for (const field of ['price', 'duration', 'clinician']) {
          const slot = reading.querySelector('[data-smile-case-' + field + ']');
          const sample = document.createElement('span');
          sample.className = 'smile-page-fact_value';
          Object.assign(sample.style, {
            display: 'inline-block',
            font: getComputedStyle(slot).font,
            letterSpacing: getComputedStyle(slot).letterSpacing,
          });
          measure.replaceChildren(sample);
          let width = 0;
          for (const item of payload.cases) {
            sample.textContent = item[field];
            width = Math.max(width, sample.getBoundingClientRect().width);
          }
          slot.style.width = Math.ceil(width) + 'px';
        }
        measure.remove();
      };
      const outgoingCaseNodes = new Set();
      cleanup.push(() => outgoingCaseNodes.forEach((node) => node.remove()));
      // Keep the same cream gutter between images as at the sides of the drawer.
      const slidePosition = (node, direction) =>
        'translateX(' +
        (node === drawerPhoto
          ? `calc(${direction * 100}% ${direction > 0 ? '+' : '-'} var(--smile-case-gutter))`
          : direction * 100 + '%') +
        ')';
      const paintCase = (index, direction = 1, transition = true) => {
        if (!cases.length) return;
        for (const node of outgoingCaseNodes) {
          nodeAnimations.get(node)?.cancel();
          node.remove();
        }
        outgoingCaseNodes.clear();
        const slideNodes = [drawerPhoto, reading.querySelector('[data-smile-case-title]')];
        const fadeNodes = [
          reading.querySelector('[data-smile-case-treatments]'),
          reading.querySelector('[data-smile-case-description]'),
        ];
        const travelTime = motion.duration?.(reading.clientWidth) || 650;
        const outgoing = transition
          ? [...slideNodes, ...fadeNodes].map((node) => {
              const copy = node.cloneNode(true);
              copy.classList.add('smile-page_case-outgoing');
              copy.setAttribute('aria-hidden', 'true');
              copy.inert = true;
              for (const field of ['title', 'treatments', 'description'])
                copy.removeAttribute('data-smile-case-' + field);
              for (const child of [copy, ...copy.querySelectorAll('[id],input')]) {
                child.removeAttribute('id');
                if (child.matches('input')) child.remove();
              }
              Object.assign(copy.style, {
                left: node.offsetLeft + 'px',
                top: node.offsetTop + 'px',
                width: node.getBoundingClientRect().width + 'px',
                height: node.getBoundingClientRect().height + 'px',
                opacity: getComputedStyle(node).opacity,
              });
              return [node, copy];
            })
          : [];
        for (const node of [...slideNodes, ...fadeNodes]) nodeAnimations.get(node)?.cancel();
        drawerIndex = (index + cases.length) % cases.length;
        const item = cases[drawerIndex];
        currentId = item.id;
        persist();
        drawerImage.loading = 'lazy';
        drawerImage.decoding = 'async';
        drawerImage.sizes =
          '(max-width: 767px) calc(100vw - 2.5rem), (max-width: 1200px) calc(100vw - 5rem), 75rem';
        drawerImage.srcset = item.image.srcset;
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
          for (const [node, copy] of outgoing) {
            node.parentElement.append(copy);
            outgoingCaseNodes.add(copy);
            const leaving = slideNodes.includes(node)
              ? animate(
                  copy,
                  [{ transform: 'translateX(0)' }, { transform: slidePosition(node, -direction) }],
                  travelTime,
                  'travel',
                )
              : animate(
                  copy,
                  [{ opacity: copy.style.opacity }, { opacity: 0 }],
                  motion.carousel.copyOut,
                  'fade',
                  { easing: motion.carousel.copyEaseOut },
                );
            leaving.finally(() => {
              copy.remove();
              outgoingCaseNodes.delete(copy);
            });
          }
          for (const node of slideNodes)
            animate(
              node,
              [{ transform: slidePosition(node, direction) }, { transform: 'translateX(0)' }],
              travelTime,
              'travel',
            );
          for (const node of fadeNodes)
            animate(node, [{ opacity: 0 }, { opacity: 1 }], motion.carousel.copyIn, 'fade', {
              easing: motion.carousel.copyEaseIn,
              delay:
                travelTime +
                (direction < 0 ? motion.carousel.previousDelay : motion.carousel.nextDelay),
            });
        }
      };
      const stickyDock = window.TDBFilters.mountDock({
        root: page,
        start: stage,
        home: filterHome,
        landing,
        dock,
      });
      cleanup.push(() => stickyDock.destroy());
      const updateDock = () => stickyDock.refresh();
      let toggleOrigin;
      const moveToggle = (from) => {
        if (!from) return;
        const to = toggle.getBoundingClientRect();
        animate(
          toggle,
          [
            { translate: `${from.left - to.left}px ${from.top - to.top}px` },
            { translate: '0px 0px' },
          ],
          motion.duration?.(innerWidth) || 650,
          'travel',
        );
      };
      const drawer = window.TDBDrawer.mount(drawerRoot, {
        hideChrome: true,
        onOpen() {
          const from = toggleOrigin || toggle.getBoundingClientRect();
          toggleOrigin = null;
          drawerPanel.append(dock);
          dock.classList.add('is-in-drawer');
          dock.classList.remove('is-offscreen', 'is-floating');
          reserveCase();
          if (filteringFromPage) moveToggle(from);
        },
        onClose() {
          if (filteringFromPage) {
            filters.set(false);
            // Move to the page resting position while the filter slides down.
            const from = toggle.getBoundingClientRect();
            const bottom = stickyDock.anchor.getBoundingClientRect().bottom;
            animate(
              toggle,
              [{ translate: '0px 0px' }, { translate: `0px ${bottom - from.bottom}px` }],
              motion.duration?.(innerWidth) || 650,
              'travel',
            );
          } else filters.reset();
        },
        onClosed() {
          filteringFromPage = false;
          filters.reset();
          stickyDock.restore();
          dock.classList.remove('is-in-drawer');
          drawerRoot.classList.remove('is-filter-only');
          updateDock();
        },
        returnFocus: (source) =>
          source === toggle
            ? toggle
            : cases[drawerIndex]?.node.querySelector(
                '.smile-comparison_open, [data-smile-grid-photo]:not([data-smile-comparison])',
              ) || toggle,
      });
      cleanup.push(() => {
        drawer.destroy();
        filterHome.append(dock);
        dock.classList.remove('is-in-drawer', 'is-expanded', 'is-offscreen', 'is-floating');
      });
      const filters = window.TDBFilters.mount(panel, {
        toggle,
        backdrop: dock.querySelector('[data-smile-filter-shade]'),
        heading: panel.querySelector('h3'),
        badge: dock.querySelector('[data-smile-filter-badge]'),
        blockedControls: [close, previous, next],
        inertTargets: [reading],
        escapeRoot: document,
        disclosures: disclosures(panel),
        labels: { open: 'Open smile filters', close: 'Close smile filters' },
        onChange(open) {
          dock.classList.toggle('is-expanded', open);
          if (open) {
            syncForms();
            if (drawerRoot.hidden) {
              filteringFromPage = true;
              toggleOrigin = toggle.getBoundingClientRect();
              drawerRoot.classList.add('is-filter-only');
              drawer.open(toggle, { animatePanel: false });
              panel.querySelector('h3').focus({ preventScroll: true });
            }
          } else if (filteringFromPage) {
            drawer.close();
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
      let selecting = false;
      async function select(form, closeFilter = false) {
        const selection = draft(form),
          token = ++renderRevision,
          changed = selection.display !== mode;
        selecting = true;
        if (closeFilter) filters.set(false);
        await Promise.all([
          fadeContents(1, 0, fadeOut),
          !drawerRoot.hidden
            ? animate(drawerPhoto, [{ opacity: 1 }, { opacity: 0 }], fadeOut)
            : null,
        ]);
        if (signal.aborted || token !== renderRevision) return;
        stage.dataset.smilePending = 'true';
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
        selecting = false;
        await revealContents();
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
          form.querySelector('[data-smile-option="display"][value="slider"]').checked = true;
          (form === embedded ? embeddedAccordion : filters).collapseAll();
          updateCount(form);
          if (form === embedded) select(form);
        });
      }
      listen(apply, 'click', () => select(panel, true));
      listen(embedded.querySelector('[data-smile-view-results]'), 'click', (event) => {
        event.preventDefault();
        if (window.lenis?.scrollTo)
          window.lenis.scrollTo(stage, {
            offset: -6 * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16),
            immediate: motion.reduced.matches,
          });
        else
          stage.scrollIntoView({
            behavior: motion.reduced.matches ? 'instant' : 'smooth',
            block: 'start',
          });
      });
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
        if (comparisons.get(photo)?.ignoreClick(event)) return;
        const index = cases.findIndex((item) => item.node.contains(photo));
        if (index >= 0) openCase(index, photo.querySelector('.smile-comparison_open') || photo);
      });
      listen(stage, 'keydown', (event) => {
        if (event.target.matches('input,button,[role="slider"]')) return;
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
      let layoutWidth = innerWidth,
        resizeTimer;
      cleanup.push(() => clearTimeout(resizeTimer));
      listen(
        window,
        'resize',
        () => {
          updateDock();
          // Browser toolbar height changes must not blank the gallery on Android.
          if (innerWidth === layoutWidth) return;
          layoutWidth = innerWidth;
          stage.dataset.smilePending = 'true';
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            if (signal.aborted) return;
            reserveCase();
            if (!selecting) revealContents();
          }, 160);
        },
        { passive: true },
      );
      await render();
      document.fonts?.ready.then(() => {
        if (!signal.aborted) {
          reservedWidth = 0;
          reserveCase();
        }
      });
      syncForms();
      updateDock();
      page.dataset.smilePageReady = 'true';
      page.removeAttribute('aria-busy');
      await revealContents();
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
    version: '2.2.0',
    mount,
    destroy() {
      instance?.destroy();
    },
  });
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-smile-page-retry]')) mount().catch(() => {});
  });
})();
