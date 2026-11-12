/* First Impressions v2.0.0. Native holding frames and CMS records, shared gallery motion. */
(() => {
  'use strict';
  if (window.TDBFirstImpressions) return;
  const base = new URL(
    './',
    document.currentScript?.src || window.TDBRelease?.base || location.href,
  );
  const instances = new Map(),
    pending = new Map();
  let dependencies,
    disposed = false;
  const allowed = () => !disposed && Boolean(window.TDBConsent?.allows());
  const node = (tag, cls, text) => {
    const element = document.createElement(tag);
    element.className = cls;
    if (text) element.textContent = text;
    return element;
  };
  function readCards() {
    const feed = document.querySelector('[data-tdb-first-impressions-feed]');
    return [...(feed?.querySelectorAll('.w-dyn-item') || [])].flatMap((item) => {
      const value = (key) => item.querySelector('[data-fi-' + key + ']')?.textContent.trim() || '';
      const image = item.querySelector('[data-fi-image]'),
        src = image?.getAttribute('src');
      const words = ['word-one', 'word-two', 'word-three'].map(value),
        initials = value('initials');
      if (!src || !initials || words.some((word) => !word)) return [];
      const rawDate = value('date'),
        month = value('month');
      const monthOnly = !rawDate && /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
      const date = rawDate
        ? new Date(rawDate)
        : monthOnly
          ? new Date(month + '-01T00:00:00Z')
          : null;
      const validDate = date && !Number.isNaN(date.getTime());
      const verified = item.querySelector('[data-fi-verified]');
      return [
        {
          src,
          words: words.join(' · '),
          initials,
          alt:
            value('image-description') ||
            image.alt ||
            initials + '’s handwritten first-visit card: ' + words.join(', '),
          srcset: image.getAttribute('srcset') || '',
          verified:
            !!verified && !verified.hidden && !verified.classList.contains('w-condition-invisible'),
          date: validDate
            ? new Intl.DateTimeFormat(
                'en-GB',
                monthOnly
                  ? { month: 'long', year: 'numeric', timeZone: 'UTC' }
                  : { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' },
              ).format(date)
            : '',
          datetime: validDate ? (monthOnly ? month : date.toISOString().slice(0, 10)) : '',
        },
      ];
    });
  }
  function ready() {
    if (!dependencies)
      dependencies = (async () => {
        const load = (file, check) => {
          if (!allowed()) throw new DOMException('Cancelled', 'AbortError');
          return window.TDBModules.load(
            new URL(file, base),
            check ? { ready: check } : { type: 'style' },
          );
        };
        await load('tdb-motion.js', () => !!window.TDBMotion);
        await Promise.all([
          load('tdb-swiper-8.4.7.min.js', () => !!window.TDBSwiper?.create),
          load('tdb-ticker.js', () => !!window.TDBNativeTicker),
          load('tdb-first-impressions.css'),
          load('tdb-slider-ui.css'),
          load('tdb-slider-focus.js', () => !!document.documentElement.dataset.tdbSliderFocusReady),
        ]);
        await load('tdb-gallery.js', () => !!window.TDBGallery);
      })().catch((error) => {
        dependencies = null;
        throw error;
      });
    return dependencies;
  }
  function card(record, index) {
    const figure = node('figure', 'tdb-fi-card swiper-slide');
    figure.dataset.fiIndex = String(index);
    figure.setAttribute('role', 'group');
    figure.setAttribute('aria-roledescription', 'slide');
    const image = node('img', 'tdb-fi-photo');
    image.src = record.src;
    if (record.srcset) image.srcset = record.srcset;
    image.sizes = '(max-width:767px) 90vw, (min-width:1494px) 448px, 30vw';
    image.width = 1080;
    image.height = 1440;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.draggable = false;
    image.alt = record.alt;
    figure.append(image);
    for (const position of ['top', 'bottom']) {
      const strip = node('div', 'tdb-fi-image-strip is-' + position),
        crop = node('span', 'tdb-fi-reflection');
      const copy = image.cloneNode(false);
      copy.alt = '';
      copy.className = 'tdb-fi-reflection-photo';
      strip.setAttribute('aria-hidden', 'true');
      crop.append(copy);
      strip.append(crop, node('span', 'tdb-fi-glass'));
      figure.append(strip);
    }
    return figure;
  }
  function mount(root, records) {
    if (instances.has(root)) return instances.get(root);
    const holder = root.querySelector('[data-tdb-native-holder]');
    const viewport = node('div', 'tdb-fi-viewport swiper'),
      track = node('div', 'tdb-fi-track swiper-wrapper');
    viewport.append(track);
    viewport.tabIndex = 0;
    viewport.setAttribute(
      'aria-label',
      'First visit cards. Use left and right arrow keys to change card.',
    );
    records.forEach((record, index) => track.append(card(record, index)));
    // The shared first-view advance starts on the previous card and lands on card one.
    if (records.length > 1) track.prepend(track.lastElementChild);
    const header = node('div', 'tdb-fi-banner tdb-fi-fixed-banner');
    const words = node('p', 'tdb-fi-words'),
      meta = node('div', 'tdb-fi-meta');
    const author = node('span', 'tdb-fi-initials'),
      initials = node('span', 'tdb-fi-ticker tdb-fi-initial-value');
    const badge = node('span', 'tdb-fi-verified');
    badge.setAttribute('role', 'img');
    badge.setAttribute('aria-label', 'Verified patient');
    author.append(initials, badge);
    const date = node('time', 'tdb-fi-date'),
      clock = node('span', 'tdb-fi-clock'),
      dateValue = node('span', 'tdb-fi-ticker tdb-fi-date-value');
    clock.setAttribute('aria-hidden', 'true');
    date.append(clock, dateValue);
    meta.append(author, date);
    header.append(words, meta);
    const nav = node('div', 'tdb-fi-navigation'),
      count = node('div', 'tdb-fi-count');
    const current = node('span', 'tdb-fi-ticker tdb-fi-count-current'),
      rule = node('span', 'tdb-fi-count-rule');
    rule.setAttribute('aria-hidden', 'true');
    count.append(current, rule, node('span', '', String(records.length).padStart(2, '0')));
    const buttons = node('div', 'swiper-buttons-wrapper');
    for (const [kind, label] of [
      ['prev', 'Previous first impression'],
      ['next', 'Next first impression'],
    ]) {
      const button = node('button', 'carousel-arrow tdb-fi-arrow swiper-btn-' + kind);
      button.type = 'button';
      button.setAttribute('aria-label', label);
      const icon = node('span', 'tdb-fi-arrow-icon');
      icon.setAttribute('aria-hidden', 'true');
      button.append(icon);
      buttons.append(button);
    }
    nav.append(count, buttons);
    root.append(viewport, header, nav);
    root.classList.add('highlight-swiper_component');
    initials.style.width = Math.max(...records.map((r) => r.initials.length), 2) + 1.2 + 'ch';
    dateValue.style.width = Math.max(...records.map((r) => r.date.length), 1) + 'ch';
    const tickers = [initials, dateValue, current].map((slot) =>
      window.TDBNativeTicker.mount(slot, {
        valueClass: 'tdb-fi-ticker-value',
        incomingClass: 'tdb-fi-ticker-value',
      }),
    );
    let swiper,
      stopSettled,
      observer,
      timer = 0,
      active = -1,
      dragging = false,
      dead = false,
      shown = false;
    const hide = () => {
      clearTimeout(timer);
      timer = 0;
      words.classList.remove('is-ready');
    };
    function sync() {
      if (dead) return;
      const index =
        ((swiper?.realIndex || 0) + (records.length > 1 ? records.length - 1 : 0)) % records.length;
      swiper?.slides.forEach((slide) => {
        slide.classList.toggle('is-current', Number(slide.dataset.fiIndex) === index);
        slide.setAttribute(
          'aria-label',
          Number(slide.dataset.fiIndex) + 1 + ' of ' + records.length,
        );
      });
      if (index === active) return;
      const record = records[index],
        direction = swiper && swiper.activeIndex < swiper.previousIndex ? -1 : 1;
      const previous = records[active];
      active = index;
      words.textContent = record.words;
      tickers[0].update(record.initials, direction, shown);
      tickers[1].update(
        record.date,
        previous && record.datetime < previous.datetime ? -1 : 1,
        shown,
      );
      tickers[2].update(String(index + 1).padStart(2, '0'), direction, shown);
      date.hidden = !record.date;
      date.dateTime = record.datetime;
      badge.hidden = !record.verified;
      count.setAttribute('aria-label', index + 1 + ' of ' + records.length);
    }
    function reveal() {
      if (
        dead ||
        timer ||
        dragging ||
        swiper?.animating ||
        root.getAttribute('data-tdb-slider-first-view') === 'pending'
      )
        return;
      timer = setTimeout(() => {
        timer = 0;
        if (dead || dragging || swiper?.animating) return;
        sync();
        shown = true;
        words.classList.add('is-ready');
        initials.classList.add('is-ready');
        dateValue.classList.add('is-ready');
      }, window.TDBMotion.defaults.entryDelay);
    }
    const handlers = {
      slideChange: () => {
        hide();
        sync();
      },
      transitionStart: hide,
      touchStart: () => {
        dragging = true;
        hide();
      },
      touchEnd: () => {
        dragging = false;
        reveal();
      },
      beforeDestroy: () => queueMicrotask(() => destroy(false)),
    };
    function destroy(destroySwiper = true) {
      if (dead) return;
      dead = true;
      hide();
      observer?.disconnect();
      stopSettled?.();
      if (swiper)
        Object.entries(handlers).forEach(([event, handler]) => swiper.off(event, handler));
      if (destroySwiper && swiper && !swiper.destroyed) swiper.destroy(true, true);
      tickers.forEach((ticker) => ticker.destroy());
      window.TDBGallery.resetFirstView?.(root);
      viewport.remove();
      header.remove();
      nav.remove();
      holder?.removeAttribute('hidden');
      root.classList.remove('highlight-swiper_component');
      root.removeAttribute('data-tdb-slider-init');
      root.removeAttribute('data-fi-ready');
      root.removeAttribute('data-tdb-slider-type');
      instances.delete(root);
    }
    try {
      sync();
      window.TDBGallery.beforeObserve(root);
      swiper = window.TDBSwiper.mount('gallery', root);
      if (!swiper) throw Error('Shared First Impressions gallery unavailable');
      Object.entries(handlers).forEach(([event, handler]) => swiper.on(event, handler));
      stopSettled = window.TDBSwiper.onSettled(swiper, () => {
        sync();
        reveal();
      });
      observer = new MutationObserver(reveal);
      observer.observe(root, { attributes: true, attributeFilter: ['data-tdb-slider-first-view'] });
      holder?.setAttribute('hidden', '');
      root.setAttribute('data-fi-ready', '2.0.0');
      sync();
      reveal();
      const api = Object.freeze({ swiper, destroy });
      instances.set(root, api);
      return api;
    } catch (error) {
      destroy();
      throw error;
    }
  }
  async function prepare(root) {
    if (!allowed() || !root.isConnected) return;
    if (instances.has(root)) return instances.get(root);
    if (pending.has(root)) return pending.get(root);
    const flight = (async () => {
      const records = readCards();
      if (!records.length) throw Error('No published First Impressions cards');
      await ready();
      if (!allowed() || !root.isConnected) return;
      // Keep the native holding frame until its first portrait can actually paint.
      const image = new Image();
      image.src = records[0].src;
      await image.decode();
      if (!allowed() || !root.isConnected) return;
      return mount(root, records);
    })().finally(() => pending.delete(root));
    pending.set(root, flight);
    return flight;
  }
  const unsubscribe = window.TDBConsent?.subscribe(() => {
    if (!allowed()) for (const instance of [...instances.values()]) instance.destroy();
  });
  window.TDBFirstImpressions = Object.freeze({
    version: '2.0.0',
    prepare,
    destroy() {
      disposed = true;
      unsubscribe?.();
      for (const instance of [...instances.values()]) instance.destroy();
    },
  });
})();
