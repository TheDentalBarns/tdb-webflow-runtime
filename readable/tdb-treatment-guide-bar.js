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
      content = root.querySelector('.treatment-guide_content'),
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
        [{ transform: `translateX(${direction * 100}%)` }, { transform: 'translateX(0)' }],
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
      },
    };
  }
  return Object.freeze({ mount });
})();

/* Native sticky travel. Read geometry first, then paint once per animation frame. */
(() => {
  'use strict';
  if (window.TDBTreatmentGuideScroll) return;
  function mount(root, controls) {
    if (!root.hasAttribute('data-tdb-guide-scroll')) return null;
    const layout = root.querySelector('.treatment-guide_layout'),
      art = root.querySelector('.treatment-guide_dial-art'),
      centre = root.querySelector('.treatment-guide_centre'),
      content = root.querySelector('.treatment-guide_content'),
      arrows = root.querySelector('.treatment-guide_arrows'),
      footer = root.querySelector('.treatment-guide_details'),
      rim = root.querySelector('.treatment-guide_rim');
    if (!layout || !art || !content) return null;
    const events = new AbortController(),
      { signal } = events,
      reduced =
        window.TDBMotion?.reduced ||
        window.TDBMotionPolicy?.reduced ||
        matchMedia('(prefers-reduced-motion: reduce)'),
      coarse = matchMedia('(pointer: coarse)'),
      track = document.createElement('div');
    track.className = 'tdb-guide-scroll-track';
    layout.before(track);
    track.append(layout);
    // Designer owns the resting 5px rim. Only the moving fill is enhancement paint.
    const horizontal = Boolean(controls.horizontal);
    const docked = horizontal && Boolean(footer && centre);
    const nativeStage = docked && getComputedStyle(centre).display === 'none';
    const exitImage =
      nativeStage && root.nextElementSibling?.matches('.tdb-review-image-break')
        ? root.nextElementSibling
        : null;
    const exitAnchor = exitImage && document.createComment('treatment guide image position');
    root.classList.toggle('is-guide-footer-docked', docked);
    root.classList.toggle('is-guide-native-stage', nativeStage);
    // The small viewport includes browser chrome. Keep that measured height
    // for this mobile orientation so toolbar animation cannot move the card.
    const viewportMeter = docked && coarse.matches ? document.createElement('span') : null;
    if (viewportMeter) {
      viewportMeter.setAttribute('aria-hidden', 'true');
      viewportMeter.style.cssText =
        'position:absolute;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none';
      track.append(viewportMeter);
    }
    const svgNS = 'http://www.w3.org/2000/svg';
    const progress =
      rim && (horizontal ? document.createElement('div') : document.createElementNS(svgNS, 'svg'));
    const arc = progress && (horizontal ? progress : document.createElementNS(svgNS, 'circle'));
    if (progress) {
      progress.setAttribute(
        'class',
        horizontal ? 'tdb-guide-linear-progress' : 'tdb-guide-scroll-progress',
      );
      progress.setAttribute('aria-hidden', 'true');
      progress.setAttribute('focusable', 'false');
      if (!horizontal)
        for (const [name, value] of Object.entries({
          cx: '50%',
          cy: '50%',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': '5',
          pathLength: '100',
          'stroke-dasharray': '100 100',
          'stroke-dashoffset': '100',
          'stroke-linecap': 'butt',
        }))
          arc.setAttribute(name, value);
      if (!horizontal) progress.append(arc);
      rim.append(progress);
    }
    let enabled = false,
      completed = false,
      pinned = false,
      chromeAway = false,
      rotating = false,
      rotationY = 0,
      rotationPending = false,
      suspended = false,
      disposed = false,
      raf = 0,
      resize = true,
      pinTop = 0,
      cardHeight = 0,
      cardShift = 0,
      stageHeight = 0,
      wheelOffset = 0,
      wheelSize = 0,
      measuredWidth = 0,
      canArm = false,
      distance = 0,
      runway = 0,
      start = 0,
      lastIndex = -1,
      radius = -1,
      painted = '',
      shownFraction = 0,
      animation = null,
      entryIndex = null,
      stickyStage = null,
      lenis = null,
      unbindLenis = null,
      releaseChrome = null;
    function groupExit(join) {
      if (join && !stickyStage) {
        // One native sticky surface keeps the card/image seam solid even when
        // browser scrolling runs ahead of JavaScript animation frames.
        stickyStage = document.createElement('div');
        stickyStage.className = 'tdb-guide-sticky-stage';
        exitImage.before(exitAnchor);
        track.append(stickyStage);
        stickyStage.append(layout, exitImage);
      } else if (!join && stickyStage) {
        stickyStage.before(layout);
        exitAnchor.replaceWith(exitImage);
        stickyStage.remove();
        stickyStage = null;
      }
    }
    function paintProgress(fraction) {
      shownFraction = Math.max(0, Math.min(1, fraction));
      if (!arc) return;
      const offset = (100 * (1 - shownFraction)).toFixed(3);
      if (offset === painted) return;
      painted = offset;
      if (horizontal) arc.style.transform = `scaleX(${shownFraction.toFixed(5)})`;
      else arc.style.strokeDashoffset = offset;
    }
    function bindLenis() {
      if (lenis === window.lenis) return;
      unbindLenis?.();
      lenis = window.lenis;
      unbindLenis = lenis?.on?.('scroll', onScroll);
    }
    function onScroll() {
      // Native and Lenis events may both arrive in one frame. Neither writes layout.
      schedule();
    }
    function scrollTo(top) {
      if (window.lenis?.scrollTo) window.lenis.scrollTo(top, { immediate: true, force: true });
      else window.scrollTo({ top, behavior: 'instant' });
    }
    function hold(value) {
      if (pinned === value) return;
      pinned = value;
      root.classList.toggle('is-guide-scroll-pinned', value);
      if (value) {
        controls.interact();
        window.TDBSliderFocus?.release(root);
      } else {
        window.TDBSliderFocus?.release(root);
      }
    }
    function clearChrome(value) {
      if (chromeAway === value) return;
      chromeAway = value;
      root.classList.toggle('is-guide-chrome-away', value);
      if (value) releaseChrome = window.TDBSiteChrome?.acquire();
      else {
        releaseChrome?.();
        releaseChrome = null;
      }
    }
    function disable() {
      if (!enabled) return;
      // Remove synthetic travel without moving the visible card or following image.
      const travelled = Math.max(0, Math.min(runway, window.scrollY - start));
      hold(false);
      rotating = false;
      rotationPending = false;
      animation = null;
      enabled = false;
      groupExit(false);
      root.classList.remove('is-guide-scroll-enabled');
      cardShift = 0;
      stageHeight = 0;
      paintProgress((controls.current() + 1) / 5);
      track.removeAttribute('style');
      if (travelled) scrollTo(window.scrollY - travelled);
      lastIndex = -1;
    }
    function measure() {
      resize = false;
      // Once the five chapters are complete, this visit stays in natural flow,
      // including reverse scrolling, viewport changes and back/forward restores.
      if (completed) {
        canArm = false;
        return disable();
      }
      const cardBox = layout.getBoundingClientRect(),
        exitHeight = exitImage?.getBoundingClientRect().height || 0,
        wheelBox = art.getBoundingClientRect(),
        contentBox = content.getBoundingClientRect(),
        centreBox =
          centre && getComputedStyle(centre).display !== 'none'
            ? centre.getBoundingClientRect()
            : null,
        arrowsBox = arrows?.getBoundingClientRect(),
        footerBox = footer?.getBoundingClientRect(),
        footerHeight = docked ? Math.max(footerBox.height, arrowsBox?.height || 0) : 0,
        layoutStyle = getComputedStyle(layout),
        bottomPadding = parseFloat(layoutStyle.paddingBottom) || 0,
        footerSpace = docked && centreBox ? footerHeight : 0,
        viewport = window.visualViewport,
        height = Math.min(innerHeight, viewport?.height || innerHeight),
        stableHeight =
          enabled && coarse.matches && measuredWidth === innerWidth
            ? stageHeight
            : viewportMeter?.getBoundingClientRect().height || height,
        gap = horizontal ? 0 : innerWidth * 0.05,
        offset = wheelBox.top - cardBox.top,
        bodyTop = docked
          ? contentBox.top - cardBox.top
          : Math.min(centreBox?.top ?? contentBox.top, contentBox.top) - cardBox.top - cardShift,
        centreBottom =
          (centreBox?.bottom ?? (docked ? footerBox.bottom : wheelBox.bottom)) -
          cardBox.top -
          cardShift,
        bodyBottom = docked
          ? centreBottom
          : Math.max(contentBox.bottom, centreBox?.bottom || 0, arrowsBox?.bottom || 0) -
            cardBox.top -
            cardShift,
        bodyHeight = bodyBottom - bodyTop,
        needed = horizontal
          ? Math.max(
              wheelBox.height + bodyHeight + footerSpace + 24,
              docked ? cardBox.height - bottomPadding : 0,
            )
          : Math.max(wheelBox.bottom, contentBox.bottom) - wheelBox.top + gap + 12;
      const nextRadius = Math.max(0, wheelBox.width / 2 - 2.5);
      if (arc && !horizontal && nextRadius !== radius) {
        radius = nextRadius;
        arc.setAttribute('r', String(radius));
      }
      const eligible = wheelBox.width > 0 && !reduced.matches && (!viewport || viewport.scale <= 1);
      // Mobile browser bars resize only the viewport height. Keep the established
      // range; removing/reinserting it mid-swipe moves every following section.
      const fits =
        eligible &&
        (needed <= stableHeight + 1 || (enabled && coarse.matches && measuredWidth === innerWidth));
      canArm = fits;
      measuredWidth = innerWidth;
      if (!fits) return disable();
      // Do not insert scroll travel above a restored reading position.
      if (!enabled && wheelBox.top < gap) return;
      const joinImage = Boolean(exitImage && innerWidth >= 992);
      const fraction = enabled ? Math.max(0, Math.min(5, (window.scrollY - start) / distance)) : 0;
      const oldDistance = distance;
      const oldPinTop = pinTop;
      const margin = layoutStyle.marginBottom;
      stageHeight = stableHeight;
      // Native flexible rows centre the heading, copy and CTA. Legacy layouts
      // alone need a paint offset; never translate the authored grid.
      cardShift =
        horizontal && !docked
          ? offset +
            wheelBox.height +
            (stageHeight - footerSpace - wheelBox.height - bodyHeight) / 2 -
            bodyTop
          : 0;
      cardHeight = nativeStage
        ? cardBox.height
        : docked
          ? offset + stageHeight + bottomPadding
          : horizontal
            ? Math.max(
                (docked ? contentBox.bottom - cardBox.top : bodyBottom) + bottomPadding,
                offset + stageHeight,
              )
            : cardBox.height;
      wheelOffset = offset;
      wheelSize = horizontal
        ? Math.max(wheelBox.height, centreBottom + cardShift - offset, docked ? cardHeight : 0)
        : wheelBox.height;
      pinTop = gap - offset;
      distance = Math.max(240, Math.min(480, innerWidth * 0.8));
      runway = distance * 5;
      const styles = {
        '--tdb-guide-pin-top': pinTop + 'px',
        '--tdb-guide-scroll-travel': runway + 'px',
        '--tdb-guide-background-start': offset + wheelBox.height * (horizontal ? 1 : 0.5) + 'px',
        height: cardHeight + runway + (joinImage ? exitHeight : 0) + 'px',
      };
      if (horizontal) {
        styles['--tdb-guide-stage-height'] = offset + stageHeight + 'px';
        if (docked) styles['--tdb-guide-bottom-padding'] = bottomPadding + 'px';
        else styles['--tdb-guide-card-shift'] = cardShift + 'px';
      }
      for (const [name, value] of Object.entries(styles))
        if (track.style.getPropertyValue(name) !== value) track.style.setProperty(name, value);
      groupExit(joinImage);
      if (!enabled) track.style.marginBottom = margin;
      root.classList.add('is-guide-scroll-enabled');
      enabled = true;
      start = track.getBoundingClientRect().top + window.scrollY - pinTop;
      if (pinned && (oldDistance !== distance || oldPinTop !== pinTop)) {
        animation = null;
        scrollTo(start + fraction * distance);
      }
    }
    function update(now) {
      raf = 0;
      if (disposed || suspended || document.hidden) {
        animation = null;
        hold(false);
        clearChrome(false);
        return;
      }
      bindLenis();
      if (resize) measure();
      const viewHeight = Math.min(innerHeight, window.visualViewport?.height || innerHeight);
      if (!enabled) {
        const wheelBox = art.getBoundingClientRect();
        const headerBottom = horizontal
          ? docked
            ? layout.getBoundingClientRect().bottom
            : centre?.getBoundingClientRect().bottom || wheelBox.bottom
          : wheelBox.bottom;
        clearChrome(wheelBox.width > 0 && wheelBox.top < viewHeight && headerBottom > 0);
        if (canArm && wheelBox.top >= (horizontal ? 0 : innerWidth * 0.05)) measure();
      }
      // All geometry reads precede any scroll/paint writes. Sticky wheel position
      // is derived from this one track rect and the cached dimensions.
      const trackTop = enabled ? track.getBoundingClientRect().top + window.scrollY : 0;
      if (enabled) start = trackTop - pinTop;
      const blocked = window.TDBScrollLock?.active || root.closest('[inert]');
      if (blocked) {
        animation = null;
        rotationPending = false;
      }
      // A choice made above the strip has already completed that chapter.
      // Join its divider only on entry, preserving any native scroll overshoot.
      // Keep this intent separate from animation, which finger input may cancel.
      if (enabled && entryIndex !== null && !blocked) {
        const progress = window.scrollY - start;
        if (progress >= runway - 1) entryIndex = null;
        else if (progress >= -1) {
          animation = null;
          scrollTo(start + (entryIndex + 1) * distance + Math.max(0, progress));
          paintProgress((entryIndex + 1) / 5);
          entryIndex = null;
        }
      }
      const destination = animation?.index;
      if (rotationPending && enabled) {
        rotationPending = false;
        scrollTo(rotationY);
      } else if (animation) {
        const ms = animation.last == null ? 0 : Math.max(0, now - animation.last);
        animation.elapsed += ms;
        animation.last = now;
        const timing = animation.travel?.effect.getComputedTiming();
        const fraction = reduced.matches
          ? 1
          : timing?.localTime != null
            ? Math.min(1, timing.localTime / timing.endTime)
            : Math.min(1, animation.elapsed / animation.duration);
        const ease =
          fraction === 1 ? 1 : (timing?.progress ?? (1 - Math.cos(Math.PI * fraction)) / 2);
        const value = animation.from + (animation.to - animation.from) * ease;
        if (animation.scroll) scrollTo(value);
        else paintProgress(value);
        if (fraction === 1) animation = null;
        else schedule();
      }
      if (!enabled) return;
      const wheelTop =
        Math.min(Math.max(pinTop, trackTop - window.scrollY), trackTop + runway - window.scrollY) +
        wheelOffset;
      clearChrome(wheelTop < viewHeight && wheelTop + wheelSize > 0);
      const progress = window.scrollY - start;
      const inside = progress >= -1 && progress < runway - 1;
      const wasPinned = pinned;
      if (inside || wasPinned) paintProgress(runway - progress <= 1 ? 1 : progress / runway);
      hold(inside);
      if (window.TDBScrollLock?.active) return;
      // A divider belongs to the chapter just completed; allow native pixel rounding.
      const index =
        destination ?? Math.max(0, Math.min(4, Math.ceil((progress - 0.5) / distance) - 1));
      if ((inside || wasPinned) && (lastIndex !== index || controls.current() !== index)) {
        lastIndex = index;
        controls.select(index);
      }
      if (!inside) lastIndex = -1;
      if (!blocked && progress >= runway - 1) {
        completed = true;
        canArm = false;
        entryIndex = null;
        if (controls.current() !== 4) controls.select(4);
        disable();
        schedule();
      }
    }
    function schedule(needsMeasure = false) {
      if (disposed) return;
      resize ||= needsMeasure;
      if (!raf) raf = requestAnimationFrame(update);
    }
    const observer = new ResizeObserver(() => schedule(true));
    observer.observe(layout);
    observer.observe(art);
    observer.observe(content);
    if (docked) observer.observe(footer);
    if (exitImage) observer.observe(exitImage);
    window.addEventListener('scroll', onScroll, { passive: true, signal });
    const interrupt = () => {
      animation = null;
    };
    for (const type of ['wheel', 'touchstart', 'pointerdown'])
      window.addEventListener(type, interrupt, { capture: true, passive: true, signal });
    window.addEventListener('resize', () => schedule(true), { passive: true, signal });
    window.visualViewport?.addEventListener('resize', () => schedule(true), {
      passive: true,
      signal,
    });
    reduced.addEventListener('change', () => schedule(true), { signal });
    root.addEventListener('toggle', () => schedule(true), { capture: true, signal });
    document.addEventListener(
      'keydown',
      (event) => {
        if (
          ['Escape', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(
            event.key,
          )
        )
          interrupt();
        if (event.key !== 'Escape' || !pinned || window.TDBScrollLock?.active) return;
        scrollTo(start + runway + 1);
        schedule();
      },
      { capture: true, signal },
    );
    window.addEventListener(
      'pagehide',
      () => {
        suspended = true;
        animation = null;
        hold(false);
        clearChrome(false);
      },
      { signal },
    );
    window.addEventListener(
      'pageshow',
      () => {
        suspended = false;
        schedule(true);
      },
      { signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) {
          animation = null;
          hold(false);
          clearChrome(false);
        } else schedule(true);
      },
      { signal },
    );
    root.classList.add('is-guide-progress-ready');
    paintProgress(controls.current() ? (controls.current() + 1) / 5 : 0);
    schedule(true);
    return {
      get enabled() {
        return enabled;
      },
      get pinned() {
        return pinned;
      },
      manual(index, travel) {
        if (window.TDBScrollLock?.active || root.closest('[inert]')) return;
        const linked =
          enabled && window.scrollY >= start - 1 && window.scrollY <= start + runway + 1;
        entryIndex =
          !completed &&
          !linked &&
          art.getBoundingClientRect().top > (horizontal ? 0 : innerWidth * 0.05)
            ? index
            : null;
        lastIndex = index;
        animation = {
          index,
          scroll: linked,
          from: linked ? window.scrollY : shownFraction,
          to: linked ? start + (index + 1) * distance : (index + 1) / 5,
          elapsed: 0,
          last: null,
          travel,
          duration:
            window.TDBMotion?.duration?.(content.clientWidth) ??
            window.TDBMotionProfile?.time(480) ??
            480,
        };
        schedule();
      },
      beginRotation() {
        animation = null;
        rotationPending = false;
        if (resize) measure();
        rotating =
          enabled &&
          window.scrollY >= start - 1 &&
          window.scrollY <= start + runway + 1 &&
          !window.TDBScrollLock?.active;
        rotationY = window.scrollY;
        return rotating;
      },
      rotate(chapters) {
        if (!rotating || !enabled || window.TDBScrollLock?.active) return;
        rotationY = Math.max(start, Math.min(start + runway, rotationY + chapters * distance));
        rotationPending = true;
        schedule();
      },
      endRotation() {
        rotating = false;
        schedule();
      },
      destroy() {
        if (disposed) return;
        disposed = true;
        events.abort();
        unbindLenis?.();
        observer.disconnect();
        cancelAnimationFrame(raf);
        disable();
        clearChrome(false);
        root.classList.remove('is-guide-progress-ready');
        root.classList.remove('is-guide-footer-docked');
        root.classList.remove('is-guide-native-stage');
        progress?.remove();
        track.replaceWith(layout);
      },
    };
  }
  window.TDBTreatmentGuideScroll = Object.freeze({ mount });
})();

