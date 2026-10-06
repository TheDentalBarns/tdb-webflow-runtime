/* Deterministic DOM/SDK contract tests; no browser or network required.
 * Run: NODE_PATH=<jsdom modules> node --test tests/vimeo-shared-lifecycle.cjs
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, process.env.VIMEO_TEST_DIST ? '../dist/tdb-vimeo.js' : '../src/components/vimeo.js'), 'utf8');
const deferred = () => {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
};
const flush = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };

function fixture(options = {}) {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>
    <div data-vimeo-hero-shell><div data-vimeo-controls-layer>
      <button data-vimeo-control="play"></button><button data-vimeo-control="pause"></button>
    </div><div id="hero" data-vimeo-player-init data-vimeo-hero-init data-vimeo-autoplay="true" data-vimeo-video-id="1"><iframe></iframe></div>
      <div id="heroMobile" style="display:none" data-vimeo-player-init data-vimeo-hero-init data-vimeo-autoplay="true" data-vimeo-video-id="1"><iframe></iframe></div>
    </div>
    <div class="layout355_background-video-wrapper"><div id="ambient" data-vimeo-ambient-init data-vimeo-autoplay="true" data-vimeo-video-id="2"><iframe></iframe><img class="vimeo-bg__placeholder"></div></div>
    <div id="content" data-vimeo-player-init data-vimeo-content-init data-vimeo-video-id="3" data-vimeo-muted="false"><iframe></iframe><button data-vimeo-control="play"></button><button data-vimeo-control="pause"></button></div>
    <div id="idle" data-vimeo-player-init data-vimeo-content-init data-vimeo-video-id="4"><iframe></iframe></div>
    </body></html>`, { url: 'https://dentalbarns.webflow.io/', runScripts: 'outside-only' });
  const w = dom.window, d = w.document;
  let visible = true, consent = options.consent !== false, now = 0, next = 1;
  const timers = new Map(), frames = new Map(), observers = [], players = new Map(), errors = [];
  Object.defineProperty(d, 'visibilityState', { get: () => visible ? 'visible' : 'hidden' });
  w.setTimeout = (fn, delay = 0) => { const id = next++; timers.set(id, { fn, at: now + delay }); return id; };
  w.clearTimeout = id => timers.delete(id);
  w.requestAnimationFrame = fn => { const id = next++; frames.set(id, fn); return id; };
  w.cancelAnimationFrame = id => frames.delete(id);
  w.console.error = (...args) => errors.push(args);
  w.CookieScript = { instance: { currentState: () => ({ categories: consent ? ['functionality'] : [] }) } };
  w.HTMLElement.prototype.getBoundingClientRect = function () {
    const top = Number(this.dataset.top || 0);
    return { top, bottom: top + 500, width: 800, height: 500, left: 0, right: 800 };
  };
  w.IntersectionObserver = class {
    constructor(cb, opts) { this.cb = cb; this.opts = opts; this.targets = new Set(); observers.push(this); }
    observe(el) { this.targets.add(el); }
    unobserve(el) { this.targets.delete(el); }
    disconnect() { this.targets.clear(); }
  };
  class Player {
    constructor(iframe) {
      this.root = iframe.parentElement;
      this.events = new Map();
      this.playCalls = 0; this.pauseCalls = 0; this.paused = true; this.muted = [];
      this.readyGate = deferred(); this.playGates = []; this.pauseGates = [];
      if (!options.deferReady) this.readyGate.resolve();
      players.set(this.root.id, this);
    }
    ready() { return this.readyGate.promise; }
    on(name, fn) { if (!this.events.has(name)) this.events.set(name, new Set()); this.events.get(name).add(fn); }
    off(name, fn) { this.events.get(name)?.delete(fn); }
    emit(name, value) { for (const fn of Array.from(this.events.get(name) || [])) fn(value); }
    setMuted(value) { this.muted.push(value); return Promise.resolve(); }
    setVolume(value) { this.muted.push(value === 0); return Promise.resolve(); }
    play() {
      this.playCalls++;
      const gate = deferred(); this.playGates.push(gate);
      const promise = gate.promise.then(() => { this.paused = false; this.emit('play'); this.emit('playing'); });
      if (!options.deferPlay) gate.resolve();
      return promise;
    }
    pause() {
      this.pauseCalls++;
      const gate = deferred(); this.pauseGates.push(gate);
      const promise = gate.promise.then(() => { this.paused = true; this.emit('pause'); });
      if (!options.deferPause) gate.resolve();
      return promise;
    }
    setCurrentTime(value) { this.currentTime = value; return Promise.resolve(); }
  }
  w.Vimeo = { Player };
  w.eval(source);
  const controller = w.TDBVimeo.init();
  const root = id => d.getElementById(id);
  function intersect(id, inside) {
    const el = root(id), target = id === 'ambient' ? el.parentElement : id === 'hero' ? el.parentElement : el;
    target.dataset.top = inside ? '0' : '2000';
    for (const observer of observers) {
      if (observer.targets.has(target)) observer.cb([{ target, isIntersecting: inside }]);
    }
  }
  async function tick(ms, runFrames = true) {
    now += ms;
    for (const [id, timer] of Array.from(timers)) {
      if (timer.at <= now) { timers.delete(id); timer.fn(); }
    }
    if (runFrames) {
      for (const [id, fn] of Array.from(frames)) { frames.delete(id); fn(); }
    }
    await flush();
  }
  function visibility(value) { visible = value; d.dispatchEvent(new w.Event('visibilitychange')); }
  function setConsent(value) { consent = value; w.dispatchEvent(new w.Event(value ? 'CookieScriptAccept' : 'CookieScriptReject')); }
  function click(id, action) {
    const target = id === 'hero' ? root(id).parentElement : root(id);
    target.querySelector(`[data-vimeo-control="${action}"]`).click();
  }
  return { w, d, root, controller, players, errors, intersect, tick, visibility, setConsent, click, close: () => dom.window.close() };
}

async function withFixture(options, run) {
  const f = fixture(options);
  try { await run(f); assert.deepEqual(f.errors, [], 'no unexpected controller errors'); }
  finally { f.close(); }
}

test('consent gate leaves the SDK and every iframe untouched', () => withFixture({ consent: false }, async f => {
  assert.equal(f.controller, null);
  assert.equal(f.players.size, 0);
  assert.equal(f.d.querySelectorAll('iframe[src]').length, 0);
}));

test('ambient leaves the preparation area during ready; re-entry reuses one player', () => withFixture({ deferReady: true }, async f => {
  f.intersect('ambient', true); await flush();
  const p = f.players.get('ambient'); assert.ok(p);
  f.intersect('ambient', false); p.readyGate.resolve(); await flush();
  assert.equal(p.playCalls, 0);
  assert.equal(f.root('ambient')._ambientState.playing, false);
  f.intersect('ambient', true); await flush();
  assert.equal(p.playCalls, 1); assert.equal(p.paused, false);
  assert.equal(p.muted.at(-1), true);
  f.intersect('ambient', false); await flush();
  assert.equal(p.paused, true);
  f.intersect('ambient', true); await flush();
  assert.equal(p.playCalls, 2); assert.equal(f.players.size, 1);
}));

test('late play and playing events cannot restart an offscreen ambient video', () => withFixture({ deferPlay: true }, async f => {
  f.intersect('ambient', true); await flush();
  const p = f.players.get('ambient'); assert.equal(p.playCalls, 1);
  f.intersect('ambient', false); await flush();
  p.playGates[0].resolve(); await flush();
  assert.equal(p.paused, true);
  assert.equal(f.root('ambient')._ambientState.playing, false);
  await f.tick(1000);
  assert.equal(f.root('ambient').getAttribute('data-ambient-started'), 'false');
}));

test('hidden tabs pause all three modes and resume only videos that were playing', () => withFixture({}, async f => {
  f.intersect('hero', true); f.intersect('ambient', true); f.click('content', 'play'); await flush();
  for (const id of ['hero', 'ambient', 'content']) assert.equal(f.players.get(id).paused, false);
  f.visibility(false); await flush();
  for (const id of ['hero', 'ambient', 'content']) assert.equal(f.players.get(id).paused, true);
  f.visibility(true); await flush();
  for (const id of ['hero', 'ambient', 'content']) assert.equal(f.players.get(id).playCalls, 2);
  assert.equal(f.players.has('idle'), false);
  assert.equal(f.players.get('content').muted.at(-1), false);
  f.click('hero', 'pause'); f.click('content', 'pause'); await flush();
  f.visibility(false); await flush(); f.visibility(true); await flush();
  assert.equal(f.players.get('hero').playCalls, 2);
  assert.equal(f.players.get('content').playCalls, 2);
  assert.equal(f.players.get('ambient').playCalls, 3);
}));

test('hidden pages cancel pending ready, then safely resume the original intent', () => withFixture({ deferReady: true }, async f => {
  f.intersect('hero', true); f.intersect('ambient', true); f.click('content', 'play'); await flush();
  f.visibility(false);
  for (const p of f.players.values()) p.readyGate.resolve();
  await flush();
  for (const p of f.players.values()) assert.equal(p.playCalls, 0);
  f.visibility(true); await flush();
  for (const p of f.players.values()) assert.equal(p.playCalls, 1);
}));

test('pagehide/pageshow preserve playback and foreground geometry prevents offscreen resume', () => withFixture({}, async f => {
  f.intersect('hero', true); f.intersect('ambient', true); f.click('content', 'play'); await flush();
  f.w.dispatchEvent(new f.w.Event('pagehide')); await flush();
  f.root('ambient').parentElement.dataset.top = '2000';
  f.w.dispatchEvent(new f.w.Event('pageshow')); await flush();
  assert.equal(f.players.get('ambient').paused, true);
  assert.equal(f.players.get('ambient').playCalls, 1);
  assert.equal(f.players.get('hero').playCalls, 2);
  assert.equal(f.players.get('content').playCalls, 2);
}));

test('poster reveal cancels between timer and animation frame; the existing delays survive', () => withFixture({}, async f => {
  f.intersect('ambient', true); await flush();
  await f.tick(160, false);
  f.intersect('ambient', false); await flush();
  await f.tick(0);
  assert.equal(f.root('ambient').getAttribute('data-ambient-started'), 'false');
  f.intersect('ambient', true); await flush();
  await f.tick(159);
  assert.equal(f.root('ambient').getAttribute('data-ambient-started'), 'false');
  await f.tick(1);
  assert.equal(f.root('ambient').getAttribute('data-ambient-started'), 'true');
  assert.equal(f.root('ambient').getAttribute('data-placeholder-hidden'), 'false');
  await f.tick(519);
  assert.equal(f.root('ambient').getAttribute('data-placeholder-hidden'), 'false');
  await f.tick(1);
  assert.equal(f.root('ambient').getAttribute('data-placeholder-hidden'), 'true');
}));

test('manual content pause cancels pending ready and a fresh click plays with sound', () => withFixture({ deferReady: true }, async f => {
  f.click('content', 'play'); await flush();
  const p = f.players.get('content');
  f.click('content', 'pause'); p.readyGate.resolve(); await flush();
  assert.equal(p.playCalls, 0);
  f.click('content', 'play'); await flush();
  assert.equal(p.playCalls, 1); assert.equal(p.muted.at(-1), false);
  p.emit('ended'); await flush();
  assert.equal(p.currentTime, 0);
  assert.equal(f.root('content').getAttribute('data-vimeo-activated'), 'false');
  f.visibility(false); f.visibility(true); await flush();
  assert.equal(p.playCalls, 1);
}));

test('rapid leave/re-entry waits for the pending pause acknowledgement', () => withFixture({ deferPause: true }, async f => {
  f.intersect('ambient', true); await flush();
  const p = f.players.get('ambient');
  f.intersect('ambient', false); await flush();
  f.intersect('ambient', true); await flush();
  assert.equal(p.playCalls, 1);
  p.pauseGates[0].resolve(); await flush();
  assert.equal(p.playCalls, 2); assert.equal(p.paused, false);
}));

test('consent withdrawal cancels pending playback and removes hidden-page resume intent', () => withFixture({ deferReady: true }, async f => {
  f.intersect('hero', true); f.intersect('ambient', true); f.click('content', 'play'); await flush();
  f.visibility(false); f.setConsent(false);
  for (const p of f.players.values()) p.readyGate.resolve();
  await flush(); f.visibility(true); await flush();
  for (const p of f.players.values()) assert.equal(p.playCalls, 0);
  f.setConsent(true); await f.tick(80);
  assert.equal(f.players.get('content').playCalls, 0);
  assert.equal(f.players.get('ambient').playCalls, 1);
}));

test('a hidden responsive hero cannot finish loading over its visible replacement', () => withFixture({ deferReady: true }, async f => {
  f.intersect('hero', true); await flush();
  const old = f.players.get('hero');
  f.root('hero').style.display = 'none'; f.root('heroMobile').style.display = 'block';
  f.w.dispatchEvent(new f.w.Event('resize')); await f.tick(120);
  const next = f.players.get('heroMobile'); assert.ok(next);
  old.readyGate.resolve(); next.readyGate.resolve(); await flush();
  assert.equal(old.playCalls, 0); assert.equal(next.playCalls, 1);
  old.emit('pause');
  assert.equal(f.root('hero').parentElement.getAttribute('data-vimeo-ui'), 'playing');
}));

test('suspending before SDK setup keeps iframe sources empty until return', () => withFixture({}, async f => {
  f.intersect('hero', true); f.intersect('ambient', true); f.click('content', 'play');
  f.visibility(false); await flush();
  assert.equal(f.d.querySelectorAll('iframe[src]').length, 0);
  f.visibility(true); await flush();
  for (const id of ['hero', 'ambient', 'content']) assert.equal(f.players.get(id).playCalls, 1);
}));

test('a manually started non-autoplay hero resumes after tab suspension', () => withFixture({}, async f => {
  f.root('hero').setAttribute('data-vimeo-autoplay', 'false');
  f.intersect('hero', true); await flush();
  assert.equal(f.players.has('hero'), false);
  f.click('hero', 'play'); await flush();
  f.visibility(false); await flush(); f.visibility(true); await flush();
  assert.equal(f.players.get('hero').playCalls, 2);
}));
