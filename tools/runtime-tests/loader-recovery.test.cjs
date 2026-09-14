const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');

const runtimePath = process.env.TDB_RUNTIME_FILE || path.resolve(__dirname, '../../src/runtime/site-asset-loader.js');
const source = fs.readFileSync(runtimePath, 'utf8');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const turns = async () => { await pause(0); await pause(0); };
const attributes = { forms: 'data-tdb-forms-js', swiper: 'data-swiper-js', sliders: 'data-tdb-sliders-js' };

async function setup(t, options = {}) {
  const requests = [];
  const io = [];
  const jsErrors = [];
  class Network extends ResourceLoader {
    fetch(url, { element }) {
      const kind = Object.keys(attributes).find(key => element.hasAttribute(attributes[key]));
      assert.ok(kind, `Unexpected request: ${url}`);
      let resolve, reject;
      const response = new Promise((yes, no) => { resolve = yes; reject = no; });
      response.abort = () => {};
      requests.push({ kind, url, element, resolve, reject, settled: false });
      return response;
    }
  }
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => jsErrors.push(error));
  // Runtime error messages are expected in the persistent-failure cases.
  virtualConsole.on('error', () => {});
  const dom = new JSDOM(`<!doctype html><html style="--tdb-ui-ready:1;--tdb-slider-ui-ready:1"><head></head><body>
    <form id="normal-form"><input id="field"><button type="submit">Send</button></form>
    <form id="vip-drawer-form"><input id="vip-field"></form>
    <a id="vip-intent" href="#VIP">Join VIP</a>
    <div id="slider" class="parallax-swiper_component"><button id="arrow">Next</button></div>
    <div id="gallery" class="highlight-swiper_component"></div>
  </body></html>`, {
    url: 'https://dentalbarns.webflow.io/', runScripts: 'dangerously', resources: new Network(), virtualConsole,
    beforeParse(window) {
      window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
      window.requestIdleCallback = () => 1;
      if (!options.noIntersectionObserver) window.IntersectionObserver = class {
        constructor(callback, config) { this.callback = callback; this.config = config; this.targets = new Set(); io.push(this); }
        observe(target) { this.targets.add(target); }
        disconnect() { this.targets.clear(); }
        enter(target, isIntersecting = true) {
          assert.ok(this.targets.has(target), 'Proximity target should remain observed until successful loading');
          this.callback([{ target, isIntersecting }]);
        }
      };
    },
  });
  t.after(() => dom.window.close());
  const { window } = dom;
  window.eval(source);
  await turns();
  const count = kind => requests.filter(request => request.kind === kind).length;
  const next = kind => requests.find(request => request.kind === kind && !request.settled);
  async function waitForRequest(kind, expectedCount) {
    const deadline = Date.now() + 1500;
    while (count(kind) < expectedCount && Date.now() < deadline) await pause(10);
    assert.equal(count(kind), expectedCount, `${kind} request count`);
    return next(kind);
  }
  async function finish(kind, result = 'success') {
    const request = next(kind);
    assert.ok(request, `Pending ${kind} request`);
    request.settled = true;
    if (result === 'error') request.reject(new Error('Simulated network failure'));
    else {
      let script = `window.executions = window.executions || {}; window.executions.${kind} = (window.executions.${kind} || 0) + 1;`;
      if (result === 'execution-error') script += 'throw new Error("Simulated runtime exception");';
      else if (kind === 'swiper') script += 'window.Swiper = function Swiper() {};';
      else if (kind === 'sliders') script += 'window.TDBSliders = { ready: true };';
      request.resolve(Buffer.from(script));
    }
    await turns();
    return request;
  }
  const intent = (type, selector) => window.document.querySelector(selector).dispatchEvent(new window.Event(type, { bubbles: true, cancelable: true }));
  const observer = margin => io.find(item => item.config.rootMargin === `${margin}px 0px`);
  return { window, requests, io, count, next, waitForRequest, finish, intent, observer, jsErrors };
}

