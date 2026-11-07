/* Treatment chapters in the established USP shell. Content comes from native CMS bindings. */
(() => {
  'use strict';
  if (window.TDBTreatmentGuideDrawer) return;
  const base = new URL('./', document.currentScript.src),
    instances = new WeakMap(),
    flights = new WeakMap();
  const artworkBase = 'https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/';
  const artwork = [
    ['diamond', '6ac8f795d857a42b8d46b54c_tdb-exceptional-diamond.svg'],
    [
      'thumbprint',
      '678aba69d9fd592a6d93970f_Logo%20Icon%20-%2024%2048_Core%20Value%20Thumb%20Print%20192.svg',
    ],
    ['lotus', '6aeddc640ce35bc2256782a5_tdb-lotus-large-1px.svg'],
    ['quotation', '6ac7b973bb15c9b9f29a8d18_tdb-review-quote.svg'],
    ['barn-window', '6ac9119d7e007fc273d48477_tdb-barn-window-light.min.svg'],
  ];
  let dependencies;
  function code() {
    return (dependencies ||= (async () => {
      await window.TDBModules.load(new URL('tdb-motion.js', base));
      await Promise.all([
        window.TDBModules.load(new URL('tdb-drawer.js', base)),
        window.TDBModules.load(new URL('tdb-ticker.js', base)),
        window.TDBModules.load(new URL('tdb-swiper-8.4.7.min.js', base), {
          ready: () => Boolean(window.TDBSwiper?.create),
        }),
        window.TDBModules.load(new URL('tdb-drawer.css', base), { type: 'style' }),
        window.TDBModules.load(new URL('tdb-usp-drawer.css', base), { type: 'style' }),
        window.TDBModules.load(new URL('tdb-treatment-guide.css', base), { type: 'style' }),
        Promise.all(
          artwork.map(([, file]) => {
            const image = new Image();
            image.src = artworkBase + file;
            return image.decode().catch(() => {});
          }),
        ),
      ]);
    })().catch((error) => {
      dependencies = null;
      throw error;
    }));
  }
  function mount(section) {
    if (instances.has(section)) return instances.get(section);
    const records = [...section.querySelectorAll('[data-tdb-guide-panel]')].map((pane) => ({
      title: pane.querySelector('[data-tdb-guide-title]').textContent.trim(),
      summary: pane.querySelector('[data-tdb-guide-summary]').textContent.trim(),
      body: pane.querySelector('[data-tdb-guide-body]'),
    }));
    if (records.length !== 5 || records.some((record) => !record.body))
      throw Error('Treatment guide chapters unavailable');
    const treatment =
      section.querySelector('[data-tdb-guide-treatment]')?.textContent.trim() || 'Treatment';
    const template = document.createElement('template');
    template.innerHTML = `<div class="tdb-drawer_root is-hidden" data-tdb-drawer data-tdb-usp-shell data-tdb-guide-shell aria-hidden="true">
      <div class="tdb-drawer_backdrop" data-tdb-drawer-backdrop aria-hidden="true"></div>
      <div class="tdb-drawer_panel" data-tdb-drawer-panel role="dialog" aria-modal="true" tabindex="-1">
        <button class="tdb-drawer_close" data-tdb-drawer-close type="button" aria-label="Close treatment guide"><span class="tdb-drawer_close-icon" aria-hidden="true"></span></button>
        <div class="tdb-usp_content">
          <header class="tdb-usp_header"><div class="tdb-usp_brand"><div class="tdb-guide_treatment"></div><span class="tdb-usp_rule" aria-hidden="true"></span><h2 class="tdb-usp_title"></h2></div></header>
          <div class="tdb-guide_static-intro"><div class="tdb-guide_intro-card"><div class="tdb-guide_static-mark" aria-hidden="true"><span class="tdb-guide_intro-rule"></span><span class="tdb-guide_icon-slot" data-guide-icon>0</span><span class="tdb-guide_intro-rule"></span></div><div class="tdb-guide_intro-copy"><p class="tdb-guide_intro"></p></div></div></div>
          <div class="tdb-usp_viewport" role="group" aria-roledescription="carousel" aria-label="Treatment guide chapters"><div class="tdb-usp_track"></div></div>
          <footer class="tdb-usp_footer"><div class="tdb-review-drawer_position" role="status" aria-live="polite" aria-atomic="true"><span class="tdb-pagination-number" data-guide-position>01</span><span class="tdb-pagination-rule" aria-hidden="true"></span><span class="tdb-pagination-number">05</span></div><div class="tdb-usp_arrows"><button class="carousel-arrow tdb-review-drawer_nav-button" type="button" data-guide-prev aria-label="Previous chapter"><span class="carousel-arrow-icon is-previous" aria-hidden="true"></span></button><button class="carousel-arrow tdb-review-drawer_nav-button" type="button" data-guide-next aria-label="Next chapter"><span class="carousel-arrow-icon" aria-hidden="true"></span></button></div></footer>
        </div>
      </div>
    </div>`;
    const shell = template.content.firstElementChild;
    shell.hidden = true;
    shell.inert = true;
    section.append(shell);
    const panel = shell.querySelector('[data-tdb-drawer-panel]'),
      close = shell.querySelector('[data-tdb-drawer-close]');
    panel.setAttribute('aria-label', treatment + ' — treatment guide');
    shell.querySelector('.tdb-guide_treatment').textContent = treatment;
    const root = shell.querySelector('.tdb-usp_content'),
      header = root.querySelector('header'),
      footer = root.querySelector('footer');
    const staticIntro = root.querySelector('.tdb-guide_static-intro'),
      intro = root.querySelector('.tdb-guide_intro');
    const viewport = root.querySelector('.tdb-usp_viewport'),
      track = root.querySelector('.tdb-usp_track'),
      title = root.querySelector('h2');
    title.textContent = '1. ' + records[0].title;
    const ticker = window.TDBNativeTicker.mount(root.querySelector('[data-guide-position]'));
    const titleTicker = window.TDBNativeTicker.mount(title, {
      valueClass: 'tdb-usp_title-value',
      incomingClass: 'tdb-usp_title-incoming',
    });
    const iconTicker = window.TDBNativeTicker.mount(root.querySelector('[data-guide-icon]'), {
      valueClass: 'tdb-guide_icon-value',
      incomingClass: 'tdb-guide_icon-incoming',
      render(node, value) {
        const [name, file] = artwork[Number(value)] || artwork[0];
        const icon = document.createElement('span');
        icon.className = 'tdb-guide_icon-art';
        icon.style.setProperty('--tdb-guide-artwork', `url("${artworkBase + file}")`);
        node.dataset.guideIcon = name;
        node.replaceChildren(icon);
      },
    });
    const fades = window.TDBMotion.fadeController();
    let introTimer = 0,
      shownIntro = -1;
    function reflectIntro(index, animate) {
      if (shownIntro === index) return;
      shownIntro = index;
      clearTimeout(introTimer);
      if (!animate || window.TDBMotion.reduced.matches) {
        intro.textContent = records[index].summary;
        fades.to(intro, 1, 0);
        return;
      }
      fades.to(intro, 0, window.TDBMotion.defaults.fadeOut);
      introTimer = setTimeout(() => {
        intro.textContent = records[index].summary;
        fades.to(intro, 1, window.TDBMotion.defaults.fadeIn);
      }, window.TDBMotion.defaults.fadeOut + window.TDBMotion.defaults.entryDelay);
    }
    records.forEach((record, index) => {
      const slide = document.createElement('article');
      slide.className = 'tdb-usp_slide';
      slide.dataset.guideSlide = String(index);
      slide.setAttribute('data-lenis-prevent', '');
      slide.setAttribute('aria-label', record.title);
      slide.tabIndex = 0;
      const content = document.createElement('div');
      content.className = 'tdb-usp_slide-content';
      const body = record.body.cloneNode(true);
      body.className = 'tdb-usp_copy w-richtext';
      for (const node of [body, ...body.querySelectorAll('*')])
        for (const attr of [...node.attributes])
          if (
            attr.name === 'id' ||
            attr.name === 'data-w-id' ||
            attr.name.startsWith('data-tdb-guide')
          )
            node.removeAttribute(attr.name);
      content.append(body);
      slide.append(content);
      track.append(slide);
    });
    const controller = new AbortController(),
      scroll = new Map();
    let swiper,
      requested = 0,
      direction = 1,
      activeSlide,
      landscape = false,
      lastIndex = -1,
      source;
    const reading = window.TDBDrawerReading.mount({
      pane: root,
      footer,
      viewport,
      track,
      swiper: () => swiper,
      slideScroll: () => activeSlide,
      active: () => drawer.state === 'open',
      onMode: (value) => {
        landscape = value;
      },
      nodes: () => [
        root,
        header,
        staticIntro,
        footer,
        viewport,
        track,
        close,
        ...track.querySelectorAll('.tdb-usp_slide,.tdb-usp_slide-content'),
      ],
      durationRoot: root,
      durationProperty: '--tdb-usp-duration',
    });
    function save() {
      if (activeSlide)
        scroll.set(Number(activeSlide.dataset.guideSlide), reading.scroll().scrollTop);
    }
    function reflect(animate = true) {
      const index = swiper.realIndex;
      ticker.update(String(index + 1).padStart(2, '0'), direction, animate);
      titleTicker.update(`${index + 1}. ${records[index].title}`, direction, animate);
      iconTicker.update(String(index), direction, animate);
      reflectIntro(index, animate);
      const selected = swiper.slides[swiper.activeIndex];
      if (selected !== activeSlide) selected.scrollTop = landscape ? 0 : scroll.get(index) || 0;
      activeSlide = selected;
      if (lastIndex !== index) {
        lastIndex = index;
        // Native tabs still own the page. This also drives the optional wheel.
        section.querySelector(`[data-tdb-guide-choice="${index}"]`)?.click();
      }
    }
    function createSwiper() {
      if (swiper) return;
      swiper = window.TDBSwiper.create(viewport, {
        wrapperClass: 'tdb-usp_track',
        slideClass: 'tdb-usp_slide',
        slidesPerView: 1,
        spaceBetween: 0,
        loop: true,
        loopAdditionalSlides: 1,
        initialSlide: requested,
        autoHeight: landscape,
        speed: window.TDBMotion.duration(innerWidth),
        loopPreventsSlide: false,
        preventInteractionOnTransition: false,
        touchStartPreventDefault: false,
        threshold: 12,
        touchAngle: 40,
        grabCursor: true,
        a11y: { enabled: false },
        observer: false,
        updateOnWindowResize: false,
        on: {
          beforeTransitionStart() {
            save();
            reading.capture();
          },
          touchStart: save,
          sliderFirstMove: reading.capture,
          transitionStart: reading.apply,
        },
      });
      swiper.on('slideChange', () => {
        direction =
          swiper.swipeDirection === 'prev' ? -1 : swiper.swipeDirection === 'next' ? 1 : direction;
        reflect();
      });
      window.TDBCarouselVisibility.bind(swiper, { activeOnly: true });
      reading.bind();
      swiper.on('loopFix', () => reflect(false));
      window.TDBSwiper.onSettled(swiper, () => {
        reading.apply();
        reading.clear();
        reflect(false);
      });
    }
    const drawer = window.TDBDrawer.mount(shell, {
      hideChrome: true,
      returnFocus: () =>
        (!section.hasAttribute('data-tdb-guide-fallback') &&
          section.querySelector('[data-tdb-guide-card] [data-tdb-guide-open]')) ||
        section.querySelector('.w--tab-active [data-tdb-guide-open]') ||
        source,
      onOpen() {
        reading.clear();
        reading.setMode();
        createSwiper();
        swiper.update();
        swiper.slideToLoop(requested, 0, false);
        reflect(false);
        if (landscape) root.scrollTop = scroll.get(requested) || 0;
        source?.setAttribute('aria-expanded', 'true');
      },
      onClose() {
        save();
        reading.clear();
        ticker.settle();
        titleTicker.settle();
        iconTicker.settle();
        clearTimeout(introTimer);
        intro.textContent = records[Math.max(0, shownIntro)].summary;
        fades.to(intro, 1, 0);
        source?.setAttribute('aria-expanded', 'false');
      },
    });
    reading.setMode();
    window.TDBCarouselControls.bind({
      root: shell,
      previous: root.querySelector('[data-guide-prev]'),
      next: root.querySelector('[data-guide-next]'),
      signal: controller.signal,
      enabled: () => Boolean(swiper) && !['closed', 'closing'].includes(drawer.state),
      navigate(delta) {
        save();
        reading.capture();
        direction = delta;
        if (delta < 0) swiper.slidePrev();
        else swiper.slideNext();
      },
    });
    const api = {
      async open(index, trigger) {
        if (drawer.state !== 'closed') return;
        requested = Math.max(0, Math.min(4, index));
        source = trigger;
        await drawer.open(trigger);
      },
      destroy() {
        drawer.destroy();
        reading.destroy();
        swiper?.destroy(true, true);
        controller.abort();
        ticker.destroy();
        titleTicker.destroy();
        iconTicker.destroy();
        clearTimeout(introTimer);
        fades.destroy();
        shell.remove();
        instances.delete(section);
        flights.delete(section);
      },
    };
    instances.set(section, api);
    return api;
  }
  window.TDBTreatmentGuideDrawer = Object.freeze({
    prepare(section) {
      if (instances.has(section)) return Promise.resolve(instances.get(section));
      if (!flights.has(section))
        flights.set(
          section,
          code()
            .then(() => {
              if (!section.isConnected || (window.TDBConsent && !window.TDBConsent.allows()))
                throw new DOMException('Cancelled', 'AbortError');
              return mount(section);
            })
            .catch((error) => {
              flights.delete(section);
              throw error;
            }),
        );
      return flights.get(section);
    },
    destroy(section) {
      instances.get(section)?.destroy();
    },
  });
})();
