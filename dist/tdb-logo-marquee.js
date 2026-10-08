(() => {
  'use strict';

  const VERSION = '0.11.1';
  if (window.TDBLogoMarquee) { window.TDBLogoMarquee.start?.(); return; }
  const DEFAULTS = {
    selector: '.logo-slider .partner-featured_component',
    itemSelector: '.partner_logos',
    logoSelector: '.logo_image',
    tooltipImageSelector: '.tooltip2_image',
    speedDesktop: 40,
    speedMobile: 22,
    mobileMedia: '(max-width: 767px)',
    smoothing: 0.18,
    initViewportMargin: 600,
    activeViewportMargin: 200,
    maxMeasureAttempts: 160,
    measureRetryMs: 50,
    dragClickThreshold: 6
  };

  const CONFIG = {
    ...DEFAULTS,
    ...(window.TDBLogoMarqueeConfig || {})
  };
  // MediaQueryList.matches stays live as the viewport changes. Reuse the list
  // rather than creating another one on every animation frame.
  const mobileMediaQuery = window.matchMedia?.(CONFIG.mobileMedia);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 992px)');
  // Homepage marquee motion is owner-enabled at every responsive width.
  const homeMotion = document.documentElement.dataset.wfPage === '677cf86df9952f978d94d8a9';
  const reduceMotion = () => !homeMotion && reduced.matches && !desktop.matches;
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)');

  const INIT_ATTR = 'data-tdb-logo-marquee-init';
  const CLONE_ATTR = 'data-tdb-logo-marquee-clone';
  const instances = new Map();
  let discoveredTracks = new WeakSet();
  let booted = false;
  let cardId = 0;
  let initObserver = null;
  let mutationObserver = null;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const modulo = (value, divisor) => ((value % divisor) + divisor) % divisor;

  function wrapX(value, width) {
    if (!width) return 0;
    const wrapped = modulo(value, width);
    return wrapped === 0 ? 0 : wrapped - width;
  }

  function shortestDelta(delta, width) {
    if (!width) return delta;
    return modulo(delta + width / 2, width) - width / 2;
  }

  function getSpeed() {
    return mobileMediaQuery?.matches
      ? CONFIG.speedMobile
      : CONFIG.speedDesktop;
  }

  function prepareVisibleLogos(track) {
    track.querySelectorAll(CONFIG.logoSelector).forEach(image => {
      image.loading = 'eager';
      image.setAttribute('loading', 'eager');
      image.setAttribute('decoding', 'async');
    });

    track.querySelectorAll(CONFIG.tooltipImageSelector).forEach(image => {
      image.loading = 'lazy';
      image.setAttribute('loading', 'lazy');
      image.setAttribute('decoding', 'async');
    });
  }

  function primeTooltipImage(item) {
    const image = item?.querySelector(CONFIG.tooltipImageSelector);
    if (!image) return;
    image.loading = 'eager';
    image.setAttribute('loading', 'eager');
    image.setAttribute('decoding', 'async');
  }

  function makeClone(original) {
    const clone = original.cloneNode(true);
    clone.setAttribute(CLONE_ATTR, 'true');
    clone.setAttribute('aria-hidden', 'true');
    clone.removeAttribute('id');
    clone.setAttribute('tabindex', '-1');

    clone.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
    clone
      .querySelectorAll('a, button, input, select, textarea, [tabindex]')
      .forEach(element => element.setAttribute('tabindex', '-1'));

    return clone;
  }

  function initTrack(track) {
    if (!track || instances.has(track) || track.getAttribute(INIT_ATTR) === VERSION) {
      return instances.get(track) || null;
    }

    const originals = Array.from(
      track.querySelectorAll(`${CONFIG.itemSelector}:not([${CLONE_ATTR}])`)
    );

    if (!originals.length) return null;

    const restore = [];
    function remember(node, names) {
      const values = names.map(name => [name, node.getAttribute(name)]);
      restore.push(() => values.forEach(([name, value]) => value === null ? node.removeAttribute(name) : node.setAttribute(name, value)));
    }
    remember(track, ['style', INIT_ATTR]);
    originals.forEach(item => {
      remember(item, ['role', 'tabindex', 'aria-label', 'data-tdb-logo-index', 'data-tdb-keyboard-focus', 'aria-expanded', 'aria-controls']);
      item.querySelectorAll('img').forEach(img => remember(img, ['loading', 'decoding', 'draggable']));
    });
    track.setAttribute(INIT_ATTR, VERSION);
    track.style.willChange = 'transform';
    track.style.touchAction = 'pan-y';
    prepareVisibleLogos(track);

    originals.forEach((item, index) => {
      item.dataset.tdbLogoIndex = index;
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', (item.querySelector(CONFIG.logoSelector)?.alt || 'Logo ' + (index + 1)) + ': centre and pause');
      item.querySelectorAll('img').forEach(img => img.draggable = false);
    });
    const fragment = document.createDocumentFragment();
    originals.forEach(original => fragment.appendChild(makeClone(original)));
    track.appendChild(fragment);

    const cards = new Map();
    track.querySelectorAll(CONFIG.itemSelector).forEach(item => {
      const card = item.querySelector('.tdb-partner-tooltip');
      if (!card || card.hidden || card.classList.contains('w-condition-invisible')) return;
      remember(card, ['id', 'class', 'style', 'aria-hidden', 'role', 'aria-label']);
      remember(item, ['aria-expanded', 'aria-controls']);
      const pointer = card.querySelector('.tdb-partner-backdrop');
      if (pointer) remember(pointer, ['style']);
      const id = 'tdb-partner-card-' + (++cardId);
      card.id = id;
      card.setAttribute('aria-hidden', 'true');
      card.setAttribute('role', 'region');
      const name = card.querySelector('.text-style-tagline-restored')?.textContent.trim() || 'Partner';
      card.setAttribute('aria-label', name);
      item.setAttribute('aria-label', name + ': centre and show details');
      item.setAttribute('aria-expanded', 'false');
      item.setAttribute('aria-controls', id);
      cards.set(item, card);
    });

    const controller = new AbortController();
    const { signal } = controller;
    const dd = window.TDBMotion.ddText(track.closest('.section_logo-features')?.querySelectorAll('.partner-banner-heading[data-tdb-dd-text]') || []);

    let paused = reduceMotion();
    let momentum = 0;
    let coasting = false;
    let samples = [];
    let pageY = window.scrollY;
    let selected = null;
    let openItem = null;
    let openCard = null;
    const cardTransitions = new Map();
    let startY = 0;
    let startX = 0;
    let horizontal = false;
    const viewport = track.closest('.logo-slider');
    let loopWidth = 0;
    let targetX = 0;
    let currentX = 0;
    let ready = false;
    let active = false;
    let dragging = false;
    let pointerId = null;
    let pressedItem = null;
    let touchClickUntil = 0;
    let lastPointerX = 0;
    let suppressNextClick = false;
    let rafId = 0;
    let lastFrameAt = performance.now();
    let measureTimer = 0;
    let measureAttempts = 0;
    let activeObserver = null;
    let resizeObserver = null;

    function positionCard() {
      if (!openCard || !openItem) return;
      const edge = 12, gap = 10;
      const copies = [...track.querySelectorAll(CONFIG.itemSelector)].filter(item => item.dataset.tdbLogoIndex === openItem.dataset.tdbLogoIndex);
      const anchor = copies.map(item => item.getBoundingClientRect()).sort((a,b) => Math.abs(a.left + a.width/2 - innerWidth/2) - Math.abs(b.left + b.width/2 - innerWidth/2))[0];
      const visual = window.visualViewport;
      const viewLeft = visual?.offsetLeft || 0, viewTop = visual?.offsetTop || 0;
      const viewWidth = visual?.width || document.documentElement.clientWidth;
      const viewHeight = visual?.height || innerHeight;
      const box = { width: openCard.offsetWidth, height: openCard.offsetHeight };
      const above = anchor.top - box.height - gap;
      const below = !mobileMediaQuery?.matches && above < viewTop + edge && anchor.bottom + gap + box.height <= viewTop + viewHeight - edge;
      const left = clamp(anchor.left + anchor.width / 2 - box.width / 2, viewLeft + edge, Math.max(viewLeft + edge, viewLeft + viewWidth - box.width - edge));
      const top = mobileMediaQuery?.matches ? above : clamp(below ? anchor.bottom + gap : above, viewTop + edge, Math.max(viewTop + edge, viewTop + viewHeight - box.height - edge));
      openCard.style.left = left + 'px';
      openCard.style.top = top + 'px';
      const pointer = openCard.querySelector('.tdb-partner-backdrop');
      if (pointer) {
        const surface = openCard.querySelector('.tooltip2_card-wrapper');
        const topEdge = surface.offsetTop;
        const bottomEdge = topEdge + surface.offsetHeight;
        pointer.style.setProperty('--tdb-tip-x', clamp(anchor.left + anchor.width / 2 - left, 12, box.width - 12) + 'px');
        pointer.style.setProperty('--tdb-surface-top', topEdge + 'px');
        pointer.style.setProperty('--tdb-surface-bottom', bottomEdge + 'px');
        pointer.style.setProperty('--tdb-tip-top', (below ? topEdge - 8 : topEdge) + 'px');
        pointer.style.setProperty('--tdb-tip-bottom', (below ? bottomEdge : bottomEdge + 8) + 'px');
      }
    }
    function finishCardTransition(card) {
      const state = cardTransitions.get(card);
      if (!state) return;
      cardTransitions.delete(card);
      state.animations.forEach(animation => animation.cancel());
      state.done?.();
    }
    function animateCard(card, opening, done) {
      const surface = card.querySelector('.tooltip2_card-wrapper');
      const glass = card.querySelector('.tdb-partner-backdrop');
      const activeTransition = cardTransitions.has(card);
      const cardStyle = getComputedStyle(card);
      const surfaceStyle = getComputedStyle(surface);
      const glassStyle = getComputedStyle(glass);
      const restingGlass = {
        backgroundColor: glassStyle.backgroundColor,
        backdropFilter: glassStyle.backdropFilter
      };
      // Preserve Designer's full glass values even while an animation is running.
      const nativeGlass = cardTransitions.get(card)?.nativeGlass || restingGlass;
      const clearGlass = { backgroundColor: 'rgba(249, 242, 230, 0)', backdropFilter: 'saturate(100%) blur(0px)' };
      const fromTransform = activeTransition ? cardStyle.transform : opening ? 'translateY(20px)' : 'translateY(0)';
      const fromOpacity = activeTransition ? surfaceStyle.opacity : opening ? 0 : 1;
      const fromGlass = activeTransition ? restingGlass : opening ? clearGlass : nativeGlass;
      finishCardTransition(card);
      const duration = window.TDBPanelMotion?.duration() || window.TDBMotion.duration();
      const easing = window.TDBPanelMotion?.easing || 'cubic-bezier(0.165,0.84,0.44,1)';
      const options = { duration, easing, fill: 'both' };
      // Keep opacity off the glass ancestor: it creates a backdrop root and can
      // make the blur appear only when the ancestor fade finishes.
      const animations = [
        card.animate([{ transform: fromTransform }, { transform: opening ? 'translateY(0)' : 'translateY(20px)' }], options),
        surface.animate([{ opacity: fromOpacity }, { opacity: opening ? 1 : 0 }], options),
        glass.animate([fromGlass, opening ? nativeGlass : clearGlass], options)
      ];
      const state = { animations, nativeGlass, done };
      cardTransitions.set(card, state);
      Promise.all(animations.map(animation => animation.finished)).then(() => {
        if (cardTransitions.get(card) !== state) return;
        cardTransitions.delete(card);
        done?.();
        animations.forEach(animation => animation.cancel());
      }).catch(() => {});
    }
    function closeCard(returnFocus = false, immediate = false) {
      if (!openCard) return;
      const card = openCard, item = openItem;
      const focused = card.contains(document.activeElement);
      openCard = openItem = null;
      card.setAttribute('aria-hidden', 'true');
      card.inert = true;
      item.setAttribute('aria-expanded', 'false');
      const park = () => {
        card.style.removeProperty('display');
        card.style.removeProperty('left');
        card.style.removeProperty('top');
        card.inert = false;
        item.prepend(card);
      };
      if (immediate) { finishCardTransition(card); park(); }
      else animateCard(card, false, park);
      if (returnFocus && focused) {
        const original = originals[Number(item.dataset.tdbLogoIndex)];
        original?.focus({ preventScroll: true });
      }
    }
    function showCard(item) {
      closeCard();
      const card = cards.get(item);
      if (!card) return;
      finishCardTransition(card);
      openItem = item; openCard = card;
      primeTooltipImage(item);
      // Portal the native CMS card out of the moving track to avoid clipping.
      document.body.append(card);
      card.inert = false;
      card.querySelectorAll('a').forEach(link => link.removeAttribute('tabindex'));
      card.style.display = 'block';
      card.setAttribute('aria-hidden', 'false');
      item.setAttribute('aria-expanded', 'true');
      positionCard();
      animateCard(card, true);
    }

    function setTransform(value) {
      track.style.transform = `translate3d(${value}px, 0, 0)`;
      positionCard();
    }

    function measureLoopWidth() {
      const firstOriginal = track.querySelector(
        `${CONFIG.itemSelector}:not([${CLONE_ATTR}])`
      );
      const firstClone = track.querySelector(`${CONFIG.itemSelector}[${CLONE_ATTR}]`);

      if (!firstOriginal || !firstClone) return 0;
      const width = firstClone.offsetLeft - firstOriginal.offsetLeft;
      return width > 0 ? width : 0;
    }

    function startAnimation() {
      if (rafId || !active || document.visibilityState === 'hidden') return;
      lastFrameAt = performance.now();
      rafId = requestAnimationFrame(frame);
    }

    function stopAnimation() {
      if (!rafId) return;
      cancelAnimationFrame(rafId);
      rafId = 0;
    }

    function applyMeasurement() {
      if (signal.aborted) return;
      const nextWidth = measureLoopWidth();

      if (!nextWidth) {
        ready = false;
        if (measureAttempts++ < CONFIG.maxMeasureAttempts) {
          clearTimeout(measureTimer);
          measureTimer = window.setTimeout(applyMeasurement, CONFIG.measureRetryMs);
        }
        return;
      }

      const gap = loopWidth
        ? shortestDelta(targetX - currentX, loopWidth)
        : targetX - currentX;

      loopWidth = nextWidth;
      currentX = wrapX(currentX, loopWidth);
      targetX = currentX + shortestDelta(gap, loopWidth);
      measureAttempts = 0;
      ready = true;
      setTransform(wrapX(currentX, loopWidth));
      if (paused && !dragging && !momentum && selected !== null) centre(originals[Number(selected)]);
      startAnimation();
    }

    function scheduleMeasure() {
      if (signal.aborted) return;
      clearTimeout(measureTimer);
      measureTimer = window.setTimeout(applyMeasurement, 120);
    }

    function frame(now) {
      rafId = 0;

      if (!document.documentElement.contains(track)) {
        destroy();
        return;
      }

      if (!active || document.visibilityState === 'hidden') return;

      const deltaSeconds = clamp((now - lastFrameAt) / 1000, 0, 0.25);
      lastFrameAt = now;

      if (ready) {
        if (coasting && !dragging) {
          // Carry the throw into the existing automatic speed, without snapping.
          const cruise = -getSpeed();
          const decay = Math.exp(-4.2 * deltaSeconds);
          currentX += cruise * deltaSeconds + (momentum-cruise) * (1-decay) / 4.2;
          momentum = cruise + (momentum-cruise) * decay;
          targetX = currentX;
          if (Math.abs(momentum-cruise) < 2) { coasting = false; momentum = 0; }
        } else if (!dragging) {
          if (!paused && !reduceMotion()) {
            currentX -= getSpeed() * deltaSeconds;
            targetX = currentX;
          } else {
            const frameSmoothing = 1 - Math.pow(1-.11, deltaSeconds * 60);
            currentX += (targetX-currentX) * frameSmoothing;
          }
        }

        if (Math.abs(currentX) > 1000000 || Math.abs(targetX) > 1000000) {
          const wrappedCurrent = wrapX(currentX, loopWidth);
          targetX = wrappedCurrent + shortestDelta(targetX - currentX, loopWidth);
          currentX = wrappedCurrent;
        }

        setTransform(wrapX(currentX, loopWidth));
      }

      if (!rafId && ((!paused && !reduceMotion()) || coasting || Math.abs(targetX-currentX) > .05)) rafId = requestAnimationFrame(frame);
    }

    function centre(item) {
      if (!item || !ready) return;
      paused = true;
      momentum = 0; coasting = false;
      selected = item.dataset.tdbLogoIndex;
      const box = item.getBoundingClientRect();
      const view = viewport.getBoundingClientRect();
      targetX = currentX + shortestDelta(view.left + view.width / 2 - box.left - box.width / 2, loopWidth);
      if (reduceMotion()) { currentX = targetX; setTransform(wrapX(currentX,loopWidth)); }
      startAnimation();
    }
    function select(item) {
      if (!item) return;
      centre(item);
      // Activation always selects; dismissal is outside/Escape/scroll/drag.
      if (openItem !== item) showCard(item);
    }
    function resume() {
      if (dragging) return;
      closeCard();
      paused = reduceMotion(); selected = null; momentum = 0; coasting = false;
      targetX = currentX;
      if (!paused) startAnimation();
    }
    function onPointerDown(event) {
      if (!ready || event.button > 0 || event.isPrimary === false || pointerId !== null) return;
      // Catch a moving logo exactly where the finger lands, including mid-settle.
      momentum = 0; coasting = false; targetX = currentX; paused = true; stopAnimation();
      pointerId = event.pointerId;
      pressedItem = event.target.closest(CONFIG.itemSelector);
      startX = lastPointerX = event.clientX; startY = event.clientY;
      samples = [{x:event.clientX,t:event.timeStamp}];
      horizontal = false; dragging = false;
      suppressNextClick = false;
    }
    function onPointerMove(event) {
      if (event.pointerId !== pointerId) return;
      const dx = event.clientX-startX, dy = event.clientY-startY;
      if (!horizontal) {
        if (Math.abs(dy) > CONFIG.dragClickThreshold && Math.abs(dy) > Math.abs(dx)) {
          pointerId = null; resume(); return;
        }
        if (Math.abs(dx) <= CONFIG.dragClickThreshold) return;
        closeCard();
        horizontal = dragging = true; selected = null;
        try { track.setPointerCapture(pointerId); } catch (_) {}
      }
      event.preventDefault(); suppressNextClick = true;
      const delta = event.clientX-lastPointerX; lastPointerX = event.clientX;
      samples.push({x:event.clientX,t:event.timeStamp});
      while (samples.length > 2 && samples[1].t < event.timeStamp - 100) samples.shift();
      currentX += delta; targetX = currentX;
      setTransform(wrapX(currentX,loopWidth));
    }
    function endPointer(event) {
      if (event.pointerId !== pointerId) return;
      const id = pointerId, moved = horizontal, tappedItem = pressedItem;
      pressedItem = null;
      pointerId = null; dragging = false; horizontal = false;
      try { track.releasePointerCapture(id); } catch (_) {}
      if (moved) {
        suppressNextClick = true;
        const first = samples[0], last = samples[samples.length-1];
        const dt = last.t-first.t;
        momentum = !reduceMotion() && event.type === 'pointerup' && event.timeStamp-last.t < 90 && dt > 0
          ? clamp((last.x-first.x) / dt * 1000,-2800,2800) : 0;
        selected = null;
        paused = reduceMotion();
        coasting = !paused;
        targetX = currentX;
        if (coasting) startAnimation();
      } else if (event.type === 'pointerup' && event.pointerType === 'touch' && tappedItem) {
        // iOS may retarget or omit click after implicit pointer capture.
        touchClickUntil = performance.now() + 800;
        suppressNextClick = true;
        select(tappedItem);
      } else if (event.type !== 'pointerup') resume();
    }
    function onClick(event) {
      // A touch activation has already been handled on pointerup.
      if (performance.now() < touchClickUntil) {
        event.preventDefault(); event.stopImmediatePropagation(); return;
      }
      // Pointer capture can retarget the release-click to the track itself.
      if (suppressNextClick) {
        suppressNextClick = false;
        event.preventDefault(); event.stopImmediatePropagation(); return;
      }
      suppressNextClick = false;
      const item = event.target.closest(CONFIG.itemSelector);
      if (!item) { resume(); return; }
      event.preventDefault(); event.stopImmediatePropagation(); select(item);
    }
    function onOutsideClick(event) {
      if (performance.now() < touchClickUntil) return;
      if (!track.contains(event.target) && !openCard?.contains(event.target)) resume();
    }
    function onPageScroll() {
      const nextY = window.scrollY;
      if (Math.abs(nextY-pageY) < 8) return;
      pageY = nextY;
      if (!dragging && (paused || momentum)) resume();
    }
    function onKey(event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const item = event.target.closest(CONFIG.itemSelector);
      if (!item) return;
      suppressNextClick = false;
      event.preventDefault(); event.stopImmediatePropagation(); select(item);
    }
    function onReducedChange() {
      momentum = 0; coasting = false; targetX = currentX;
      if (reduceMotion()) { paused = true; stopAnimation(); }
      else resume();
    }

    function onTooltipIntent(event) {
      const item = event.target instanceof Element ? event.target.closest(CONFIG.itemSelector) : null;
      if (!item || !track.contains(item)) return;
      if (event.type === 'pointerover' && finePointer.matches) item.querySelectorAll(CONFIG.logoSelector).forEach(logo => logo.classList.add('is-partner-hovered'));
    }

    function clearHover(event) {
      const item = event.target instanceof Element ? event.target.closest(CONFIG.itemSelector) : null;
      if (item && !item.contains(event.relatedTarget)) item.querySelectorAll(CONFIG.logoSelector).forEach(logo => logo.classList.remove('is-partner-hovered'));
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') stopAnimation();
      else startAnimation();
    }

    function destroy() {
      if (!instances.has(track)) return;

      closeCard(false, true);
      [...cardTransitions.keys()].forEach(finishCardTransition);
      controller.abort();
      dd.destroy();
      track.querySelectorAll('.is-partner-hovered').forEach(logo => logo.classList.remove('is-partner-hovered'));
      track.querySelectorAll('.is-keyboard-focused').forEach(item => item.classList.remove('is-keyboard-focused'));
      stopAnimation();
      clearTimeout(measureTimer);
      activeObserver?.disconnect();
      resizeObserver?.disconnect();

      track.querySelectorAll(`[${CLONE_ATTR}]`).forEach(clone => clone.remove());
      track.removeAttribute(INIT_ATTR);
      track.style.removeProperty('transform');
      track.style.removeProperty('will-change');
      track.style.removeProperty('touch-action');
      restore.reverse().forEach(fn => fn());
      discoveredTracks.delete(track);
      instances.delete(track);
    }

    track.addEventListener('focusin', event => {
      const item = event.target.closest(CONFIG.itemSelector);
      if (!item || !item.matches(':focus-visible') || item === openItem) return;
      centre(item);
      selected = null; // Focusing pauses; the first activation selects rather than resumes.
      track.querySelectorAll(CONFIG.itemSelector).forEach(copy => {
        copy.classList.toggle('is-keyboard-focused', copy.dataset.tdbLogoIndex === item.dataset.tdbLogoIndex);
      });
    }, { signal });
    track.addEventListener('focusout', () => track.querySelectorAll('.is-keyboard-focused').forEach(item => item.classList.remove('is-keyboard-focused')), { signal });
    track.addEventListener('keydown', onKey, { signal });
    document.addEventListener('keydown', event => {
      if (event.key === 'Tab' && openCard && !event.shiftKey && event.target === openItem) {
        const link = openCard.querySelector('a[href]');
        if (link) { event.preventDefault(); link.focus({ preventScroll: true }); }
      }
      if (event.key === 'Escape' && openCard) {
        event.preventDefault(); closeCard(true); resume();
      }
    }, { signal });
    window.addEventListener('resize', positionCard, { signal, passive: true });
    window.visualViewport?.addEventListener('resize', positionCard, { signal, passive: true });
    const cardObserver = new ResizeObserver(positionCard);
    cards.forEach(card => cardObserver.observe(card));
    signal.addEventListener('abort', () => cardObserver.disconnect(), { once: true });
    track.addEventListener('dragstart', event => event.preventDefault(), { signal });
    reduced.addEventListener('change', onReducedChange, { signal });
    desktop.addEventListener('change', onReducedChange, { signal });
    document.addEventListener('click', onOutsideClick, { signal, capture:true });
    window.addEventListener('scroll', onPageScroll, { signal, passive:true });
    track.addEventListener('pointerdown', onPointerDown, { signal });
    track.addEventListener('pointermove', onPointerMove, { signal, passive: false });
    window.addEventListener('pointerup', endPointer, { signal });
    track.addEventListener('pointercancel', endPointer, { signal });
    // Touch starts with implicit capture on the logo/image. Moving capture to
    // the track emits a bubbling lostpointercapture from that child. It is a
    // handoff, not a release: keep following the finger until the track loses it.
    track.addEventListener('lostpointercapture', event => {
      if (event.target === track) endPointer(event);
    }, { signal });
    track.addEventListener('click', onClick, { signal, capture: true });
    track.addEventListener('auxclick', event => {
      if (event.target.closest(CONFIG.itemSelector)) {
        event.preventDefault(); event.stopImmediatePropagation();
      }
    }, { signal, capture: true });
    track.addEventListener('pointerover', onTooltipIntent, { signal, passive: true });
    track.addEventListener('pointerout', clearHover, { signal, passive: true });
    finePointer.addEventListener('change', () => track.querySelectorAll('.is-partner-hovered').forEach(logo => logo.classList.remove('is-partner-hovered')), { signal });
    // Tooltip imagery is requested only by explicit activation in showCard().
    document.addEventListener('visibilitychange', onVisibilityChange, { signal });

    if ('IntersectionObserver' in window) {
      activeObserver = new IntersectionObserver(
        ([entry]) => {
          active = Boolean(entry?.isIntersecting);
          if (active) startAnimation();
          else { closeCard(); paused = reduceMotion(); selected = null; momentum = 0; coasting = false; targetX = currentX; stopAnimation(); }
        },
        { rootMargin: `${CONFIG.activeViewportMargin}px 0px` }
      );
      activeObserver.observe(track);
    } else {
      active = true;
    }

    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(scheduleMeasure);
      resizeObserver.observe(track);
      track.querySelectorAll(CONFIG.itemSelector).forEach(item => resizeObserver.observe(item));
    } else {
      window.addEventListener('resize', scheduleMeasure, { signal, passive: true });
    }

    track.querySelectorAll('img').forEach(image => {
      if (image.complete) return;
      image.addEventListener('load', scheduleMeasure, { signal, once: true });
      image.addEventListener('error', scheduleMeasure, { signal, once: true });
    });

    window.addEventListener('load', scheduleMeasure, { signal, once: true });
    window.addEventListener('orientationchange', scheduleMeasure, {
      signal,
      passive: true
    });

    if (document.fonts?.ready) {
      document.fonts.ready.then(scheduleMeasure).catch(() => {});
    }

    const instance = {
      version: VERSION,
      refresh: applyMeasurement,
      destroy,
      status: () => ({
        ready,
        active,
        running: Boolean(rafId),
        dragging,
        paused,
        momentum,
        coasting,
        selected,
        loopWidth,
        currentX,
        targetX
      })
    };

    instances.set(track, instance);
    applyMeasurement();
    requestAnimationFrame(() => requestAnimationFrame(scheduleMeasure));
    if (!('IntersectionObserver' in window)) startAnimation();
    return instance;
  }

  function discoverTrack(track) {
    if (!track || discoveredTracks.has(track) || instances.has(track)) return;
    discoveredTracks.add(track);

    if (!('IntersectionObserver' in window)) {
      initTrack(track);
      return;
    }

    initObserver.observe(track);
  }

  function discover(root = document) {
    if (root instanceof Element && root.matches(CONFIG.selector)) discoverTrack(root);
    root.querySelectorAll?.(CONFIG.selector).forEach(discoverTrack);
    return status();
  }

  function refresh() {
    discover(document);
    instances.forEach(instance => instance.refresh());
    return status();
  }

  function destroyAll() {
    initObserver?.disconnect();
    mutationObserver?.disconnect();
    Array.from(instances.values()).forEach(instance => instance.destroy());
    discoveredTracks = new WeakSet();
    booted = false;

  }

  function status() {
    return {
      version: VERSION,
      selector: CONFIG.selector,
      instances: Array.from(instances.values()).map(instance => instance.status())
    };
  }

  function boot() {
    if (booted) return;
    booted = true;

    if ('IntersectionObserver' in window) {
      initObserver = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            initObserver.unobserve(entry.target);
            initTrack(entry.target);
          });
        },
        { rootMargin: `${CONFIG.initViewportMargin}px 0px` }
      );
    }

    discover(document);

    mutationObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof Element) discover(node);
        });
      });
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  window.TDBLogoMarquee = Object.freeze({
    version: VERSION,
    start: boot,
    refresh,
    destroy: destroyAll,
    status
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

