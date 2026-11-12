const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

function fixture(withLocation = false, withCategory = false) {
  const slot = (attr, value = '') =>
    `<span ${attr}><span class="tdb-smile-fact-value">${value}</span><span class="tdb-smile-fact-value" aria-hidden="true"></span></span>`;
  const dom = new JSDOM(
    `<section data-tdb-treatment-layout>
    <div data-tdb-treatment-postage><div class="swiper"><div class="swiper-wrapper">
      <article><h3 class="tdb-treatment-title">Treatment B</h3><a data-tdb-treatment-price-source="4195" data-tdb-treatment-duration-source="6–18 months" data-tdb-treatment-location-source="Unit 4"></a><p hidden data-tdb-treatment-category-source>Patient comfort</p></article>
      <article><h3 class="tdb-treatment-title">Treatment A</h3><a data-tdb-treatment-price-source="£995" data-tdb-treatment-duration-source="Several weeks" data-tdb-treatment-location-source="The Cottage"></a><p hidden data-tdb-treatment-category-source>Diagnostics</p></article>
      <article><h3 class="tdb-treatment-title">Treatment C</h3><a data-tdb-treatment-price-source="" data-tdb-treatment-duration-source=""></a></article>
    </div></div><div data-tdb-treatment-position><span data-tdb-treatment-current>01</span><span data-tdb-treatment-total>06</span></div></div>
    <div data-tdb-treatment-facts><img alt="" src="price.svg">${slot('data-tdb-treatment-price')}<img alt="" src="clock.svg">${slot('data-tdb-treatment-duration')}</div>
    ${withLocation ? `<div data-tdb-partner-facts><span data-tdb-journey-icon="barn"></span>${slot('data-tdb-treatment-location', 'Unit 4')}</div>` : ''}
    ${withCategory ? `<div data-tdb-treatment-facts><img data-tdb-treatment-category-icon alt="">${slot('data-tdb-treatment-category')}</div>` : ''}
  </section>`,
    { runScripts: 'outside-only', url: 'https://example.test/' },
  );
  const w = dom.window;
  const media = { matches: true, addEventListener() {}, removeEventListener() {} };
  w.matchMedia = () => media;
  w.TDBMotion = {
    reduced: { matches: false, addEventListener() {}, removeEventListener() {} },
    defaults: { ticker: 400 },
  };
  const animations = [];
  w.Element.prototype.animate = function (frames, options) {
    const animation = {
      node: this,
      frames,
      options,
      cancel() {
        this.cancelled = true;
      },
    };
    animations.push(animation);
    return animation;
  };
  const events = {};
  const swiper = (w.document.querySelector('.swiper').swiper = {
    slides: [...w.document.querySelector('.swiper-wrapper').children],
    realIndex: 0,
    params: { loop: false },
    on(name, fn) {
      (events[name] ||= new Set()).add(fn);
    },
    off(name, fn) {
      events[name]?.delete(fn);
    },
  });
  w.eval(fs.readFileSync('src/shared/native-ticker.js', 'utf8'));
  w.eval(fs.readFileSync('src/sliders/treatment-ticker.js', 'utf8'));
  const controller = w.TDBTreatmentTicker.prepare(
    w.document.querySelector('[data-tdb-treatment-postage]'),
  );
  const value = (attr) =>
    w.document.querySelector(`[data-tdb-treatment-${attr}]`).firstElementChild.textContent;
  function select(index) {
    swiper.realIndex = index;
    events.slideChange.forEach((fn) => fn());
  }
  function finish() {
    for (const a of animations) if (!a.cancelled) a.onfinish?.();
  }
  return { dom, w, media, swiper, events, animations, controller, value, select, finish };
}

