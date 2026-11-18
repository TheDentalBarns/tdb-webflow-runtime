/* Shared site chrome v1.1.0. Independently owned, reversible nav/banner/VIP motion. */
(() => {
  'use strict';
  if (window.TDBSiteChrome) return;
  const selector =
    '.navbar10_component,.navbar-bg_layer,.tdb-announcement,#tdb-elfsight-timer-shell,#tdb-vip-drawer';
  const owners = new Set();
  let animations = [],
    arrivals = null,
    sizes = null;
  function timing() {
    const profile = window.TDBMotionProfile?.forFamily?.('navigation') || window.TDBMotionProfile;
    if (profile)
      return {
        duration: window.TDBMotion.reduced.matches ? 0 : profile.time(420),
        easing: profile.easing('panel', 'cubic-bezier(.4,0,.2,1)'),
        fill: 'both',
      };
    const css = getComputedStyle(document.documentElement);
    const clock = css.getPropertyValue('--tdb-peek-duration').trim();
    const duration = /^\d*\.?\d+(ms|s)$/.test(clock)
      ? parseFloat(clock) * (clock.endsWith('ms') ? 1 : 1000)
      : 420;
    const easing = css.getPropertyValue('--tdb-peek-ease').trim() || 'cubic-bezier(.4,0,.2,1)';
    return { duration: window.TDBMotion.reduced.matches ? 0 : duration, easing, fill: 'both' };
  }
  function cancel() {
    animations.forEach(({ animation }) => animation.cancel());
    animations = [];
  }
  function hide() {
    const nodes = [...document.querySelectorAll(selector)];
    // A new owner can interrupt the return motion. Capture the visible poses,
    // then measure the native layout without our previous animation applied.
    const from = new Map(nodes.map((node) => [node, getComputedStyle(node).transform]));
    cancel();
    const nav = document.querySelector('.navbar10_component');
    // Measure every starting pose before starting any animation.
    const poses = nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      const height =
        node === nav
          ? Math.max(
              rect.height,
              ...[
                ...node.querySelectorAll(
                  '.w-nav-overlay,.navbar10_menu[data-nav-menu-open],.navbar10_dropdown-list.w--open',
                ),
              ]
                .filter((n) => n.getClientRects().length)
                .map((n) => n.getBoundingClientRect().bottom - rect.top),
            )
          : rect.height;
      return {
        node,
        from: from.get(node),
        height,
        y: node.id === 'tdb-vip-drawer' ? height : -Math.max(height, rect.bottom),
      };
    });
    animations = poses
      .filter((pose) => pose.node.animate)
      .map(({ node, from, y, height }) => ({
        node,
        y,
        height,
        animation: node.animate(
          [{ transform: from }, { transform: `translateY(${y}px)` }],
          timing(),
        ),
      }));
    animations.forEach(({ animation }) => animation.finished.catch(() => {}));
    if (document.querySelector('#tdb-vip-drawer.is-open,#tdb-vip-drawer.is-peeking'))
      window.TDBVIPDrawer?.close?.();
  }
  function resizeHidden() {
    if (!owners.size) return;
    const changes = animations.flatMap((entry) => {
      const { node } = entry;
      if (!node.isConnected) return [];
      const from = getComputedStyle(node).transform,
        matrix = from.match(/matrix(3d)?\(([^)]+)\)/),
        shift = matrix
          ? Number(matrix[2].split(',')[matrix[1] ? 13 : 5])
          : parseFloat(from.match(/translateY\(([^)]+)/)?.[1]) || 0,
        rect = node.getBoundingClientRect(),
        height = node.matches('.navbar10_component')
          ? Math.max(
              rect.height,
              ...[
                ...node.querySelectorAll(
                  '.w-nav-overlay,.navbar10_menu[data-nav-menu-open],.navbar10_dropdown-list.w--open',
                ),
              ]
                .filter((n) => n.getClientRects().length)
                .map((n) => n.getBoundingClientRect().bottom - rect.top),
            )
          : rect.height,
        y = node.id === 'tdb-vip-drawer' ? height : -Math.max(height, rect.bottom - shift);
      return Math.abs(y - entry.y) > 0.5 ? [{ entry, from, y, height }] : [];
    });
    for (const { entry, from, y, height } of changes) {
      // An empty lazy shell gains height after its contents arrive. Park it
      // before paint; a bar already moving continues from its visible pose.
      const moving = entry.height > 0 && entry.animation.playState === 'running';
      entry.animation.cancel();
      const transform = `translateY(${y}px)`;
      entry.animation = entry.node.animate(
        [{ transform: moving ? from : transform }, { transform }],
        { ...timing(), ...(moving ? {} : { duration: 0 }) },
      );
      entry.animation.finished.catch(() => {});
      entry.y = y;
      entry.height = height;
    }
  }
  function parkArrivals() {
    if (!owners.size) return;
    const known = new Set(animations.map(({ node }) => node));
    // Lazy banners may mount after an owner has moved the existing chrome away.
    // Reserve their hidden pose before first paint, then share the normal return.
    const poses = [...document.querySelectorAll(selector)]
      .filter((node) => !known.has(node) && node.animate)
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          node,
          height: rect.height,
          y: node.id === 'tdb-vip-drawer' ? rect.height : -Math.max(rect.height, rect.bottom),
        };
      });
    for (const { node, y, height } of poses) {
      const transform = `translateY(${y}px)`;
      const animation = node.animate([{ transform }, { transform }], { ...timing(), duration: 0 });
      animation.finished.catch(() => {});
      animations.push({ node, animation, y, height });
      sizes?.observe(node);
    }
    resizeHidden();
  }
  function show() {
    const poses = animations.map(({ node }) => ({ node, from: getComputedStyle(node).transform }));
    cancel();
    // settleBackground may have closed a menu while chrome was hidden. Return
    // to that current native pose, rather than reversing to the stale open menu.
    const targets = poses.map((pose) => ({ ...pose, to: getComputedStyle(pose.node).transform }));
    const returning = targets.map(({ node, from, to }) => ({
      node,
      animation: node.animate([{ transform: from }, { transform: to }], timing()),
    }));
    animations = returning;
    Promise.allSettled(returning.map(({ animation }) => animation.finished)).then(() => {
      if (animations === returning && !owners.size) cancel();
    });
  }
  function settleBackground() {
    window.TDBVIPDrawer?.reset?.();
    document.querySelector('.navbar10_menu-button[aria-expanded="true"]')?.click();
    document
      .querySelectorAll('.navbar10_dropdown-toggle[aria-expanded="true"]')
      .forEach((node) => node.click());
  }
  function acquire() {
    const owner = {};
    if (!owners.size) {
      hide();
      if (typeof ResizeObserver === 'function') {
        sizes = new ResizeObserver(resizeHidden);
        animations.forEach(({ node }) => sizes.observe(node));
      }
      arrivals = new MutationObserver(parkArrivals);
      arrivals.observe(document.documentElement, { childList: true, subtree: true });
    }
    owners.add(owner);
    return () => {
      if (!owners.delete(owner) || owners.size) return;
      arrivals.disconnect();
      arrivals = null;
      sizes?.disconnect();
      sizes = null;
      show();
    };
  }
  window.TDBSiteChrome = Object.freeze({ version: '1.1.0', acquire, settleBackground });
})();

