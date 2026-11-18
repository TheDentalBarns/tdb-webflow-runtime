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
function setup({ pendingImages = [] } = {}) {
  const dom = new JSDOM(
    `<section data-tdb-guide data-tdb-guide-cinema><span data-tdb-guide-treatment>Veneers</span><div class="tdb-cinema-track"><div class="tdb-cinema-stage"><div class="tdb-cinema-tabs"><nav>${Array.from({ length: 5 }, (_, i) => `<a data-tdb-guide-choice="${i}" href="#pane-${i}" ${i ? '' : 'class="w--current"'}>${i + 1}</a>`).join('')}</nav>${Array.from({ length: 5 }, (_, i) => `<div data-tdb-guide-panel="${i}" ${i ? '' : 'class="w--tab-active"'}><img class="tdb-cinema-image" src="https://example.org/fallback-${i}.webp" alt="Fallback"><h3 data-tdb-guide-title>Chapter ${i + 1}</h3><div data-tdb-guide-body>${i === 0 ? '<img src="https://example.org/camera-with-lens.webp" alt="CMS photo">' : ''}</div></div>`).join('')}</div><a data-tdb-cinema-next href="#end">Scroll to continue</a><a data-tdb-cinema-skip href="#end">Skip</a></div></div></section><section id="after">Following content</section>`,
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
    height = 800;
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
    const photo = w.document.createElement('div');
    photo.setAttribute('data-tdb-cinema-photo', String(index));
    image.setAttribute('data-swiper-parallax-x', '30%');
    const blur = w.document.createElement('div');
    blur.className = 'tdb-treatment-blur';
    photo.append(image, blur);
    rail.append(photo);
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
  });
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
  Object.defineProperty(stage, 'clientWidth', { value: 390 });
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
    y = top;
    w.dispatchEvent(new w.Event('scroll'));
  };
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
  assert.equal(t.root.querySelectorAll('[data-tdb-cinema-photo]')[1].style.visibility, 'visible');
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
  assert.equal(railMove.keyframes.at(-1).transform, 'translateX(-100%)');
  assert.equal(imageMove.keyframes.at(-1).transform, 'translateX(30%)');
  assert.equal(railMove.timing, imageMove.timing);
  assert.equal(
    t.root.querySelector('.tdb-cinema-media').style.getPropertyValue('--tdb-parallax-duration'),
    '500ms',
  );
  for (let i = 0; i < 5; i++) {
    const photo = t.root.querySelector('[data-tdb-cinema-photo="' + i + '"]');
    assert.equal(photo.style.transform, 'translateX(' + i * 100 + '%)');
    assert.equal(photo.style.visibility, 'visible');
    assert.equal(photo.querySelector('img').style.visibility, 'visible');
  }
  t.root.querySelector('[data-tdb-guide-choice="2"]').click();
  t.flush();
  assert.equal(railMove.cancelled, true);
  assert.equal(t.rail.style.transform, 'translateX(-200%)');
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
  assert.equal(t.rail.style.transform, 'translateX(0%)');
  t.resolveImage(1);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(t.root.dataset.tdbCinemaImageIndex, '3');
  assert.equal(t.rail.style.transform, 'translateX(-200%)');
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
test('numbers, keyboard and continuation remain aligned with scroll; Skip exits the entire track', () => {
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
  assert.match(t.root.querySelector('[data-tdb-cinema-next]').textContent, /Continue reading/);
  t.root.querySelector('[data-tdb-cinema-skip]').click();
  t.flush();
  assert.equal(t.y, 5000);
  assert.equal(t.chrome, 0);
  assert.equal(t.w.document.activeElement.id, 'after');
  t.close();
});
test('open drawers suspend chapters; CMS photography wins and lifecycle restores authored images', () => {
  const t = setup(),
    img = t.root.querySelector('.tdb-cinema-image');
  assert.match(img.src, /camera-with-lens/);
  assert.equal(img.alt, 'CMS photo');
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
  assert.match(img.src, /fallback-0/);
  assert.equal(img.getAttribute('style'), null);
  assert.equal(t.chrome, 0);
  assert.equal(t.destroyed, 1);
  t.scroll(1200);
  assert.equal(t.frames.size, 0);
  t.w.close();
});
