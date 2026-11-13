const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

function fixture(file, scoped = true) {
  const dom = new JSDOM(
    `<main ${scoped ? 'data-tdb-parallax-scope' : ''}>
    <header data-tdb-page-break data-tdb-parallax-mode="opacity"
      data-tdb-parallax-fade-curve="0:1,0.5:1,0.85:0,1:0"
      data-tdb-parallax-fade-selector=".logo" data-tdb-parallax-fade-to="0.25">
      <img class="logo" style="opacity:1">
    </header><footer><img class="logo" style="opacity:1"></footer>
    </main><img class="logo outside" style="opacity:0.6">
    <div data-tdb-motion-enter="1000" style="opacity:0"></div>`,
    { runScripts: 'outside-only', pretendToBeVisual: true },
  );
  const w = dom.window,
    queue = new Map(),
    animations = [];
  let sequence = 0;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  w.requestAnimationFrame = (cb) => {
    queue.set(++sequence, cb);
    return sequence;
  };
  w.cancelAnimationFrame = (id) => queue.delete(id);
  w.innerHeight = 1000;
  Object.defineProperty(w.document.documentElement, 'scrollHeight', { value: 10000 });
  const wrapper = w.document.querySelector('header');
  wrapper.getBoundingClientRect = () => ({
    top: -w.scrollY,
    bottom: 1000 - w.scrollY,
    height: 1000,
    width: 1000,
    left: 0,
    right: 1000,
  });
  const entry = w.document.querySelector('[data-tdb-motion-enter]');
  entry.animate = (frames, options) => {
    const a = { frames, options, cancel() {} };
    animations.push(a);
    return a;
  };
  w.eval(fs.readFileSync(file, 'utf8'));
  const flush = () => {
    const jobs = [...queue.values()];
    queue.clear();
    jobs.forEach((cb) => cb());
  };
  const scroll = (y) => {
    w.dispatchEvent(new w.Event('wheel'));
    w.scrollY = y;
    w.dispatchEvent(new w.Event('scroll'));
    flush();
  };
  return { dom, w, wrapper, flush, scroll, animations, entry };
}

for (const file of [
  'src/shared/motion.js',
  'dist/tdb-motion.js',
  'dist/tdb-motion-standalone.js',
]) {
  test(`${file}: coupled logo fade keeps its original curve and explicit page scope`, () => {
    const e = fixture(file),
      logos = [...e.w.document.querySelectorAll('main .logo')];
    const owner = e.w.TDBMotion.pageBreaks([e.wrapper]);
    e.flush();
    assert.ok(logos.every((n) => n.style.opacity === '1'));
    e.scroll(350);
    assert.ok(logos.every((n) => Math.abs(+n.style.opacity - 0.625) < 0.001));
    e.scroll(700);
    assert.ok(logos.every((n) => n.style.opacity === '0.25'));
    assert.equal(e.w.document.querySelector('.outside').style.opacity, '0.6');
    assert.equal(e.wrapper.style.transform, '', 'opacity-only motion does not move the layout');
    owner.destroy();
    assert.ok(logos.every((n) => n.style.opacity === '1'));
    e.dom.window.close();
  });
  test(`${file}: a selector without an explicit scope cannot acquire other page nodes`, () => {
    const e = fixture(file, false),
      owner = e.w.TDBMotion.pageBreaks([e.wrapper]);
    e.flush();
    e.scroll(700);
    assert.ok(
      [...e.w.document.querySelectorAll('main .logo')].every((n) => n.style.opacity === '1'),
    );
    owner.destroy();
    e.dom.window.close();
  });
}

test('standalone entry retains authored start opacity and runs once through the shared fade controller', () => {
  const e = fixture('dist/tdb-motion-standalone.js');
  e.w.document.dispatchEvent(new e.w.Event('DOMContentLoaded'));
  assert.equal(e.animations.length, 1);
  assert.equal(e.animations[0].frames[0].opacity, 0);
  assert.equal(e.animations[0].frames[1].opacity, 1);
  assert.equal(e.animations[0].options.duration, e.w.TDBMotion.time(1000));
  assert.equal(e.entry.style.opacity, '1');
  e.w.document.dispatchEvent(new e.w.Event('DOMContentLoaded'));
  assert.equal(e.animations.length, 1);
  e.dom.window.close();
});
