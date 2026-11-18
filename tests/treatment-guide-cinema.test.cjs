const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
test('Cinema presence selects only the Cinema controller', async () => {
  const dom = new JSDOM('<section data-tdb-guide data-tdb-guide-cinema></section>', {
    runScripts: 'outside-only',
  });
  const w = dom.window,
    requested = [];
  w.TDBFeatureLoading = { watchIntent() {} };
  w.TDBRuntimeModuleRoot = 'https://example.org/dist/';
  w.TDBModules = { load: async (url) => requested.push(new URL(url).pathname) };
  let mounted = 0;
  w.TDBTreatmentGuideCinema = {
    mount() {
      mounted++;
      return { destroy() {} };
    },
  };
  w.eval(fs.readFileSync('src/runtime/treatment-guide-loader.js', 'utf8'));
  w.prepareTreatmentGuideLoader();
  await w.TDBTreatmentGuideLoader.wheel(w.document.querySelector('section'));
  assert.equal(mounted, 1);
  assert.ok(requested.includes('/dist/tdb-treatment-guide-cinema.js'));
  assert.ok(
    requested.indexOf('/dist/tdb-slider-ui.css') <
      requested.indexOf('/dist/tdb-treatment-guide-cinema.js'),
  );
  assert.equal(
    requested.some((path) => /guide-(wheel|bar|drawer)\.js/.test(path)),
    false,
  );
  w.TDBTreatmentGuideLoader.destroy();
  w.close();
});
function setup({
  pendingImages = [],
  edgePreviews = false,
  nativeGap = 0,
  initialWidth = 390,
  roundScroll = false,
  nativeFallbackLayers = false,
} = {}) {
  const dom = new JSDOM(
    `<section data-tdb-guide data-tdb-guide-cinema><span data-tdb-guide-treatment>Veneers</span><div class="tdb-cinema-track"><div class="tdb-cinema-stage"><div class="tdb-cinema-tabs"><nav>${Array.from({ length: 5 }, (_, i) => `<a data-tdb-guide-choice="${i}" href="#pane-${i}" ${i ? '' : 'class="w--current"'}>${i + 1}</a>`).join('')}</nav>${Array.from({ length: 5 }, (_, i) => `<div data-tdb-guide-panel="${i}" ${i ? '' : 'class="w--tab-active"'}><img class="tdb-cinema-image" src="https://example.org/fallback-${i}.webp" alt="Fallback"><h3 data-tdb-guide-title>Chapter ${i + 1}</h3><div data-tdb-guide-body>${i === 0 ? '<img src="https://example.org/camera-with-lens.webp" alt="CMS photo">' : ''}</div></div>`).join('')}</div></div></div></section><section id="after">Following content</section>`,
    {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://example.org/treatments/veneers',
    },
  );
  const w = dom.window,
    root = w.document.querySelector('section'),
    track = root.querySelector('.tdb-cinema-track'),
    stage = root.querySelector('.tdb-cinema-stage');
  let y = 0,
    frames = new Map(),
    sequence = 0,
    chrome = 0,
    destroyed = 0,
    height = 800,
    width = initialWidth;
  const updates = [];
  const media = w.document.createElement('div');
  media.className = 'tdb-cinema-media';
  const parallax = w.document.createElement('div');
  parallax.setAttribute('data-tdb-cinema-parallax', '');
  media.append(parallax);
  const photoMoves = [],
    railMoves = [],
    pending = new Set(pendingImages),
    imageResolvers = new Map();
  const rail = w.document.createElement('div');
  rail.setAttribute('data-tdb-cinema-rail', '');
  parallax.append(rail);
  rail.getBoundingClientRect = () => ({ left: 0 });
  Object.defineProperty(rail, 'clientWidth', { get: () => width });
  rail.animate = (keyframes, timing) => {
    const record = { keyframes, timing, cancelled: false };
    railMoves.push(record);
    return {
      cancel() {
        record.cancelled = true;
      },
    };
  };
  root.querySelectorAll('.tdb-cinema-image').forEach((image, index) => {
    // Native Webflow output already contains the CMS image or component default.
    if (index === 0) {
      image.src = 'https://example.org/native-cms-camera.webp';
      image.alt = 'Native CMS photo';
    }
    const photo = w.document.createElement('div');
    photo.setAttribute('data-tdb-cinema-photo', String(index));
    image.setAttribute('data-swiper-parallax-x', '30%');
    const blur = w.document.createElement('div');
    blur.className = 'tdb-treatment-blur';
    photo.append(image, blur);
    rail.append(photo);
    photo.getBoundingClientRect = () => ({
      left: (index + (edgePreviews ? 1 : 0)) * (width + nativeGap),
    });
    Object.defineProperty(image, 'complete', { get: () => !pending.has(index) });
    Object.defineProperty(image, 'naturalWidth', { get: () => (pending.has(index) ? 0 : 800) });
    if (pending.has(index))
      image.decode = () =>
        pending.has(index)
          ? new Promise((resolve) =>
              imageResolvers.set(index, () => {
                pending.delete(index);
                resolve();
              }),
            )
          : Promise.resolve();
    for (const [kind, node] of [
      ['crop', photo],
      ['image', image],
    ])
      node.animate = (keyframes, timing) => {
        const record = { index, kind, keyframes, timing, cancelled: false };
        photoMoves.push(record);
        return {
          cancel() {
            record.cancelled = true;
          },
        };
      };
    if (nativeFallbackLayers) {
      const fallback = image.cloneNode();
      fallback.setAttribute('data-tdb-cinema-fallback', String(index));
      fallback.src = `https://example.org/underlay-${index}.webp`;
      Object.defineProperty(fallback, 'complete', { value: true });
      Object.defineProperty(fallback, 'naturalWidth', { value: 800 });
      fallback.animate = image.animate;
      photo.prepend(fallback);
      if (index === 1) {
        image.setAttribute('src', '');
      }
    }
  });
  if (edgePreviews) {
    for (const [index, position] of [
      [4, 0],
      [0, 6],
    ]) {
      const preview = w.document.createElement('div');
      preview.className = 'tdb-cinema-photo is-cinema-ready';
      preview.setAttribute('data-tdb-cinema-preview', String(index));
      preview.setAttribute('aria-hidden', 'true');
      preview.innerHTML = `<img class="tdb-cinema-image" src="https://example.org/${index === 0 ? 'native-cms-camera' : 'fallback-4'}.webp" alt=""><div class="tdb-treatment-blur"></div>`;
      preview.getBoundingClientRect = () => ({ left: position * (width + nativeGap) });
      const image = preview.querySelector('img');
      Object.defineProperty(image, 'complete', { value: true });
      Object.defineProperty(image, 'naturalWidth', { value: 800 });
      image.animate = () => ({ cancel() {} });
      if (nativeFallbackLayers) {
        const fallback = image.cloneNode();
        fallback.src = `https://example.org/edge-underlay-${index}.webp`;
        Object.defineProperty(fallback, 'complete', { value: true });
        Object.defineProperty(fallback, 'naturalWidth', { value: 800 });
        fallback.animate = image.animate;
        preview.prepend(fallback);
        if (index === 4) image.setAttribute('src', '');
      }
      if (position === 0) rail.prepend(preview);
      else rail.append(preview);
    }
  }
  stage.prepend(media);
  media.getBoundingClientRect = () => ({ height: height * 0.4 });
  const progress = w.document.createElement('div');
  const content = w.document.createElement('div');
  content.className = 'tdb-cinema-content';
  stage.append(content);
  progress.setAttribute('data-tdb-cinema-progress', '');
  stage.append(progress);
  const progressMoves = [];
  progress.animate = (keyframes, timing) => {
    const record = { keyframes, timing, cancelled: false };
    progressMoves.push(record);
    return {
      cancel() {
        record.cancelled = true;
      },
    };
  };
  Object.defineProperty(w, 'scrollY', { get: () => y });
  track.getBoundingClientRect = () => ({ top: 1000 - y, height: 4000 });
  stage.getBoundingClientRect = () => ({ top: 0, height });
  Object.defineProperty(stage, 'clientWidth', { get: () => width });
  w.requestAnimationFrame = (fn) => (frames.set(++sequence, fn), sequence);
  w.cancelAnimationFrame = (id) => frames.delete(id);
  w.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  w.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  };
  w.TDBMotion = { reduced: { matches: false }, duration: () => 500, easing: () => 'linear' };
  w.TDBScrollLock = { active: false };
  w.TDBSiteChrome = {
    acquire() {
      chrome++;
      return () => chrome--;
    },
  };
  w.TDBTreatmentGuideCard = {
    mount() {
      return {
        update(i) {
          updates.push(i);
        },
        destroy() {
          destroyed++;
        },
      };
    },
  };
  w.scrollTo = ({ top }) => {
    y = roundScroll ? Math.round(top) : top;
    w.dispatchEvent(new w.Event('scroll'));
  };
  w.eval(fs.readFileSync('src/treatment-guide/cinema-photos.js', 'utf8'));
  w.eval(fs.readFileSync('src/treatment-guide/cinema.js', 'utf8'));
  const api = w.TDBTreatmentGuideCinema.mount(root);
  const flush = () => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((fn) => fn());
  };
  const scroll = (top) => {
    y = top;
    w.dispatchEvent(new w.Event('scroll'));
    flush();
  };
  flush();
  return {
    w,
    root,
    track,
    stage,
    api,
    updates,
    flush,
    scroll,
    frames,
    parallax,
    progress,
    progressMoves,
    photoMoves,
    rail,
    railMoves,
    resolveImage(index) {
      imageResolvers.get(index)?.();
    },
    get y() {
      return y;
    },
    get chrome() {
      return chrome;
    },
    get destroyed() {
      return destroyed;
    },
    resize(h) {
      height = h;
      w.dispatchEvent(new w.Event('resize'));
      flush();
    },
    resizeWidth(value) {
      width = value;
      w.dispatchEvent(new w.Event('resize'));
      flush();
    },
    close() {
      api.destroy();
      w.close();
    },
  };
}
test('image entrance parallax stops at the pin and the underline uses shared travel motion', () => {
  const t = setup();
  t.scroll(600);
  assert.equal(t.parallax.style.transform, 'translateY(19.200px)');
  t.scroll(1002);
  assert.equal(t.parallax.style.transform, 'translateY(0.000px)');
  t.root.querySelector('[data-tdb-guide-choice="3"]').click();
  t.flush();
  assert.equal(t.parallax.style.transform, 'translateY(0.000px)');
  assert.equal(t.progress.style.transform, 'scaleX(0.600625)');
  assert.equal(t.progressMoves.at(-1).timing.duration, 500);
  assert.equal(t.progressMoves.at(-1).keyframes.at(-1).transform, 'scaleX(0.600625)');
  t.root.querySelector('[data-tdb-guide-choice="1"]').click();
  t.flush();
  assert.equal(t.progressMoves.at(-2).cancelled, true);
  assert.equal(t.progress.style.transform, 'scaleX(0.200625)');
  assert.equal(t.root.querySelectorAll('[data-tdb-cinema-photo]')[1].style.visibility, '');
  t.api.destroy();
  assert.equal(t.parallax.getAttribute('style'), null);
  assert.equal(t.progress.getAttribute('style'), null);
  assert.equal(t.frames.size, 0);
  t.w.close();
});

