const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.resolve(__dirname, '../../dist/tdb-logo-marquee.js'), 'utf8');

test('marquee reuses its media query and keeps responsive speed, pauses and drag behaviour', t => {
  let mobile = false, mediaCalls = 0, nextFrame = 0;
  const frames = new Map();
  const observers = [];
  const dom = new JSDOM('<!doctype html><div class="logo-slider"><div class="partner-featured_component"><a class="partner_logos" href="#partner">Partner</a></div></div>', {
    runScripts: 'outside-only', pretendToBeVisual: true,
    beforeParse(w) {
      w.matchMedia = () => { mediaCalls++; return { get matches() { return mobile; } }; };
      w.requestAnimationFrame = cb => { frames.set(++nextFrame, cb); return nextFrame; };
      w.cancelAnimationFrame = id => frames.delete(id);
      w.IntersectionObserver = class { constructor(cb, options) { this.cb = cb; this.options = options; observers.push(this); } observe() {} unobserve() {} disconnect() {} };
      Object.defineProperty(w.HTMLElement.prototype, 'offsetLeft', { get() { return this.hasAttribute('data-tdb-logo-marquee-clone') ? 500 : 0; } });
    }
  });
  t.after(() => dom.window.close());
  const w = dom.window;
  w.eval(source);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  const track = w.document.querySelector('.partner-featured_component');
  const init = observers.find(o => o.options.rootMargin === '600px 0px');
  assert.ok(init);
  init.cb([{ target: track, isIntersecting: true }]);
  const active = observers.find(o => o.options.rootMargin === '200px 0px');
  assert.ok(active);
  active.cb([{ target: track, isIntersecting: true }]);
  const tick = time => { const batch = [...frames.values()]; frames.clear(); for (const cb of batch) cb(time); };
  const status = () => w.TDBLogoMarquee.status().instances[0];
  tick(1000);
  const desktopStart = status().targetX;
  tick(1100);
  assert.ok(Math.abs((desktopStart - status().targetX) - 4) < 0.00001);
  mobile = true;
  const mobileStart = status().targetX;
  tick(1200);
  assert.ok(Math.abs((mobileStart - status().targetX) - 2.2) < 0.00001);
  assert.equal(mediaCalls, 1);
  const dispatchPointer = (type, x) => {
    const event = new w.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { clientX: x, pointerId: 1, button: 0 });
    track.dispatchEvent(event);
  };
  const beforeDrag = status().targetX;
  dispatchPointer('pointerdown', 100);
  dispatchPointer('pointermove', 120);
  assert.equal(status().targetX, beforeDrag + 20);
  dispatchPointer('pointerup', 120);
  assert.equal(status().dragging, false);
  active.cb([{ target: track, isIntersecting: false }]);
  const paused = status().targetX;
  tick(1400);
  assert.equal(status().targetX, paused);
  assert.equal(status().running, false);
  w.TDBLogoMarquee.destroy();
  assert.equal(track.querySelectorAll('[data-tdb-logo-marquee-clone]').length, 0);
});
