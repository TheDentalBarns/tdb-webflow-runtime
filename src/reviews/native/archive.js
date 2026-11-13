/* Dedicated review archive: native full-text cards and the shared Smile Gallery filter UI. */
(() => {
  'use strict';
  if (window.TDBReviewPage) return;
  const base = new URL('./', document.currentScript.src);
  const groups = ['treatment', 'experience', 'platform', 'rating'];
  const emptyState = () => ({
    sort: 'recommended',
    treatment: [],
    experience: [],
    platform: [],
    rating: [],
  });
  const copy = (state) =>
    Object.fromEntries(
      Object.entries(state).map(([k, v]) => [k, Array.isArray(v) ? v.slice() : v]),
    );
  let instance, flight;
  async function mount() {
    if (instance) return instance;
    if (flight) return flight;
    const root = document.querySelector('[data-tdb-review-archive]');
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
      load('tdb-review-cms.js', () => !!window.TDBReviewCMS),
      load('tdb-drawer.js', () => !!window.TDBDrawer),
      load('tdb-filters.js', () => !!window.TDBFilters),
      load('tdb-ticker.js', () => !!window.TDBNativeTicker),
      ...[
        'tdb-smile-page.css',
        'tdb-review-page.css',
        'tdb-review-cards.css',
        'tdb-review-drawer.css',
        'tdb-drawer.css',
      ].map((name) =>
        // The page head owns these blocking style links. Adopt an already loaded
        // sheet before the shared registry resolves assets to the site release.
        load(
          name,
          () => [...document.styleSheets].some((sheet) => sheet.href?.endsWith('/' + name)),
          'style',
        ),
      ),
    ]);
    // Webflow's native builder represents button markup as a block. Restore button semantics.
    for (const control of root.querySelectorAll('[type="button"]:not(button)')) {
      const button = document.createElement('button');
      for (const { name, value } of control.attributes)
        if (name !== 'href') button.setAttribute(name, value);
      button.append(...control.childNodes);
      control.replaceWith(button);
    }
    const cms = window.TDBReviewCMS;
    const lifecycle = new AbortController(),
      { signal } = lifecycle;
    const listen = (node, type, fn) => node.addEventListener(type, fn, { signal });
    const q = (name, parent = root) => parent.querySelector(`[data-review-page-${name}]`);
    const list = root.querySelector('.reviews-page_grid');
    const original = [...list.children];
    const lastReview = root.dataset.reviewPageLast || '';
    const order = (index, selection) => {
      const result = cms.ordered(index, selection);
      return lastReview
        ? [
            ...result.filter((record) => record.id !== lastReview),
            ...result.filter((record) => record.id === lastReview),
          ]
        : result;
    };
    const template = original[0]?.cloneNode(true);
    if (!template) throw Error('Native review card template is missing');
    // Preserve published CMS cards until the first successful request. Clones need no CMS flags.
    for (const child of [...template.children])
      if (!child.matches('.reviews-page_card')) child.remove();
    for (const node of [template, ...template.querySelectorAll('*')]) {
      node.removeAttribute('id');
      node.removeAttribute('data-w-id');
    }
    const pagination = root.querySelector('.w-pagination-wrapper');
    const more = q('more'),
      sentinel = q('load-home'),
      status = q('status'),
      noResults = q('empty');
    const embedded = q('embedded'),
      panel = q('panel'),
      dock = q('dock'),
      toggle = q('toggle');
    const home = q('filter-home'),
      landing = q('landing');
    const dialog = document.querySelector('[data-review-page-filter-drawer]');
    const dialogPanel = dialog.querySelector('[data-tdb-drawer-panel]');
    const forms = [embedded, panel];
    const allowed = Object.fromEntries(
      [...groups, 'sort'].map((group) => [
        group,
        new Set(
          [...embedded.querySelectorAll(`[data-review-page-group="${group}"]`)].map(
            (n) => n.dataset.reviewPageValue,
          ),
        ),
      ]),
    );
    const normalize = (value) => {
      const next = emptyState();
      for (const key of groups)
        next[key] = [...new Set(Array.isArray(value?.[key]) ? value[key] : [])].filter(
          (v) => v && allowed[key].has(v),
        );
      if (allowed.sort.has(value?.sort)) next.sort = value.sort;
      return next;
    };
    const storageKey = 'tdb-review-page-filters';
    let saved;
    try {
      saved = JSON.parse(sessionStorage.getItem(storageKey));
    } catch {}
    let state = normalize(saved),
      draft = copy(state),
      data,
      index = [],
      ordered = [],
      rendered = 0;
    let revision = 0,
      pending,
      failed = false,
      disposed = false,
      observer,
      filtering = false,
      origin,
      moving;
    let replacing = false,
      replacement,
      fading;
    const fade = async (opacity, duration) => {
      const from = getComputedStyle(list).opacity;
      fading?.cancel();
      list.style.opacity = String(opacity);
      if (!list.animate || window.TDBMotion.reduced.matches) return;
      const animation = list.animate([{ opacity: from }, { opacity }], {
        duration,
        easing: window.TDBMotion.easing?.('fade') || 'ease',
      });
      fading = animation;
      await animation.finished.catch(() => {});
      if (fading === animation) {
        animation.cancel();
        fading = null;
      }
    };
    const animations = new Set();
    const animate = (node, frames) => {
      if (!node.animate || window.TDBMotion.reduced.matches) return;
      moving?.cancel();
      const animation = node.animate(frames, {
        duration: window.TDBMotion.duration?.(innerWidth) || 650,
        easing: window.TDBMotion.easing?.('travel') || 'cubic-bezier(.4,0,.2,1)',
        fill: 'both',
      });
      moving = animation;
      animations.add(animation);
      animation.finished
        .catch(() => {})
        .finally(() => {
          animation.cancel();
          animations.delete(animation);
        });
    };
    const disclosures = (form) =>
      [...form.querySelectorAll('[data-review-page-disclosure]')].map((button) => {
        const key = button.dataset.reviewPageDisclosure;
        return {
          key,
          button,
          group: button.closest('.tdb-review-filter_group'),
          body: button.nextElementSibling,
          chevron: button.querySelector('[data-review-page-chevron]'),
        };
      });
    const embeddedDisclosures = window.TDBFilters.mountDisclosures(embedded, {
      disclosures: disclosures(embedded),
    });
    const sticky = window.TDBFilters.mountDock({ root, start: root, home, landing, dock });
    const drawer = window.TDBDrawer.mount(dialog, {
      hideChrome: true,
      onOpen() {
        const from = origin || toggle.getBoundingClientRect();
        origin = null;
        dialogPanel.append(dock);
        dock.classList.add('is-in-drawer');
        dock.classList.remove('is-offscreen', 'is-floating');
        const to = toggle.getBoundingClientRect();
        animate(toggle, [
          { translate: `${from.left - to.left}px ${from.top - to.top}px` },
          { translate: '0px 0px' },
        ]);
      },
      onClose() {
        filters.set(false);
        const from = toggle.getBoundingClientRect(),
          bottom = sticky.anchor.getBoundingClientRect().bottom;
        animate(toggle, [{ translate: '0px 0px' }, { translate: `0px ${bottom - from.bottom}px` }]);
      },
      onClosed() {
        filtering = false;
        filters.reset();
        sticky.restore();
        dock.classList.remove('is-in-drawer', 'is-expanded');
        draft = copy(state);
        sync();
        sticky.refresh();
      },
      returnFocus: () => toggle,
    });
    const filters = window.TDBFilters.mount(panel, {
      toggle,
      backdrop: q('shade', dock),
      heading: panel.querySelector('h3'),
      badge: q('badge', dock),
      escapeRoot: document,
      disclosures: disclosures(panel),
      labels: { open: 'Open review filters', close: 'Close review filters' },
      onChange(open) {
        dock.classList.toggle('is-expanded', open);
        if (open) {
          draft = copy(state);
          sync();
          if (dialog.hidden) {
            filtering = true;
            origin = toggle.getBoundingClientRect();
            drawer.open(toggle, { animatePanel: false });
            panel.querySelector('h3').focus({ preventScroll: true });
          }
        } else if (filtering) drawer.close();
      },
    });
    const tickers = forms.map((form) => window.TDBNativeTicker.mount(q('count', form)));
    function sync() {
      forms.forEach((form, i) => {
        const selection = i ? draft : state;
        for (const option of form.querySelectorAll('[data-review-page-group]')) {
          const key = option.dataset.reviewPageGroup,
            value = option.dataset.reviewPageValue;
          const selected =
            key === 'sort'
              ? selection.sort === value
              : value
                ? selection[key].includes(value)
                : !selection[key].length;
          option.classList.toggle('is-selected', selected);
          // The shared native review controls own the mark and tick appearance.
          // Keep their existing state classes in step with the accessible selection.
          for (const mark of option.querySelectorAll(
            '.tdb-review-filter_mark,.tdb-review-filter_tick',
          ))
            mark.classList.toggle('is-checked', selected);
          option.setAttribute(
            option.getAttribute('role') === 'checkbox' ? 'aria-checked' : 'aria-pressed',
            String(selected),
          );
          // Match the drawer's AND topic / OR platform-and-rating semantics.
          let disabled = false;
          if (index.length && value && !selected && key !== 'sort') {
            const candidate = copy(selection);
            candidate[key] = ['rating', 'platform'].includes(key)
              ? [value]
              : [...candidate[key], value];
            disabled = !cms.matching(index, candidate).length;
          }
          option.setAttribute('aria-disabled', String(disabled));
        }
        for (const node of form.querySelectorAll('[data-review-page-selection]')) {
          const key = node.dataset.reviewPageSelection;
          const values = key === 'sort' ? [selection.sort] : selection[key];
          const label = (value) =>
            form
              .querySelector(`[data-review-page-group="${key}"][data-review-page-value="${value}"]`)
              ?.textContent.trim() || '';
          node.textContent = values.length ? values.map(label).join(', ') : label('');
        }
        const count = cms.matching(index, selection).length;
        tickers[i].update(String(count), 1, !!data);
        q('plural', form).classList.toggle('is-singular', count === 1);
        const action = q(i ? 'apply' : 'view', form);
        action.setAttribute('aria-label', `View ${count} ${count === 1 ? 'review' : 'reviews'}`);
      });
      filters.setCount(
        groups.reduce((n, k) => n + state[k].length, 0) + Number(state.sort !== 'recommended'),
      );
    }
    function card(record, position) {
      const node = template.cloneNode(true);
      node.dataset.reviewId = record.id;
      node.dataset.reviewPlatform = record.platform;
      node.dataset.reviewRating = record.rating ?? '';
      for (const [field, value] of Object.entries({
        'reviewer-display-name': record.name,
        'display-date': record.displayDate,
        'featured-excerpt': record.excerpt,
        'full-review': record.text,
      })) {
        const slot = node.querySelector(`[data-tdb-review-field="${field}"]`);
        if (slot) slot.textContent = value || '';
      }
      const stars = q('stars', node);
      stars.setAttribute(
        'aria-label',
        record.rating ? `${record.rating} out of 5 stars` : 'Unrated review',
      );
      stars.hidden = !record.rating;
      for (const star of stars.children)
        star.classList.toggle('is-empty', Number(star.dataset.tdbStar) >= record.rating);
      const platform = node.querySelector('[data-cards-platform-logo]');
      platform.hidden = !cms.platformAsset(record.platform);
      platform.setAttribute(
        'aria-label',
        `Read ${record.name}’s original ${record.platform} review`,
      );
      if (record.url && /^https?:\/\//i.test(record.url)) {
        platform.href = record.url;
        platform.target = '_blank';
        platform.rel = 'noopener noreferrer';
      } else {
        platform.removeAttribute('href');
        platform.removeAttribute('target');
        platform.setAttribute('role', 'img');
        platform.setAttribute('aria-label', record.platform);
      }
      q('historic', node).hidden = !record.historic;
      q('response', node).hidden = !(record.showResponse && record.response);
      q('response-text', node).textContent = record.showResponse ? record.response || '' : '';
      q('current', node).textContent = String(position).padStart(2, '0');
      q('total', node).textContent = String(ordered.length).padStart(2, '0');
      q('number', node).setAttribute('aria-label', `Review ${position} of ${ordered.length}`);
      return node;
    }
    function updateProgress() {
      more.hidden = rendered >= ordered.length && !failed;
      more.disabled = !!pending;
      more.textContent = pending
        ? 'Loading reviews…'
        : failed
          ? 'Try loading reviews again'
          : 'Load more reviews';
      list.setAttribute('aria-busy', String(!!pending));
      noResults.hidden = ordered.length !== 0;
      status.textContent = failed
        ? 'Reviews could not be loaded. Please try again.'
        : pending
          ? 'Loading reviews…'
          : `${rendered ? '1–' + rendered : '0'} of ${ordered.length} ${ordered.length === 1 ? 'review' : 'reviews'}`;
      sticky.refresh();
    }
    async function loadMore(token = revision, replace = false) {
      if (
        disposed ||
        token !== revision ||
        pending ||
        (!replace && (replacing || rendered >= ordered.length))
      )
        return;
      const offset = replace ? 0 : rendered,
        batch = ordered.slice(offset, offset + 20);
      failed = false;
      const request = new AbortController();
      pending = request;
      updateProgress();
      try {
        const records = await data.fetchRecords(
          batch.map((record) => record.id),
          { signal: request.signal },
        );
        if (replace && replacement) await replacement;
        if (disposed || token !== revision) return;
        const nodes = records.map((record, i) => card(record, offset + i + 1));
        if (replace) list.replaceChildren(...nodes);
        else list.append(...nodes);
        rendered = offset + records.length;
        if (pagination) pagination.hidden = true;
        root.dataset.reviewPageReady = 'true';
        if (replace) {
          replacing = false;
          list.style.minHeight = '';
          await fade(1, window.TDBMotion.defaults?.fadeIn || 350);
        }
      } catch (error) {
        if (token !== revision || disposed || error.name === 'AbortError') return;
        failed = true;
        if (replace) {
          replacing = false;
          list.style.minHeight = '';
          await fade(1, window.TDBMotion.defaults?.fadeIn || 350);
        }
      } finally {
        if (pending === request) {
          pending = null;
          updateProgress();
        }
      }
    }
    async function select(selection, scroll = false) {
      state = normalize(selection);
      draft = copy(state);
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(state));
      } catch {}
      const token = ++revision;
      pending?.abort();
      pending = null;
      rendered = 0;
      ordered = order(index, state);
      sync();
      // Retain the old geometry while fetching. Commit the next cards only once
      // faded out; a later selection owns both the request and the reveal.
      replacing = true;
      list.style.minHeight = list.getBoundingClientRect().height + 'px';
      replacement = fade(0, window.TDBMotion.defaults?.fadeOut || 120);
      await loadMore(token, true);
      if (scroll && !disposed && token === revision)
        list.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    forms.forEach((form, i) => {
      listen(form, 'click', (event) => {
        const option = event.target.closest('[data-review-page-group]');
        if (option && form.contains(option)) {
          event.preventDefault();
          if (option.getAttribute('aria-disabled') === 'true') return;
          const key = option.dataset.reviewPageGroup,
            value = option.dataset.reviewPageValue;
          const next = copy(i ? draft : state);
          if (key === 'sort') next.sort = value;
          else if (!value) next[key] = [];
          else
            next[key] = next[key].includes(value)
              ? next[key].filter((v) => v !== value)
              : [...next[key], value];
          if (i) {
            draft = next;
            sync();
          } else select(next);
        }
        const reset = event.target.closest('[data-review-page-reset]');
        if (reset && form.contains(reset)) {
          event.preventDefault();
          if (i) {
            draft = emptyState();
            filters.collapseAll();
            sync();
          } else {
            embeddedDisclosures.collapseAll();
            select(emptyState());
          }
        }
      });
      listen(form, 'keydown', (event) => {
        const option = event.target.closest('[data-review-page-group]');
        if (option && (event.key === ' ' || (event.key === 'Enter' && option.tagName !== 'A'))) {
          event.preventDefault();
          option.click();
        }
      });
    });
    listen(q('apply', panel), 'click', async (event) => {
      event.preventDefault();
      const next = copy(draft);
      await filters.set(false);
      await select(next, true);
    });
    listen(q('view', embedded), 'click', (event) => {
      event.preventDefault();
      list.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    listen(more, 'click', () => loadMore(revision, rendered === 0));
    try {
      data = await cms.load({ signal });
      index = await data.loadIndex({ signal });
      ordered = order(index, state);
      sync();
      await loadMore(revision, true);
    } catch (error) {
      lifecycle.abort();
      filters.destroy();
      drawer.destroy();
      sticky.destroy();
      embeddedDisclosures.destroy();
      tickers.forEach((ticker) => ticker.destroy());
      status.textContent =
        'The published reviews are shown below. Reload to try the filters again.';
      throw error;
    }
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting) && !failed) loadMore();
        },
        { rootMargin: '900px 0px' },
      );
      observer.observe(sentinel);
    }
    instance = {
      loadMore: () => loadMore(),
      get count() {
        return rendered;
      },
      destroy() {
        disposed = true;
        revision++;
        lifecycle.abort();
        pending?.abort();
        observer?.disconnect();
        fading?.cancel();
        list.style.opacity = '';
        list.style.minHeight = '';
        filters.destroy();
        drawer.destroy();
        sticky.destroy();
        embeddedDisclosures.destroy();
        tickers.forEach((ticker) => ticker.destroy());
        for (const animation of animations) animation.cancel();
        home.append(dock);
        dock.classList.remove('is-in-drawer', 'is-expanded');
        list.replaceChildren(...original);
        list.removeAttribute('aria-busy');
        if (pagination) pagination.hidden = false;
        delete root.dataset.reviewPageReady;
        instance = null;
      },
    };
    window.dispatchEvent(new CustomEvent('tdb:review-page-ready'));
    return instance;
  }
  window.TDBReviewPage = Object.freeze({
    version: '1.0.0',
    mount,
    destroy() {
      instance?.destroy();
    },
  });
  const start = () => mount().catch((error) => console.warn('[TDB review page]', error));
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