/* Linear interaction for the Designer-owned six-rem chapter strip. */
(() => {
  'use strict';
  if (window.TDBTreatmentGuideBar) return;
  const instances = new WeakMap();
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  function mount(root) {
    if (instances.has(root)) return instances.get(root);
    const menu = root.querySelector('.treatment-guide_wheel');
    const choices = [...root.querySelectorAll('[data-tdb-guide-choice]')];
    if (!menu || choices.length !== 5) throw Error('Treatment guide bar structure missing');
    const events = new AbortController(),
      { signal } = events;
    const tabs = root.querySelector('.treatment-guide_tabs');
    const tabState = () => tabs && window.jQuery?.data?.(tabs, '.w-tabs');
    const tabAttributes =
      tabs &&
      ['data-duration-in', 'data-duration-out'].map((name) => [name, tabs.getAttribute(name)]);
    const tabMotion = tabs && {
      intro: parseInt(tabAttributes[0][1], 10) || 0,
      outro: parseInt(tabAttributes[1][1], 10) || 0,
    };
    if (tabs) {
      tabAttributes.forEach(([name]) => tabs.setAttribute(name, '0'));
      const config = tabState()?.config;
      if (config) Object.assign(config, { intro: 0, outro: 0, immediate: true });
    }
    const attributes = [
      'role',
      'aria-label',
      'tabindex',
      'aria-orientation',
      'aria-valuemin',
      'aria-valuemax',
      'aria-valuenow',
      'aria-valuetext',
    ];
    const before = attributes.map((name) => [name, menu.getAttribute(name)]);
    const hrefs = choices.map((choice) => choice.getAttribute('href'));
    const tabIndexes = choices.map((choice) => choice.getAttribute('tabindex'));
    const syncChoiceTargets = () =>
      choices.forEach((choice) => {
        if (choice.hasAttribute('href')) choice.removeAttribute('href');
        const tabIndex = choice.classList.contains('w--current') ? '0' : '-1';
        if (choice.getAttribute('tabindex') !== tabIndex) choice.setAttribute('tabindex', tabIndex);
      });
    // Enhanced tabs change chapters in place; native fragment URLs are fallback only.
    syncChoiceTargets();
    const total = root.querySelector('.treatment-guide_pagination-total');
    const totalHidden = total?.getAttribute('aria-hidden');
    total?.setAttribute('aria-hidden', 'true');
    menu.setAttribute('role', 'slider');
    menu.setAttribute('aria-label', 'Treatment guide chapters');
    menu.setAttribute('aria-orientation', 'horizontal');
    menu.setAttribute('aria-valuemin', '1');
    menu.setAttribute('aria-valuemax', '5');
    menu.tabIndex = 0;
    root.classList.add('is-guide-bar', 'is-click-wheel');
    let active = Math.max(
      0,
      choices.findIndex((choice) => choice.classList.contains('w--current')),
    );
    let scrollGuide,
      scrollSelecting = false,
      drag = null,
      geometry,
      raf = 0,
      last = 0;
    let visible = true,
      disposed = false,
      suppressUntil = 0;
    const weights = choices.map((_, i) => (i === active ? 1 : 0));
    const reduced = () =>
      Boolean(window.TDBMotionPolicy?.reduced?.matches || window.TDBMotion?.reduced?.matches);
    const blocked = () => Boolean(root.closest('[inert]') || window.TDBScrollLock?.active);
    const card = window.TDBTreatmentGuideCard?.mount(root, active, navigate);
    function schedule() {
      if (!raf && !disposed && visible && !document.hidden) raf = requestAnimationFrame(frame);
    }
    function frame(now) {
      raf = 0;
      if (disposed || !visible || document.hidden) {
        last = 0;
        return;
      }
      const ms = Math.min(40, last ? now - last : 16);
      last = now;
      const dt = (window.TDBMotionProfile?.elapsed(ms) ?? ms) / 1000;
      const ease = reduced() ? 1 : 1 - Math.exp(-dt * 15);
      let moving = false;
      weights.forEach((weight, i) => {
        const goal = i === active ? 1 : 0;
        weights[i] = weight + (goal - weight) * ease;
        if (Math.abs(goal - weights[i]) > 0.002) moving = true;
        else weights[i] = goal;
        choices[i].style.opacity = (0.28 + weights[i] * 0.72).toFixed(4);
      });
      if (moving) schedule();
      else last = 0;
    }
    function measure() {
      geometry = menu.getBoundingClientRect();
      schedule();
    }
    function interact() {
      if (!scrollGuide?.enabled) window.TDBSliderFocus?.focus(root, () => Boolean(drag?.claimed));
    }
    function navigate(direction) {
      interact();
      select((active + direction + 5) % 5, true, direction);
    }
    function select(index, notify = true, direction) {
      index = clamp(index, 0, 4);
      const previous = active;
      active = index;
      const travel =
        previous !== index ? card?.update(index, direction || Math.sign(index - previous)) : null;
      if (notify && !choices[index].classList.contains('w--current')) choices[index].click();
      syncChoiceTargets();
      if (previous !== index && !scrollSelecting && !drag?.claimed)
        scrollGuide?.manual(index, travel);
      menu.setAttribute('aria-valuenow', String(index + 1));
      menu.setAttribute('aria-valuetext', choices[index].textContent.trim());
      schedule();
    }
    function begin(event) {
      if (disposed || blocked() || drag || (event.button != null && event.button !== 0)) return;
      if (!menu.contains(event.target)) return;
      measure();
      drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        previous: event.clientX,
        claimed: false,
        scroll: false,
      };
      // Do not cancel pointerdown: vertical touch pans remain browser-owned.
    }
    function move(event) {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x,
        dy = event.clientY - drag.y;
      if (!drag.claimed) {
        if (Math.abs(dy) > 6 && Math.abs(dy) >= Math.abs(dx)) {
          drag = null;
          return;
        }
        if (Math.abs(dx) <= 6) return;
        drag.claimed = true;
        drag.scroll = scrollGuide?.beginRotation() || false;
        root.setPointerCapture?.(event.pointerId);
        root.classList.add('is-wheel-dragging');
        interact();
      }
      const delta = (event.clientX - drag.previous) / Math.max(1, geometry.width);
      drag.previous = event.clientX;
      const target = clamp((event.clientX - geometry.left) / Math.max(1, geometry.width), 0, 1);
      if (drag.scroll) scrollGuide.rotate(delta * 5);
      else select(Math.min(4, Math.floor(target * 5)), true, delta < 0 ? -1 : 1);
      schedule();
    }
    function end(event) {
      if (!drag || drag.id !== event.pointerId) return;
      const current = drag;
      drag = null;
      if (current.claimed) {
        suppressUntil = performance.now() + 500;
        if (current.scroll) scrollGuide.endRotation();
        else scrollGuide?.manual(active);
      }
      if (root.hasPointerCapture?.(event.pointerId)) root.releasePointerCapture(event.pointerId);
      root.classList.remove('is-wheel-dragging');
      schedule();
    }
    menu.addEventListener('pointerdown', begin, { passive: true, signal });
    document.addEventListener('pointermove', move, { passive: true, signal });
    for (const type of ['pointerup', 'pointercancel'])
      document.addEventListener(type, end, { signal });
    root.addEventListener(
      'lostpointercapture',
      (event) => {
        // Touch begins with implicit capture on a native tab. Transferring that
        // capture to the guide must not end the newly claimed horizontal drag.
        if (event.target === root) end(event);
      },
      { signal },
    );
    menu.addEventListener(
      'touchmove',
      (event) => {
        if (drag?.claimed && event.touches.length === 1) event.preventDefault();
      },
      { passive: false, signal },
    );
    root.addEventListener(
      'click',
      (event) => {
        if (event.isTrusted && performance.now() < suppressUntil && menu.contains(event.target)) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true, signal },
    );
    menu.addEventListener('dragstart', (event) => event.preventDefault(), { signal });
    choices.forEach((choice, index) =>
      choice.addEventListener(
        'click',
        (event) => {
          if (event.isTrusted) {
            interact();
            if (active === index) scrollGuide?.manual(index);
          }
          select(index, false);
        },
        { signal },
      ),
    );
    menu.addEventListener(
      'keydown',
      (event) => {
        const choice = event.target.closest?.('[data-tdb-guide-choice]');
        const activate = choice && (event.key === 'Enter' || event.key === ' ');
        const index = activate
          ? choices.indexOf(choice)
          : {
              ArrowRight: Math.min(4, active + 1),
              ArrowLeft: Math.max(0, active - 1),
              Home: 0,
              End: 4,
            }[event.key];
        if (index == null || blocked()) return;
        event.preventDefault();
        interact();
        if (activate && active === index) scrollGuide?.manual(index);
        select(index);
        (activate ? choice : menu).focus({ preventScroll: true });
      },
      { signal },
    );
    const selection = new MutationObserver(() => {
      syncChoiceTargets();
      const index = choices.findIndex((choice) => choice.classList.contains('w--current'));
      if (index >= 0 && index !== active) select(index, false);
    });
    choices.forEach((choice) =>
      selection.observe(choice, {
        attributes: true,
        attributeFilter: ['class', 'href', 'tabindex'],
      }),
    );
    const resize = new ResizeObserver(measure);
    resize.observe(menu);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible) {
        measure();
        schedule();
      } else {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
      }
    });
    intersection.observe(menu);
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden && drag) end({ pointerId: drag.id });
        else schedule();
      },
      { signal },
    );
    measure();
    select(active, false);
    scrollGuide = window.TDBTreatmentGuideScroll?.mount(root, {
      horizontal: true,
      current: () => active,
      interact() {},
      select(index) {
        scrollSelecting = true;
        select(index);
        scrollSelecting = false;
      },
    });
    const api = {
      select,
      resume(seed) {
        if (seed.cancelled) return;
        begin({
          pointerId: seed.pointerId,
          clientX: seed.startX,
          clientY: seed.startY,
          target: menu,
        });
        move(seed);
        const tapped = drag && !drag.claimed;
        if (!seed.down) {
          end(seed);
          if (tapped) {
            const index = clamp(
              Math.floor(((seed.clientX - geometry.left) / geometry.width) * 5),
              0,
              4,
            );
            if (index === active) scrollGuide?.manual(index);
            select(index);
          }
        }
      },
      destroy() {
        if (disposed) return;
        disposed = true;
        if (drag) end({ pointerId: drag.id });
        cancelAnimationFrame(raf);
        events.abort();
        resize.disconnect();
        intersection.disconnect();
        selection.disconnect();
        scrollGuide?.destroy();
        card?.destroy();
        root.classList.remove('is-guide-bar', 'is-click-wheel', 'is-wheel-dragging');
        choices.forEach((choice) => choice.style.removeProperty('opacity'));
        choices.forEach((choice, i) =>
          hrefs[i] == null ? choice.removeAttribute('href') : choice.setAttribute('href', hrefs[i]),
        );
        choices.forEach((choice, i) =>
          tabIndexes[i] == null
            ? choice.removeAttribute('tabindex')
            : choice.setAttribute('tabindex', tabIndexes[i]),
        );
        before.forEach(([name, value]) =>
          value == null ? menu.removeAttribute(name) : menu.setAttribute(name, value),
        );
        if (totalHidden == null) total?.removeAttribute('aria-hidden');
        else total?.setAttribute('aria-hidden', totalHidden);
        if (tabs) {
          tabAttributes.forEach(([name, value]) =>
            value == null ? tabs.removeAttribute(name) : tabs.setAttribute(name, value),
          );
          const config = tabState()?.config;
          if (config)
            Object.assign(config, tabMotion, { immediate: !tabMotion.intro && !tabMotion.outro });
        }
        window.TDBSliderFocus?.release(root);
        instances.delete(root);
      },
    };
    instances.set(root, api);
    return api;
  }
  window.TDBTreatmentGuideBar = Object.freeze({ mount });
})();
