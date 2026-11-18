/* Designer owns the 100lvh stage, photos, typography and controls.
 * This module owns chapter selection and motion only. */
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
    const rail = root.querySelector('[data-tdb-cinema-rail]');
    const outro = root.querySelector('.tdb-cinema-outro-space');
    const parallax = root.querySelector('[data-tdb-cinema-parallax]');
    const media = root.querySelector('.tdb-cinema-media');
    const progress = root.querySelector('[data-tdb-cinema-progress]');
    const content = root.querySelector('.tdb-cinema-content');
    const parallaxBefore = parallax?.getAttribute('style');
    const progressBefore = progress?.getAttribute('style');
    if (!track || !stage || !rail || choices.length !== 5 || panes.length !== 5)
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
    const tabAttrs = ['data-duration-in', 'data-duration-out'].map((name) => [
      name,
      tabs.getAttribute(name),
    ]);
    const tabConfig = window.jQuery?.data?.(tabs, '.w-tabs')?.config;
    const configBefore = tabConfig && { ...tabConfig };
    for (const [name] of tabAttrs) tabs.setAttribute(name, '0');
    if (tabConfig) Object.assign(tabConfig, { intro: 0, outro: 0, immediate: true });
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
      mediaHeight = 0,
      outroHeight = 0;
    let releaseChrome = null,
      progressAnimation = null,
      lastProgress = '',
      lastProgressPosition = NaN,
      lastParallax = '';
    const blocked = () => Boolean(window.TDBScrollLock?.active || root.closest('[inert]'));
    const card = window.TDBTreatmentGuideCard.mount(root, active, (direction) =>
      manual(clamp(active + direction, 0, 4)),
    );
    const photoStrip = window.TDBTreatmentGuideCinemaPhotos.mount(root, active);
    choices.forEach((choice, index) =>
      choice.setAttribute(
        'aria-label',
        `${index + 1}. ${panes[index].querySelector('[data-tdb-guide-title]').textContent.trim()}`,
      ),
    );
    function syncTabs() {
      choices.forEach((choice, index) => {
        choice.classList.toggle('w--current', index === active);
        choice.setAttribute('aria-selected', String(index === active));
        choice.setAttribute('tabindex', index === active ? '0' : '-1');
        // Preserve the native href for no-module fallback; enhanced clicks cancel it.
        panes[index].classList.toggle('w--tab-active', index === active);
      });
      root.dataset.tdbCinemaChapter = String(active + 1);
    }
    function select(index, animate = true) {
      index = clamp(index, 0, 4);
      if (index === active) return;
      const direction = Math.sign(index - active);
      active = index;
      if (content) content.scrollTop = 0;
      syncTabs();
      card.update(index, direction, animate);
      photoStrip.select(index, animate);
    }
    function updateProgress(position, animate = false) {
      if (!progress) return;
      // Browser scroll coordinates can round by a fraction of a pixel. Do not
      // let that follow-up event cancel a number-click transition.
      if (!animate && progressAnimation && Math.abs(position - lastProgressPosition) < 1) return;
      const target = `scaleX(${clamp(position / runway, 0, 1).toFixed(6)})`;
      if (target === lastProgress) return;
      const from = getComputedStyle(progress).transform;
      progressAnimation?.cancel();
      progressAnimation = null;
      progress.style.transform = target;
      lastProgress = target;
      lastProgressPosition = position;
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
      outroHeight = outro?.getBoundingClientRect().height || 0;
      photoStrip.measure();
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
      updateProgress(window.scrollY - start, true);
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
      const touchesViewport =
        position > -window.innerHeight && position < runway + stageHeight + outroHeight;
      if (touchesViewport && !releaseChrome) releaseChrome = window.TDBSiteChrome?.acquire();
      else if (!touchesViewport && releaseChrome) {
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
    resize.observe(rail);
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
    root.dataset.tdbCinemaReady = '';
    syncTabs();
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
        photoStrip.destroy();
        progressAnimation?.cancel();
        releaseChrome?.();
        card.destroy();
        choices.forEach((choice, index) => restore(choice, attrs[index]));
        if (parallax) restore(parallax, [['style', parallaxBefore]]);
        delete root.dataset.tdbCinemaReady;
        if (progress) restore(progress, [['style', progressBefore]]);
        restore(tabs, tabAttrs);
        if (tabConfig) Object.assign(tabConfig, configBefore);
        delete root.dataset.tdbCinemaChapter;
        instances.delete(root);
      },
    };
    instances.set(root, api);
    return api;
  }
  window.TDBTreatmentGuideCinema = Object.freeze({ mount });
})();
