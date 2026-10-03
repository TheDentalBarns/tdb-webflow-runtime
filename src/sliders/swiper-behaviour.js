/* TDB Swiper behaviour v1.0.0. Included in the existing custom Swiper artifact. */
(() => {
  'use strict';
  if (window.TDBSwiper) return;
  const bound = new WeakSet();

  // Components own their options and lifecycle. This shared adapter only keeps
  // loop handoffs and interrupted transitions continuous, including parallax.
  function bindSwiper(swiper) {
    if (bound.has(swiper)) return;
    bound.add(swiper);
    const axis = swiper.isHorizontal() ? 'left' : 'top';
    const original = {
      slideTo: swiper.slideTo,
      loopFix: swiper.loopFix,
      slidePrev: swiper.slidePrev,
    };

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
      if (speed > 0 && Number(index) !== this.activeIndex && this.animating && !this.params.preventInteractionOnTransition) {
        freeze(capture());
      }
      return original.slideTo.call(this, index, speed, callbacks, internal, initial);
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

    swiper.on('beforeDestroy', () => {
      swiper.slideTo = original.slideTo;
      swiper.loopFix = original.loopFix;
      swiper.slidePrev = original.slidePrev;
    });
  }

  window.TDBSwiper = Object.freeze({ version: '1.0.0', bindSwiper });
})();
