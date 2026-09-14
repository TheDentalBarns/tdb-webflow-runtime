const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
const source = fs.readFileSync(process.env.TDB_IMMEDIATE_FILE || path.resolve(__dirname, '../../src/runtime/immediate-runtime-batch.js'), 'utf8');
const turns = async () => { await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0)); };
async function setup(t, body) {
  const requests = [];
  class Network extends ResourceLoader {
    fetch(url, { element }) {
      const kind = element.hasAttribute('data-tdb-footer-runtime-js') ? 'footer' : element.hasAttribute('data-vimeo-controller-js') ? 'vimeo' : 'other';
      if (kind === 'other') { const done = Promise.resolve(Buffer.from(';')); done.abort = () => {}; return done; }
      let resolve; const promise = new Promise(yes => { resolve = yes; }); promise.abort = () => {}; requests.push({ kind, resolve }); return promise;
    }
  }
  const dom = new JSDOM('<!doctype html><body>' + body + '</body>', { url: 'https://dentalbarns.webflow.io/', runScripts: 'dangerously', resources: new Network(), virtualConsole: new VirtualConsole() });
  t.after(() => dom.window.close()); const w = dom.window; w.eval(source); await turns();
  return { w, count: kind => requests.filter(r => r.kind === kind).length, async footer() { requests.find(r => r.kind === 'footer').resolve(Buffer.from('window.TDBFooterRuntime={};window.TDBFeatureCSS={contentVideo(){window.contentCSSCalls=(window.contentCSSCalls||0)+1;return new Promise(resolve=>{window.finishContentCSS=resolve})}};')); await turns(); } };
}
test('homepage hero controller starts without waiting for content-video CSS or footer', async t => {
  const h = await setup(t, '<header data-vimeo-hero-shell></header>'); assert.equal(h.count('vimeo'), 1); assert.equal(h.w.contentCSSCalls, undefined);
});
test('content-player controller waits for its CSS before binding playback controls', async t => {
  const h = await setup(t, '<div data-vimeo-player-init data-vimeo-content-init></div>'); assert.equal(h.count('vimeo'), 0);
  await h.footer(); assert.equal(h.w.contentCSSCalls, 1); assert.equal(h.count('vimeo'), 0);
  h.w.finishContentCSS(); await turns(); assert.equal(h.count('vimeo'), 1);
});
test('pages without video request neither the controller nor content-video CSS', async t => {
  const h = await setup(t, '<p>No video</p>'); await h.footer(); assert.equal(h.count('vimeo'), 0); assert.equal(h.w.contentCSSCalls, undefined);
});
