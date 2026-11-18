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
  assert.equal(
    requested.some((path) => /guide-(wheel|bar|drawer)\.js/.test(path)),
    false,
  );
  w.TDBTreatmentGuideLoader.destroy();
  w.close();
});
function setup() {
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