/* Enhance the native CMS card. Designer owns every resting element and its space. */
window.TDBTreatmentGuideCard ||= (() => {
  function mount(root, initial, navigate) {
    const panes = [...root.querySelectorAll('[data-tdb-guide-panel]')],
      content = root.querySelector('.tdb-cinema-content, .treatment-guide_content'),
      pagination = root.querySelector('[data-tdb-guide-pagination]');
    if (panes.length !== 5 || !content) return null;
    const events = new AbortController(),
      rows = panes.map((pane) => ({
        pane,
        title: pane.querySelector('[data-tdb-guide-title]'),
        summary: pane.querySelector('[data-tdb-guide-summary]'),
        button: pane.querySelector('[data-tdb-guide-open]'),
        icon: pane.querySelector('.treatment-guide_cta-icon'),
      }));
    if (rows.some((row) => !row.title || !row.summary || !row.button || !row.icon)) return null;
    const cinema = root.hasAttribute('data-tdb-guide-cinema');
    const titleVisibility = rows.map((row) => row.title.style.visibility);
    const motion = window.TDBMotion,
      fades = motion.fadeController();
    // Reuse the Designer artwork inside a fixed-size ticker slot, not another card.
    const artwork = rows.map((row) => row.icon.firstElementChild.cloneNode(true));
    const iconTickers = rows.map((row, index) => {
      const ticker = window.TDBNativeTicker.mount(row.icon, {
        valueClass: 'treatment-guide_icon-value',
        incomingClass: 'treatment-guide_icon-incoming',
        render(node, value) {
          node.replaceChildren(artwork[Number(value) || 0].cloneNode(true));
        },
      });
      ticker.update(String(index), 1, false);
      row.button.setAttribute('aria-haspopup', 'dialog');
      row.button.setAttribute('aria-label', 'Learn more about ' + row.title.textContent.trim());
      return ticker;
    });
    // The strip announces its own selection. Only older circular markup has
    // separate centre pagination; do not retain hidden artwork for the strip.
    const centreIcon = pagination?.querySelector('[data-tdb-guide-centre-icon]');
    const centreBefore = centreIcon
      ? [...centreIcon.childNodes].map((node) => node.cloneNode(true))
      : null;
    const tickerSlot = centreIcon || pagination?.querySelector('[data-tdb-guide-position]');
    const ticker =
      tickerSlot &&
      window.TDBNativeTicker.mount(
        tickerSlot,
        centreIcon
          ? {
              valueClass: 'treatment-guide_icon-value',
              incomingClass: 'treatment-guide_icon-incoming',
              render(node, value) {
                const icon = artwork[Number(value) || 0].cloneNode(true);
                icon.className =
                  'treatment-guide_icon-art treatment-guide_centre-' + icon.dataset.guideArtwork;
                node.replaceChildren(icon);
              },
            }
          : {
              valueClass: 'treatment-guide_number-value',
              incomingClass: 'treatment-guide_number-incoming',
            },
      );
    for (const button of root.querySelectorAll('[data-tdb-guide-nav]'))
      button.addEventListener('click', () => navigate(Number(button.dataset.tdbGuideNav)), {
        signal: events.signal,
      });
    let active = initial,
      animations = [],
      entryTimer = 0,
      disposed = false;
    const stop = () => {
      clearTimeout(entryTimer);
      entryTimer = 0;
      animations.forEach((animation) => animation.cancel());
      animations = [];
    };
    function update(index, direction = 1, animate = true) {
      if (disposed || (active === index && animate)) return;
      const previous = active;
      stop();
      active = index;
      pagination?.setAttribute(
        'aria-label',
        `${index + 1} of ${rows.length}: ${rows[index].title.textContent.trim()}`,
      );
      ticker?.update(
        centreIcon ? String(index) : String(index + 1).padStart(2, '0'),
        direction,
        animate,
      );
      iconTickers[index].update(String(previous), direction, false);
      iconTickers[index].update(String(index), direction, animate);
      rows.forEach((row, i) => {
        row.pane.style.visibility = i === index ? 'visible' : 'hidden';
        row.pane.style.pointerEvents = i === index ? 'auto' : 'none';
        row.pane.setAttribute('aria-hidden', String(i !== index));
        // Explicit selected text visibility survives interrupted ancestor animations.
        if (cinema) row.title.style.visibility = i === index ? 'visible' : 'hidden';
      });
      if (!animate || motion.reduced.matches || !content.animate) {
        rows.forEach((row) => fades.to(row.summary, 1, 0));
        return;
      }
      const duration = motion.duration(content.clientWidth),
        easing = motion.easing('travel', 'cubic-bezier(.3,0,.2,1)'),
        old = rows[previous],
        next = rows[index];
      // Only text travels; the native tracks, pagination and controls do not move.
      animations.push(
        old.title.animate(
          [
            { transform: 'translateX(0)', opacity: 1, visibility: 'visible' },
            { transform: `translateX(${-direction * 100}%)`, opacity: 1, visibility: 'visible' },
          ],
          { duration, easing },
        ),
      );
      const incoming = next.title.animate(
        [
          { transform: `translateX(${direction * 100}%)`, visibility: 'visible' },
          { transform: 'translateX(0)', visibility: 'visible' },
        ],
        { duration, easing },
      );
      animations.push(incoming);
      // The shared controller samples the current opacity on interruption.
      // Only retain the outgoing pane's visibility locally; motion.js owns fades.
      rows.forEach((row, i) => {
        if (i !== previous) fades.to(row.summary, 0, 0);
      });
      fades.to(old.summary, 0, motion.carousel.copyOut, motion.carousel.copyEaseOut);
      animations.push(
        old.summary.animate([{ visibility: 'visible' }, { visibility: 'visible' }], {
          duration: motion.carousel.copyOut,
        }),
      );
      entryTimer = setTimeout(
        () => {
          entryTimer = 0;
          fades.to(
            next.summary,
            1,
            motion.reduced.matches ? 0 : motion.carousel.copyIn,
            motion.carousel.copyEaseIn,
          );
        },
        duration + (direction < 0 ? motion.carousel.previousDelay : motion.carousel.nextDelay),
      );
      // Arrow-driven progress samples this same animation's eased phase.
      return incoming;
    }
    update(initial, 1, false);
    return {
      update,
      destroy() {
        disposed = true;
        stop();
        fades.destroy();
        events.abort();
        ticker?.destroy();
        if (centreIcon) centreIcon.replaceChildren(...centreBefore);
        iconTickers.forEach((ticker, i) => {
          ticker.destroy();
          rows[i].icon.replaceChildren(artwork[i]);
        });
        rows.forEach(({ pane }) => {
          pane.style.removeProperty('visibility');
          pane.style.removeProperty('pointer-events');
          pane.removeAttribute('aria-hidden');
        });
        if (cinema)
          rows.forEach((row, i) => {
            if (titleVisibility[i]) row.title.style.visibility = titleVisibility[i];
            else row.title.style.removeProperty('visibility');
          });
      },
    };
  }
  return Object.freeze({ mount });
})();

