/* TDB shared smile cards v3.2. All changing text starts hidden; pagination remains visible. */
(() => {
  const lotus = 'https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/678aba6948c1f2433e11fcd0_Logo%20Icon%20-%2024%2048_Core%20Value%20Lotus%20Print%20192.svg';
  const make = (tag, className, text) => {
    const el = document.createElement(tag);
    el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const image = src => {
    const el = make('img', '');
    el.src = src; el.alt = ''; el.width = 16; el.height = 16;
    el.loading = 'lazy'; el.decoding = 'async';
    return el;
  };
  const treatmentSources = card => Array.from(card.querySelectorAll('.smile-card .treatment-smile'))
    .filter(el => !el.classList.contains('w-condition-invisible') && el.querySelector('.paragraph-smile')?.textContent.trim());
  // One animation implementation for pagination, price, duration and clinician.
  const ticker = (viewport, className, reduced, normalize = text => text) => {
    let value = null, animations = [], revision = 0;
    const item = text => make('span', className, text);
    const stop = () => {
      revision++;
      animations.forEach(animation => animation.cancel());
      animations = [];
      if (value !== null) viewport.replaceChildren(item(value));
    };
    return {
      stop,
      update(text, direction, animate = true) {
        if (value !== null && normalize(value) === normalize(text)) return;
        const previous = value;
        stop();
        value = text;
        const incoming = item(text);
        if (previous === null || !animate || reduced.matches || !viewport.animate) {
          viewport.replaceChildren(incoming);
          return;
        }
        const outgoing = item(previous);
        const token = revision;
        viewport.replaceChildren(outgoing, incoming);
        const timing = { duration: 400, easing: 'ease-in-out', fill: 'both' };
        animations = [
          outgoing.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(' + (-direction * 100) + '%)' }], timing),
          incoming.animate([{ transform: 'translateY(' + (direction * 100) + '%)' }, { transform: 'translateY(0)' }], timing)
        ];
        animations[1].onfinish = () => {
          if (token !== revision) return;
          viewport.replaceChildren(incoming);
          animations.forEach(animation => animation.cancel());
          animations = [];
        };
      }
    };
  };
  const prepare = card => {
    const content = card.querySelector('.layout423_card-content.smile');
    const title = content?.querySelector(':scope > .margin-top.smile.left');
    const footer = content?.querySelector(':scope > .margin-top.smile:not(.left)');
    const details = content?.querySelector('.smile-card');
    const media = card.querySelector('.layout423_image-wrapper.smile');
    if (!title || !footer || !details || !media) return;
    if (!title.querySelector('.tdb-smile-kicker')) {
      const kicker = make('div', 'tdb-smile-kicker');
      kicker.append(make('span', 'tdb-smile-kicker-title', 'Smile transformation'));
      title.prepend(kicker);
    }
    title.querySelector('.tdb-smile-kicker').setAttribute('aria-hidden', 'true');
    if (!media.querySelector('.tdb-smile-image-label')) {
      media.append(make('span', 'tdb-smile-image-label is-before', 'Before'), make('span', 'tdb-smile-image-label is-after', 'After'));
    }
    // Mark only text elements; the header background and photograph stay opaque.
    [title.querySelector(':scope > .tagline-smile-layout'),
      details.querySelector(':scope > .paragraph-smile.descript'),
      ...media.querySelectorAll('.tdb-smile-image-label')].filter(Boolean).forEach(text => {
      if (!text.hasAttribute('data-fade-slide')) {
        text.setAttribute('data-fade-slide', '');
        text.classList.remove('is-visible');
      }
    });
    title.querySelectorAll('.tdb-smile-card-number').forEach(node => node.remove());
    if (footer.querySelector('.tdb-smile-summary')) return;
    const sourceFacts = footer.querySelectorAll('.smile-iconset:last-child > .tagline-smile-layout');
    const sourceIcons = footer.querySelectorAll('.smile-iconset:last-child svg');
    const clinician = details.querySelector('.button.smile > :last-child')?.textContent.trim();
    if (sourceFacts.length !== 2 || sourceIcons.length !== 2 || !clinician) return;
    const summary = make('div', 'tdb-smile-summary');
    const treatments = make('ul', 'tdb-smile-treatments');
    treatments.setAttribute('aria-label', 'Treatments carried out');
    treatmentSources(card).forEach(source => {
      const line = make('li', '');
      const src = source.querySelector('img')?.getAttribute('src');
      if (src) line.append(image(src));
      line.append(make('span', '', source.querySelector('.paragraph-smile').textContent.trim()));
      treatments.append(line);
    });
    const facts = make('div', 'tdb-smile-facts');
    facts.setAttribute('aria-hidden', 'true');
    sourceFacts.forEach((source, index) => {
      const fact = make('div', 'tdb-smile-fact');
      const icon = sourceIcons[index].cloneNode(true);
      icon.removeAttribute('id'); icon.setAttribute('aria-hidden', 'true');
      icon.setAttribute('focusable', 'false'); icon.removeAttribute('role');
      fact.append(icon, make('span', '', source.textContent.trim()));
      facts.append(fact);
    });
    const doctor = make('div', 'tdb-smile-fact');
    doctor.append(image(lotus), make('span', '', clinician));
    facts.append(doctor);
    treatments.setAttribute('data-fade-slide', '');
    summary.append(facts, treatments);
    footer.append(summary);
    footer.classList.add('tdb-smile-summary-ready');
  };
  // Swiper owns slide motion. This presentation controller owns the card text
  // and the one stationary counter; it never changes an ancestor
  // class during a transition (observeParents would interrupt Swiper).
  const bindPresentation = (component, swiperEl, wrapper, prepare) => {
    const counter = component.querySelector(':scope > .tdb-smile-counter') || make('span', 'tdb-smile-counter');
    const kicker = make('span', 'tdb-smile-static-kicker', 'Smile transformation');
    component.querySelector(':scope > .swiper_functions-btm > .swiper-count')?.remove();
    if (!counter.parentElement) component.append(counter);
    component.append(kicker);
    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = { get matches() { return motionPreference.matches && !(document.documentElement.dataset.wfPage === '677cf86df9952f978d94d8a9' && matchMedia('(min-width:992px)').matches); } };
    let slides = [], originals = [], total = 0, swiper = null, showTimer = 0, moving = false, presentationReady = false;
    const current = make('span', 'tdb-smile-counter-current');
    const divider = make('span', 'tdb-smile-counter-divider');
    const totalNumber = make('span', 'tdb-smile-counter-total');
    const accessibleCount = make('span', 'tdb-smile-counter-label');
    [current, divider, totalNumber].forEach(el => el.setAttribute('aria-hidden', 'true'));
    counter.setAttribute('aria-live', 'polite');
    counter.setAttribute('aria-atomic', 'true');
    counter.replaceChildren(current, divider, totalNumber, accessibleCount);
    const countTicker = ticker(current, 'tdb-smile-counter-value', reduced);
    let factsLayer = null, factTickers = [], factViewports = [];
    const revealValues = () => {
      if (presentationReady) return;
      presentationReady = true;
      factViewports.forEach(viewport => viewport.classList.add('is-ready'));
    };
    const sourceFacts = slide => slide?.querySelector('.tdb-smile-summary > .tdb-smile-facts');
    const values = slide => Array.from(sourceFacts(slide)?.querySelectorAll('.tdb-smile-fact > span') || []).map(el => el.textContent.trim());
    const stopTickers = () => {
      countTicker.stop();
      factTickers.forEach(item => item.stop());
    };
    const layoutFacts = () => {
      const source = sourceFacts(originals[0]);
      if (!source || !factsLayer || !component.isConnected) return;
      const sourceRect = source.getBoundingClientRect();
      const rootRect = component.getBoundingClientRect();
      factsLayer.style.top = (sourceRect.top - rootRect.top) + 'px';
      factsLayer.style.height = sourceRect.height + 'px';
      // Reserve the widest existing value in each column. The icons therefore
      // stay in exactly one position, even when a shorter value follows.
      factViewports.forEach((viewport, column) => {
        const boxes = originals.map(slide => sourceFacts(slide)?.children[column]?.querySelector('span')?.getBoundingClientRect()).filter(Boolean);
        const width = Math.max(0, ...boxes.map(box => box.width));
        const height = Math.max(0, ...boxes.map(box => box.height));
        // Desktop container units can differ fractionally between slide and overlay.
        // Reserve a pixel so the static ticker never wraps into its clipped edge.
        const desktopHome = document.documentElement.dataset.wfPage === '677cf86df9952f978d94d8a9' && matchMedia('(min-width:992px)').matches;
        viewport.style.width = (desktopHome ? Math.ceil(width) + 1 : width) + 'px';
        viewport.style.height = (desktopHome ? Math.ceil(height) + 1 : height) + 'px';
      });
    };
    const prepareFacts = () => {
      if (factsLayer) return;
      const source = sourceFacts(originals[0]);
      if (!source || source.children.length !== 3) return;
      factsLayer = make('div', 'tdb-smile-facts tdb-smile-static-facts');
      factsLayer.setAttribute('role', 'group');
      factsLayer.setAttribute('aria-label', 'Treatment summary');
      Array.from(source.children).forEach((cell, column) => {
        const fact = make('div', 'tdb-smile-fact');
        const icon = cell.querySelector('svg, img').cloneNode(true);
        icon.setAttribute('aria-hidden', 'true');
        const viewport = make('span', 'tdb-smile-fact-ticker');
        viewport.setAttribute('aria-hidden', 'true');
        if (presentationReady) viewport.classList.add('is-ready');
        fact.append(icon, viewport);
        factsLayer.append(fact);
        factViewports.push(viewport);
        const normalize = text => {
          const spaced = text.trim().replace(/\s+/g, ' ');
          return column < 2 ? spaced.toUpperCase() : spaced;
        };
        factTickers.push(ticker(viewport, 'tdb-smile-fact-value', reduced, normalize));
      });
      component.append(factsLayer);
    };

    const cancelShow = () => { clearTimeout(showTimer); showTimer = 0; };
    const updatePresentation = () => {
      const index = swiper && !swiper.destroyed ? swiper.realIndex : 0;
      // Active indices preserve direction at the loop boundary; real indices wrap.
      const direction = swiper && swiper.activeIndex < swiper.previousIndex ? -1 : 1;
      const totalText = String(total).padStart(2, '0');
      if (totalNumber.textContent !== totalText) totalNumber.textContent = totalText;
      const label = 'Smile ' + (index + 1) + ' of ' + total;
      if (accessibleCount.textContent !== label) accessibleCount.textContent = label;
      countTicker.update(String(index + 1).padStart(2, '0'), direction, Boolean(swiper));
      const active = swiper && !swiper.destroyed ? swiper.slides[swiper.activeIndex] : originals[index];
      const activeValues = values(active);
      if (activeValues.length !== 3) return;
      activeValues.forEach((text, column) => factTickers[column]?.update(text, direction, presentationReady));
      const factsText = 'Treatment summary: ' + activeValues.join(', ');
      if (factsLayer && factsLayer.getAttribute('aria-label') !== factsText) factsLayer.setAttribute('aria-label', factsText);
    };
    const showText = (index, fast = false) => {
      slides.forEach((slide, order) => {
        const raw = slide.getAttribute('data-swiper-slide-index');
        const logicalIndex = raw === null ? order : Number(raw);
        slide.querySelectorAll('[data-fade-slide]').forEach(text => {
          text.classList.toggle('is-moving', fast);
          text.classList.toggle('is-visible', index === logicalIndex);
        });
      });
    };
    const reveal = delay => {
      cancelShow();
      moving = false;
      showText(null);
      const show = () => {
        showTimer = 0;
        if (!swiper || swiper.destroyed || !component.isConnected) return;
        showText(swiper.realIndex);
        revealValues();
      };
      if (reduced.matches) show();
      else showTimer = setTimeout(show, delay);
    };
    const hide = () => {
      cancelShow();
      moving = true;
      showText(reduced.matches ? swiper.realIndex : null, !reduced.matches);
    };
    const watch = () => {
      observer.disconnect();
      observer.observe(wrapper, { childList: true });
      observer.observe(component, { attributes: true, attributeFilter: ['data-tdb-slider-first-view'] });
      if (!swiper) observer.observe(swiperEl, { attributes: true, attributeFilter: ['class'] });
    };
    const bind = () => {
      const instance = swiperEl.swiper;
      if (!instance || instance.destroyed || instance === swiper) return;
      swiper = instance;
      swiper.on('slideChange', updatePresentation);
      swiper.on('touchStart', cancelShow);
      swiper.on('sliderMove', () => { if (!moving) hide(); });
      swiper.on('slideChangeTransitionStart', hide);
      swiper.on('slideChangeTransitionEnd', () => {
        updatePresentation();
        reveal(swiper.swipeDirection === 'prev' ? 140 : 100);
      });
      swiper.on('touchEnd', () => { if (!swiper.animating) reveal(60); });
      swiper.on('beforeDestroy', () => {
        cancelShow();
        stopTickers();
        slides.forEach(slide => slide.querySelectorAll('[data-fade-slide]').forEach(text => {
          text.classList.remove('is-moving');
          text.classList.add('is-visible');
        }));
        swiper = null;
        moving = false;
        watch();
      });
      updatePresentation();
      showText(presentationReady ? swiper.realIndex : null);
      watch();
    };
    const refresh = () => {
      slides = Array.from(wrapper.children).filter(slide => slide.matches('.swiper-slide') && slide.querySelector('.layout423_card.smile'));
      originals = slides.filter(slide => !slide.classList.contains('swiper-slide-duplicate'));
      total = originals.length;
      let lines = 3;
      originals.forEach(slide => { lines = Math.max(lines, treatmentSources(slide.querySelector('.layout423_card.smile')).length); });
      for (const [name, value] of [['--tdb-smile-treatment-lines', lines], ['--tdb-smile-extra-lines', lines - 3]]) {
        if (component.style.getPropertyValue(name) !== String(value)) component.style.setProperty(name, String(value));
      }
      slides.forEach(slide => prepare(slide.querySelector('.layout423_card.smile')));
      prepareFacts();
      layoutFacts();
      bind();
      updatePresentation();
      if (swiper && !moving && !showTimer && !swiper.animating) {
        if (presentationReady) showText(swiper.realIndex);
        else if (component.getAttribute('data-tdb-slider-first-view') !== 'pending') reveal(100);
      }
    };
    const observer = new MutationObserver(() => {
      if (!component.isConnected) { cancelShow(); stopTickers(); observer.disconnect(); resizeObserver?.disconnect(); return; }
      refresh();
    });
    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(layoutFacts) : null;
    refresh();
    watch();
    resizeObserver?.observe(component);
    document.fonts?.ready.then(layoutFacts);
  };

  document.querySelectorAll('[data-tdb-smile-slider]').forEach(component => {
    const swiperEl = component.querySelector(':scope > .swiper');
    const wrapper = swiperEl?.querySelector(':scope > .swiper-wrapper');
    if (!wrapper || component.hasAttribute('data-tdb-smile-card-design')) return;
    component.setAttribute('data-tdb-smile-card-design', '3.2');
    bindPresentation(component, swiperEl, wrapper, prepare);
  });
})();

