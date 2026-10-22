const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

test('treatment CTA reads visible stamp titles by URL after hidden copy is removed', () => {
  const dom = new JSDOM(
    `<div data-tdb-treatment-layout>
      <section class="parallax-swiper_component" data-tdb-treatment data-tdb-treatment-postage>
        <div class="swiper"><div class="swiper-wrapper">
          <article class="swiper-slide"><div data-tdb-copy-state></div><a class="tdb-treatment-source" href="/treatments/a" data-tdb-treatment-price-source="995"></a></article>
          <article class="swiper-slide"><div data-tdb-copy-state></div><a class="tdb-treatment-source" href="/treatments/b" data-tdb-treatment-price-source="4195"></a></article>
        </div></div>
      </section>
      <div data-tdb-treatment-stamps>
        <a data-tdb-treatment-stamp href="/treatments/b"><h3 class="tdb-treatment-title">Treatment B</h3></a>
        <a data-tdb-treatment-stamp href="/treatments/a"><h3 class="tdb-treatment-title">Treatment A</h3></a>
      </div>
      <div class="tdb-treatment-cta"><a data-tdb-parallax-cta>Discover treatment<span aria-hidden="true"></span></a></div>
    </div>`,
    { url: 'https://example.test/', runScripts: 'outside-only' },
  );
  const w = dom.window,
    d = w.document;
  w.matchMedia = () => ({ matches: false, addEventListener() {} });
  w.TDBParallaxPresentation = { prepare() {} };
  try {
    w.eval(fs.readFileSync('src/sliders/parallax-controls.js', 'utf8'));
    const root = d.querySelector('[data-tdb-treatment]');
    const api = w.TDBParallaxControls.prepare(root);
    const cta = d.querySelector('[data-tdb-parallax-cta]');
    assert(api);
    assert.equal(cta.getAttribute('href'), '/treatments/a');
    assert.equal(cta.getAttribute('aria-label'), 'Discover treatment: Treatment A');
    const listeners = {};
    const swiper = {
      slides: [...d.querySelectorAll('.swiper-slide')],
      activeIndex: 1,
      on(name, fn) {
        listeners[name] = fn;
      },
    };
    api.bind(swiper);
    assert.equal(cta.getAttribute('href'), '/treatments/b');
    assert.equal(cta.getAttribute('aria-label'), 'Discover treatment: Treatment B');
    api.setBusy(true);
    assert.equal(cta.getAttribute('aria-disabled'), 'true');
    api.setBusy(false);
    assert.equal(cta.getAttribute('aria-disabled'), null);
    assert.equal(
      d
        .querySelector('[data-tdb-treatment-price-source]')
        .getAttribute('data-tdb-treatment-price-source'),
      '995',
    );
  } finally {
    w.close();
  }
});
