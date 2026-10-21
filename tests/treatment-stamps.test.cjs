const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

function fixture(count = 6) {
  const dom = new JSDOM(
    `<section data-tdb-treatment-postage>
    <div class="swiper">${Array.from({ length: count }, (_, i) => `<div data-swiper-slide-index="${i}"><h3 class="tdb-treatment-title">Treatment ${i}</h3></div>`).join('')}</div><div data-tdb-native-progress></div>
    <div data-tdb-treatment-stamps><div class="tdb-treatment-controls">
    ${Array.from(
      { length: count },
      (_, i) => `<div class="tdb-treatment-card"><a
    data-tdb-treatment-stamp href="/treatments/${i}">Treatment ${i}</a></div>`,
    ).join('')}
    </div></div></section>`,
    { runScripts: 'outside-only', url: 'https://example.test' },
  );
  const w = dom.window,
    root = w.document.querySelector('section');
  const viewport = root.querySelector('.tdb-treatment-controls');
  const items = [...root.querySelectorAll('.tdb-treatment-card')];
  const links = [...root.querySelectorAll('a')],
    listeners = {};
  w.Element.prototype.animate = function (frames) {
    this.dataset.finalOpacity = frames.at(-1).opacity;
    this.dataset.finalColor = frames.at(-1).color;
    return { cancel() {} };
  };
  items.forEach(
    (item, i) =>
      (item.getBoundingClientRect = () => ({
        left: 50 + i * 220 - viewport.scrollLeft,
        width: 200,
      })),
  );
  root.querySelector('[data-tdb-native-progress]').getBoundingClientRect = () => ({ width: 800 });
  const swiper = (root.querySelector('.swiper').swiper = {
    slides: [...root.querySelector('.swiper').children],
    realIndex: 0,
    animating: false,
    on(events, callback) {
      for (const name of events.split(' ')) (listeners[name] ||= []).push(callback);
    },
    slideToLoop(index) {
      this.realIndex = index;
      listeners.slideChange?.forEach((fn) => fn());
    },
  });
  w.eval(fs.readFileSync('src/sliders/treatment-stamps.js', 'utf8'));
  const controller = w.TDBTreatmentStamps.prepare(root);
  return { dom, w, root, viewport, items, links, swiper, controller };
}
test('native stamps align first, intermediate and last positions with the progress marker', () => {
  const f = fixture();
  try {
    assert.equal(f.controller.measure(), 200);
    for (const i of [0, 2, 5]) {
      f.swiper.slideToLoop(i);
      const marker = (i * 600) / 5;
      f.controller.paint(i, marker, 800);
      assert.equal(f.items[i].getBoundingClientRect().left, 50 + marker);
      assert.equal(f.links[i].getAttribute('aria-current'), 'true');
      assert.equal(f.links.filter((l) => l.hasAttribute('aria-current')).length, 1);
      assert.deepEqual(
        f.swiper.slides.map((s) => s.querySelector('h3').dataset.finalColor),
        Array.from({ length: 6 }, (_, index) =>
          index === i ? '#ffffff' : 'rgba(255,255,255,0.5)',
        ),
      );
    }
  } finally {
    f.dom.window.close();
  }
});
test('manual scroll does not select an image or get pulled back by progress; click resumes alignment', () => {
  const f = fixture();
  try {
    f.controller.measure();
    f.swiper.slideToLoop(5);
    f.controller.paint(5, 600, 800);
    f.viewport.dispatchEvent(new f.w.Event('wheel'));
    f.viewport.scrollLeft = 100;
    f.controller.paint(5, 600, 800);
    assert.equal(f.viewport.scrollLeft, 100);
    assert.equal(f.swiper.realIndex, 5);
    f.links[0].click();
    assert.equal(f.swiper.realIndex, 0);
    assert.equal(f.viewport.scrollLeft, 0);
  } finally {
    f.dom.window.close();
  }
});
test('CMS navigation leaves modified clicks and unenhanced links usable', () => {
  const f = fixture();
  try {
    const click = new f.w.MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    f.links[2].dispatchEvent(click);
    assert.equal(click.defaultPrevented, false);
    assert.equal(f.swiper.realIndex, 0);
    f.root.removeAttribute('data-tdb-treatment-postage');
    assert.equal(f.w.TDBTreatmentStamps.prepare(f.root), null);
  } finally {
    f.dom.window.close();
  }
});
test('single CMS treatment and loop seam produce finite scroll positions', () => {
  for (const count of [1, 6]) {
    const f = fixture(count);
    try {
      f.controller.measure();
      f.controller.paint(count - 0.5, 750, 800);
      assert.ok(Number.isFinite(f.viewport.scrollLeft));
      assert.ok(f.viewport.scrollLeft >= 0);
    } finally {
      f.dom.window.close();
    }
  }
});
