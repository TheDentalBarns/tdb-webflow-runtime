/* Designer owns CMS image bindings, fallback photos, widths, gaps and crops.
 * This controller decodes and animates the native strip with the shared carousel clock. */
window.TDBTreatmentGuideCinemaPhotos ||= (() => {
  const clamp = (value) => Math.max(-1, Math.min(1, value));
  // An empty CMS binding leaves its authored fallback underlay in place.
  const nativeImage = (frame) =>
    [...frame.querySelectorAll('.tdb-cinema-image')]
      .reverse()
      .find(
        (image) =>
          image.getAttribute('src')?.trim() && !image.classList.contains('w-dyn-bind-empty'),
      );
  function mount(root, initial) {
    const rail = root.querySelector('[data-tdb-cinema-rail]');
    const media = root.querySelector('.tdb-cinema-media');
    const photos = [...root.querySelectorAll('[data-tdb-cinema-photo]')];
    const panes = [...root.querySelectorAll('[data-tdb-guide-panel]')];
    const frames = [...rail.children].filter((node) =>
      node.matches('[data-tdb-cinema-photo], [data-tdb-cinema-preview]'),
    );
    if (photos.length !== 5 || panes.length !== 5) throw Error('Cinema native photos missing');
    const images = photos.map(nativeImage);
    const frameImages = frames.map(nativeImage);
    if (frameImages.some((image) => !image)) throw Error('Cinema native image missing');
    const blurs = frames.map((frame) => frame.querySelector('.tdb-treatment-blur'));
    const motion = window.TDBMotion;
    const events = new AbortController();
    const saved = [rail, ...frames, ...frameImages, ...blurs.filter(Boolean)].map((node) => [
      node,
      ['style', 'class', 'src', 'srcset', 'sizes', 'alt', 'loading'].map((name) => [
        name,
        node.getAttribute(name),
      ]),
    ]);
    const clockBefore = media.style.getPropertyValue('--tdb-parallax-duration');
    const clockPriority = media.style.getPropertyPriority('--tdb-parallax-duration');
    const previews = frames
      .filter((frame) => frame.hasAttribute('data-tdb-cinema-preview'))
      .map((frame) => ({
        index: Number(frame.dataset.tdbCinemaPreview),
        image: nativeImage(frame),
      }));
    let active = initial,
      request = 0,
      disposed = false,
      geometry = '',
      offsets = [],
      animations = [];
    const jobs = [],
      decoded = [];
    const ready = (image) => image.complete && image.naturalWidth > 0;
    const decode = (image) => {
      if (image.decode) return image.decode();
      if (ready(image)) return Promise.resolve();
      return new Promise((resolve, reject) => {
        image.addEventListener('load', resolve, { once: true, signal: events.signal });
        image.addEventListener('error', reject, { once: true, signal: events.signal });
      });
    };
    frameImages.forEach((image) => {
      image.loading = 'eager';
    });
    function load(index) {
      if (decoded[index]) return Promise.resolve(true);
      if (jobs[index]) return jobs[index];
      const image = images[index];
      const mirrors = previews.filter((preview) => preview.index === index).map((p) => p.image);
      if ([image, ...mirrors].every((node) => ready(node) && !node.decode)) {
        decoded[index] = true;
        return Promise.resolve(true);
      }
      jobs[index] = Promise.all([image, ...mirrors].map(decode))
        .then(() => {
          if (disposed) return false;
          return (decoded[index] = [image, ...mirrors].every(ready));
        })
        .catch(() => false);
      return jobs[index];
    }
    function travel(index, animate) {
      const from = getComputedStyle(rail).transform || 'none';
      const imageFrom = frameImages.map((image) => getComputedStyle(image).transform || 'none');
      animations.forEach((animation) => animation.cancel());
      animations = [];
      const timing = {
        duration: motion.duration(rail.clientWidth),
        easing: motion.easing('travel', 'cubic-bezier(.3,0,.2,1)'),
      };
      const targetFrame = frames.indexOf(photos[index]);
      const target = `translateX(${-offsets[targetFrame]}px)`;
      rail.style.transform = target;
      const moving = animate && !motion.reduced.matches && rail.animate;
      if (moving)
        animations.push(rail.animate([{ transform: from }, { transform: target }], timing));
      frameImages.forEach((image, i) => {
        const amount = parseFloat(image.getAttribute('data-swiper-parallax-x')) || 30;
        const target = `translateX(${clamp(targetFrame - i) * amount}%)`;
        image.style.transform = target;
        if (moving)
          animations.push(
            image.animate([{ transform: imageFrom[i] }, { transform: target }], timing),
          );
        blurs[i]?.classList.toggle('is-current', frames[i] === photos[index]);
      });
      active = index;
      root.dataset.tdbCinemaImageIndex = String(index + 1);
    }
    function measure() {
      const left = rail.getBoundingClientRect().left;
      offsets = frames.map((frame) => frame.getBoundingClientRect().left - left);
      const next = [rail.clientWidth, ...offsets].map((value) => value.toFixed(3)).join(',');
      media.style.setProperty('--tdb-parallax-duration', motion.duration(rail.clientWidth) + 'ms');
      // Never continue an old pixel matrix after the native width/gap changes.
      if (geometry && next !== geometry) travel(active, false);
      geometry = next;
    }
    frames.forEach((frame, index) => {
      frame.classList.add('is-cinema-ready');
      frame.style.visibility = 'visible';
      frameImages[index].style.visibility = 'visible';
      if (blurs[index]) blurs[index].style.visibility = 'visible';
    });
    measure();
    travel(initial, false);
    images.forEach((image, index) => load(index));
    return {
      measure,
      select(index, animate) {
        const generation = ++request;
        const crossed = Array.from(
          { length: Math.abs(index - active) + 1 },
          (_, n) => Math.min(index, active) + n,
        );
        // Include both visible edge previews before moving the image strip.
        const needed = [...new Set([...crossed, (index + 4) % 5, (index + 1) % 5])];
        if (needed.every((i) => decoded[i])) return travel(index, animate);
        Promise.all(needed.map(load)).then((ready) => {
          if (!disposed && generation === request && ready.every(Boolean)) travel(index, animate);
        });
      },
      destroy() {
        disposed = true;
        events.abort();
        animations.forEach((animation) => animation.cancel());
        for (const [node, attributes] of saved)
          for (const [name, value] of attributes)
            if (value == null) node.removeAttribute(name);
            else node.setAttribute(name, value);
        if (clockBefore)
          media.style.setProperty('--tdb-parallax-duration', clockBefore, clockPriority);
        else media.style.removeProperty('--tdb-parallax-duration');
        delete root.dataset.tdbCinemaImageIndex;
      },
    };
  }
  return Object.freeze({ mount });
})();
