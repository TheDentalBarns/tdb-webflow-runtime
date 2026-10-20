const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('src/shared/motion.js', 'utf8');

function setup() {
  const dom = new JSDOM(
    '<section><div class="frame"><img class="photo" style="transform:translateX(30%)"><img class="photo" style="transform:translateX(-30%)"></div></section>',
    {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    },
  );
  const w = dom.window,
    queue = new Map();
  let sequence = 0;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  w.requestAnimationFrame = (cb) => {
    queue.set(++sequence, cb);
    return sequence;
  };
  w.cancelAnimationFrame = (id) => queue.delete(id);
  w.innerHeight = 900;
  const wrapper = w.document.querySelector('section');
  const frame = w.document.querySelector('.frame');
  const rect = (top, height) => ({
    top,
    bottom: top + height,
    left: 0,
    right: 1000,
    width: 1000,
    height,
  });
  wrapper.getBoundingClientRect = () => rect(500 - w.scrollY, 1400);
  frame.getBoundingClientRect = () => rect(Math.max(0, 500 - w.scrollY), 600);
  const prepare = (node) => {
    node.getBoundingClientRect = () =>
      rect(
        frame.getBoundingClientRect().top -
          30 +
          (parseFloat(node.style.translate.split(' ')[1]) || 0),
        660,
      );
  };
  wrapper.querySelectorAll('img').forEach(prepare);
  w.eval(source);
  const flush = () => {
    const callbacks = [...queue.values()];
    queue.clear();
    callbacks.forEach((cb) => cb());
  };
  const scroll = (y) => {
    w.dispatchEvent(new w.Event('wheel'));
    w.scrollY = y;
    w.dispatchEvent(new w.Event('scroll'));
    flush();
  };
  return { w, dom, wrapper, frame, prepare, flush, scroll, queue };
}

test('vertical motion preserves horizontal transforms, stays within the crop and leaves controls alone', () => {
  const e = setup(),
    photos = [...e.wrapper.querySelectorAll('img')];
  const transforms = photos.map((n) => n.style.transform);
  const owner = e.w.TDBMotion.pageBreaks([
    { wrapper: e.wrapper, selector: '.photo', frame: '.frame' },
  ]);
  e.scroll(200);
  e.scroll(400);
  e.scroll(600);
  assert.notEqual(parseFloat(photos[0].style.translate.split(' ')[1]), 0);
  assert.deepEqual(
    photos.map((n) => n.style.transform),
    transforms,
  );
  assert.equal(photos[0].style.translate, photos[1].style.translate);
  assert.equal(e.frame.style.translate, '');
  assert.ok(Math.abs(owner.status()[0].y) <= 18);
  assert.equal(e.queue.size, 0, 'no perpetual animation loop');
  owner.destroy();
  assert.ok(photos.every((n) => n.style.translate === ''));
  assert.deepEqual(
    photos.map((n) => n.style.transform),
    transforms,
  );
  e.dom.window.close();
});

test('refresh includes new loop clones and releases detached images without accumulating owners', () => {
  const e = setup(),
    input = { wrapper: e.wrapper, selector: '.photo', frame: '.frame' };
  const owner = e.w.TDBMotion.pageBreaks([input]);
  e.scroll(300);
  const original = e.wrapper.querySelector('img'),
    clone = original.cloneNode();
  e.prepare(clone);
  e.frame.append(clone);
  owner.refresh();
  e.flush();
  e.scroll(500);
  assert.equal(clone.style.translate, original.style.translate);
  assert.equal(owner.status().length, 1);
  original.remove();
  owner.refresh();
  e.flush();
  assert.equal(original.style.translate, '');
  owner.destroy();
  e.dom.window.close();
});

test('a sticky image uses section progress while respecting its separate crop frame', () => {
  const e = setup();
  const owner = e.w.TDBMotion.pageBreaks([
    { wrapper: e.wrapper, selector: '.photo', frame: '.frame' },
  ]);
  e.scroll(600);
  const first = owner.status()[0].y;
  e.scroll(900);
  const next = owner.status()[0].y;
  assert.notEqual(first, next);
  for (const node of e.wrapper.querySelectorAll('img')) {
    const image = node.getBoundingClientRect(),
      crop = e.frame.getBoundingClientRect();
    assert.ok(image.top <= crop.top && image.bottom >= crop.bottom);
  }
  owner.destroy();
  e.dom.window.close();
});

test('Home discovery includes its photo surfaces but excludes all three feeds and other pages', async () => {
  const markup =
    '<div class="tdb-service-parallax"><div class="swiper"><img class="showcase_image"></div></div><div class="section_smile-gallery"><img></div><div data-tdb-review-cards><img></div><div class="tdb-home-awards-ig"><img></div>';
  for (const home of [true, false]) {
    const dom = new JSDOM(markup, { runScripts: 'outside-only' }),
      w = dom.window,
      groups = [];
    if (home) w.document.body.setAttribute('data-tdb-home-photo-parallax', '');
    w.TDBModules = { load: () => Promise.resolve() };
    w.TDBMotion = {
      pageBreaks: (nodes) => {
        groups.push(nodes);
        return {
          refresh() {},
          destroy() {},
          status() {
            return [];
          },
        };
      },
    };
    w.eval(
      "const TDBRuntimeModuleRoot=new URL('https://example.com/dist/');\n" +
        fs.readFileSync('src/runtime/page-break-loader.js', 'utf8') +
        '\npreparePageBreakLoader();',
    );
    await w.TDBPageBreaks.refresh();
    assert.equal(groups.length, home ? 1 : 0);
    if (home) {
      assert.equal(groups[0].length, 1);
      assert.equal(groups[0][0].selector, '.showcase_image');
    }
    w.TDBPageBreaks.destroy();
    dom.window.close();
  }
});