test('successful path keeps proximity gates, VIP exclusion, dependency order and one execution', async t => {
  const h = await setup(t);
  assert.equal(h.requests.length, 0, 'No early forms or slider requests');
  const forms = h.observer(600), sliders = h.observer(800);
  assert.deepEqual([...forms.targets].map(e => e.id), ['normal-form']);
  assert.deepEqual([...sliders.targets].map(e => e.id), ['slider', 'gallery']);
  forms.enter(h.window.document.querySelector('#normal-form'));
  sliders.enter(h.window.document.querySelector('#slider'));
  assert.equal(h.count('forms'), 1);
  assert.equal(h.count('swiper'), 1);
  assert.equal(h.count('sliders'), 0, 'Slider runtime waits for Swiper');
  await h.finish('forms');
  await h.finish('swiper');
  await h.waitForRequest('sliders', 1);
  await h.finish('sliders');
  assert.deepEqual({ ...h.window.executions }, { forms: 1, swiper: 1, sliders: 1 });
  assert.equal(forms.targets.size, 0);
  assert.equal(sliders.targets.size, 0);
  h.intent('focusin', '#field');
  await h.window.TDBSliderLoader.load();
  assert.equal(h.requests.length, 3);
  assert.equal(h.window.document.querySelectorAll('link').length, 0, 'No additional CSS request');
  assert.equal(h.window.TDBSliderLoader.status().loading, false);
});

for (const event of ['focusin', 'pointerdown', 'keydown', 'submit']) {
  test(`forms retain the ${event} trigger`, async t => {
    const h = await setup(t);
    h.intent(event, event === 'submit' ? '#normal-form' : '#field');
    assert.equal(h.count('forms'), 1);
    await h.finish('forms');
  });
}

test('VIP link intent and excluded drawer form focus still load forms', async t => {
  for (const target of ['#vip-intent', '#vip-field']) {
    const h = await setup(t);
    h.intent('focusin', target);
    assert.equal(h.count('forms'), 1);
    await h.finish('forms');
  }
});

test('failed forms request is removed and retried once despite repeated intent', async t => {
  const h = await setup(t);
  h.intent('focusin', '#field');
  const failed = await h.finish('forms', 'error');
  assert.equal(failed.element.isConnected, false);
  for (const event of ['pointerdown', 'keydown', 'focusin', 'submit']) h.intent(event, '#normal-form');
  assert.equal(h.count('forms'), 1, 'No retry before the cooldown');
  const retry = await h.waitForRequest('forms', 2);
  assert.notEqual(retry.element, failed.element);
  assert.equal(h.window.document.querySelectorAll('script[data-tdb-forms-js]').length, 1);
  await h.finish('forms');
  assert.equal(h.window.executions.forms, 1);
  assert.equal(h.observer(600).targets.size, 0);
});

test('persistent forms failure stops automatic retries but later focus can recover', async t => {
  const h = await setup(t);
  h.intent('focusin', '#field');
  await h.finish('forms', 'error');
  await h.waitForRequest('forms', 2);
  await h.finish('forms', 'error');
  await pause(300);
  assert.equal(h.count('forms'), 2, 'No retry loop');
  assert.equal(h.window.document.querySelectorAll('script[data-tdb-forms-js]').length, 0);
  h.intent('focusin', '#field');
  assert.equal(h.count('forms'), 3);
  await h.finish('forms');
  assert.equal(h.window.executions.forms, 1);
});

test('forms proximity and dynamic discovery remain available after persistent failure', async t => {
  const h = await setup(t);
  const form = h.window.document.querySelector('#normal-form');
  h.observer(600).enter(form);
  await h.finish('forms', 'error');
  await h.waitForRequest('forms', 2);
  await h.finish('forms', 'error');
  const added = h.window.document.createElement('form');
  h.window.document.body.appendChild(added);
  await turns();
  assert.ok(h.observer(600).targets.has(added));
  h.observer(600).enter(form, false);
  assert.equal(h.count('forms'), 2);
  h.observer(600).enter(form);
  await h.finish('forms');
  assert.equal(h.window.executions.forms, 1);
});