test('the progress line creeps during a reading beat before the next chapter snaps', () => {
  const t = setup();
  t.scroll(1320);
  assert.equal(t.root.dataset.tdbCinemaChapter, '1');
  assert.equal(t.progress.style.transform, 'scaleX(0.100000)');
  t.scroll(1600);
  assert.equal(t.root.dataset.tdbCinemaChapter, '1');
  assert.equal(t.progress.style.transform, 'scaleX(0.187500)');
  t.scroll(1640);
  assert.equal(t.root.dataset.tdbCinemaChapter, '2');
  assert.equal(t.progress.style.transform, 'scaleX(0.200000)');
  t.scroll(1320);
  assert.equal(t.progress.style.transform, 'scaleX(0.100000)');
  t.scroll(4200);
  assert.equal(t.progress.style.transform, 'scaleX(1.000000)');
  assert.equal(t.frames.size, 0);
  t.close();
});

test('one image strip retains complete coverage and shares the Services parallax and blur clocks', () => {
  const t = setup();
  t.root.querySelector('[data-tdb-guide-choice="1"]').click();
  t.flush();
  const railMove = t.railMoves.at(-1);
  const imageMove = t.photoMoves.find((m) => m.index === 0 && m.kind === 'image');
  assert.equal(railMove.keyframes.at(-1).transform, 'translateX(-390px)');
  assert.equal(imageMove.keyframes.at(-1).transform, 'translateX(30%)');
  assert.equal(railMove.timing, imageMove.timing);
  assert.equal(
    t.root.querySelector('.tdb-cinema-media').style.getPropertyValue('--tdb-parallax-duration'),
    '500ms',
  );
  for (let i = 0; i < 5; i++) {
    const photo = t.root.querySelector('[data-tdb-cinema-photo="' + i + '"]');
    assert.equal(photo.style.transform, '', 'native flow owns crop position');
    assert.equal(photo.classList.contains('is-cinema-ready'), false, 'native geometry needs no runtime class');
    assert.equal(photo.style.visibility, '', 'Designer owns photo visibility');
    assert.equal(photo.querySelector('img').style.visibility, '', 'Designer owns image visibility');
  }
  t.root.querySelector('[data-tdb-guide-choice="2"]').click();
  t.flush();
  assert.equal(railMove.cancelled, true);
  assert.equal(t.rail.style.transform, 'translateX(-780px)');
  assert.ok(t.root.querySelector('[data-tdb-cinema-photo="2"] .is-current'));
  t.api.destroy();
  assert.equal(t.rail.getAttribute('style'), null);
  assert.equal(t.root.querySelector('[data-tdb-cinema-photo]').getAttribute('style'), null);
  assert.equal(t.root.querySelector('.tdb-treatment-blur.is-current'), null);
  assert.equal(
    t.root.querySelector('.tdb-cinema-media').style.getPropertyValue('--tdb-parallax-duration'),
    '',
  );
  t.w.close();
});

