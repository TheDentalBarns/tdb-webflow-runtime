// Focused DOM lifecycle check. JSDOM supplies MutationObserver; the browser's
// native popover API is modelled here and checked separately in staging.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<body><script src="https://example.test/dist/tdb-five-senses-loader.js"></script></body>', {
  url: 'https://example.test/five-senses-experience', runScripts: 'outside-only', pretendToBeVisual: true
});
const { window } = dom;
const doc = window.document;
Object.defineProperty(doc, 'currentScript', { value: doc.querySelector('script') });
window.matchMedia = () => ({ matches: true });
const popovers = new Set();
const originalMatches = window.Element.prototype.matches;
window.Element.prototype.matches = function (selector) {
  return selector === ':popover-open' ? popovers.has(this) : originalMatches.call(this, selector);
};
window.HTMLElement.prototype.showPopover = function () { popovers.add(this); };
window.HTMLElement.prototype.hidePopover = function () { popovers.delete(this); };
const source = fs.readFileSync(process.argv[2] || __dirname + '/../dist/tdb-five-senses-loader.js', 'utf8');
window.eval(source.replace('window.TDBFiveSensesEntry=Object.freeze', 'window.audioTest={keepPageAudio,stopPageAudio};window.TDBFiveSensesEntry=Object.freeze'));
const audio = { ready: true, muted: false, changes: 0, stops: 0,
  context: { resume: () => Promise.resolve() },
  setMuted(value) { this.muted = value; this.changes++; },
  stop() { this.stops++; }
};
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
(async () => {
  window.audioTest.keepPageAudio(audio);
  const button = doc.querySelector('.tdb-senses-page-audio');
  assert.ok(button);
  assert.equal(button.parentElement, doc.body);
  assert.equal(button.hasAttribute('popover'), false);
  button.click(); assert.equal(audio.muted, true);
  button.click(); assert.equal(audio.muted, false);
  const calculator = doc.createElement('dialog'); calculator.className = 'tdbc-dialog';
  doc.body.append(calculator); calculator.open = true; await tick();
  assert.equal(button.parentElement, calculator);
  assert.equal(popovers.has(button), true);
  const vip = doc.createElement('dialog'); vip.className = 'tdbc-vip-overlay';
  vip.innerHTML = '<div id="tdb-vip-drawer"></div>'; doc.body.append(vip); vip.open = true; await tick();
  assert.equal(button.parentElement, vip.firstElementChild);
  assert.equal(popovers.has(button), true);
  vip.open = false; await tick(); assert.equal(button.parentElement, calculator);
  calculator.open = false; await tick();
  assert.equal(button.parentElement, doc.body);
  assert.equal(button.hasAttribute('popover'), false);
  assert.equal(popovers.has(button), false);
  assert.equal(doc.querySelectorAll('.tdb-senses-page-audio').length, 1);
  button.click(); assert.equal(audio.changes, 3, 'one click must cause exactly one mute change after moves');
  window.HTMLElement.prototype.showPopover = function () { throw new Error('simulated unavailable top layer'); };
  calculator.open = true; await tick();
  assert.equal(button.parentElement, calculator);
  assert.equal(button.hasAttribute('popover'), false, 'failed popover must not leave a hidden control');
  window.audioTest.stopPageAudio();
  assert.equal(doc.querySelectorAll('.tdb-senses-page-audio').length, 0);
  assert.equal(audio.stops, 1);
  calculator.open = false; await tick();
  assert.equal(doc.querySelectorAll('.tdb-senses-page-audio').length, 0);
  console.log('PASS: page handover, mute/unmute, calculator and VIP layers, single handler, fallback, cleanup');
  window.close();
})().catch(error => { console.error(error); window.close(); process.exitCode = 1; });
