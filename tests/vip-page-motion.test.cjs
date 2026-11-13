const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const read = (file) => fs.readFileSync(file, 'utf8');
function fixture(vip = true) {
  const dom = new JSDOM(
    `<body ${vip ? 'data-tdb-vip-campaign' : ''}>
    <p data-tdb-dd-page style="opacity:0.4">A calm visit</p>
    <section data-tdb-page-break><img data-tdb-page-break-image></section>
    <section data-tdb-price-section><button data-tdb-disclosure-trigger>Prices</button></section>
  </body>`,
    { runScripts: 'outside-only', pretendToBeVisual: true },
  );
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addEventListener() {} });
  w.eval(read('src/shared/motion-policy.js'));
  return { w, d: w.document, close: () => w.close() };
}

test('native VIP opt-in disables only page effects; shared functional motion remains full', () => {
  for (const vip of [false, true]) {
    const f = fixture(vip);
    try {
      assert.equal(f.w.TDBMotionPolicy.mode, 'full');
      assert.equal(f.w.TDBMotionPolicy.reduced.matches, false);
      assert.equal(f.w.TDBMotionPolicy.pageEffects.textReveals, !vip);
      assert.equal(f.w.TDBMotionPolicy.pageEffects.imageParallax, !vip);
      assert.equal(f.w.TDBMotionPolicy.pageEffects.stickyPricing, !vip);
      assert(Object.isFrozen(f.w.TDBMotionPolicy.pageEffects));
      const first = f.w.TDBMotionPolicy;
      f.w.eval(read('src/shared/motion-policy.js'));
      assert.equal(f.w.TDBMotionPolicy, first);
    } finally {
      f.close();
    }
  }
});

test('the built entry establishes the VIP policy before requesting foundation', () => {
  const dom = new JSDOM('<body data-tdb-vip-campaign></body>', {
    runScripts: 'outside-only',
    url: 'https://dentalbarns.webflow.io/vip/instagram',
  });
  const w = dom.window,
    d = w.document;
  try {
    const script = d.createElement('script');
    script.src =
      'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@' +
      'c'.repeat(40) +
      '/dist/tdb-start.min.js';
    Object.defineProperty(d, 'currentScript', { value: script });
    const append = d.head.append.bind(d.head);
    let checked = false;
    d.head.append = (node) => {
      if (node.src?.endsWith('tdb-foundation.js')) {
        checked = true;
        assert.equal(w.TDBMotionPolicy.pageEffects.textReveals, false);
        assert.equal(w.TDBMotionPolicy.pageEffects.imageParallax, false);
      }
      return append(node);
    };
    w.eval(read('dist/tdb-start.min.js'));
    d.dispatchEvent(new w.Event('DOMContentLoaded'));
    assert(checked, 'foundation request observed');
  } finally {
    w.close();
  }
});

test('VIP text and photo entry points never create geometry observers or animation frames', () => {
  const f = fixture();
  try {
    const forbidden = () => assert.fail('static page effects must not measure, observe or animate');
    f.w.ResizeObserver = class {
      constructor() {
        forbidden();
      }
    };
    f.w.IntersectionObserver = class {
      constructor() {
        forbidden();
      }
    };
    f.w.requestAnimationFrame = forbidden;
    f.w.Element.prototype.getBoundingClientRect = forbidden;
    f.w.Element.prototype.getClientRects = forbidden;
    f.w.eval(read('src/shared/motion.js'));
    const text = f.d.querySelector('p');
    for (const method of ['ddText', 'ddRegion']) {
      const owner = f.w.TDBMotion[method]([text]);
      assert.equal(text.style.opacity, '1');
      text.style.opacity = '0.5';
      owner.refresh();
      assert.equal(text.style.opacity, '1');
      owner.enter([text]);
      owner.destroy();
      owner.destroy();
    }
    const photos = f.w.TDBMotion.pageBreaks([f.d.querySelector('section')]);
    assert.equal(photos.status().length, 0);
    photos.refresh();
    photos.destroy();
    assert.equal(f.w.TDBMotion.reduced.matches, false);
    assert(f.w.TDBMotion.duration() > 0, 'carousel timings remain active');
  } finally {
    f.close();
  }
});

test('VIP loaders opt out before DOM discovery and motion-module fetching', async () => {
  const f = fixture();
  try {
    const forbidden = () => assert.fail('disabled page owner must not start');
    f.w.TDBModules = { load: forbidden };
    f.w.MutationObserver = class {
      constructor() {
        forbidden();
      }
    };
    f.w.IntersectionObserver = class {
      constructor() {
        forbidden();
      }
    };
    f.w.eval(read('src/runtime/page-break-loader.js'));
    f.w.eval('preparePageBreakLoader()');
    assert.equal(f.w.TDBPageBreaks, undefined);
    const script = f.d.createElement('script');
    script.src = 'https://example.com/tdb-runtime.js';
    Object.defineProperty(f.d, 'currentScript', { value: script });
    f.w.TDBConsent = { allows: () => false };
    f.w.eval(read('src/runtime/runtime.js'));
    await f.w.TDBRuntime.refresh();
    assert.equal(f.w.TDBRuntime.count(), 0);
    assert.equal(f.w.TDBRuntime.status().started, false);
    f.w.TDBRuntime.destroy();
    f.d.querySelectorAll = forbidden;
    f.w.eval(read('src/pricing/sticky-categories.js'));
    f.d.dispatchEvent(new f.w.Event('DOMContentLoaded'));
  } finally {
    f.close();
  }
});
