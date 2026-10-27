const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

function gallery(restoredIndex) {
  const dom = new JSDOM(
    `<section class="parallax-swiper_component tdb-service-parallax" data-tdb-parallax-link-mode="fixed">
    <div class="swiper"><div class="swiper-wrapper">
      <article class="swiper-slide"><h3 class="service-card-mobile-title">Lounge</h3><img></article>
      <article class="swiper-slide"><h3 class="service-card-mobile-title">Reception</h3><img></article>
    </div></div>
    <div class="tdb-service-controls"><button class="swiper-btn-prev">Previous</button><button class="swiper-btn-next">Next</button></div>
    <div class="tdb-service-cta"><a data-tdb-parallax-cta href="/first-visit">First Visit<div aria-hidden="true"></div></a></div>
  </section>`,
    { url: 'https://example.test/location', runScripts: 'outside-only' },
  );
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addEventListener() {} });
  w.TDBParallaxPresentation = { prepare() {} };
  if (restoredIndex !== undefined) {
    w.performance.getEntriesByType = () => [{ type: 'back_forward' }];
    w.history.replaceState(
      {
        tdbParallax: { '/location:0': { index: restoredIndex, href: '/first-visit', held: true } },
      },
      '',
    );
  }
  w.eval(fs.readFileSync('src/sliders/parallax-controls.js', 'utf8'));
  const root = w.document.querySelector('section');
  return { dom, w, root, cta: root.querySelector('a'), api: w.TDBParallaxControls.prepare(root) };
}

test('fixed gallery action uses its native destination without per-image links or generated nodes', () => {
  const { dom, w, root, cta, api } = gallery();
  try {
    assert(api);
    assert.equal(root.querySelectorAll('a').length, 1);
    assert.equal(root.querySelectorAll('.swiper-slide a').length, 0);
    assert.equal(cta.getAttribute('href'), '/first-visit');
    assert.equal(cta.getAttribute('aria-label'), 'First Visit');
    const events = {};
    const swiper = {
      slides: [...root.querySelectorAll('.swiper-slide')],
      activeIndex: 0,
      on(n, f) {
        events[n] = f;
      },
      off() {},
    };
    api.bind(swiper);
    swiper.activeIndex = 1;
    events.slideChange();
    assert.equal(cta.getAttribute('href'), '/first-visit');
    assert.equal(cta.getAttribute('aria-label'), 'First Visit');
    api.setBusy(true);
    assert.equal(cta.tabIndex, -1);
    assert.equal(
      cta.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })),
      false,
    );
    api.setBusy(false);
    assert.equal(cta.tabIndex, 0);
    assert.equal(cta.getAttribute('aria-disabled'), null);
    w.dispatchEvent(new w.Event('pagehide'));
    assert.equal(w.history.state.tdbParallax['/location:0'].index, 1);
    api.dispose();
    assert.equal(root.querySelectorAll('a').length, 1);
    assert.equal(root.querySelector('[data-tdb-parallax-cta-index]'), null);
    assert.equal(cta.getAttribute('href'), '/first-visit');
    assert(w.TDBParallaxControls.prepare(root));
  } finally {
    dom.window.close();
  }
});

test('browser Back restores the precise gallery slide even though all destinations match', () => {
  const { dom, root, cta, api } = gallery(1);
  try {
    assert.equal(api.initialIndex, 1);
    assert.equal(api.skipEntry, true);
    assert.equal(
      root.querySelector('.swiper').style.getPropertyValue('--tdb-parallax-initial-index'),
      '1',
    );
    assert(cta.classList.contains('is-touch-held'));
    assert.equal(root.querySelectorAll('.swiper-slide a').length, 0);
  } finally {
    dom.window.close();
  }
});
