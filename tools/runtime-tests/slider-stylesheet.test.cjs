const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
const source = fs.readFileSync(process.env.TDB_RUNTIME_FILE || path.resolve(__dirname, '../../src/runtime/site-asset-loader.js'), 'utf8');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const turns = async () => { await pause(0); await pause(0); };

async function setup(t, { missingCSS = false } = {}) {
  const requests = [];
  class Network extends ResourceLoader {
    fetch(url, { element }) {
      const kind = element.tagName === 'LINK' ? 'css' : element.hasAttribute('data-swiper-js') ? 'swiper' : 'sliders';
      let resolve, reject;
      const result = new Promise((yes, no) => { resolve = yes; reject = no; });
      result.abort = () => {};
      requests.push({ kind, element, resolve, reject, settled: false });
      return result;
    }
  }
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', () => {});
  virtualConsole.on('error', () => {});
  const dom = new JSDOM(`<!doctype html><html style="--tdb-ui-ready:1"><head>
    <style id="before"></style>
    ${missingCSS ? '' : '<link data-tdb-slider-ui-css rel="stylesheet" media="print" href="https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@release/dist/tdb-slider-ui.css">'}
    <style id="after"></style></head><body><div class="parallax-swiper_component"><button>Next</button></div></body></html>`, {
    url: 'https://dentalbarns.webflow.io/', runScripts: 'dangerously', resources: new Network(), virtualConsole,
    beforeParse(window) {
      window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
      window.requestIdleCallback = () => 1;
      window.IntersectionObserver = class { observe() {} disconnect() {} };
    },
  });
  t.after(() => dom.window.close());
  const { window } = dom;
  window.eval(source);
  await turns();
  const count = kind => requests.filter(r => r.kind === kind).length;
  const pending = kind => requests.find(r => r.kind === kind && !r.settled);
  async function finish(kind, result = 'success') {
    const request = pending(kind);
    assert.ok(request, `Pending ${kind} request`);
    request.settled = true;
    if (result === 'error') request.reject(new Error('Simulated request failure'));
    else request.resolve(Buffer.from(kind === 'css'
      ? result === 'stale' ? 'html{--unrelated:1}' : 'html{--tdb-slider-ui-ready:1}'
      : kind === 'swiper' ? 'window.Swiper=function(){};'
      : 'window.TDBSliders={version:"test"};window.sliderExecutions=(window.sliderExecutions||0)+1;'));
    await turns();
    return request;
  }
  const load = () => window.TDBSliderLoader.load();
  return { window, requests, count, pending, finish, load };
}

test('slider initialization waits for CSS even when Swiper finishes first', async t => {
  const h = await setup(t);
  assert.equal(h.count('swiper'), 0, 'No slider scripts before intent/proximity');
  const flight = h.load();
  assert.equal(h.load(), flight, 'Repeated intent shares one load');
  await h.finish('swiper');
  assert.equal(h.count('sliders'), 0, 'No unstyled slider initialization');
  await h.finish('css');
  assert.equal(h.pending('css'), undefined);
  assert.equal(h.window.document.querySelector('link').media, 'all');
  await h.finish('sliders');
  await flight;
  await h.load();
  assert.equal(h.window.sliderExecutions, 1);
  assert.equal(h.count('css'), 1);
  assert.equal(h.count('swiper'), 1);
  assert.equal(h.count('sliders'), 1);
});

test('an already downloaded sheet is applied and does not trigger a second CSS request', async t => {
  const h = await setup(t);
  await h.finish('css');
  assert.equal(h.count('swiper'), 0);
  const flight = h.load();
  await h.finish('swiper');
  await h.finish('sliders');
  await flight;
  assert.equal(h.count('css'), 1);
});

test('failed CSS retries once in its original cascade position before initialization', async t => {
  const h = await setup(t);
  const original = h.pending('css').element;
  const flight = h.load();
  await h.finish('swiper');
  await h.finish('css', 'error');
  assert.equal(h.count('css'), 2);
  assert.equal(original.isConnected, false);
  const replacement = h.pending('css').element;
  assert.equal(replacement.previousElementSibling.id, 'before');
  assert.equal(replacement.nextElementSibling.id, 'after');
  assert.equal(h.count('sliders'), 0);
  assert.equal(h.load(), flight);
  await h.finish('css');
  await h.finish('sliders');
  await flight;
  assert.equal(h.window.sliderExecutions, 1);
});

test('stale CSS cannot initialize sliders and later intent can recover', async t => {
  const h = await setup(t);
  const flight = h.load();
  const rejected = assert.rejects(flight, /stale or incomplete/);
  await h.finish('swiper');
  await h.finish('css', 'stale');
  await h.finish('css', 'stale');
  await rejected;
  assert.equal(h.count('sliders'), 0);
  const recovery = h.load();
  await h.finish('css');
  await h.finish('sliders');
  await recovery;
  assert.equal(h.count('swiper'), 1);
  assert.equal(h.window.sliderExecutions, 1);
});

test('missing slider CSS refuses unstyled initialization', async t => {
  const h = await setup(t, { missingCSS: true });
  await assert.rejects(h.load(), /slider UI link is missing/);
  assert.equal(h.count('sliders'), 0);
});
