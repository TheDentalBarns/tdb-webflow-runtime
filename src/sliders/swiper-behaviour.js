/* TDB Swiper behaviour v1.3.0. One custom engine with shared plugin lifecycle. */
(() => {
  'use strict';
  if (window.TDBSwiper) return;
  const bound = new WeakSet();

  // A loop copy and its original represent one logical slide. Presentation
  // plugins choose what to show; the engine only supplies their shared identity.
  function matchingSlides(swiper, slide = swiper.slides[swiper.activeIndex]) {
    if (!slide) return [];
    const key = slide.getAttribute('data-swiper-slide-index');
    return key == null ? [slide] : [...swiper.slides].filter(node =>
      node.getAttribute('data-swiper-slide-index') === key);
  }

  // Includes snap-back to the same slide and a release with no transition.
  // Internal zero-duration loop corrections are not user-visible settlements.
  function onSettled(swiper, callback) {
    let disposed = false, looping = false, touching = false, queued = false;
    const beforeLoop = () => { looping = true; };
    const afterLoop = () => { looping = false; };
    const touchStart = () => { touching = true; };
    const settle = reason => {
      if (disposed || looping || touching || queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        if (!disposed && !swiper.destroyed && !looping && !touching && !swiper.animating) callback(reason);
      });
    };
    const touchEnd = () => { touching = false; settle('release'); };
    const transitionEnd = () => settle('transition');
    const handlers = { beforeLoopFix: beforeLoop, loopFix: afterLoop, touchStart,
      touchEnd, transitionEnd, beforeDestroy: destroy };
    function destroy() {
      if (disposed) return;
      disposed = true;
      Object.entries(handlers).forEach(([event, handler]) => swiper.off(event, handler));
    }
    Object.entries(handlers).forEach(([event, handler]) => swiper.on(event, handler));
    return destroy;
  }

  // Components own their options, duration and lifecycle. The shared adapter
  // keeps loop/interrupt handoffs continuous and gives touch release a settling
  // curve. Swiper still chooses the snapped card; no free-scrolling mode is added.
  function bindSwiper(swiper) {
    if (bound.has(swiper)) return;
    bound.add(swiper);
    const axis = swiper.isHorizontal() ? 'left' : 'top';
    const original = {
      slideTo: swiper.slideTo,
      loopFix: swiper.loopFix,
      slidePrev: swiper.slidePrev,
    };
    const releaseEasing = 'cubic-bezier(.22,.61,.36,1)';
    const releaseStyles = new Map();
    let releasePending = false;

    function restoreReleaseEasing() {
      releaseStyles.forEach((value, el) => { el.style.transitionTimingFunction = value; });
      releaseStyles.clear();
    }

    function applyReleaseEasing() {
      const nodes = [swiper.wrapperEl, ...[...swiper.slides].flatMap(slide =>
        [...slide.querySelectorAll('[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y]')])];
      nodes.forEach(el => {
        if (!releaseStyles.has(el)) releaseStyles.set(el, el.style.transitionTimingFunction || '');
        el.style.transitionTimingFunction = releaseEasing;
      });
    }

    function capture() {
      return [...swiper.slides].flatMap((slide, index) => {
        const key = slide.getAttribute('data-swiper-slide-index') ?? String(index);
        const x = slide.getBoundingClientRect()[axis];
        return [...slide.querySelectorAll('[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y]')]
          .map((el, slot) => ({ el, key, slot, x, transform: getComputedStyle(el).transform }));
      });
    }

    function freeze(items) {
      const wrapper = swiper.wrapperEl;
      const transform = getComputedStyle(wrapper).transform;
      wrapper.style.transitionDuration = '0ms';
      wrapper.style.transform = transform;
      items.forEach(({ el, transform }) => {
        el.style.transitionDuration = '0ms';
        el.style.transform = transform;
      });
      void wrapper.offsetWidth;
    }

    swiper.slideTo = function (index = 0, speed = this.params.speed, callbacks = true, internal, initial) {
      // A loop's zero-duration correction must not consume the pending release.
      const touchRelease = releasePending && speed > 0;
      if (speed > 0) releasePending = false;
      if (this.animating && this.params.preventInteractionOnTransition) {
        return original.slideTo.call(this, index, speed, callbacks, internal, initial);
      }
      if (speed > 0 && (Number(index) !== this.activeIndex || releaseStyles.size) && this.animating && !this.params.preventInteractionOnTransition) {
        freeze(capture());
      }
      if (touchRelease) applyReleaseEasing();
      else restoreReleaseEasing();
      const result = original.slideTo.call(this, index, speed, callbacks, internal, initial);
      if (touchRelease && !this.animating) restoreReleaseEasing();
      return result;
    };

    swiper.loopFix = function () {
      const items = this.animating ? capture() : null;
      const index = this.activeIndex;
      const previous = items ? this.slides[index]?.getBoundingClientRect()[axis] : null;
      if (items) freeze(items);
      const result = original.loopFix.call(this);
      if (items && this.activeIndex !== index) {
        const next = this.slides[this.activeIndex]?.getBoundingClientRect()[axis];
        if (previous != null && next != null && Math.abs(previous - next) > 0.1) {
          this.setTranslate(this.getTranslate() + previous - next);
        }
        capture().forEach(item => {
          const match = items.filter(old => old.key === item.key && old.slot === item.slot)
            .reduce((nearest, old) => !nearest || Math.abs(old.x - item.x) < Math.abs(nearest.x - item.x) ? old : nearest, null);
          if (match) {
            item.el.style.transitionDuration = '0ms';
            item.el.style.transform = match.transform;
          }
        });
        void this.wrapperEl.offsetWidth;
      }
      return result;
    };

    swiper.slidePrev = function (speed = this.params.speed, callbacks = true, internal) {
      if (!this.enabled) return this;
      if (this.params.loop && this.params.slidesPerGroup === 1) {
        if (this.animating && this.params.loopPreventsSlide) return false;
        this.loopFix();
        return this.slideTo(this.activeIndex - 1, speed, callbacks, internal);
      }
      return original.slidePrev.call(this, speed, callbacks, internal);
    };

    swiper.on('touchEnd', () => {
      releasePending = !!swiper.touchEventsData?.isMoved && swiper.allowTouchMove !== false;
      // Swiper resolves a touch snap synchronously after emitting touchEnd.
      // A tap, cancelled gesture or zero-distance release cannot affect a later click.
      queueMicrotask(() => { releasePending = false; });
    });
    swiper.on('transitionEnd', restoreReleaseEasing);
    swiper.on('beforeDestroy', () => {
      releasePending = false;
      restoreReleaseEasing();
      swiper.slideTo = original.slideTo;
      swiper.loopFix = original.loopFix;
      swiper.slidePrev = original.slidePrev;
    });
  }

  /* TDB_SWIPER_PLUGINS */
  window.TDBSwiper = Object.freeze({ version: '1.3.0', matchingSlides, onSettled, bindSwiper, create, register, mount, observe, refresh, prune, watchDuration,
    plugins: () => [...plugins.keys()] });
})();
