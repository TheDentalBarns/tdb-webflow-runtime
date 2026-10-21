/* Native CMS stamps: independent scrolling, with selection following image progress. */
window.TDBTreatmentStamps ||= (() => {
  const instances = new WeakMap();
  function prepare(root) {
    if (!root.hasAttribute('data-tdb-treatment-postage')) return null;
    if (instances.has(root)) return instances.get(root);
    const layout = root.closest('[data-tdb-treatment-layout]') || root;
    const strip = layout.querySelector('[data-tdb-treatment-stamps]');
    const viewport = strip?.querySelector('.tdb-treatment-controls');
    const links = Array.from(strip?.querySelectorAll('[data-tdb-treatment-stamp]') || []);
    if (!viewport || !links.length) return null;
    const items = links.map((link) => link.closest('.tdb-treatment-card'));
    const track = items[0].parentElement;
    const mobile = matchMedia('(max-width: 767px)');
    let looped = false,
      cycle = 0,
      copies = [],
      allLinks = links;
    let swiper,
      automatic = true,
      offsets = [],
      width = 0,
      drag = null,
      suppressClick = false;
    let selected = -1;
    const animations = new Map();
    const on = (type, listener, options) => viewport.addEventListener(type, listener, options);
    links.forEach((link, index) => {
      link.dataset.tdbStampIndex = String(index);
    });
    function configureLoop() {
      const enabled = mobile.matches && links.length > 1;
      if (enabled === looped) return;
      copies.forEach((node) => {
        animations.get(node)?.cancel();
        animations.delete(node);
        node.remove();
      });
      copies = [];
      looped = enabled;
      if (enabled) {
        const copy = (item) => {
          const node = item.cloneNode(true);
          node.setAttribute('aria-hidden', 'true');
          node.removeAttribute('id');
          node.querySelectorAll('[id]').forEach((child) => child.removeAttribute('id'));
          node.querySelectorAll('a').forEach((link) => (link.tabIndex = -1));
          return node;
        };
        const before = items.map(copy),
          after = items.map(copy);
        track.prepend(...before);
        track.append(...after);
        copies = [...before, ...after];
      }
      allLinks = [...track.querySelectorAll('[data-tdb-treatment-stamp]')];
      selected = -1;
      automatic = true;
      drag = null;
    }
    function normalize() {
      if (!looped || !cycle) return;
      const before = viewport.scrollLeft;
      const after = cycle / 2 + ((((before - cycle / 2) % cycle) + cycle) % cycle);
      if (Math.abs(after - before) < 0.5) return;
      viewport.scrollLeft = after;
      // Preserve the pointer's origin when a dragged cycle is recycled.
      if (drag) drag.left += after - before;
    }
    function dim(item, active, heading = false) {
      if (!item) return;
      const property = heading ? 'color' : 'opacity';
      const current = getComputedStyle(item)[property];
      const target = heading ? (active ? '#ffffff' : 'rgba(255,255,255,0.5)') : active ? 1 : 0.5;
      animations.get(item)?.cancel();
      animations.set(
        item,
        item.animate([{ [property]: current }, { [property]: target }], {
          duration: window.TDBMotion?.reduced?.matches ? 0 : 200,
          fill: 'forwards',
        }),
      );
    }
    function selection() {
      if (!swiper || selected === swiper.realIndex) return;
      selected = swiper.realIndex;
      allLinks.forEach((link) => {
        const active = Number(link.dataset.tdbStampIndex) === selected;
        active ? link.setAttribute('aria-current', 'true') : link.removeAttribute('aria-current');
        dim(link.closest('.tdb-treatment-card'), active);
      });
      Array.from(swiper.slides || []).forEach((slide, index) => {
        const realIndex = Number(slide.getAttribute('data-swiper-slide-index') ?? index);
        dim(slide.querySelector('.tdb-treatment-title'), realIndex === selected, true);
      });
    }
    function bind() {
      const candidate = root.querySelector(':scope > .swiper')?.swiper;
      if (!candidate || candidate === swiper) return;
      swiper = candidate;
      swiper.on('slideChange', change);
      swiper.on('beforeDestroy', dispose);
      selection();
    }
    function change() {
      automatic = true;
      selection();
    }
    function measure() {
      configureLoop();
      bind();
      const first = items[0].getBoundingClientRect();
      width = first.width;
      offsets = items.map((item) => item.getBoundingClientRect().left - first.left);
      cycle = looped ? copies[items.length].getBoundingClientRect().left - first.left : 0;
      selection();
      return width;
    }
    function paint(index, markerX, trackWidth) {
      bind();
      if (!automatic || !offsets.length || drag) return;
      const last = links.length - 1;
      if (looped && cycle > 0) {
        const value = ((index % links.length) + links.length) % links.length;
        const lower = Math.floor(value),
          fraction = value - lower;
        const next = lower === last ? cycle : offsets[lower + 1];
        const offset = offsets[lower] + (next - offsets[lower]) * fraction;
        // Across the seam continue forward into the next CMS copy. Recycling
        // a whole cycle is visually identical, including during a native drag.
        const marker = lower === last ? (trackWidth - width) * (1 - fraction) : markerX;
        viewport.scrollLeft = cycle + offset - marker;
        normalize();
        return;
      }
      // The loop's duplicated images cross the seam; stamps remain a finite list.
      const value = Math.min(last, Math.max(0, index));
      const lower = Math.floor(value),
        upper = Math.min(last, lower + 1);
      const offset = offsets[lower] + (offsets[upper] - offsets[lower]) * (value - lower);
      const alignedMarker = index > last ? trackWidth - width : markerX;
      viewport.scrollLeft = Math.max(0, offset - alignedMarker);
    }
    function choose(event) {
      const link = event.target.closest('[data-tdb-treatment-stamp]');
      if (
        !link ||
        !viewport.contains(link) ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      bind();
      if (!swiper) {
        window.TDBSwiper?.mount('parallax', root);
        bind();
      }
      if (!swiper) return; // CMS links remain usable if the enhancement is unavailable.
      event.preventDefault();
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      const index = Number(link.dataset.tdbStampIndex);
      if (!Number.isInteger(index) || index < 0 || index >= links.length) return;
      automatic = true;
      swiper.slideToLoop(index);
      const progress = root.querySelector('[data-tdb-native-progress]');
      const trackWidth = progress.getBoundingClientRect().width;
      if (swiper.realIndex === index && !swiper.animating) {
        measure();
        paint(
          index,
          links.length < 2 ? 0 : (index * (trackWidth - width)) / (links.length - 1),
          trackWidth,
        );
      }
    }
    function down(event) {
      if (event.button !== 0) return;
      automatic = false;
      suppressClick = false;
      if (event.pointerType === 'mouse')
        drag = { id: event.pointerId, x: event.clientX, left: viewport.scrollLeft };
    }
    function move(event) {
      if (!drag || event.pointerId !== drag.id) return;
      const delta = event.clientX - drag.x;
      if (Math.abs(delta) > 4) suppressClick = true;
      if (suppressClick) {
        viewport.setPointerCapture(event.pointerId);
        viewport.scrollLeft = drag.left - delta;
        event.preventDefault();
      }
    }
    function up() {
      drag = null;
    }
    function wheel() {
      automatic = false;
    }
    function preventDrag(event) {
      event.preventDefault();
    }
    function dispose() {
      for (const [type, fn] of listeners) viewport.removeEventListener(type, fn);
      swiper?.off('slideChange', change);
      swiper?.off('beforeDestroy', dispose);
      animations.forEach((animation) => animation.cancel());
      copies.forEach((node) => node.remove());
      links.forEach((link) => {
        delete link.dataset.tdbStampIndex;
      });
      instances.delete(root);
    }
    const listeners = [
      ['click', choose],
      ['pointerdown', down],
      ['pointermove', move],
      ['pointerup', up],
      ['pointercancel', up],
      ['lostpointercapture', up],
      ['wheel', wheel],
      ['dragstart', preventDrag],
      ['scroll', normalize],
    ];
    listeners.forEach(([type, fn]) => on(type, fn));
    const controller = { measure, paint, dispose };
    instances.set(root, controller);
    return controller;
  }
  return { version: '1.0.0', prepare };
})();
