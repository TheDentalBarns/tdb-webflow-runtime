const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '../src/shared/native-ticker.js'), 'utf8');

test('either cancelled ticker animation settles the latest duration and ignores stale callbacks', () => {
  for (const cancelledIndex of [0, 1]) {
    const dom = new JSDOM('<span data-output="duration">14–15 weeks</span>', { runScripts: 'outside-only' });
    const w = dom.window, animations = [], slot = w.document.querySelector('span');
    w.TDBMotion = { reduced: new w.EventTarget(), defaults: { ticker: 400 }, easing: (_, fallback) => fallback };
    w.Element.prototype.animate = function () {
      const animation = { onfinish: null, oncancel: null, cancel() { this.oncancel?.(); } };
      animations.push(animation);
      return animation;
    };
    w.eval(source);
    const ticker = w.TDBNativeTicker.mount(slot, { valueClass: 'tdbc-ticker-value', incomingClass: 'tdbc-ticker-incoming' });
    ticker.update('60 minutes', -1);
    const staleFinish = animations[1].onfinish;
    animations[cancelledIndex].cancel();
    assert.equal(slot.textContent, '60 minutes');
    assert.equal(slot.children.length, 1);
    ticker.update('90 minutes', 1);
    staleFinish();
    assert.equal(slot.children.length, 2, 'an old cancellation cannot settle a newer transition');
    animations.at(-1).onfinish();
    assert.equal(slot.textContent, '90 minutes');
    assert.equal(slot.children.length, 1);
    ticker.sequence(['2 weeks', '4 weeks']);
    animations.at(-1).cancel();
    assert.equal(slot.textContent, '4 weeks');
    assert.equal(slot.children.length, 1);
    ticker.destroy();
    dom.window.close();
  }
});

test('artwork uses the shared ticker without losing its current icon when interrupted', () => {
  const dom = new JSDOM('<span data-icons>diamond</span>', {runScripts:'outside-only'});
  const w=dom.window, slot=w.document.querySelector('span'), animations=[];
  w.TDBMotion={reduced:new w.EventTarget(),defaults:{ticker:400},easing:(_,fallback)=>fallback};
  w.Element.prototype.animate=function(){const animation={onfinish:null,oncancel:null,cancel(){this.oncancel?.()}};animations.push(animation);return animation};
  w.eval(source);
  const ticker=w.TDBNativeTicker.mount(slot,{render(node,name){const icon=w.document.createElement('i');icon.dataset.icon=name;node.replaceChildren(icon)}});
  assert.equal(slot.querySelector('i').dataset.icon,'diamond');
  ticker.update('thumbprint');assert.deepEqual([...slot.querySelectorAll('i')].map(i=>i.dataset.icon),['diamond','thumbprint']);
  ticker.update('lotus');animations.at(-1).cancel();
  assert.equal(slot.children.length,1);assert.equal(slot.querySelector('i').dataset.icon,'lotus');assert.equal(slot.textContent,'');
  ticker.sequence(['quotation','barn-window']);animations.at(-1).onfinish();assert.equal(slot.querySelector('i').dataset.icon,'barn-window');
  ticker.destroy();assert.equal(slot.querySelector('i').dataset.icon,'barn-window');w.close();
});