test('a fast jump retains the current photograph until every crossed image can paint', async () => {
  const t = setup({ pendingImages: [1] });
  t.root.querySelector('[data-tdb-guide-choice="2"]').click();
  t.flush();
  assert.equal(t.root.dataset.tdbCinemaChapter, '3');
  assert.equal(t.root.dataset.tdbCinemaImageIndex, '1');
  assert.equal(t.rail.style.transform, 'translateX(0px)');
  t.resolveImage(1);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(t.root.dataset.tdbCinemaImageIndex, '3');
  assert.equal(t.rail.style.transform, 'translateX(-780px)');
  t.close();
});

test('resizing during travel cancels stale pixel matrices and restores the current crop', () => {
  const t = setup();
  t.root.querySelector('[data-tdb-guide-choice="4"]').click();
  t.flush();
  const moving = t.railMoves.at(-1);
  t.resizeWidth(1440);
  assert.equal(moving.cancelled, true);
  assert.equal(t.rail.style.transform, 'translateX(-5760px)');
  assert.equal(t.root.dataset.tdbCinemaImageIndex, '5');
  assert.equal(t.root.querySelector('[data-tdb-cinema-photo="4"]').style.transform, '');
  t.close();
});

test('native widths and gutters position the active photo between decorative edge previews', () => {
  const t = setup({ edgePreviews: true, nativeGap: 30, initialWidth: 900 });
  assert.equal(t.rail.style.transform, 'translateX(-930px)');
  assert.equal(t.rail.style.width, '', 'Designer owns container width');
  assert.equal(t.rail.style.columnGap, '', 'Designer owns the image gutter');
  const previews = [...t.root.querySelectorAll('[data-tdb-cinema-preview]')];
  assert.match(previews[1].querySelector('img').src, /native-cms-camera/);
  t.root.querySelector('[data-tdb-guide-choice="4"]').click();
  t.flush();
  assert.equal(t.rail.style.transform, 'translateX(-4650px)');
  assert.ok(previews.every((preview) => !preview.querySelector('.is-current')));
  t.resizeWidth(1000);
  assert.equal(t.rail.style.transform, 'translateX(-5150px)');
  t.api.destroy();
  assert.ok(previews.every((preview) => preview.classList.contains('is-cinema-ready')));
  assert.equal(
    t.root.querySelector('[data-tdb-cinema-photo]').classList.contains('is-cinema-ready'),
    false,
  );
  assert.match(previews[1].querySelector('img').src, /native-cms-camera/);
  t.w.close();
});

