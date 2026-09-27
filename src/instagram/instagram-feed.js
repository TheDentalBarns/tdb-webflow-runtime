/* TDB Instagram cards v0.6.4 — stationary details, tickers and fading video markers. */
(() => {
  'use strict';
  const data = window.TDBInstagramManualData;
  if (!data || window.TDBInstagramFeed) return;
  const VERSION = '0.6.4';
  const numberFormat = new Intl.NumberFormat('en-GB');
  const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const LOGO = 'https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/681c892759ed35c51acb5fe3_the-dental-barns-blackbrook-lichfield-logo.svg.svg';
  const iconPaths = {
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    comment: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
    share: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    next: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    previous: '<path d="M20 12H4m6-6-6 6 6 6"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r=".8" fill="currentColor" stroke="none"/>',
    video: '<path fill="currentColor" fill-rule="evenodd" stroke="none" d="M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5Zm2.55 5.4A1 1 0 0 0 9 9.23v5.54a1 1 0 0 0 1.55.83l4.16-2.77a1 1 0 0 0 0-1.66Z"/>'
  };

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // Match Smile Gallery's fixed viewport, 400ms roll and interruption handling.
  function ticker(viewport, reduced) {
    let value = null, animations = [], revision = 0;
    const item = text => {
      const node = el('span', 'tdb-ig-ticker-value', text);
      node.setAttribute('aria-hidden', 'true');
      return node;
    };
    const stop = () => {
      revision++;
      animations.forEach(animation => animation.cancel());
      animations = [];
      if (value !== null) viewport.replaceChildren(item(value));
    };
    return {
      stop,
      update(text, direction, animate = true) {
        if (value === text) return;
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
  }

  function icon(name) {
    const span = el('span', 'tdb-ig-icon-wrap');
    span.innerHTML = '<svg class="tdb-ig-icon" data-tdb-ig-icon="' + name + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter">' + iconPaths[name] + '</svg>';
    return span.firstElementChild;
  }

  function galleryArrow(direction) {
    // Exact SVGs used by Smile Gallery, including pages without a smile slider.
    const paths = {
      previous: 'M3.31066 8.75001L9.03033 14.4697L7.96967 15.5303L0.439339 8.00001L7.96967 0.469676L9.03033 1.53034L3.31066 7.25001L15.5 7.25L15.5 8.75L3.31066 8.75001Z',
      next: 'M12.6893 7.25L6.96967 1.53033L8.03033 0.469666L15.5607 8L8.03033 15.5303L6.96967 14.4697L12.6893 8.75H0.5V7.25H12.6893Z'
    };
    const wrap = el('span', 'slider-arrow-icon');
    wrap.innerHTML = '<svg width="100%" height="100%" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false"><path fill="currentColor" d="' + paths[direction] + '"></path></svg>';
    return wrap;
  }

  function reflection(photo) {
    const strip = el('span', 'tdb-ig-reflection');
    strip.setAttribute('aria-hidden', 'true');
    const copy = photo.cloneNode(false);
    copy.className = 'tdb-ig-reflection-photo';
    copy.alt = '';
    strip.append(copy);
    const glass = el('span', 'tdb-ig-glass');
    glass.setAttribute('aria-hidden', 'true');
    return [strip, glass];
  }

  function matchGallerySpacing(viewport, posts, postLink, panels, pagination, initialIndex) {
    const component = viewport.closest('.tdb-ig-feed');
    let boundSwiper;
    let revealTimer = 0, dragging = false, ready = false, videoReady = false;
    const cancelReveal = () => { clearTimeout(revealTimer); revealTimer = 0; };
    const hideVideos = () => {
      cancelReveal();
      videoReady = false;
      panels.forEach(panel => panel.hideVideo());
    };
    const syncSlideLabels = () => {
      // Swiper numbers the rotated track; announce the logical post number.
      boundSwiper?.slides.forEach(slide => {
        const index = (Number(slide.getAttribute('data-swiper-slide-index') || 0) + initialIndex) % posts.length;
        const label = (index + 1) + ' of ' + posts.length;
        if (slide.getAttribute('aria-label') !== label) slide.setAttribute('aria-label', label);
      });
    };
    const syncDetails = () => {
      const index = ((boundSwiper?.realIndex || 0) + initialIndex) % posts.length;
      const direction = boundSwiper && boundSwiper.activeIndex < boundSwiper.previousIndex ? -1 : 1;
      postLink.href = posts[index].url;
      panels.forEach(panel => panel.update(posts[(index + panel.offset + posts.length) % posts.length], direction));
      pagination.update(index, direction);
    };
    const canReveal = () => !videoReady && boundSwiper && !boundSwiper.destroyed && !boundSwiper.animating && !dragging &&
      component.isConnected && component.getAttribute('data-tdb-slider-first-view') !== 'pending';
    const revealAfterSettling = () => {
      if (revealTimer || !canReveal()) return;
      revealTimer = setTimeout(() => {
        revealTimer = 0;
        if (!canReveal()) return;
        syncDetails();
        if (!ready) panels.forEach(panel => panel.show());
        ready = true;
        panels.forEach(panel => panel.showVideo());
        videoReady = true;
      }, 100);
    };
    const handlers = {
      slideChange: () => { hideVideos(); syncDetails(); },
      slidesLengthChange: syncSlideLabels,
      slidesGridLengthChange: syncSlideLabels,
      snapGridLengthChange: syncSlideLabels,
      touchStart: () => { dragging = true; cancelReveal(); },
      sliderMove: hideVideos,
      touchEnd: () => { dragging = false; revealAfterSettling(); },
      transitionStart: hideVideos,
      transitionEnd: () => { syncDetails(); revealAfterSettling(); },
      beforeDestroy: () => { cancelReveal(); dragging = false; panels.forEach(panel => panel.stop()); pagination.stop(); }
    };
    const sync = () => {
      const swiper = viewport.swiper;
      const gap = window.innerWidth < 768 ? window.innerWidth * 0.02 : 20;
      if (swiper && !swiper.destroyed && swiper !== boundSwiper) {
        if (boundSwiper) Object.entries(handlers).forEach(([event, handler]) => boundSwiper.off(event, handler));
        boundSwiper = swiper;
        Object.entries(handlers).forEach(([event, handler]) => swiper.on(event, handler));
        syncSlideLabels();
        syncDetails();
      }
      if (swiper && !swiper.destroyed && swiper.params.spaceBetween !== gap) {
        swiper.params.spaceBetween = gap;
        swiper.update();
      }
      revealAfterSettling();
    };
    new ResizeObserver(sync).observe(viewport);
    new MutationObserver(sync).observe(viewport, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(sync).observe(component, { attributes: true, attributeFilter: ['data-tdb-slider-first-view'] });
    sync();
  }

  function link(url, className, label, iconName) {
    const node = el('a', className);
    node.href = url;
    node.target = '_blank';
    node.rel = 'noopener noreferrer';
    node.setAttribute('aria-label', label);
    if (iconName) node.append(icon(iconName));
    return node;
  }

  const hasMetric = value => Number.isSafeInteger(value) && value >= 0;

  function staticDetails(posts, offset, reduced, initialIndex) {
    const panel = el('div', 'tdb-ig-details-panel' + (offset ? ' is-neighbour' : ''));
    panel.dataset.igOffset = String(offset);
    if (offset) {
      // Preserve the faded neighbouring-card appearance without duplicate
      // keyboard stops or announcements outside the current card.
      panel.setAttribute('aria-hidden', 'true');
      panel.inert = true;
    }
    const profile = link('https://www.instagram.com/thedentalbarns/', 'tdb-ig-profile tdb-ig-fixed-profile', 'Visit thedentalbarns on Instagram');
    const avatar = el('span', 'tdb-ig-avatar');
    const inner = el('span', 'tdb-ig-avatar-inner');
    const logo = el('img', 'tdb-ig-logo');
    logo.src = LOGO;
    logo.alt = '';
    logo.width = 52;
    logo.height = 52;
    logo.loading = 'lazy';
    inner.append(logo);
    avatar.append(inner);
    const details = el('span', 'tdb-ig-identity');
    details.append(el('span', 'tdb-ig-account', 'thedentalbarns'));
    const date = el('time', 'tdb-ig-date tdb-ig-ticker');
    const dateTicker = ticker(date, reduced);
    let previousDate = null;
    let ready = false;
    details.append(date);
    profile.append(avatar, details);
    const videoBadge = el('span', 'tdb-ig-video-badge');
    videoBadge.setAttribute('role', 'img');
    videoBadge.setAttribute('aria-label', 'Video post');
    videoBadge.setAttribute('aria-hidden', 'true');
    const videoSymbol = el('span', 'tdb-ig-video-symbol');
    videoSymbol.append(icon('video'));
    videoBadge.append(videoSymbol);
    let isVideo = false;
    const hideVideo = () => {
      videoBadge.classList.remove('is-visible');
      videoBadge.setAttribute('aria-hidden', 'true');
    };
    const showVideo = () => {
      videoBadge.classList.toggle('is-visible', isVideo);
      videoBadge.setAttribute('aria-hidden', String(!isVideo));
    };
    const actions = el('div', 'tdb-ig-actions tdb-ig-fixed-actions');
    const metrics = [
      ['likes', 'heart', 'View likes on Instagram'],
      ['comments', 'comment', 'Comment on this post on Instagram'],
      ['shares', 'share', 'Share this Instagram post']
    ].map(([key, artwork, label]) => {
      const node = key === 'shares' ? el('button', 'tdb-ig-action tdb-ig-share') : link(posts[0].url, 'tdb-ig-action', label);
      if (key === 'shares') node.type = 'button';
      node.append(icon(artwork));
      const known = posts.map(post => post[key]).filter(hasMetric);
      const value = known.length ? el('span', 'tdb-ig-metric tdb-ig-ticker') : null;
      if (value) {
        value.style.setProperty('--tdb-ig-metric-width', Math.max(2, ...known.map(count => numberFormat.format(count).length)) + 'ch');
        node.append(value);
      }
      actions.append(node);
      return { key, node, value, label, roll: value ? ticker(value, reduced) : null, previous: null };
    });
    const update = (post, direction) => {
      panel.dataset.igPost = post.shortcode;
      isVideo = post.mediaType === 'video';
      metrics.forEach(metric => {
        const { key, node, label, roll } = metric;
        const known = hasMetric(post[key]);
        const valueDirection = known && hasMetric(metric.previous) ? (post[key] < metric.previous ? -1 : 1) : direction;
        roll?.update(known ? numberFormat.format(post[key]) : '', valueDirection, ready);
        metric.previous = post[key];
        node.setAttribute('aria-label', (known ? post[key] + ' ' + key + '. ' : '') + label);
        if (key === 'shares') node.dataset.shareUrl = post.url;
        else node.href = post.url;
      });
      const nextDate = post.date ? Date.parse(post.date) : NaN;
      const knownDate = Number.isFinite(nextDate);
      const dateText = knownDate ? dateFormat.format(new Date(nextDate)) : '';
      const dateDirection = knownDate && previousDate !== null ? (nextDate < previousDate ? -1 : 1) : direction;
      dateTicker.update(dateText, dateDirection, ready);
      date.setAttribute('aria-label', dateText);
      if (knownDate) date.dateTime = post.date.slice(0, 10);
      else date.removeAttribute('datetime');
      previousDate = knownDate ? nextDate : null;
    };
    panel.append(profile, videoBadge, actions);
    update(posts[(initialIndex + offset + posts.length) % posts.length], 1);
    return {
      panel, offset, update, hideVideo, showVideo,
      show: () => {
        ready = true;
        date.classList.add('is-ready');
        metrics.forEach(metric => metric.value?.classList.add('is-ready'));
      },
      stop: () => { hideVideo(); dateTicker.stop(); metrics.forEach(metric => metric.roll?.stop()); }
    };
  }

  function pagination(total, reduced, initialIndex) {
    const counter = el('span', 'tdb-ig-count');
    const current = el('span', 'tdb-ig-count-current tdb-ig-ticker');
    const divider = el('span', 'tdb-ig-count-rule');
    const totalNumber = el('span', 'tdb-ig-count-total', String(total).padStart(2, '0'));
    const label = el('span', 'tdb-ig-count-label');
    [current, divider, totalNumber].forEach(node => node.setAttribute('aria-hidden', 'true'));
    counter.setAttribute('aria-live', 'polite');
    counter.setAttribute('aria-atomic', 'true');
    counter.append(current, divider, totalNumber, label);
    const roll = ticker(current, reduced);
    const update = (index, direction) => {
      roll.update(String(index + 1).padStart(2, '0'), direction);
      const text = 'Post ' + (index + 1) + ' of ' + total;
      if (label.textContent !== text) label.textContent = text;
    };
    update(initialIndex, 1);
    return { counter, update, stop: roll.stop };
  }

  function card(post, index, count) {
    const slide = el('div', 'swiper-slide tdb-ig-slide');
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', (index + 1) + ' of ' + count);
    const article = el('article', 'tdb-ig-card');
    article.dataset.igPost = post.shortcode;
    const photo = el('img', 'tdb-ig-photo');
    photo.src = post.image;
    photo.alt = post.alt;
    photo.width = post.width;
    photo.height = post.height;
    photo.loading = 'lazy';
    photo.decoding = 'async';
    photo.draggable = false;
    const header = el('header', 'tdb-ig-bar tdb-ig-top');
    header.append(...reflection(photo));
    const footer = el('footer', 'tdb-ig-bar tdb-ig-bottom');
    footer.append(...reflection(photo));
    article.append(header, photo, footer);
    slide.append(article);
    return slide;
  }

  function selectPosts(config, mount) {
    const parse = value => (value || '').toLowerCase().split(',').map(tag => tag.trim()).filter(Boolean);
    const include = parse(mount.dataset.tdbIgTags);
    const exclude = parse(mount.dataset.tdbIgExcludeTags);
    const source = include.length ? Object.values(data.posts) : config.posts.map(id => data.posts[id]).filter(Boolean);
    return source.filter(post => {
      const tags = post.tags || [];
      const included = !include.length || (mount.dataset.tdbIgTagMode === 'all'
        ? include.every(tag => tags.includes(tag)) : include.some(tag => tags.includes(tag)));
      return included && !exclude.some(tag => tags.includes(tag));
    });
  }

  function render(mount) {
    const config = data.feeds[mount.dataset.tdbIgWidget];
    if (!config || mount.dataset.tdbIgReady) return;
    const posts = selectPosts(config, mount);
    if (!posts.length) {
      mount.replaceChildren(el('p', 'tdb-ig-empty', 'More moments coming soon.'));
      mount.dataset.tdbIgReady = VERSION;
      mount.removeAttribute('aria-busy');
      return;
    }
    const root = el('div', 'highlight-swiper_component tdb-ig-feed');
    root.dataset.tdbIgFeed = config.key;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-roledescription', 'carousel');
    root.setAttribute('aria-label', (mount.dataset.tdbIgLabel || config.label) + ' Instagram gallery');
    const viewport = el('div', 'swiper tdb-ig-viewport');
    const wrapper = el('div', 'swiper-wrapper');
    // Keep the logical newest-first order, but start the cyclic track one post
    // earlier. The shared on-entry advance then lands on logical post 1.
    const initialIndex = posts.length - 1;
    posts.forEach((_, step) => {
      const index = (initialIndex + step) % posts.length;
      wrapper.append(card(posts[index], index, posts.length));
    });
    viewport.append(wrapper);
    // A single frame sits over the current card, outside Swiper's moving track.
    const frame = el('div', 'tdb-ig-static-frame');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const panels = (posts.length > 1 ? [-1, 0, 1] : [0]).map(offset => staticDetails(posts, offset, reduced, initialIndex));
    panels.forEach(({ panel }) => frame.append(panel));
    const headingControls = el('div', 'tdb-ig-heading-controls');
    const count = pagination(posts.length, reduced, initialIndex);
    const divider = el('span', 'tdb-ig-count-divider');
    divider.setAttribute('aria-hidden', 'true');
    const postLink = link(posts[initialIndex].url, 'tdb-ig-instagram', 'View this post on Instagram', 'instagram');
    headingControls.append(count.counter, divider, postLink);
    const controls = el('div', 'swiper_functions-btm tdb-ig-controls');
    const buttons = el('div', 'swiper-buttons-wrapper');
    const previous = el('button', 'slider-arrow swiper-btn-prev is-dark tdb-ig-nav');
    previous.type = 'button';
    previous.setAttribute('aria-label', 'Previous ' + config.label.toLowerCase() + ' post');
    previous.append(galleryArrow('previous'));
    const next = el('button', 'slider-arrow swiper-btn-next is-dark tdb-ig-nav');
    next.type = 'button';
    next.setAttribute('aria-label', 'Next ' + config.label.toLowerCase() + ' post');
    next.append(galleryArrow('next'));
    buttons.append(previous, next);
    controls.append(buttons);
    if (posts.length < 2) controls.hidden = true;
    const notice = el('span', 'tdb-ig-notice');
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    frame.append(headingControls, controls);
    root.append(viewport, frame, notice);
    mount.replaceChildren(root);
    mount.dataset.tdbIgReady = VERSION;
    mount.removeAttribute('aria-busy');
    matchGallerySpacing(viewport, posts, postLink, panels, count, initialIndex);
  }

  function refresh() {
    document.querySelectorAll('[data-tdb-ig-widget]').forEach(render);
    window.TDBSliders?.refresh?.();
  }

  document.addEventListener('click', async event => {
    const button = event.target.closest('.tdb-ig-share');
    if (!button) return;
    const root = button.closest('.tdb-ig-feed');
    const notice = root?.querySelector('.tdb-ig-notice');
    const url = button.dataset.shareUrl;
    try {
      if (navigator.share && matchMedia('(pointer:coarse)').matches) {
        await navigator.share({ title: 'The Dental Barns on Instagram', url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        if (notice) { notice.textContent = 'Post link copied'; setTimeout(() => { notice.textContent = ''; }, 2500); }
      } else window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      if (error.name !== 'AbortError' && notice) notice.textContent = 'Use the Instagram icon to open and share this post.';
    }
  });

  window.TDBInstagramFeed = Object.freeze({ version: VERSION, refresh, source: 'manual-cms-snapshot', importedAt: data.importedAt });
  refresh();
})();
