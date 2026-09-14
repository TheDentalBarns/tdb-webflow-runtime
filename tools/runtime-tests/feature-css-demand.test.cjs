const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
const source = fs.readFileSync(process.env.TDB_RUNTIME_FILE || path.resolve(__dirname, '../../src/runtime/site-asset-loader.js'), 'utf8');
const turns = async () => { await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0)); };
const base = 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@release/dist/';
async function setup(t) {
  const requests = [];
  class Network extends ResourceLoader {
    fetch(url, { element }) {
      if (url === base + 'tdb-ui.css') { const done = Promise.resolve(Buffer.from('html{--tdb-ui-ready:1}')); done.abort = () => {}; return done; }
      const kind = element.hasAttribute('data-tdb-vip-ui-css') ? 'vipCSS' : element.hasAttribute('data-tdb-vimeo-content-ui-css') ? 'videoCSS' : 'vipJS';
      let resolve, reject;
      const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); promise.abort = () => {};
      requests.push({ kind, element, url, resolve, reject, settled: false }); return promise;
    }
  }
  const dom = new JSDOM(`<!doctype html><html data-wf-page="677cf86df9952f978d94d8a9"><head><link data-tdb-ui-css rel="stylesheet" href="${base}tdb-ui.css"><style id="later-overrides"></style></head><body><a id="cta" href="#VIP">Join VIP</a><section id="VIP"></section><div id="tdb-vip-drawer"><div class="tdb-vip-drawer-handle"></div><div class="tdb-vip-drawer-body"></div></div></body></html>`, {
    url: 'https://dentalbarns.webflow.io/', runScripts: 'dangerously', resources: new Network(), virtualConsole: new VirtualConsole(),
    beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} }); w.requestIdleCallback = () => 1; w.IntersectionObserver = class { observe() {} disconnect() {} }; },
  });
  t.after(() => dom.window.close()); const w = dom.window; w.eval(source); await turns();
  const count = kind => requests.filter(r => r.kind === kind).length;
  const pending = kind => requests.find(r => r.kind === kind && !r.settled);
  async function finish(kind, error = false) {
    const r = pending(kind); assert.ok(r, 'Pending ' + kind); r.settled = true;
    if (error) r.reject(new Error('Simulated stylesheet failure'));
    else r.resolve(Buffer.from(kind === 'vipCSS' ? 'html{--tdb-vip-ui-ready:1}' : kind === 'videoCSS' ? 'html{--tdb-vimeo-content-ui-ready:1}' : 'window.TDBVIPDrawer={open(){window.opens=(window.opens||0)+1},resumeScroll(){}};'));
    await turns();
  }
  return { w, requests, count, pending, finish, click: () => w.document.querySelector('#cta').click(), prepared: () => w.document.querySelector('#tdb-vip-drawer').hasAttribute('data-tdb-vip-prepared') };
}
test('homepage requests no feature CSS before demand', async t => {
  const h = await setup(t); h.w.dispatchEvent(new h.w.Event('tdb:priority-ready')); h.w.dispatchEvent(new h.w.Event('scroll')); await turns();
  assert.equal(h.requests.length, 0); assert.equal(h.prepared(), false);
});
test('first VIP click waits for CSS, retains intent, and opens once', async t => {
  const h = await setup(t); h.click(); h.click(); await turns();
  assert.equal(h.count('vipCSS'), 1); assert.equal(h.count('vipJS'), 0); assert.equal(h.prepared(), false);
  assert.equal(h.pending('vipCSS').url, base + 'tdb-vip.css');
  await h.finish('vipCSS'); assert.equal(h.prepared(), true); assert.equal(h.count('vipJS'), 1);
  await h.finish('vipJS'); assert.equal(h.w.opens, 1); assert.equal(h.count('videoCSS'), 0);
});
test('first real scroll prepares VIP CSS and script ahead of a reversal', async t => {
  const h = await setup(t); h.w.scrollY = 20; h.w.dispatchEvent(new h.w.Event('scroll')); await turns();
  assert.equal(h.count('vipCSS'), 1); assert.equal(h.count('vipJS'), 0);
  await h.finish('vipCSS'); await h.finish('vipJS'); assert.equal(h.w.opens, undefined);
});
test('VIP CSS failure retries in place without exposing or opening the drawer early', async t => {
  const h = await setup(t); h.click(); await h.finish('vipCSS', true);
  assert.equal(h.count('vipCSS'), 2); assert.equal(h.prepared(), false); assert.equal(h.count('vipJS'), 0);
  assert.equal(h.pending('vipCSS').element.nextElementSibling.id, 'later-overrides');
  await h.finish('vipCSS'); await h.finish('vipJS'); assert.equal(h.w.opens, 1);
});
test('content-video CSS loads only when requested and shares concurrent callers', async t => {
  const h = await setup(t); const first = h.w.TDBFeatureCSS.contentVideo(); const second = h.w.TDBFeatureCSS.contentVideo();
  assert.equal(h.count('videoCSS'), 1); assert.equal(first, second); assert.equal(h.pending('videoCSS').url, base + 'tdb-vimeo-content-ui.css');
  await h.finish('videoCSS'); await Promise.all([first, second]); await h.w.TDBFeatureCSS.contentVideo();
  assert.equal(h.count('videoCSS'), 1); assert.equal(h.count('vipCSS'), 0);
});