/* Designer owns the 100lvh stage, photos, typography and controls.
 * This module owns chapter selection, CMS image population and motion only. */
(() => {
  'use strict';
  if (window.TDBTreatmentGuideCinema) return;
  const instances = new WeakMap();
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  function mount(root) {
    if (instances.has(root)) return instances.get(root);
    const track = root.querySelector('.tdb-cinema-track');
    const stage = root.querySelector('.tdb-cinema-stage');
    const tabs = root.querySelector('.tdb-cinema-tabs');
    const choices = [...root.querySelectorAll('[data-tdb-guide-choice]')];
    const panes = [...root.querySelectorAll('[data-tdb-guide-panel]')];
    const images = [...root.querySelectorAll('.tdb-cinema-image')];
    const photos = [...root.querySelectorAll('[data-tdb-cinema-photo]')];
    const blurs = photos.map((photo) => photo.querySelector('.tdb-treatment-blur'));
    const photoBefore = photos.map((photo) => photo.getAttribute('style'));
    const blurBefore = blurs.map((blur) => blur?.getAttribute('class'));
    const parallax = root.querySelector('[data-tdb-cinema-parallax]');
    const media = root.querySelector('.tdb-cinema-media');
    const progress = root.querySelector('[data-tdb-cinema-progress]');
    const content = root.querySelector('.tdb-cinema-content');
    const parallaxBefore = parallax?.getAttribute('style');
    const progressBefore = progress?.getAttribute('style');
    if (
      !track ||
      !stage ||
      choices.length !== 5 ||
      panes.length !== 5 ||
      images.length !== 5 ||
      photos.length !== 5
    )
      throw Error('Cinema native structure missing');
    const events = new AbortController(),
      { signal } = events;
    const motion = window.TDBMotion;
    const attrs = choices.map((choice) =>
      ['href', 'tabindex', 'aria-label', 'aria-selected'].map((name) => [
        name,
        choice.getAttribute(name),
      ]),
    );
    const imageBefore = images.map((image) =>
      ['src', 'srcset', 'sizes', 'alt', 'loading', 'style'].map((name) => [
        name,
        image.getAttribute(name),
      ]),
    );
    const tabAttrs = ['data-duration-in', 'data-duration-out'].map((name) => [
      name,
      tabs.getAttribute(name),
    ]);
    const tabConfig = window.jQuery?.data?.(tabs, '.w-tabs')?.config;
    const configBefore = tabConfig && { ...tabConfig };
    for (const [name] of tabAttrs) tabs.setAttribute(name, '0');
    if (tabConfig) Object.assign(tabConfig, { intro: 0, outro: 0, immediate: true });
    const next = root.querySelector('[data-tdb-cinema-next]');
    const skip = root.querySelector('[data-tdb-cinema-skip]');
    const nextBefore = next?.innerHTML;
    let active = Math.max(
      0,
      choices.findIndex((choice) => choice.classList.contains('w--current')),
    );
    let disposed = false,
      raf = 0,
      visible = true,
      dirty = true;
    let start = 0,
      step = 1,
      runway = 1,
      stageHeight = 1,
      mediaHeight = 0;
    let animations = [],
      releaseChrome = null,
      progressAnimation = null,
      lastProgress = '',
      lastParallax = '';
    const blocked = () => Boolean(window.TDBScrollLock?.active || root.closest('[inert]'));
    const card = window.TDBTreatmentGuideCard.mount(root, active, (direction) =>
      manual(clamp(active + direction, 0, 4)),
    );
    // Existing chapter photographs win. Empty chapters retain the authored clinic image.
    images.forEach((image, index) => {
      const source = panes[index].querySelector('[data-tdb-guide-body] img[src]');
      if (source) {
        image.src = source.getAttribute('src');
        image.removeAttribute('srcset');
        image.removeAttribute('sizes');
        image.alt = source.alt || image.alt;
      } else if (
        index === 0 &&
        /airflow/i.test(root.querySelector('[data-tdb-guide-treatment]')?.textContent || '')
      ) {
        image.src =
          'https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/6af5a352c97c5a25289b96fc_ems-airflow-prophylaxis-master-dental-barns-lichfield.webp';
        image.removeAttribute('srcset');
        image.removeAttribute('sizes');
        image.alt = 'EMS AIRFLOW Prophylaxis Master used for hygiene care at The Dental Barns.';
      }
      // Cropping stays Designer-owned so every photo reaches the top of the stage.
      image.loading = index < 2 ? 'eager' : 'lazy';
      choices[index].setAttribute(
        'aria-label',
        `${index + 1}. ${panes[index].querySelector('[data-tdb-guide-title]').textContent.trim()}`,
      );
    });
    function warm(index) {
      for (const i of [index, index + 1])
        if (images[i]) {
          images[i].loading = 'eager';
          images[i].decode?.().catch(() => {});
        }
    }
    function syncTabs() {
      choices.forEach((choice, index) => {
        choice.classList.toggle('w--current', index === active);
        choice.setAttribute('aria-selected', String(index === active));
        choice.setAttribute('tabindex', index === active ? '0' : '-1');
        // Preserve the native href for no-module fallback; enhanced clicks cancel it.
        panes[index].classList.toggle('w--tab-active', index === active);
        photos[index].style.visibility = index === active ? 'visible' : 'hidden';
        blurs[index]?.classList.toggle('is-current', index === active);
      });
      if (next)
        next.innerHTML =
          active === 4 ? 'Continue reading <span aria-hidden="true">↓</span>' : nextBefore;
      root.dataset.tdbCinemaChapter = String(active + 1);
    }
    function select(index, animate = true) {
      index = clamp(index, 0, 4);
      if (index === active) return;
      const previous = active,
        direction = Math.sign(index - previous);
      const pose = (i) => ({
        visible: getComputedStyle(photos[i]).visibility === 'visible',
        frame: getComputedStyle(photos[i]).transform || 'none',
        image: getComputedStyle(images[i]).transform || 'none',
      });
      const outgoing = pose(previous),
        incoming = pose(index);
      animations.forEach((animation) => animation.cancel());
      animations = [];
      active = index;
      // A short phone may scroll the copy; every new chapter starts at its heading.
      if (content) content.scrollTop = 0;
      warm(index);
      syncTabs();
      card.update(index, direction, animate);
      const timing = {
        duration: motion.duration(stage.clientWidth),
        easing: motion.easing('travel', 'cubic-bezier(.3,0,.2,1)'),
      };
      if (animate && !motion.reduced.matches && photos[index].animate) {
        // Match Services/Treatments: the 140% photo compensates by 30% inside
        // its travelling crop. Both layers use one clock; adjacent crops blur.
        const amount = (i) => parseFloat(images[i].getAttribute('data-swiper-parallax-x')) || 30;
        animations.push(
          photos[previous].animate(
            [
              { transform: outgoing.frame, visibility: 'visible' },
              { transform: `translateX(${-direction * 100}%)`, visibility: 'visible' },
            ],
            timing,
          ),
          images[previous].animate(
            [
              { transform: outgoing.image },
              { transform: `translateX(${direction * amount(previous)}%)` },
            ],
            timing,
          ),
          photos[index].animate(
            [
              {
                transform: incoming.visible ? incoming.frame : `translateX(${direction * 100}%)`,
                visibility: 'visible',
              },
              { transform: 'translateX(0)', visibility: 'visible' },
            ],
            timing,
          ),
          images[index].animate(
            [
              {
                transform: incoming.visible
                  ? incoming.image
                  : `translateX(${-direction * amount(index)}%)`,
              },
              { transform: 'translateX(0)' },
            ],
            timing,
          ),
        );
      }
    }
    function updateProgress(position, animate = false) {
      if (!progress) return;
      const target = `scaleX(${clamp(position / runway, 0, 1).toFixed(6)})`;
      if (target === lastProgress) return;
      const from = getComputedStyle(progress).transform;
      progressAnimation?.cancel();
      progressAnimation = null;
      progress.style.transform = target;
      lastProgress = target;
      if (animate && !motion.reduced.matches && progress.animate)
        progressAnimation = progress.animate([{ transform: from }, { transform: target }], {
          duration: motion.duration(stage.clientWidth),
          easing: motion.easing('travel', 'cubic-bezier(.3,0,.2,1)'),
        });
    }
    function measure() {
      const rect = track.getBoundingClientRect();
      start = rect.top + window.scrollY;
      stageHeight = stage.getBoundingClientRect().height;
      mediaHeight = media?.getBoundingClientRect().height || 0;
      runway = Math.max(1, rect.height - stageHeight);
      // Five equal reading beats, including a full hold for the last chapter.
      step = runway / 5;
      dirty = false;
    }
    function go(top) {
      if (window.lenis?.scrollTo) window.lenis.scrollTo(top, { immediate: true, force: true });
      else window.scrollTo({ top, behavior: 'instant' });
      schedule();
    }
    function manual(index) {
      if (blocked()) return;
      measure();
      select(index);
      const position = step * index + Math.min(2, step / 10);
      go(start + position);
      updateProgress(position, true);
    }
    function leave(event) {
      event?.preventDefault();
      if (blocked()) return;
      measure();
      go(start + track.getBoundingClientRect().height);
      releaseChrome?.();
      releaseChrome = null;
      const target = root.nextElementSibling;
      if (target) {
        const before = target.getAttribute('tabindex');
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        target.addEventListener(
          'blur',
          () =>
            before == null
              ? target.removeAttribute('tabindex')
              : target.setAttribute('tabindex', before),
          { once: true },
        );
      }
    }
    function frame() {
      raf = 0;
      if (disposed || document.hidden) return;
      if (dirty) measure();
      else start = track.getBoundingClientRect().top + window.scrollY;
      const position = window.scrollY - start;
      // Entrance parallax is scroll-linked and stops exactly when the stage pins.
      // The authored 12% overscan keeps the photo covering its native frame.
      if (parallax) {
        const offset = motion.reduced.matches
          ? 0
          : clamp(-position / stageHeight, 0, 1) * mediaHeight * 0.12;
        const value = `translateY(${offset.toFixed(3)}px)`;
        if (value !== lastParallax) {
          parallax.style.transform = value;
          lastParallax = value;
        }
      }
      const pinned = position >= -1 && position < runway;
      if (pinned && !releaseChrome) releaseChrome = window.TDBSiteChrome?.acquire();
      else if (!pinned && releaseChrome) {
        releaseChrome();
        releaseChrome = null;
      }
      if (!blocked() && position >= 0 && position <= runway + stageHeight) {
        const index = clamp(Math.floor(Math.max(0, position) / step), 0, 4);
        select(index);
      }
      if (!blocked()) updateProgress(position);
    }
    function schedule() {
      if (!raf && !disposed && visible && !document.hidden) raf = requestAnimationFrame(frame);
    }
    choices.forEach((choice, index) =>
      choice.addEventListener(
        'click',
        (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          manual(index);
        },
        { capture: true, signal },
      ),
    );
    stage.addEventListener(
      'keydown',
      (event) => {
        if (!event.target.closest('[data-tdb-guide-choice]')) return;
        const index = {
          ArrowRight: Math.min(4, active + 1),
          ArrowLeft: Math.max(0, active - 1),
          Home: 0,
          End: 4,
        }[event.key];
        if (index == null) return;
        event.preventDefault();
        manual(index);
        choices[index].focus({ preventScroll: true });
      },
      { signal },
    );
    next?.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        active === 4 ? leave() : manual(active + 1);
      },
      { signal },
    );
    skip?.addEventListener('click', leave, { signal });
    window.addEventListener('scroll', schedule, { passive: true, signal });
    window.addEventListener(
      'resize',
      () => {
        dirty = true;
        schedule();
      },
      { passive: true, signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) {
          cancelAnimationFrame(raf);
          raf = 0;
        } else {
          dirty = true;
          schedule();
        }
      },
      { signal },
    );
    const resize = new ResizeObserver(() => {
      dirty = true;
      schedule();
    });
    resize.observe(track);
    resize.observe(stage);
    const intersection = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        if (visible) {
          dirty = true;
          schedule();
        } else {
          cancelAnimationFrame(raf);
          raf = 0;
          releaseChrome?.();
          releaseChrome = null;
        }
      },
      { rootMargin: '100% 0px' },
    );
    intersection.observe(track);
    syncTabs();
    warm(active);
    measure();
    schedule();
    const restore = (node, entries) =>
      entries.forEach(([name, value]) =>
        value == null ? node.removeAttribute(name) : node.setAttribute(name, value),
      );
    const api = {
      select: manual,
      destroy() {
        if (disposed) return;
        disposed = true;
        events.abort();
        cancelAnimationFrame(raf);
        resize.disconnect();
        intersection.disconnect();
        animations.forEach((animation) => animation.cancel());
        progressAnimation?.cancel();
        releaseChrome?.();
        card.destroy();
        choices.forEach((choice, index) => restore(choice, attrs[index]));
        images.forEach((image, index) => restore(image, imageBefore[index]));
        photos.forEach((photo, index) => restore(photo, [['style', photoBefore[index]]]));
        blurs.forEach((blur, index) => blur && restore(blur, [['class', blurBefore[index]]]));
        if (parallax) restore(parallax, [['style', parallaxBefore]]);
        if (progress) restore(progress, [['style', progressBefore]]);
        restore(tabs, tabAttrs);
        if (tabConfig) Object.assign(tabConfig, configBefore);
        if (next) next.innerHTML = nextBefore;
        delete root.dataset.tdbCinemaChapter;
        instances.delete(root);
      },
    };
    instances.set(root, api);
    return api;
  }
  window.TDBTreatmentGuideCinema = Object.freeze({ mount });
})();