test('treatment values come from each rendered CMS item, including CMS reordering and missing facts', () => {
  const f = fixture();
  try {
    assert.equal(f.value('price'), 'From £4,195');
    assert.equal(f.value('duration'), '6–18 months');
    assert.equal(f.w.document.querySelector('[data-tdb-treatment-total]').textContent, '03');
    f.select(1);
    f.finish();
    assert.equal(f.value('price'), 'From £995');
    assert.equal(f.value('duration'), 'Several weeks');
    f.select(2);
    f.finish();
    assert.equal(
      f.value('price'),
      '',
      'missing CMS fields never retain a different treatment’s price',
    );
    assert.equal(f.value('duration'), '');
  } finally {
    f.dom.window.close();
  }
});

test('optional partner location follows CMS slide order without stale labels or additional treatment slots', () => {
  const f = fixture(true);
  try {
    const icon = f.w.document.querySelector('[data-tdb-journey-icon]');
    const label = f.w.document.querySelector('[data-tdb-treatment-location]').firstElementChild;
    assert.equal(f.value('location'), 'Unit 4');
    f.select(1);
    f.finish();
    assert.equal(f.value('location'), 'The Cottage');
    f.select(2);
    f.finish();
    assert.equal(
      f.value('location'),
      '',
      'missing location cannot retain the previous partner unit',
    );
    f.select(0);
    f.select(1);
    f.select(0);
    f.finish();
    assert.equal(f.value('location'), 'Unit 4');
    assert.equal(
      f.w.document.querySelector('[data-tdb-treatment-location]').firstElementChild,
      label,
    );
    assert.equal(f.w.document.querySelector('[data-tdb-journey-icon]'), icon);
    assert.equal(f.value('price'), 'From £4,195');
  } finally {
    f.dom.window.close();
  }
  const home = fixture();
  try {
    assert.equal(home.w.document.querySelector('[data-tdb-treatment-location]'), null);
    assert.equal(home.value('price'), 'From £4,195');
  } finally {
    home.dom.window.close();
  }
});

test('technology category follows native CMS text, rapid selection and empty fields', () => {
  const f = fixture(false, true);
  try {
    assert.equal(f.value('category'), 'Patient comfort');
    const icon = f.w.document.querySelector('[data-tdb-treatment-category-icon]');
    assert.match(icon.src, /lotus-small/);
    f.select(1);
    f.finish();
    assert.equal(f.value('category'), 'Diagnostics');
    assert.match(icon.src, /diagnostics-small/);
    f.select(2);
    f.finish();
    assert.equal(
      f.value('category'),
      '',
      'missing category must not retain a previous technology label',
    );
    assert.equal(icon.hidden, true, 'unknown categories must not show a stale icon');
    f.select(0);
    f.select(1);
    f.finish();
    assert.equal(f.value('category'), 'Diagnostics');
  } finally {
    f.dom.window.close();
  }
});

test('rapid treatment selection animates only values, retains native nodes/icons, and settles latest selection', () => {
  const f = fixture();
  try {
    const icons = [...f.w.document.querySelectorAll('img')];
    const headings = [...f.w.document.querySelectorAll('h3')].map((e) => e.outerHTML);
    const value = f.w.document.querySelector('[data-tdb-treatment-price]').firstElementChild;
    f.select(1);
    f.select(2);
    f.select(0);
    f.finish();
    assert.equal(f.value('price'), 'From £4,195');
    assert.deepEqual(
      [...f.w.document.querySelectorAll('h3')].map((e) => e.outerHTML),
      headings,
      'CMS titles remain owned by the existing horizontal slider',
    );
    assert.equal(f.w.document.querySelector('[data-tdb-treatment-price]').firstElementChild, value);
    assert.deepEqual([...f.w.document.querySelectorAll('img')], icons);
    assert.ok(f.animations.every((a) => a.node.tagName === 'SPAN'));
    const before = f.animations.length;
    for (let i = 0; i < 30; i++) f.controller.sync();
    assert.equal(f.animations.length, before, 'progress frames do not restart tickers');
    f.select(1);
    f.finish();
    f.select(0);
    assert.equal(f.animations.at(-1).frames[0].transform, 'translateY(-100%)');
  } finally {
    f.dom.window.close();
  }
});

