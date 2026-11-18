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
    const rail = root.querySelector('[data-tdb-cinema-rail]');
    const outro = root.querySelector('.tdb-cinema-outro-space');
    const railBefore = rail?.getAttribute('style');
    const blurs = photos.map((photo) => photo.querySelector('.tdb-treatment-blur'));
    const photoBefore = photos.map((photo) => photo.getAttribute('style'));
    const blurBefore = blurs.map((blur) => blur?.getAttribute('class'));
    const blurStyleBefore = blurs.map((blur) => blur?.getAttribute('style'));
    const parallax = root.querySelector('[data-tdb-cinema-parallax]');
    const media = root.querySelector('.tdb-cinema-media');
    const progress = root.querySelector('[data-tdb-cinema-progress]');
    const content = root.querySelector('.tdb-cinema-content');
    const parallaxBefore = parallax?.getAttribute('style');
    const progressBefore = progress?.getAttribute('style');
    const blurClockBefore = media?.style.getPropertyValue('--tdb-parallax-duration');
    const blurClockPriority = media?.style.getPropertyPriority('--tdb-parallax-duration');
    if (
      !track ||
      !stage ||
      !rail ||
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
      mediaHeight = 0,
      outroHeight = 0;
    let animations = [],
      releaseChrome = null,
      progressAnimation = null,
      lastProgress = '',
      lastParallax = '';
    let photoIndex = active,
      photoRequest = 0;
    const imageJobs = [],
      decodedImages = [];
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
      // This module is proximity/intent gated: warm all five before a fast scroll.
      image.loading = 'eager';
      choices[index].setAttribute(
        'aria-label',
        `${index + 1}. ${panes[index].querySelector('[data-tdb-guide-title]').textContent.trim()}`,
      );
    });
    const imageReady = (index) => images[index].complete && images[index].naturalWidth > 0;
    function loadImage(index) {
      if (decodedImages[index]) return Promise.resolve(true);
      if (!images[index].decode && imageReady(index)) {
        decodedImages[index] = true;
        return Promise.resolve(true);
      }
      if (imageJobs[index]) return imageJobs[index];
      const image = images[index];
      image.loading = 'eager';
      const decode = () =>
        image.decode
          ? image.decode()
          : new Promise((resolve, reject) => {
              image.addEventListener('load', resolve, { once: true, signal });
              image.addEventListener('error', reject, { once: true, signal });
            });
      imageJobs[index] = decode()
        .catch(async (error) => {
          if (disposed) throw error;
          const fallback = imageBefore[index].find(([name]) => name === 'src')?.[1];
          if (!fallback || image.getAttribute('src') === fallback) throw error;
          image.src = fallback;
          image.removeAttribute('srcset');
          image.removeAttribute('sizes');
          await decode();
        })
        .then(() => (decodedImages[index] = imageReady(index)))
        .catch(() => false);
      return imageJobs[index];
    }
    function warm() {
      images.forEach((image, index) => loadImage(index));
    }
    function syncTabs() {
      choices.forEach((choice, index) => {
        choice.classList.toggle('w--current', index === active);
        choice.setAttribute('aria-selected', String(index === active));
        choice.setAttribute('tabindex', index === active ? '0' : '-1');
        // Preserve the native href for no-module fallback; enhanced clicks cancel it.
        panes[index].classList.toggle('w--tab-active', index === active);
      });
      if (next)
        next.innerHTML =
          active === 4 ? 'Continue reading <span aria-hidden="true">↓</span>' : nextBefore;
      root.dataset.tdbCinemaChapter = String(active + 1);
    }
    function travelPhotos(index, animate) {
      // One moving strip preserves coverage when a second chapter arrives before
      // the first transition has finished. Individual crops never disappear.
      const from = getComputedStyle(rail).transform || 'none';
      const imageFrom = images.map((image) => getComputedStyle(image).transform || 'none');
      animations.forEach((animation) => animation.cancel());
      animations = [];
      const timing = {
        duration: motion.duration(stage.clientWidth),
        easing: motion.easing('travel', 'cubic-bezier(.3,0,.2,1)'),
      };
      const target = 'translateX(' + -index * 100 + '%)';
      rail.style.transform = target;
      const moving = animate && !motion.reduced.matches && rail.animate;
      if (moving)
        animations.push(rail.animate([{ transform: from }, { transform: target }], timing));
      photos.forEach((photo, i) => {
        photo.style.transform = 'translateX(' + i * 100 + '%)';
        photo.style.visibility = 'visible';
        images[i].style.visibility = 'visible';
        const amount = parseFloat(images[i].getAttribute('data-swiper-parallax-x')) || 30;
        const imageTarget = 'translateX(' + clamp(index - i, -1, 1) * amount + '%)';
        images[i].style.transform = imageTarget;
        if (moving)
          animations.push(
            images[i].animate(
              [
                { transform: imageFrom[i], visibility: 'visible' },
                { transform: imageTarget, visibility: 'visible' },
              ],
              timing,
            ),
          );
        if (blurs[i]) {
          blurs[i].style.visibility = 'visible';
          blurs[i].classList.toggle('is-current', i === index);
        }
      });
      photoIndex = index;
      root.dataset.tdbCinemaPhoto = String(index + 1);
    }
    function requestPhoto(index, animate) {
      const request = ++photoRequest;
      const needed = Array.from(
        { length: Math.abs(index - photoIndex) + 1 },
        (_, n) => Math.min(index, photoIndex) + n,
      );
      if (needed.every((i) => decodedImages[i])) return travelPhotos(index, animate);
      // Retain the last rendered photograph until every crossed crop can paint.
      Promise.all(needed.map(loadImage)).then((ready) => {
        if (!disposed && request === photoRequest && ready.every(Boolean))
          travelPhotos(index, animate);
      });
    }
    function select(index, animate = true) {
      index = clamp(index, 0, 4);
      if (index === active) return;
      const direction = Math.sign(index - active);
      active = index;
      if (content) content.scrollTop = 0;
      syncTabs();
      card.update(index, direction, animate);
      requestPhoto(index, animate);
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
      outroHeight = outro?.getBoundingClientRect().height || 0;
      // The exact shared Services/Treatments blur clock and control easing.
      media?.style.setProperty(
        '--tdb-parallax-duration',
        motion.duration(stage.clientWidth) + 'ms',
      );
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
      go(start + track.getBoundingClientRect().height + outroHeight);
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
    root.dataset.tdbCinemaReady = '';
    syncTabs();
    measure();
    travelPhotos(active, false);
    warm();
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
        blurs.forEach(
          (blur, index) =>
            blur &&
            restore(blur, [
              ['class', blurBefore[index]],
              ['style', blurStyleBefore[index]],
            ]),
        );
        if (parallax) restore(parallax, [['style', parallaxBefore]]);
        restore(rail, [['style', railBefore]]);
        if (blurClockBefore)
          media?.style.setProperty('--tdb-parallax-duration', blurClockBefore, blurClockPriority);
        else media?.style.removeProperty('--tdb-parallax-duration');
        delete root.dataset.tdbCinemaReady;
        delete root.dataset.tdbCinemaPhoto;
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