test('Swiper failure recovers before loading slider runtime and shares concurrent callers', async t => {
  const h = await setup(t);
  const first = h.window.TDBSliderLoader.load();
  assert.equal(first, h.window.TDBSliderLoader.load());
  await h.finish('swiper', 'error');
  h.intent('pointerdown', '#arrow');
  h.intent('keydown', '#arrow');
  assert.equal(h.count('sliders'), 0);
  await h.waitForRequest('swiper', 2);
  await h.finish('swiper');
  await h.waitForRequest('sliders', 1);
  await h.finish('sliders');
  await first;
  assert.deepEqual({ ...h.window.executions }, { swiper: 1, sliders: 1 });
});

test('slider runtime retry retains the successful Swiper dependency', async t => {
  const h = await setup(t);
  const load = h.window.TDBSliderLoader.load();
  await h.finish('swiper');
  const swiperNode = h.window.document.querySelector('script[data-swiper-js]');
  const failed = await h.finish('sliders', 'error');
  assert.equal(failed.element.isConnected, false);
  assert.equal(swiperNode.isConnected, true);
  await h.waitForRequest('sliders', 2);
  await h.finish('sliders');
  await load;
  assert.equal(h.count('swiper'), 1);
  assert.deepEqual({ ...h.window.executions }, { swiper: 1, sliders: 1 });
});

for (const trigger of ['pointerdown', 'keydown', 'proximity']) {
  test(`persistent slider failure can recover on later ${trigger}`, async t => {
    const h = await setup(t);
    const rejected = assert.rejects(h.window.TDBSliderLoader.load());
    await h.finish('swiper');
    await h.finish('sliders', 'error');
    await h.waitForRequest('sliders', 2);
    await h.finish('sliders', 'error');
    await rejected;
    await pause(300);
    assert.equal(h.count('sliders'), 2, 'No automatic retry loop');
    assert.equal(h.window.TDBSliderLoader.status().loading, false);
    if (trigger === 'proximity') {
      const slider = h.window.document.querySelector('#slider');
      h.observer(800).enter(slider, false);
      h.observer(800).enter(slider);
    } else h.intent(trigger, '#arrow');
    await h.waitForRequest('sliders', 3);
    await h.finish('sliders');
    assert.equal(h.count('swiper'), 1);
    assert.equal(h.window.executions.sliders, 1);
  });
}

test('UI failure does not create parallel Swiper flights on a later attempt', async t => {
  const h = await setup(t);
  h.window.document.documentElement.style.setProperty('--tdb-ui-ready', '0');
  await assert.rejects(h.window.TDBSliderLoader.load(), /global UI link is missing/);
  assert.equal(h.count('swiper'), 1);
  h.window.document.documentElement.style.setProperty('--tdb-ui-ready', '1');
  const recovered = h.window.TDBSliderLoader.load();
  assert.equal(h.count('swiper'), 1);
  await h.finish('swiper', 'error');
  await h.waitForRequest('swiper', 2);
  await h.finish('swiper');
  await h.finish('sliders');
  await recovered;
  assert.deepEqual({ ...h.window.executions }, { swiper: 1, sliders: 1 });
});

test('a downloaded script with an execution error is not replayed', async t => {
  const h = await setup(t);
  h.intent('focusin', '#field');
  await h.finish('forms', 'execution-error');
  await pause(300);
  h.intent('focusin', '#field');
  assert.equal(h.count('forms'), 1);
  assert.equal(h.window.executions.forms, 1);
  assert.ok(h.jsErrors.some(error => /runtime exception/.test(error.message)));
});

test('existing fallback without IntersectionObserver still loads each asset once', async t => {
  const h = await setup(t, { noIntersectionObserver: true });
  assert.equal(h.count('forms'), 1);
  assert.equal(h.count('swiper'), 1);
  await h.finish('forms');
  await h.finish('swiper');
  await h.finish('sliders');
  assert.deepEqual({ ...h.window.executions }, { forms: 1, swiper: 1, sliders: 1 });
});