test('number-click progress survives rounded scroll events and yields to real scrolling', () => {
  const t = setup({ roundScroll: true });
  t.resize(801);
  t.root.querySelector('[data-tdb-guide-choice="3"]').click();
  t.flush();
  const first = t.progressMoves.at(-1);
  assert.equal(first.cancelled, false);
  t.scroll(t.y + 0.4);
  assert.equal(first.cancelled, false, 'subpixel settlement must not cut the animation short');
  t.root.querySelector('[data-tdb-guide-choice="1"]').click();
  t.flush();
  const second = t.progressMoves.at(-1);
  assert.equal(first.cancelled, true);
  assert.equal(second.cancelled, false, 'a second click retargets the line');
  t.scroll(t.y + 40);
  assert.equal(second.cancelled, true, 'native scrolling resumes continuous progress');
  t.close();
});

test('site chrome leaves at image entry and remains away until the section exits', () => {
  const t = setup();
  t.scroll(100);
  assert.equal(t.chrome, 0);
  t.scroll(300);
  assert.equal(t.chrome, 1, 'the image is entering, before the pin');
  t.scroll(4500);
  assert.equal(t.chrome, 1, 'keep chrome away while the stage exits');
  t.scroll(5001);
  assert.equal(t.chrome, 0);
  t.close();
});