test('changed category artwork ticks with its label and unchanged artwork stays still', () => {
  const f = fixture(false, true);
  try {
    const icon = f.w.document.querySelector('[data-tdb-treatment-category-icon]');
    const iconSlot = icon.closest('.tdb-treatment-icon-ticker');
    const labelSlot = f.w.document.querySelector('[data-tdb-treatment-category]');
    const iconMotion = () =>
      f.animations.filter((a) => a.node.classList.contains('tdb-treatment-icon-value'));
    assert.equal(iconMotion().length, 0, 'initial artwork must not animate');
    f.select(1);
    const movingIcon = iconMotion();
    const movingLabel = f.animations.filter((a) => a.node.parentElement === labelSlot);
    assert.equal(movingIcon.length, 2);
    assert.deepEqual(
      movingIcon.map((a) => a.frames),
      movingLabel.map((a) => a.frames),
    );
    assert.deepEqual(
      movingIcon.map((a) => a.options),
      movingLabel.map((a) => a.options),
    );
    assert.match(icon.src, /lotus-small/, 'outgoing artwork remains in place during the tick');
    assert.match(iconSlot.lastElementChild.querySelector('img').src, /diagnostics-small/);
    assert.equal(iconSlot.querySelectorAll('[data-tdb-treatment-category-icon]').length, 1);
    f.finish();
    assert.match(icon.src, /diagnostics-small/);
    assert.equal(iconSlot.children.length, 1);
    f.swiper.slides[2].append(
      f.swiper.slides[1].querySelector('[data-tdb-treatment-category-source]').cloneNode(true),
    );
    const before = iconMotion().length;
    f.select(2);
    f.finish();
    assert.equal(iconMotion().length, before, 'two items in the same category keep a still icon');
    f.controller.dispose();
    assert.equal(f.w.document.querySelector('.tdb-treatment-icon-ticker'), null);
    assert.equal(f.w.document.querySelector('[data-tdb-treatment-category-icon]'), icon);
    assert.match(icon.src, /diagnostics-small/);
  } finally {
    f.dom.window.close();
  }
});

test('reversed or cancelled category ticks settle the latest artwork without stale callbacks', () => {
  const f = fixture(false, true);
  try {
    const icon = f.w.document.querySelector('[data-tdb-treatment-category-icon]');
    const iconSlot = icon.closest('.tdb-treatment-icon-ticker');
    const iconMotion = () =>
      f.animations.filter((a) => a.node.classList.contains('tdb-treatment-icon-value'));
    f.select(1);
    const staleFinish = iconMotion().at(-1).onfinish;
    f.select(0);
    assert.equal(iconMotion().at(-1).frames[0].transform, 'translateY(-100%)');
    staleFinish();
    assert.equal(iconSlot.children.length, 2, 'stale completion must not cancel the current tick');
    iconMotion().at(-1).oncancel();
    assert.match(icon.src, /lotus-small/);
    assert.equal(iconSlot.children.length, 1);
    f.select(2);
    assert.equal(iconSlot.hidden, true);
    f.select(1);
    f.finish();
    assert.equal(iconSlot.hidden, false);
    assert.match(icon.src, /diagnostics-small/);
  } finally {
    f.dom.window.close();
  }
});

test('desktop uses the same ticker; reduced motion stays immediate and disposal unbinds the slider', () => {
  const f = fixture();
  try {
    f.media.matches = false;
    f.select(1);
    assert.ok(f.animations.length > 0, 'desktop selection animates the native value slots');
    f.finish();
    assert.equal(f.value('price'), 'From £995');
    const beforeReduced = f.animations.length;
    f.w.TDBMotion.reduced.matches = true;
    f.select(0);
    assert.equal(f.animations.length, beforeReduced);
    assert.equal(f.value('price'), 'From £4,195');
    f.controller.dispose();
    assert.equal(f.events.slideChange.size, 0);
    assert.equal(f.events.beforeDestroy.size, 0);
  } finally {
    f.dom.window.close();
  }
});