test('native vertical position reaches every chapter, holds the fifth, and supports reversal', () => {
  const t = setup();
  for (let i = 0; i < 5; i++) {
    t.scroll(1000 + i * 640 + 2);
    assert.equal(t.root.dataset.tdbCinemaChapter, String(i + 1));
  }
  t.scroll(4180);
  assert.equal(t.root.dataset.tdbCinemaChapter, '5');
  t.scroll(1642);
  assert.equal(t.root.dataset.tdbCinemaChapter, '2');
  assert.equal(t.chrome, 1);
  assert.equal(t.frames.size, 0, 'no idle animation loop');
  t.close();
});

test('changing chapter returns short-screen copy to its heading without resetting idle reading', () => {
  const t = setup();
  const content = t.root.querySelector('.tdb-cinema-content');
  t.scroll(1002);
  content.scrollTop = 100;
  t.scroll(1100);
  assert.equal(content.scrollTop, 100);
  t.root.querySelector('[data-tdb-guide-choice="1"]').click();
  t.flush();
  assert.equal(content.scrollTop, 0);
  content.scrollTop = 80;
  t.scroll(1002);
  assert.equal(content.scrollTop, 0);
  t.close();
});
test('numbers and keyboard remain aligned with native scroll', () => {
  const t = setup(),
    choices = [...t.root.querySelectorAll('[data-tdb-guide-choice]')];
  choices[3].click();
  t.flush();
  assert.equal(t.root.dataset.tdbCinemaChapter, '4');
  assert.equal(t.y, 2922);
  choices[3].dispatchEvent(
    new t.w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
  );
  t.flush();
  assert.equal(t.root.dataset.tdbCinemaChapter, '5');
  assert.equal(t.w.document.activeElement, choices[4]);
  t.close();
});
test('empty native CMS slots animate their Designer underlay without rewriting image URLs', () => {
  const t = setup({ nativeFallbackLayers: true, edgePreviews: true });
  const first = t.root.querySelector('[data-tdb-cinema-photo="0"]');
  const second = t.root.querySelector('[data-tdb-cinema-photo="1"]');
  assert.equal(first.querySelector('[data-tdb-cinema-fallback]').style.transform, '');
  assert.equal(
    first.querySelector('img:not([data-tdb-cinema-fallback])').style.transform,
    'translateX(0%)',
  );
  t.root.querySelector('[data-tdb-guide-choice="1"]').click();
  assert.equal(t.root.dataset.tdbCinemaImageIndex, '2');
  assert.equal(
    second.querySelector('[data-tdb-cinema-fallback]').style.transform,
    'translateX(0%)',
  );
  assert.equal(second.querySelector('img:not([data-tdb-cinema-fallback])').getAttribute('src'), '');
  assert.match(second.querySelector('[data-tdb-cinema-fallback]').src, /underlay-1/);
  const previews = t.root.querySelectorAll('[data-tdb-cinema-preview]');
  assert.notEqual(previews[0].querySelector('img').style.transform, '');
  assert.equal(previews[1].querySelector('img').style.transform, '');
  assert.notEqual(previews[1].querySelectorAll('img')[1].style.transform, '');
  t.close();
});

test('open drawers suspend chapters; native CMS images survive lifecycle without rich-text substitution', () => {
  const t = setup(),
    img = t.root.querySelector('.tdb-cinema-image');
  assert.match(img.src, /native-cms-camera/);
  assert.equal(img.alt, 'Native CMS photo');
  assert.match(t.root.querySelector('[data-tdb-guide-body] img').src, /camera-with-lens/);
  assert.match(t.root.querySelector('[data-tdb-cinema-photo="1"] img').src, /fallback-1/);
  assert.equal(img.style.objectFit, '', 'leave image fitting to Designer');
  t.scroll(1002);
  t.w.TDBScrollLock.active = true;
  t.scroll(3000);
  assert.equal(t.root.dataset.tdbCinemaChapter, '1');
  t.root.querySelector('[data-tdb-guide-choice="4"]').click();
  assert.equal(t.y, 3000);
  t.w.TDBScrollLock.active = false;
  t.scroll(3000);
  assert.equal(t.root.dataset.tdbCinemaChapter, '4');
  t.api.destroy();
  assert.match(img.src, /native-cms-camera/);
  assert.equal(img.getAttribute('style'), null);
  assert.equal(t.chrome, 0);
  assert.equal(t.destroyed, 1);
  t.scroll(1200);
  assert.equal(t.frames.size, 0);
  t.w.close();
});
